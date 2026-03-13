/**
 * useOperatorSession
 * Hook responsável por toda a lógica de dados do OperatorView:
 * - Carregamento da lista de contatos via token
 * - Gerenciamento de estado (progresso, histórico, navegação)
 * - Salvamento de registros no Supabase
 *
 * O componente visual (OperatorView) permanece puramente declarativo.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { supabaseQuery } from "@/lib/supabaseHelper";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ContatoData {
    lista_contato_id: number;
    contato_id: number;
    nome: string;
    telefone: string;
    endereco: string;
    tipo: string;
    territorio: string;
    obs_original: string;
    ordem: number;
}

export interface HistoricoItem {
    status: string;
    observacao: string;
    horario_retorno: string;
    criado_em: string;
    lista_nome: string;
    nome_operador: string;
}

export interface OperatorSessionState {
    // Data
    contatos: ContatoData[];
    currentIdx: number;
    historico: HistoricoItem[];
    nomeOperador: string;
    completed: Set<number>;
    completedStatuses: Map<number, string>;

    // Form state
    status: string;
    observacao: string;
    horarioRetorno: string;

    // UI state
    loading: boolean;
    saving: boolean;
    error: string;
    allDone: boolean;
    historyOpen: boolean;

    // Actions
    setCurrentIdx: (idx: number) => void;
    setStatus: (s: string) => void;
    setObservacao: (s: string) => void;
    setHorarioRetorno: (s: string) => void;
    setHistoryOpen: (open: boolean) => void;
    setAllDone: (done: boolean) => void;
    salvar: () => Promise<void>;
    salvarContato: (lista_contato_id: number, status: string, observacao: string, horarioRetorno: string) => Promise<boolean>;
    parsePhones: (telefone: string) => string[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOperatorSession(token: string | undefined): OperatorSessionState {
    const [contatos, setContatos] = useState<ContatoData[]>([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [nomeOperador, setNomeOperador] = useState("");
    const [status, setStatus] = useState("");
    const [observacao, setObservacao] = useState("");
    const [horarioRetorno, setHorarioRetorno] = useState("");
    const [historico, setHistorico] = useState<HistoricoItem[]>([]);
    const [saving, setSaving] = useState(false);
    const [completed, setCompleted] = useState<Set<number>>(new Set());
    const [completedStatuses, setCompletedStatuses] = useState<Map<number, string>>(new Map());
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [allDone, setAllDone] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);

    // Load session data from Supabase
    const loadData = useCallback(async () => {
        if (!token) return;
        setLoading(true);

        const { data: lcData, error: lcErr } = await supabase
            .from("lista_contatos")
            .select("id, contato_id, nome_operador, link_ativo, ordem, lista_id")
            .eq("token_operador", token)
            .order("ordem");

        if (lcErr || !lcData || lcData.length === 0) {
            setError("Link invalido ou nao encontrado.");
            setLoading(false);
            return;
        }

        if (!lcData[0].link_ativo) {
            setError("Este link foi desativado.");
            setLoading(false);
            return;
        }

        const { data: lista } = await supabase
            .from("listas")
            .select("ativa")
            .eq("id", lcData[0].lista_id)
            .maybeSingle();

        if (!lista?.ativa) {
            setError("Esta lista foi encerrada.");
            setLoading(false);
            return;
        }

        setNomeOperador(lcData[0].nome_operador || "");

        const contatoIds = lcData.map((lc) => lc.contato_id);
        const { data: contatosData } = await supabase
            .from("contatos")
            .select("id, nome, telefone, endereco, tipo, territorio, obs_original")
            .in("id", contatoIds);

        const contatoMap = new Map((contatosData || []).map((c) => [c.id, c]));

        const mapped: ContatoData[] = lcData.map((lc) => {
            const c = contatoMap.get(lc.contato_id);
            return {
                lista_contato_id: lc.id,
                contato_id: lc.contato_id,
                nome: c?.nome || "",
                telefone: c?.telefone || "",
                endereco: c?.endereco || "",
                tipo: c?.tipo || "",
                territorio: c?.territorio || "",
                obs_original: c?.obs_original || "",
                ordem: lc.ordem || 0,
            };
        });

        const lcIds = lcData.map((lc) => lc.id);
        const { data: regData } = await supabase
            .from("registros")
            .select("lista_contato_id, status")
            .in("lista_contato_id", lcIds);

        const doneSet = new Set<number>();
        const statusMap = new Map<number, string>();
        (regData || []).forEach((r) => {
            doneSet.add(r.lista_contato_id);
            statusMap.set(r.lista_contato_id, r.status);
        });

        setCompleted(doneSet);
        setCompletedStatuses(statusMap);
        setContatos(mapped);

        const firstIncomplete = mapped.findIndex((c) => !doneSet.has(c.lista_contato_id));
        setAllDone(firstIncomplete === -1);
        if (firstIncomplete !== -1) setCurrentIdx(firstIncomplete);
        setLoading(false);
    }, [token]);

    // Load contact history
    const loadHistorico = useCallback(async (contatoId: number) => {
        const { data } = await supabase
            .from("historico_contato")
            .select("*")
            .eq("contato_id", contatoId);

        setHistorico(
            (data || [])
                .sort((a, b) => new Date(b.data_ligacao || 0).getTime() - new Date(a.data_ligacao || 0).getTime())
                .map((h) => ({
                    status: h.status || "",
                    observacao: h.observacao || "",
                    horario_retorno: h.horario_retorno || "",
                    criado_em: h.data_ligacao || "",
                    lista_nome: h.lista_nome || "",
                    nome_operador: h.nome_operador || "",
                }))
        );
    }, []);

    // Save register for a specific lista_contato_id
    const salvarContato = useCallback(async (
        lista_contato_id: number,
        statusValue: string,
        observacaoValue: string,
        horarioRetornoValue: string,
    ) => {
        if (!statusValue) {
            toast({ title: "Selecione um status", variant: "destructive" });
            return false;
        }
        setSaving(true);

        try {
            await supabaseQuery(async () => await supabase.rpc("admin_salvar_registro", {
                p_lista_contato_id: lista_contato_id,
                p_status: statusValue,
                p_observacao: observacaoValue.trim() || null,
                p_horario_retorno: statusValue === "retornar" ? horarioRetornoValue || null : null,
            }));
        } catch (err: any) {
            toast({ title: "Erro ao salvar", description: err?.message, variant: "destructive" });
            setSaving(false);
            return false;
        }

        const newCompleted = new Set(completed);
        newCompleted.add(lista_contato_id);
        const newStatuses = new Map(completedStatuses);
        newStatuses.set(lista_contato_id, statusValue);

        setCompleted(newCompleted);
        setCompletedStatuses(newStatuses);
        try { navigator.vibrate?.(50); } catch (_) { /* vibration API optional */ }
        toast({ title: "Registrado!" });
        setSaving(false);

        const anyLeft = contatos.findIndex((c) => !newCompleted.has(c.lista_contato_id));
        if (anyLeft === -1) setAllDone(true);

        return true;
    }, [completed, completedStatuses, contatos]);

    // Legacy: Save register and advance contact (kept for compatibility)
    const salvar = useCallback(async () => {
        const contato = contatos[currentIdx];
        const ok = await salvarContato(contato.lista_contato_id, status, observacao, horarioRetorno);
        if (ok) {
            const newCompleted = new Set(completed);
            newCompleted.add(contato.lista_contato_id);
            const nextIdx = contatos.findIndex((c, i) => i > currentIdx && !newCompleted.has(c.lista_contato_id));
            if (nextIdx !== -1) setCurrentIdx(nextIdx);
        }
    }, [status, contatos, currentIdx, observacao, horarioRetorno, completed, salvarContato]);


    const parsePhones = useCallback(
        (telefone: string) => telefone.split(/[|/,]/).map((t) => t.trim()).filter(Boolean),
        []
    );

    // Effects
    useEffect(() => { loadData(); }, [loadData]);

    useEffect(() => {
        if (contatos.length > 0 && contatos[currentIdx]) {
            loadHistorico(contatos[currentIdx].contato_id);
            setStatus("");
            setObservacao("");
            setHorarioRetorno("");
            setHistoryOpen(false);
        }
    }, [currentIdx, contatos, loadHistorico]);

    return {
        contatos, currentIdx, historico, nomeOperador, completed, completedStatuses,
        status, observacao, horarioRetorno,
        loading, saving, error, allDone, historyOpen,
        setCurrentIdx, setStatus, setObservacao, setHorarioRetorno,
        setHistoryOpen, setAllDone,
        salvar, salvarContato, parsePhones,
    };
}
