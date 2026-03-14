import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { usePainelLote, useEstatisticasLote, useFinalizarLote, useDeleteLote, useMudarStatusLotePredio } from '@/hooks/predios/useLotes';
import { useEntregas, useRegistrarEntrega, useRemoverEntrega } from '@/hooks/predios/useEntregas';
import { supabase } from '@/integrations/supabase/client';
import { PainelLoteRow, Entrega } from '@/lib/predios/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, Building2, Mail, Pencil, Trash2, Flag, MapPin, ChevronDown, ChevronRight, Home } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
    nao_iniciado: 'Não Iniciado',
    em_andamento: 'Em Andamento',
    pendente: 'Pendente',
    concluido: 'Concluído',
};

const STATUS_COLORS: Record<string, string> = {
    nao_iniciado: 'bg-secondary text-secondary-foreground',
    em_andamento: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    pendente: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    concluido: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

/** Gera lista de apartamentos a partir de andares × aptos/andar */
function generateApartments(andares: string | null, aptosPorAndar: string | null, totalAptos: number): string[] {
    const floors = andares ? parseInt(andares) : 0;
    const perFloor = aptosPorAndar ? parseInt(aptosPorAndar) : 0;

    if (floors > 0 && perFloor > 0) {
        const apts: string[] = [];
        for (let f = 1; f <= floors; f++) {
            for (let u = 1; u <= perFloor; u++) {
                apts.push(`${f}${String(u).padStart(2, '0')}`);
            }
        }
        return apts;
    }

    // Fallback: numera sequencialmente pelo total_aptos
    if (totalAptos > 0 && totalAptos <= 300) {
        return Array.from({ length: totalAptos }, (_, i) => String(i + 1));
    }

    return [];
}

// ─────────────────────────────────────────
// Sub-componente: Painel de apartamentos
// ─────────────────────────────────────────
interface ApartmentPanelProps {
    predio: PainelLoteRow;
    isLoteFinalizado: boolean;
}

function ApartmentPanel({ predio, isLoteFinalizado }: ApartmentPanelProps) {
    const { data: entregas, isLoading } = useEntregas(predio.lote_predio_id);
    const registrar = useRegistrarEntrega();
    const remover = useRemoverEntrega();
    const mudarStatus = useMudarStatusLotePredio();

    const apartments = generateApartments(predio.andares, predio.aptos_por_andar, predio.total_aptos);

    if (apartments.length === 0) {
        return (
            <div className="px-4 pb-3 pt-1 bg-muted/20 border-t text-xs text-muted-foreground">
                Prédio sem configuração de andares/aptos. Edite o prédio para definir andares e apartamentos por andar.
            </div>
        );
    }

    const entregaByApt = new Map<string, Entrega>(entregas?.map(e => [e.apartamento, e]) ?? []);
    const deliveredCount = entregas?.filter(e => e.entregue).length ?? 0;
    const isBusy = registrar.isPending || remover.isPending;

    async function toggleApt(apt: string) {
        if (isLoteFinalizado || isBusy) return;

        const existing = entregaByApt.get(apt);

        if (existing?.entregue) {
            // Remove entrega
            await remover.mutateAsync(existing.id);
            // Se estava concluído, volta para em_andamento
            if (predio.status === 'concluido') {
                mudarStatus.mutate({ id: predio.lote_predio_id, status: 'em_andamento' });
            }
        } else {
            // Registra entrega
            await registrar.mutateAsync({
                lote_predio_id: predio.lote_predio_id,
                apartamento: apt,
                entregue: true,
                observacao: null,
            });
            // Auto-status: nao_iniciado → em_andamento
            if (predio.status === 'nao_iniciado') {
                mudarStatus.mutate({ id: predio.lote_predio_id, status: 'em_andamento' });
            }
            // Auto-status: todos feitos → concluido
            const newDeliveredCount = deliveredCount + 1;
            if (newDeliveredCount >= apartments.length && predio.status !== 'concluido') {
                mudarStatus.mutate({ id: predio.lote_predio_id, status: 'concluido' });
            }
        }
    }

    return (
        <div className="px-4 pb-4 pt-2 bg-muted/20 border-t">
            {isLoading ? (
                <Skeleton className="h-16 w-full rounded-lg" />
            ) : (
                <>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Home className="w-3 h-3" />
                            {deliveredCount} / {apartments.length} apartamentos visitados
                        </span>
                        <div className="h-1.5 w-24 bg-secondary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 transition-all"
                                style={{ width: `${Math.min((deliveredCount / apartments.length) * 100, 100)}%` }}
                            />
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {apartments.map(apt => {
                            const isDelivered = entregaByApt.get(apt)?.entregue ?? false;
                            return (
                                <button
                                    key={apt}
                                    onClick={() => toggleApt(apt)}
                                    disabled={isLoteFinalizado || isBusy}
                                    title={isDelivered ? `Apto ${apt} — visitado (clique para desmarcar)` : `Apto ${apt} — pendente`}
                                    className={cn(
                                        'h-8 min-w-[2.75rem] px-1.5 rounded-lg text-xs font-medium transition-all border select-none',
                                        isDelivered
                                            ? 'bg-emerald-100 border-emerald-300 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-400'
                                            : 'bg-background border-border text-muted-foreground hover:border-primary hover:text-foreground',
                                        isLoteFinalizado && 'opacity-60 cursor-default',
                                    )}
                                >
                                    {apt}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

// ─────────────────────────────────────────
// Componente principal: LoteDetail
// ─────────────────────────────────────────
export default function LoteDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: stats, isLoading: loadingStats } = useEstatisticasLote(id!);
    const { data: predios, isLoading: loadingPredios } = usePainelLote(id!);
    const finalizarLote = useFinalizarLote();
    const deleteLote = useDeleteLote();
    const mudarStatus = useMudarStatusLotePredio();

    // Estado para linha expandida de apartamentos
    const [expandedId, setExpandedId] = useState<number | null>(null);

    // Estado para edição de cartas
    const [editingLotePredioId, setEditingLotePredioId] = useState<number | null>(null);
    const [editingPredioPredio, setEditingPredioPredio] = useState<PainelLoteRow | null>(null);
    const [cartasInput, setCartasInput] = useState('');
    const [savingCartas, setSavingCartas] = useState(false);

    // Dialogs de confirmação
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [confirmFinalizar, setConfirmFinalizar] = useState(false);

    const isLoading = loadingStats || loadingPredios;

    async function salvarCartas() {
        if (editingLotePredioId === null) return;
        const count = parseInt(cartasInput);
        if (isNaN(count) || count < 0) {
            toast.error('Número de cartas inválido');
            return;
        }
        setSavingCartas(true);
        const { error } = await supabase
            .from('lote_predios')
            .update({ cartas_entregues: count })
            .eq('id', editingLotePredioId);

        if (error) {
            toast.error('Erro ao salvar: ' + error.message);
        } else {
            toast.success('Cartas atualizadas');
            queryClient.invalidateQueries({ queryKey: ['painel_lote', Number(id)] });
            queryClient.invalidateQueries({ queryKey: ['estatisticas_lotes'] });
            queryClient.invalidateQueries({ queryKey: ['estatisticas_lotes', Number(id)] });
            setEditingLotePredioId(null);
            setEditingPredioPredio(null);
        }
        setSavingCartas(false);
    }

    function openEditCartas(predio: PainelLoteRow) {
        setEditingLotePredioId(predio.lote_predio_id);
        setEditingPredioPredio(predio);
        setCartasInput(String(predio.cartas_entregues));
    }

    if (isLoading) {
        return (
            <div className="space-y-6 max-w-5xl mx-auto">
                <Skeleton className="h-10 w-48" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
                </div>
                <Skeleton className="h-64 rounded-xl" />
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="text-center py-12">
                <h2 className="text-xl font-semibold mb-2">Lote não encontrado</h2>
                <Button onClick={() => navigate('/predios/lotes')} variant="outline">
                    Voltar para Lotes
                </Button>
            </div>
        );
    }

    const pct = Math.min(stats.progresso_geral_pct, 100);

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-start gap-4 flex-wrap">
                <Button variant="ghost" size="icon" onClick={() => navigate('/predios/lotes')} className="mt-1">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl font-bold truncate">{stats.lote_nome}</h1>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium shrink-0 ${stats.finalizado ? 'bg-secondary text-secondary-foreground' : 'bg-primary/10 text-primary'}`}>
                            {stats.finalizado ? 'Finalizado' : 'Ativo'}
                        </span>
                    </div>
                    <div className="flex items-center gap-5 mt-2 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1.5">
                            <Building2 className="w-4 h-4" />
                            {stats.total_predios} prédios
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Mail className="w-4 h-4" />
                            {stats.total_cartas_entregues} / {stats.total_meta_cartas} cartas entregues
                        </span>
                    </div>
                </div>
                {!stats.finalizado && (
                    <div className="flex gap-2 shrink-0">
                        <Button
                            variant="default"
                            onClick={() => setConfirmFinalizar(true)}
                            className="gap-2"
                        >
                            <Flag className="w-4 h-4" />
                            Finalizar Lote
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setConfirmDelete(true)}
                            title="Excluir lote"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Progress Overview */}
            <div className="glass-card rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">Progresso Geral</span>
                    <span className="text-muted-foreground font-medium">{pct}%</span>
                </div>
                <Progress value={pct} className="h-3" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                    <div className="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                        <p className="text-2xl font-bold text-emerald-600">{stats.concluidos}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">Concluídos</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                        <p className="text-2xl font-bold text-amber-500">{stats.em_andamento}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">Em Andamento</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                        <p className="text-2xl font-bold text-red-500">{stats.pendentes}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">Pendentes</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-secondary">
                        <p className="text-2xl font-bold">{stats.nao_iniciados}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">Não Iniciados</p>
                    </div>
                </div>
            </div>

            {/* Prédios do Lote */}
            <div className="glass-card rounded-xl overflow-hidden">
                <div className="p-4 border-b">
                    <h2 className="font-semibold flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        Prédios do Lote
                        <Badge variant="secondary" className="ml-1">{predios?.length || 0}</Badge>
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                        Clique em um prédio para expandir e registrar visitas por apartamento.
                    </p>
                </div>

                {!predios || predios.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        Nenhum prédio associado a este lote.
                    </div>
                ) : (
                    <div className="divide-y">
                        {predios.map((p) => {
                            const isExpanded = expandedId === p.lote_predio_id;
                            return (
                                <div key={p.lote_predio_id} className="flex flex-col">
                                    {/* Linha do prédio */}
                                    <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                                        {/* Botão expand */}
                                        <button
                                            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                                            onClick={() => setExpandedId(isExpanded ? null : p.lote_predio_id)}
                                            title={isExpanded ? 'Recolher apartamentos' : 'Expandir apartamentos'}
                                        >
                                            {isExpanded
                                                ? <ChevronDown className="w-4 h-4" />
                                                : <ChevronRight className="w-4 h-4" />
                                            }
                                        </button>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <button
                                                    className="font-medium text-left hover:underline"
                                                    onClick={() => setExpandedId(isExpanded ? null : p.lote_predio_id)}
                                                >
                                                    {p.predio_nome}
                                                </button>
                                                {p.territorio && (
                                                    <Badge variant="secondary" className="text-xs font-normal py-0 h-5">
                                                        <MapPin className="w-3 h-3 mr-1" />
                                                        T{p.territorio}
                                                    </Badge>
                                                )}
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status] || 'bg-secondary text-secondary-foreground'}`}>
                                                    {STATUS_LABELS[p.status] || p.status}
                                                </span>
                                                {p.excedeu_meta && (
                                                    <Badge className="bg-amber-100 text-amber-700 border-0 text-xs py-0 h-5">
                                                        Excedeu meta
                                                    </Badge>
                                                )}
                                                {p.total_aptos > 0 && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {p.total_aptos} aptos
                                                    </span>
                                                )}
                                            </div>
                                            {p.endereco && (
                                                <p className="text-xs text-muted-foreground truncate mb-2">{p.endereco}</p>
                                            )}
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden max-w-xs">
                                                    <div
                                                        className="h-full bg-primary transition-all"
                                                        style={{ width: `${Math.min(p.progresso_pct, 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                    {p.cartas_entregues} / {p.meta_cartas} cartas
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <Select
                                                value={p.status}
                                                onValueChange={(val) => mudarStatus.mutate({
                                                    id: p.lote_predio_id,
                                                    status: val as 'nao_iniciado' | 'em_andamento' | 'concluido' | 'pendente',
                                                })}
                                                disabled={mudarStatus.isPending || stats.finalizado}
                                            >
                                                <SelectTrigger className="h-8 w-36 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="nao_iniciado">Não Iniciado</SelectItem>
                                                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                                                    <SelectItem value="pendente">Pendente</SelectItem>
                                                    <SelectItem value="concluido">Concluído</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                title="Atualizar cartas entregues"
                                                onClick={() => openEditCartas(p)}
                                                disabled={stats.finalizado}
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Painel de apartamentos (expandível) */}
                                    {isExpanded && (
                                        <ApartmentPanel
                                            predio={p}
                                            isLoteFinalizado={stats.finalizado}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Dialog: Editar cartas entregues */}
            <Dialog open={editingLotePredioId !== null} onOpenChange={(o) => { if (!o) { setEditingLotePredioId(null); setEditingPredioPredio(null); } }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Cartas Entregues</DialogTitle>
                        {editingPredioPredio && (
                            <p className="text-sm text-muted-foreground">{editingPredioPredio.predio_nome}</p>
                        )}
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                            <Label>Quantidade de cartas entregues</Label>
                            <Input
                                type="number"
                                min={0}
                                value={cartasInput}
                                onChange={(e) => setCartasInput(e.target.value)}
                                placeholder="Ex: 42"
                                autoFocus
                                onKeyDown={(e) => { if (e.key === 'Enter') salvarCartas(); }}
                            />
                            {editingPredioPredio && (
                                <p className="text-xs text-muted-foreground">
                                    Meta: {editingPredioPredio.meta_cartas} cartas · Total aptos: {editingPredioPredio.total_aptos}
                                </p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setEditingLotePredioId(null); setEditingPredioPredio(null); }} disabled={savingCartas}>
                            Cancelar
                        </Button>
                        <Button onClick={salvarCartas} disabled={savingCartas}>
                            {savingCartas ? 'Salvando...' : 'Salvar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirm Finalizar */}
            <AlertDialog open={confirmFinalizar} onOpenChange={setConfirmFinalizar}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Finalizar lote "{stats.lote_nome}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                            O lote será marcado como finalizado. Ainda poderá ser consultado, mas não serão registradas novas entregas.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { finalizarLote.mutate(id!); setConfirmFinalizar(false); }}>
                            Finalizar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Confirm Delete */}
            <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir lote "{stats.lote_nome}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O lote e todos os registros de entrega serão excluídos permanentemente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                                deleteLote.mutate(id!);
                                setConfirmDelete(false);
                                navigate('/predios/lotes');
                            }}
                        >
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
