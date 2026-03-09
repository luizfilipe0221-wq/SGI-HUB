import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useEstatisticasLotes } from '@/hooks/predios/useLotes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, ListChecks } from 'lucide-react';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';

export default function LotesList() {
    const { data: lotes, isLoading } = useEstatisticasLotes();
    const [search, setSearch] = useState('');

    const filteredLotes = lotes?.filter(lote =>
        lote.lote_nome.toLowerCase().includes(search.toLowerCase())
    ) || [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Lotes de Trabalho</h1>
                    <p className="text-muted-foreground">Gerencie as rotinas de entrega agrupadas</p>
                </div>

                <Button asChild>
                    <Link to="/predios/lotes/novo">
                        <Plus className="w-4 h-4 mr-2" />
                        Novo Lote
                    </Link>
                </Button>
            </div>

            <div className="glass-card rounded-xl p-4">
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar lote por nome..."
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
                        <h3 className="text-lg font-medium text-foreground">Nenhum lote encontrado</h3>
                        <p className="text-muted-foreground mt-1">
                            {search ? 'Tente buscar com outros termos.' : 'Crie seu primeiro lote para começar.'}
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
                                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${lote.finalizado
                                        ? 'bg-secondary text-secondary-foreground'
                                        : 'bg-primary/10 text-primary'
                                        }`}>
                                        {lote.finalizado ? 'Finalizado' : 'Ativo'}
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
                                            <span className="text-muted-foreground block text-xs">Meta de Cartas</span>
                                            <span className="font-medium">{lote.total_meta_cartas}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
                                    {!lote.finalizado && lote.em_andamento > 0 && (
                                        <span className="text-amber-500 font-medium">Em andamento: {lote.em_andamento}</span>
                                    )}
                                    {lote.finalizado && (
                                        <span className="text-primary font-medium tracking-wide">
                                            Pronto
                                        </span>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
