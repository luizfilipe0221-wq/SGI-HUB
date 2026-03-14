import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useEstatisticasLotes } from '@/hooks/predios/useLotes';
import { usePrediosPendentes } from '@/hooks/predios/usePredios';
import { supabase } from '@/integrations/supabase/client';
import { PredioPendenteRow } from '@/lib/predios/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Search, ListChecks, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// ─── Lógica de pontuação (mesma do AISugestoes) ───────────────────────────────
function pontuarPredio(p: PredioPendenteRow): number {
    let pts = 0;
    if (p.vezes_na_lista === 0) pts += 40;
    if (p.tem_pendencia) pts += 30;
    if (p.ultima_vez_em) {
        const dias = Math.floor((Date.now() - new Date(p.ultima_vez_em).getTime()) / 86400000);
        if (dias > 90) pts += 20;
        else if (dias > 30) pts += 10;
    } else if (p.vezes_na_lista > 0) {
        pts += 10;
    }
    return pts;
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function LotesList() {
    const queryClient = useQueryClient();
    const { data: lotes, isLoading } = useEstatisticasLotes();
    const { data: pendentes } = usePrediosPendentes();

    const [search, setSearch] = useState('');
    const [gerando, setGerando] = useState(false);
    const [confirmarGerar, setConfirmarGerar] = useState(false);

    const filteredLotes = lotes?.filter(lote =>
        lote.lote_nome.toLowerCase().includes(search.toLowerCase())
    ) || [];

    async function gerarListasAutomaticamente() {
        if (!pendentes || pendentes.length === 0) {
            toast.error('Nenhum prédio pendente encontrado para gerar listas.');
            return;
        }

        setConfirmarGerar(false);
        setGerando(true);

        try {
            // Pontua, ordena e pega os top 70 (10 listas × 7 prédios)
            const pontuados = [...pendentes]
                .map(p => ({ ...p, pts: pontuarPredio(p) }))
                .sort((a, b) => b.pts - a.pts)
                .slice(0, 70);

            const totalListas = Math.min(10, Math.ceil(pontuados.length / 7));
            let criadas = 0;

            for (let i = 0; i < totalListas; i++) {
                const grupo = pontuados.slice(i * 7, (i + 1) * 7);
                if (grupo.length === 0) break;

                // Território mais frequente do grupo
                const contagem: Record<string, number> = {};
                for (const p of grupo) {
                    if (p.territorio) contagem[p.territorio] = (contagem[p.territorio] ?? 0) + 1;
                }
                const territorioMaisFreq = Object.keys(contagem).sort((a, b) => contagem[b] - contagem[a])[0] ?? null;
                const nome = territorioMaisFreq ? `Lista ${i + 1} — T${territorioMaisFreq}` : `Lista ${i + 1}`;

                // Cria o lote direto no Supabase (sem usar o hook para não disparar toasts individuais)
                const { data: lote, error: loteError } = await supabase
                    .from('lotes')
                    .insert({ nome })
                    .select()
                    .single();

                if (loteError) throw loteError;

                const lotePredios = grupo.map(p => ({
                    lote_id: lote.id,
                    predio_id: Number(p.id),
                    meta_cartas: 1,
                    status: 'nao_iniciado' as const,
                }));

                const { error: lpError } = await supabase
                    .from('lote_predios')
                    .insert(lotePredios);

                if (lpError) throw lpError;

                criadas++;
            }

            // Invalida queries para atualizar a tela
            queryClient.invalidateQueries({ queryKey: ['lotes'] });
            queryClient.invalidateQueries({ queryKey: ['estatisticas_lotes'] });
            queryClient.invalidateQueries({ queryKey: ['predios_pendentes'] });

            toast.success(`${criadas} lista(s) gerada(s) com sucesso!`);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Erro desconhecido';
            toast.error('Erro ao gerar listas', { description: msg });
            console.error('Erro ao gerar listas:', err);
        } finally {
            setGerando(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Listas de Trabalho</h1>
                    <p className="text-muted-foreground">Gerencie as listas de prédios agrupadas por rota</p>
                </div>

                <div className="flex gap-2 flex-wrap">
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => setConfirmarGerar(true)}
                        disabled={gerando || isLoading}
                    >
                        {gerando
                            ? <><Loader2 className="w-4 h-4 animate-spin" />Gerando...</>
                            : <><Sparkles className="w-4 h-4" />Gerar 10 Listas Automáticas</>
                        }
                    </Button>
                    <Button asChild>
                        <Link to="/predios/lotes/novo">
                            <Plus className="w-4 h-4 mr-2" />
                            Nova Lista
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="glass-card rounded-xl p-4">
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar lista por nome..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
                    </div>
                ) : filteredLotes.length === 0 ? (
                    <div className="text-center py-12">
                        <ListChecks className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground">Nenhuma lista encontrada</h3>
                        <p className="text-muted-foreground mt-1">
                            {search
                                ? 'Tente buscar com outros termos.'
                                : 'Crie sua primeira lista ou use o botão "Gerar 10 Listas Automáticas".'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredLotes.map((lote) => (
                            <Link
                                key={lote.lote_id}
                                to={`/predios/lotes/${lote.lote_id}`}
                                className="group p-5 rounded-xl border bg-card hover:bg-muted/50 transition-colors flex flex-col h-full"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <h3 className="font-semibold text-lg line-clamp-1">{lote.lote_nome}</h3>
                                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium shrink-0 ml-2 ${lote.finalizado
                                        ? 'bg-secondary text-secondary-foreground'
                                        : 'bg-primary/10 text-primary'
                                        }`}>
                                        {lote.finalizado ? 'Finalizada' : 'Ativa'}
                                    </span>
                                </div>

                                <div className="space-y-3 flex-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Progresso</span>
                                        <span className="font-medium">{lote.progresso_geral_pct}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary"
                                            style={{ width: `${Math.min(lote.progresso_geral_pct, 100)}%` }}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-sm pt-2">
                                        <div>
                                            <span className="text-muted-foreground block text-xs">Prédios</span>
                                            <span className="font-medium">{lote.total_predios}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block text-xs">Concluídos</span>
                                            <span className="font-medium">{lote.concluidos}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
                                    {!lote.finalizado && lote.em_andamento > 0 && (
                                        <span className="text-amber-500 font-medium">Em andamento: {lote.em_andamento}</span>
                                    )}
                                    {lote.finalizado && (
                                        <span className="text-primary font-medium tracking-wide">Concluída</span>
                                    )}
                                    {!lote.finalizado && lote.em_andamento === 0 && (
                                        <span className="text-muted-foreground">Não iniciada</span>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Confirmação: Gerar automático */}
            <AlertDialog open={confirmarGerar} onOpenChange={setConfirmarGerar}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Gerar 10 Listas Automaticamente?</AlertDialogTitle>
                        <AlertDialogDescription>
                            O sistema vai selecionar os <strong>70 prédios mais urgentes</strong> (nunca visitados, com pendências e há mais tempo sem visita), dividir em <strong>10 listas de 7 prédios</strong> cada, agrupando por território e criar todas automaticamente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={gerarListasAutomaticamente}>
                            Gerar Listas
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
