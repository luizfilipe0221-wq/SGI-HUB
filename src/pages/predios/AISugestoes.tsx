import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePredios, usePrediosPendentes } from '@/hooks/predios/usePredios';
import { useEstatisticasLotes, useCreateLote } from '@/hooks/predios/useLotes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Sparkles, Building2, MapPin, RefreshCw, AlertTriangle,
    ChevronDown, ChevronUp, Plus, Loader2, Info
} from 'lucide-react';

interface Sugestao {
    titulo: string;
    motivo: string;
    prioridade: 'alta' | 'media' | 'baixa';
    territorio: string | null;
    predios_ids: number[];
    predios_nomes: string[];
}

interface AIResponse {
    sugestoes: Sugestao[];
    resumo: string;
    error?: string;
}

const PRIORIDADE_CONFIG = {
    alta: { label: 'Alta', class: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400' },
    media: { label: 'Média', class: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400' },
    baixa: { label: 'Baixa', class: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400' },
};

export default function AISugestoes() {
    const navigate = useNavigate();

    const { data: predios, isLoading: loadingPredios } = usePredios();
    const { data: prediosPendentes, isLoading: loadingPendentes } = usePrediosPendentes();
    const { data: estatisticas, isLoading: loadingStats } = useEstatisticasLotes();
    const createLote = useCreateLote();

    const [resultado, setResultado] = useState<AIResponse | null>(null);
    const [analisando, setAnalisando] = useState(false);
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

    // Dialog criar lote a partir de sugestão
    const [criarDialog, setCriarDialog] = useState<{ sugestao: Sugestao; nome: string } | null>(null);

    const isLoading = loadingPredios || loadingPendentes || loadingStats;

    async function analisar() {
        if (!predios || !prediosPendentes || !estatisticas) {
            toast.error('Dados ainda carregando, aguarde.');
            return;
        }

        setAnalisando(true);
        setResultado(null);

        try {
            // Prepara contexto enxuto para a IA
            const prediosContexto = prediosPendentes.map(p => ({
                id: p.id,
                nome: p.nome,
                endereco: p.endereco,
                territorio: p.territorio,
                total_aptos: p.total_aptos,
                vezes_na_lista: p.vezes_na_lista,
                ultima_vez_em: p.ultima_vez_em,
                tem_pendencia: p.tem_pendencia,
            }));

            const lotesAtivos = estatisticas
                .filter(e => !e.finalizado)
                .map(e => ({
                    nome: e.lote_nome,
                    total_predios: e.total_predios,
                    concluidos: e.concluidos,
                    em_andamento: e.em_andamento,
                    nao_iniciados: e.nao_iniciados,
                    pendentes: e.pendentes,
                    progresso_pct: e.progresso_geral_pct,
                }));

            const { data, error } = await supabase.functions.invoke('ai-sugestoes', {
                body: {
                    predios: prediosContexto,
                    lotes_ativos: lotesAtivos,
                },
            });

            if (error) throw new Error(error.message);
            if (data?.error) throw new Error(data.error);

            setResultado(data as AIResponse);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Erro desconhecido';
            toast.error('Erro ao consultar IA', { description: msg });
            // Mostra o erro na UI também
            setResultado({ sugestoes: [], resumo: '', error: msg });
        } finally {
            setAnalisando(false);
        }
    }

    async function criarLoteDaSugestao() {
        if (!criarDialog) return;
        try {
            const lote = await createLote.mutateAsync({
                loteData: { nome: criarDialog.nome, descricao: criarDialog.sugestao.motivo },
                predioIds: criarDialog.sugestao.predios_ids,
            });
            setCriarDialog(null);
            navigate(`/predios/lotes/${lote.id}`);
        } catch {
            // erro tratado pelo hook
        }
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-3">
                    <Sparkles className="w-6 h-6 text-primary" />
                    Sugestões de IA
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    A IA analisa prédios pendentes e incompletos e sugere lotes de trabalho priorizados por território e urgência.
                </p>
            </div>

            {/* Painel de contexto */}
            {isLoading ? (
                <div className="glass-card rounded-xl p-5">
                    <Skeleton className="h-4 w-48 mb-2" />
                    <div className="flex gap-4">
                        <Skeleton className="h-14 w-28 rounded-lg" />
                        <Skeleton className="h-14 w-28 rounded-lg" />
                        <Skeleton className="h-14 w-28 rounded-lg" />
                    </div>
                </div>
            ) : (
                <div className="glass-card rounded-xl p-5">
                    <p className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">Situação Atual</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="text-center p-3 rounded-lg bg-secondary">
                            <p className="text-2xl font-bold">{predios?.length ?? 0}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Total de Prédios</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                            <p className="text-2xl font-bold text-amber-600">{prediosPendentes?.length ?? 0}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Pendentes/Incompletos</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-primary/5">
                            <p className="text-2xl font-bold text-primary">
                                {estatisticas?.filter(e => !e.finalizado).length ?? 0}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">Lotes Ativos</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                            <p className="text-2xl font-bold text-red-600">
                                {prediosPendentes?.filter(p => p.tem_pendencia).length ?? 0}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">Com Pendência</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Botão analisar */}
            <div className="flex gap-3 items-center">
                <Button
                    onClick={analisar}
                    disabled={analisando || isLoading}
                    className="gap-2"
                    size="lg"
                >
                    {analisando ? (
                        <><Loader2 className="w-4 h-4 animate-spin" />Analisando com IA...</>
                    ) : (
                        <><Sparkles className="w-4 h-4" />Gerar Sugestões</>
                    )}
                </Button>
                {resultado && !analisando && (
                    <Button variant="ghost" size="sm" onClick={analisar} className="gap-1.5 text-muted-foreground">
                        <RefreshCw className="w-3.5 h-3.5" />
                        Reanalisar
                    </Button>
                )}
                <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>Requer a Edge Function <code className="bg-muted px-1 py-0.5 rounded">ai-sugestoes</code> implantada no Supabase</span>
                </div>
            </div>

            {/* Resultado de erro */}
            {resultado?.error && (
                <div className="glass-card rounded-xl p-5 border border-destructive/30 bg-destructive/5">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-destructive">Erro ao consultar IA</p>
                            <p className="text-sm text-muted-foreground mt-1">{resultado.error}</p>
                            {resultado.error.includes('ANTHROPIC_API_KEY') && (
                                <div className="mt-3 text-xs bg-muted rounded-lg p-3 space-y-1 font-mono">
                                    <p># Configure a chave API no Supabase:</p>
                                    <p>supabase secrets set ANTHROPIC_API_KEY=sk-ant-...</p>
                                    <p># Implante a função:</p>
                                    <p>supabase functions deploy ai-sugestoes</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Resumo da IA */}
            {resultado?.resumo && !resultado.error && (
                <div className="glass-card rounded-xl p-5 border border-primary/20 bg-primary/5">
                    <div className="flex items-start gap-3">
                        <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-sm mb-1">Análise da IA</p>
                            <p className="text-sm text-muted-foreground">{resultado.resumo}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Lista de sugestões */}
            {resultado?.sugestoes && resultado.sugestoes.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        {resultado.sugestoes.length} sugestão(ões) de lote
                    </h2>
                    {resultado.sugestoes.map((s, idx) => {
                        const isExpanded = expandedIdx === idx;
                        const config = PRIORIDADE_CONFIG[s.prioridade] ?? PRIORIDADE_CONFIG.baixa;
                        return (
                            <div key={idx} className="glass-card rounded-xl overflow-hidden border">
                                {/* Cabeçalho da sugestão */}
                                <button
                                    className="w-full p-4 flex items-start gap-4 text-left hover:bg-muted/30 transition-colors"
                                    onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span className="font-semibold">{s.titulo}</span>
                                            <Badge variant="outline" className={cn('text-xs border', config.class)}>
                                                {config.label} prioridade
                                            </Badge>
                                            {s.territorio && (
                                                <Badge variant="secondary" className="text-xs gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {s.territorio}
                                                </Badge>
                                            )}
                                            <Badge variant="secondary" className="text-xs gap-1">
                                                <Building2 className="w-3 h-3" />
                                                {s.predios_ids.length} prédios
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{s.motivo}</p>
                                    </div>
                                    <div className="shrink-0 mt-1">
                                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                                    </div>
                                </button>

                                {/* Detalhe expandido */}
                                {isExpanded && (
                                    <div className="border-t px-4 pb-4 pt-3 bg-muted/20">
                                        <p className="text-xs font-medium text-muted-foreground mb-2">Prédios incluídos:</p>
                                        <div className="flex flex-wrap gap-1.5 mb-4">
                                            {s.predios_nomes.map((nome, i) => (
                                                <span
                                                    key={i}
                                                    className="text-xs bg-background border rounded-full px-2.5 py-1"
                                                >
                                                    {nome}
                                                </span>
                                            ))}
                                        </div>
                                        <Button
                                            size="sm"
                                            className="gap-2"
                                            onClick={() => setCriarDialog({ sugestao: s, nome: s.titulo })}
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            Criar Lote com esta sugestão
                                        </Button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {resultado?.sugestoes && resultado.sugestoes.length === 0 && !resultado.error && (
                <div className="glass-card rounded-xl p-10 text-center text-muted-foreground">
                    <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Nenhuma sugestão gerada</p>
                    <p className="text-sm mt-1">Todos os prédios podem já estar cobertos pelos lotes ativos.</p>
                </div>
            )}

            {/* Dialog: Criar lote a partir de sugestão */}
            <Dialog open={!!criarDialog} onOpenChange={(o) => { if (!o) setCriarDialog(null); }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Criar Lote</DialogTitle>
                        <p className="text-sm text-muted-foreground">
                            {criarDialog?.sugestao.predios_ids.length} prédios serão associados ao novo lote.
                        </p>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                            <Label>Nome do lote</Label>
                            <Input
                                value={criarDialog?.nome ?? ''}
                                onChange={(e) => criarDialog && setCriarDialog({ ...criarDialog, nome: e.target.value })}
                                placeholder="Ex: Zona Norte — Urgente"
                                autoFocus
                                onKeyDown={(e) => { if (e.key === 'Enter') criarLoteDaSugestao(); }}
                            />
                        </div>
                        <div className="text-xs text-muted-foreground bg-muted rounded-lg p-2.5">
                            <strong>Motivo:</strong> {criarDialog?.sugestao.motivo}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCriarDialog(null)} disabled={createLote.isPending}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={criarLoteDaSugestao}
                            disabled={createLote.isPending || !criarDialog?.nome.trim()}
                        >
                            {createLote.isPending ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Criando...</> : 'Criar Lote'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
