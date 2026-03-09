import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useEstatisticasLotes } from '@/hooks/predios/useLotes';
import { StatsCard } from '@/components/predios/StatsCard';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Clock, CheckCircle, ListChecks, Search, MapPin, CheckCircle2, Circle } from 'lucide-react';

export default function Dashboard() {
  const { data: lotesStats, isLoading } = useEstatisticasLotes();
  const [search, setSearch] = useState('');

  // Calculate totals from all active lots
  const totals = useMemo(() => {
    if (!lotesStats) return null;

    // Only count active batches that are not finalized
    const activeLots = lotesStats.filter(l => l.ativo && !l.finalizado);

    return activeLots.reduce((acc, curr) => ({
      lotes_ativos: acc.lotes_ativos + 1,
      pendentes: acc.pendentes + curr.pendentes,
      em_andamento: acc.em_andamento + curr.em_andamento,
      nao_iniciados: acc.nao_iniciados + curr.nao_iniciados,
      concluidos: acc.concluidos + curr.concluidos,
      total_predios: acc.total_predios + curr.total_predios,
      total_cartas: acc.total_cartas + curr.total_meta_cartas,
    }), {
      lotes_ativos: 0,
      pendentes: 0,
      em_andamento: 0,
      nao_iniciados: 0,
      concluidos: 0,
      total_predios: 0,
      total_cartas: 0
    });
  }, [lotesStats]);

  const filteredLots = useMemo(() => {
    if (!lotesStats) return [];
    if (!search) return lotesStats;
    return lotesStats.filter(l => l.lote_nome.toLowerCase().includes(search.toLowerCase()));
  }, [lotesStats, search]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral dos lotes de distribuição</p>
      </div>

      {/* Stats Cards based on Active Lots */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatsCard
          title="Lotes Ativos"
          value={totals?.lotes_ativos || 0}
          icon={ListChecks}
          variant="default"
        />
        <StatsCard
          title="Em Andamento"
          value={totals?.em_andamento || 0}
          icon={Clock}
          variant="warning"
        />
        <StatsCard
          title="Com Pendência"
          value={totals?.pendentes || 0}
          icon={AlertTriangle}
          variant="expired"
        />
        <StatsCard
          title="Não Iniciados"
          value={totals?.nao_iniciados || 0}
          icon={Circle}
          variant="default"
        />
        <StatsCard
          title="Concluídos"
          value={totals?.concluidos || 0}
          icon={CheckCircle2}
          variant="success"
        />
        <StatsCard
          title="Meta Cartas"
          value={totals?.total_cartas || 0}
          icon={CheckCircle}
          variant="default"
        />
      </div>

      {/* Lots Overview */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="font-semibold flex items-center gap-2">
            <ListChecks className="w-5 h-5" />
            Lotes Recentes
          </h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar lote..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {filteredLots.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {lotesStats?.length === 0 ? (
              <div>
                <p>Nenhum lote criado ainda.</p>
                <Link to="/predios/lotes" className="text-primary hover:underline">
                  Ver gerenciador de lotes
                </Link>
              </div>
            ) : (
              <p>Nenhum lote encontrado com este nome.</p>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {filteredLots.slice(0, 10).map((lote) => (
              <Link
                key={lote.lote_id}
                to={`/predios/lotes/${lote.lote_id}`}
                className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">{lote.lote_nome}</span>
                    {lote.finalizado ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">Finalizado</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">Ativo</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                    <span className="flex items-center gap-1">
                      Progresso: {lote.progresso_geral_pct}%
                    </span>
                    <span>
                      Prédios: {lote.concluidos}/{lote.total_predios}
                    </span>
                    <span>
                      Cartas: {lote.total_cartas_entregues}/{lote.total_meta_cartas}
                    </span>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${Math.min(lote.progresso_geral_pct, 100)}%` }}
                    />
                  </div>
                </div>
              </Link>
            ))}
            {filteredLots.length > 10 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Mostrando 10 de {filteredLots.length} lotes.
                <Link to="/predios/lotes" className="text-primary hover:underline ml-1">
                  Ver todos
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
