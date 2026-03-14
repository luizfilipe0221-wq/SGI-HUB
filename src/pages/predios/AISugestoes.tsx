import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrediosPendentes } from '@/hooks/predios/usePredios';
import { useEstatisticasLotes, useCreateLote } from '@/hooks/predios/useLotes';
import { PredioPendenteRow } from '@/lib/predios/types';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
    Sparkles, Building2, MapPin, ChevronDown, ChevronUp,
    Plus, Loader2, AlertTriangle, Clock, Star
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────
// Lógica local de pontuação de urgência
// ─────────────────────────────────────────

interface PredioComPontuacao extends PredioPendenteRow {
    pontuacao: number;
    motivos: string[];
}

function calcularPontuacao(p: PredioPendenteRow): { pontuacao: number; motivos: string[] } {
    let pontuacao = 0;
    const motivos: string[] = [];

    // +40 — nunca visitado
    if (p.vezes_na_lista === 0) {
        pontuacao += 40;
        motivos.push('Nunca visitado');
    }

    // +30 — tem pendência em aberto
    if (p.tem_pendencia) {
        pontuacao += 30;
        motivos.push('Pendência em aberto');
    }

    // Tempo desde a última visita
    if (p.ultima_vez_em) {
        const diasDesdeUltimaVisita = Math.floor(
            (Date.now() - new Date(p.ultima_vez_em).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diasDesdeUltimaVisita > 90) {
            pontuacao += 20;
            motivos.push(`Sem visita há ${diasDesdeUltimaVisita} dias`);
        } else if (diasDesdeUltimaVisita > 30) {
            pontuacao += 10;
            motivos.push(`Sem visita há ${diasDesdeUltimaVisita} dias`);
        }
    } else if (p.vezes_na_lista > 0) {
        // Esteve em lote mas sem data registrada
        pontuacao += 10;
        motivos.push('Data da última visita desconhecida');
    }

    return { pontuacao, motivos };
}

interface SugestaoLote {
    titulo: string;
    territorio: string | null;
    prioridade: 'alta' | 'media' | 'baixa';
    predios: PredioComPontuacao[];
    pontuacaoMedia: number;
}

function gerarSugestoes(
    pendentes: PredioPendenteRow[],
    tamLote: number,
    prediosEmLotesAtivos: Set<number>
): SugestaoLote[] {
    // Pontua e filtra prédios não estão em lotes ativos
    const pontuados: PredioComPontuacao[] = pendentes
        .filter(p => !prediosEmLotesAtivos.has(p.id))
        .map(p => {
            const { pontuacao, motivos } = calcularPontuacao(p);
            return { ...p, pontuacao, motivos };
        })
        .sort((a, b) => b.pontuacao - a.pontuacao);

    if (pontuados.length === 0) return [];

    // Agrupa por território
    const porTerritorio = new Map<string, PredioComPontuacao[]>();
    const semTerritorio: PredioComPontuacao[] = [];

    for (const p of pontuados) {
        const t = p.territorio?.trim() || '';
        if (t) {
            if (!porTerritorio.has(t)) porTerritorio.set(t, []);
            porTerritorio.get(t)!.push(p);
        } else {
            semTerritorio.push(p);
        }
    }

    const sugestoes: SugestaoLote[] = [];

    // Gera lotes por território
    for (const [territorio, lista] of porTerritorio.entries()) {
        // Divide em fatias de tamLote
        for (let i = 0; i < lista.length; i += tamLote) {
            const fatia = lista.slice(i, i + tamLote);
            const media = fatia.reduce((s, p) => s + p.pontuacao, 0) / fatia.length;
            const prioridade: 'alta' | 'media' | 'baixa' =
                media >= 40 ? 'alta' : media >= 20 ? 'media' : 'baixa';

            const num = Math.floor(i / tamLote) + 1;
            sugestoes.push({
                titulo: `Território ${territorio}${lista.length > tamLote ? ` — Parte ${num}` : ''}`,
                territorio,
                prioridade,
                predios: fatia,
                pontuacaoMedia: Math.round(media),
            });
        }
    }

    // Prédios sem território
    for (let i = 0; i < semTerritorio.length; i += tamLote) {
        const fatia = semTerritorio.slice(i, i + tamLote);
        const media = fatia.reduce((s, p) => s + p.pontuacao, 0) / fatia.length;
        const prioridade: 'alta' | 'media' | 'baixa' =
            media >= 40 ? 'alta' : media >= 20 ? 'media' : 'baixa';
        const num = Math.floor(i / tamLote) + 1;
        sugestoes.push({
            titulo: `Sem Território — Parte ${num}`,
            territorio: null,
            prioridade,
            predios: fatia,
            pontuacaoMedia: Math.round(media),
        });
    }

    // Ordena sugestões: alta → media → baixa, depois por pontuação média
    const ordemPrio = { alta: 0, media: 1, baixa: 2 };
    sugestoes.sort((a, b) =>
        ordemPrio[a.prioridade] - ordemPrio[b.prioridade] ||
        b.pontuacaoMedia - a.pontuacaoMedia
    );

    return sugestoes;
}

// ─────────────────────────────────────────
// Componentes
// ─────────────────────────────────────────

const PRIORIDADE_CONFIG = {
    alta: { label: 'Alta', class: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400' },
    media: { label: 'Média', class: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400' },
    baixa: { label: 'Baixa', class: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400' },
};

export default function Sugestoes() {
    const navigate = useNavigate();

    const { data: pendentes, isLoading: loadingPendentes } = usePrediosPendentes();
    const { data: estatisticas, isLoading: loadingStats } = useEstatisticasLotes();
    const createLote = useCreateLote();

    const [tamLote, setTamLote] = useState(6);
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
    const [criarDialog, setCriarDialog] = useState<{ sugestao: SugestaoLote; nome: string } | null>(null);

    const isLoading = loadingPendentes || loadingStats;

    // IDs dos prédios já em lotes ativos (para não repetir)
    // Não temos a lista de predio_ids por lote via hook, então deixamos vazio por ora
    const prediosEmLotesAtivos = useMemo(() => new Set<number>(), []);

    const sugestoes = useMemo(
        () => pendentes ? gerarSugestoes(pendentes, tamLote, prediosEmLotesAtivos) : [],
        [pendentes, tamLote, prediosEmLotesAtivos]
    );

    const totalPendentes = pendentes?.length ?? 0;
    const semVisita = pendentes?.filter(p => p.vezes_na_lista === 0).length ?? 0;
    const comPendencia = pendentes?.filter(p => p.tem_pendencia).length ?? 0;
    const lotesAtivos = estatisticas?.filter(e => !e.finalizado).length ?? 0;

    async function criarLoteDaSugestao() {
        if (!criarDialog) return;
        const lote = await createLote.mutateAsync({
            loteData: { nome: criarDialog.nome },
            predioIds: criarDialog.sugestao.predios.map(p => p.id),
        });
        setCriarDialog(null);
        navigate(`/predios/lotes/${lote.id}`);
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-3">
                    <Sparkles className="w-6 h-6 text-primary" />
                    Sugestões de Lotes
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    Prédios ranqueados por urgência e agrupados por território. Pontuação calculada por: nunca visitado, pendência em aberto e tempo sem visita.
                </p>
            </div>

            {/* Cards de contexto */}
            {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="glass-card rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold">{totalPendentes}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Prédios Pendentes</p>
                    </div>
                    <div className="glass-card rounded-xl p-4 text-center bg-amber-50 dark:bg-amber-900/10">
                        <p className="text-2xl font-bold text-amber-600">{semVisita}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Nunca Visitados</p>
                    </div>
                    <div className="glass-card rounded-xl p-4 text-center bg-red-50 dark:bg-red-900/10">
                        <p className="text-2xl font-bold text-red-600">{comPendencia}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Com Pendência</p>
                    </div>
                    <div className="glass-card rounded-xl p-4 text-center bg-primary/5">
                        <p className="text-2xl font-bold text-primary">{lotesAtivos}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Lotes Ativos</p>
                    </div>
                </div>
            )}

            {/* Controle de tamanho do lote */}
            <div className="glass-card rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium">Tamanho do lote sugerido</Label>
                    <span className="text-sm font-bold text-primary">{tamLote} prédios</span>
                </div>
                <Slider
                    value={[tamLote]}
                    min={3}
                    max={15}
                    step={1}
                    onValueChange={([v]) => setTamLote(v)}
                    className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>3</span>
                    <span>15</span>
                </div>
            </div>

            {/* Lista de sugestões */}
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
                </div>
            ) : sugestoes.length === 0 ? (
                <div className="glass-card rounded-xl p-10 text-center text-muted-foreground">
                    <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Nenhum prédio pendente encontrado</p>
                    <p className="text-sm mt-1">Todos os prédios parecem estar cobertos pelos lotes ativos.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {sugestoes.length} sugestão(ões) — do mais urgente ao menos urgente
                    </p>

                    {sugestoes.map((s, idx) => {
                        const isExpanded = expandedIdx === idx;
                        const config = PRIORIDADE_CONFIG[s.prioridade];
                        return (
                            <div key={idx} className="glass-card rounded-xl overflow-hidden border">
                                {/* Cabeçalho */}
                                <button
                                    className="w-full p-4 flex items-start gap-4 text-left hover:bg-muted/30 transition-colors"
                                    onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                                >
                                    {/* Número de ranking */}
                                    <div className={cn(
                                        'shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                                        idx === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                                    )}>
                                        {idx + 1}
                                    </div>

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
                                                {s.predios.length} prédios
                                            </Badge>
                                            <Badge variant="secondary" className="text-xs gap-1">
                                                <Star className="w-3 h-3" />
                                                Score {s.pontuacaoMedia}
                                            </Badge>
                                        </div>

                                        {/* Resumo dos motivos */}
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            {Array.from(new Set(s.predios.flatMap(p => p.motivos))).slice(0, 3).map((m, i) => (
                                                <span key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                                                    {m.includes('visita') ? <Clock className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                                    {m}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="shrink-0 mt-1">
                                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                                    </div>
                                </button>

                                {/* Detalhes expandidos */}
                                {isExpanded && (
                                    <div className="border-t px-4 pb-4 pt-3 bg-muted/20">
                                        <div className="space-y-2 mb-4">
                                            {s.predios.map((p, pi) => (
                                                <div key={p.id} className="flex items-start gap-3 text-sm">
                                                    <span className="text-xs text-muted-foreground w-5 pt-0.5 shrink-0">{pi + 1}.</span>
                                                    <div className="flex-1 min-w-0">
                                                        <span className="font-medium">{p.nome}</span>
                                                        {p.endereco && (
                                                            <span className="text-muted-foreground text-xs ml-2">{p.endereco}</span>
                                                        )}
                                                        <div className="flex flex-wrap gap-1.5 mt-0.5">
                                                            {p.motivos.map((m, mi) => (
                                                                <span key={mi} className="text-xs bg-background border rounded-full px-2 py-0.5 text-muted-foreground">
                                                                    {m}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <span className="text-xs font-semibold text-primary shrink-0">{p.pontuacao}pts</span>
                                                </div>
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

            {/* Dialog: Criar lote */}
            <Dialog open={!!criarDialog} onOpenChange={(o) => { if (!o) setCriarDialog(null); }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Criar Lote</DialogTitle>
                        <p className="text-sm text-muted-foreground">
                            {criarDialog?.sugestao.predios.length} prédios serão associados ao novo lote.
                        </p>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                            <Label>Nome do lote</Label>
                            <Input
                                value={criarDialog?.nome ?? ''}
                                onChange={(e) => criarDialog && setCriarDialog({ ...criarDialog, nome: e.target.value })}
                                placeholder="Ex: Território 3 — Urgente"
                                autoFocus
                                onKeyDown={(e) => { if (e.key === 'Enter') criarLoteDaSugestao(); }}
                            />
                        </div>
                        <div className="text-xs text-muted-foreground bg-muted rounded-lg p-2.5 space-y-0.5">
                            {criarDialog?.sugestao.predios.slice(0, 5).map(p => (
                                <p key={p.id}>· {p.nome}</p>
                            ))}
                            {(criarDialog?.sugestao.predios.length ?? 0) > 5 && (
                                <p className="text-muted-foreground">
                                    e mais {(criarDialog?.sugestao.predios.length ?? 0) - 5} prédio(s)...
                                </p>
                            )}
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
                            {createLote.isPending
                                ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Criando...</>
                                : 'Criar Lote'
                            }
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
