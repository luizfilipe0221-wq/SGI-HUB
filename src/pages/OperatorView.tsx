import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import {
  Phone, ChevronLeft, ChevronRight, MapPin, Tag, Globe, FileText, Clock, CheckCircle2, Loader2, History,
  PhoneCall, PhoneMissed, Voicemail, PhoneOff, PhoneForwarded, RefreshCw,
} from "lucide-react";

interface ContatoData {
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

interface HistoricoItem {
  status: string;
  observacao: string;
  horario_retorno: string;
  criado_em: string;
  lista_nome: string;
  nome_operador: string;
}

const STATUS_OPTIONS = [
  { value: "atendeu", label: "Atendeu", icon: PhoneCall, color: "#34C759" },
  { value: "nao-atendeu", label: "Nao Atendeu", icon: PhoneMissed, color: "#FFCC00" },
  { value: "caixa-postal", label: "Caixa Postal", icon: Voicemail, color: "#AF52DE" },
  { value: "invalido", label: "N. Invalido", icon: PhoneOff, color: "#FF3B30" },
  { value: "nao-quer", label: "Nao Quer", icon: Phone, color: "#FF9500" },
  { value: "retornar", label: "Retornar", icon: PhoneForwarded, color: "#007AFF" },
  { value: "revisita", label: "Revisita", icon: RefreshCw, color: "#303136" },
];

const statusLabels: Record<string, string> = {
  atendeu: "Atendeu",
  "nao-atendeu": "Nao Atendeu",
  "caixa-postal": "Caixa Postal",
  invalido: "Numero Invalido",
  "nao-quer": "Nao Quer Contato",
  retornar: "Retornar Depois",
  revisita: "Revisita",
};

export default function OperatorView() {
  const { token } = useParams<{ token: string }>();
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

  useEffect(() => {
    if (token) loadData();
  }, [token]);

  useEffect(() => {
    if (contatos.length > 0 && contatos[currentIdx]) {
      loadHistorico(contatos[currentIdx].contato_id);
      setStatus("");
      setObservacao("");
      setHorarioRetorno("");
      setHistoryOpen(false);
    }
  }, [currentIdx, contatos]);

  async function loadData() {
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
    if (firstIncomplete === -1) {
      setAllDone(true);
    } else {
      setCurrentIdx(firstIncomplete);
    }
    setLoading(false);
  }

  async function loadHistorico(contatoId: number) {
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
  }

  async function salvar() {
    if (!status) {
      toast({ title: "Selecione um status", variant: "destructive" });
      return;
    }
    const contato = contatos[currentIdx];
    setSaving(true);

    const { error: err } = await supabase.from("registros").insert([{
      lista_contato_id: contato.lista_contato_id,
      status,
      observacao: observacao.trim() || null,
      horario_retorno: status === "retornar" ? horarioRetorno || null : null,
    }]);

    if (err) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    const newCompleted = new Set(completed);
    newCompleted.add(contato.lista_contato_id);
    setCompleted(newCompleted);

    const newStatuses = new Map(completedStatuses);
    newStatuses.set(contato.lista_contato_id, status);
    setCompletedStatuses(newStatuses);

    try { navigator.vibrate?.(50); } catch {}

    toast({ title: "Registrado com sucesso!" });
    setSaving(false);

    const nextIdx = contatos.findIndex((c, i) => i > currentIdx && !newCompleted.has(c.lista_contato_id));
    if (nextIdx !== -1) {
      setCurrentIdx(nextIdx);
    } else {
      const anyLeft = contatos.findIndex((c) => !newCompleted.has(c.lista_contato_id));
      if (anyLeft === -1) {
        setAllDone(true);
      } else {
        setCurrentIdx(anyLeft);
      }
    }
  }

  function parsePhones(telefone: string): string[] {
    return telefone.split(/[|\/,]/).map((t) => t.trim()).filter(Boolean);
  }

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-6 max-w-lg mx-auto space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md glass-card-elevated text-center">
          <CardContent className="py-12">
            <Logo className="mb-4 justify-center" />
            <p className="text-[15px] text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (allDone) {
    const summary: Record<string, number> = {};
    completedStatuses.forEach((s) => { summary[s] = (summary[s] || 0) + 1; });

    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md glass-card-elevated text-center">
          <CardContent className="py-12 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-status-atendeu mx-auto" />
            <h1 className="text-[24px] font-semibold tracking-[-0.5px]">Parabens, {nomeOperador}!</h1>
            <p className="text-muted-foreground text-[15px]">
              Voce completou todos os <span className="text-foreground font-medium">{contatos.length}</span> contatos!
            </p>
            <div className="space-y-1">
              {Object.entries(summary).map(([s, count]) => (
                <div key={s} className="flex items-center justify-center gap-2">
                  <Badge className={`status-badge-${s} border-0 text-xs`}>{statusLabels[s] || s}</Badge>
                  <span className="text-sm text-muted-foreground">{count}</span>
                </div>
              ))}
            </div>
            <Button variant="outline" onClick={() => { setAllDone(false); setCurrentIdx(0); }}>
              Revisar ligacoes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const contato = contatos[currentIdx];
  const phones = parsePhones(contato.telefone);
  const doneCount = completed.size;
  const totalCount = contatos.length;
  const progressPct = Math.round((doneCount / totalCount) * 100);

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="glass-header sticky top-0 z-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <Logo />
          <span className="text-[13px] text-muted-foreground">{nomeOperador}</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Progress value={progressPct} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground font-medium">{doneCount} de {totalCount}</span>
        </div>
      </header>

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {/* Contact Hero Card */}
        <Card className="glass-card-elevated">
          <CardHeader className="pb-3">
            {contato.tipo && (
              <Badge variant="secondary" className="w-fit text-[11px] mb-1">{contato.tipo}</Badge>
            )}
            <CardTitle className="text-[22px] font-semibold tracking-[-0.5px] line-clamp-2">{contato.nome || "Sem nome"}</CardTitle>
            {completed.has(contato.lista_contato_id) && (
              <Badge className="status-badge-atendeu border-0 w-fit text-xs">Ja registrado</Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Phone buttons */}
            <div className="space-y-2">
              {phones.map((phone, i) => (
                <a
                  key={i}
                  href={`tel:${phone.replace(/\D/g, "")}`}
                  className="flex items-center gap-3 p-3.5 rounded-[14px] bg-[rgba(255,255,255,0.7)] border border-[rgba(0,0,0,0.08)] hover:bg-[rgba(255,255,255,0.95)] hover:border-[rgba(0,0,0,0.15)] hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all duration-150"
                >
                  <Phone className="h-5 w-5 text-primary" />
                  <span className="font-medium text-[15px]">{phone}</span>
                  <span className="ml-auto text-xs text-primary font-medium">Ligar</span>
                </a>
              ))}
            </div>
            {/* Info grid */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              {contato.endereco && (
                <div className="flex items-start gap-2 col-span-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <span className="text-muted-foreground text-[13px]">{contato.endereco}</span>
                </div>
              )}
              {contato.territorio && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground text-[13px]">Territorio {contato.territorio}</span>
                </div>
              )}
            </div>
            {contato.obs_original && (
              <div className="flex items-start gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <span className="text-muted-foreground italic text-[13px]">{contato.obs_original}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* History - Collapsible */}
        {historico.length > 0 && (
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Ver historico ({historico.length} tentativas)
                </span>
                <ChevronRight className={`h-4 w-4 transition-transform ${historyOpen ? "rotate-90" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="glass-card mt-2">
                <CardContent className="space-y-2 pt-4">
                  {historico.map((h, i) => (
                    <div key={i} className="p-3 rounded-xl bg-[rgba(0,0,0,0.03)] space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`status-badge-${h.status} border-0 text-xs`}>{statusLabels[h.status] || h.status}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {h.criado_em ? new Date(h.criado_em).toLocaleString("pt-BR") : "—"}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {h.lista_nome && <span>Lista: {h.lista_nome}</span>}
                        {h.nome_operador && <span> - Op: {h.nome_operador}</span>}
                      </div>
                      {h.observacao && <p className="text-xs text-muted-foreground">{h.observacao}</p>}
                      {h.horario_retorno && <p className="text-xs text-primary">Retorno: {h.horario_retorno}</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Status Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {STATUS_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => setStatus(opt.value)}
                className={`min-h-[52px] flex items-center gap-3 rounded-[14px] px-4 py-3 text-[15px] font-medium transition-all duration-150 text-left border-[1.5px] ${
                  status === opt.value
                    ? "bg-white border-[rgba(0,0,0,0.15)] -translate-y-[1px] shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                    : "bg-[rgba(255,255,255,0.7)] border-[rgba(0,0,0,0.08)] text-foreground hover:bg-[rgba(255,255,255,0.95)] hover:border-[rgba(0,0,0,0.15)]"
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" style={{ color: opt.color }} />
                {opt.label}
              </button>
            );
          })}
        </div>

        {status === "retornar" && (
          <div className="space-y-2">
            <Label className="flex items-center gap-1 text-[13px]">
              <Clock className="h-4 w-4" /> Melhor horario para retorno
            </Label>
            <Input value={horarioRetorno} onChange={(e) => setHorarioRetorno(e.target.value)} placeholder="Ex: Segunda as 14h" />
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-[13px]">Observacoes (opcional)</Label>
          <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Alguma observacao sobre a ligacao..." rows={2} className="rounded-xl bg-[rgba(0,0,0,0.04)] border-input focus-visible:bg-[rgba(255,255,255,0.9)] focus-visible:border-[rgba(0,122,255,0.4)] focus-visible:shadow-[0_0_0_3px_rgba(0,122,255,0.12)]" />
        </div>

        <div className="h-2" />
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 glass-header border-t border-[rgba(0,0,0,0.06)] px-4 py-3 z-50">
        <div className="max-w-lg mx-auto flex gap-3">
          <Button variant="outline" className="flex-1" disabled={currentIdx === 0} onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
          </Button>
          <Button className="flex-1 min-h-[48px]" disabled={saving} onClick={salvar}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
            Salvar e Proximo
          </Button>
        </div>
      </div>
    </div>
  );
}
