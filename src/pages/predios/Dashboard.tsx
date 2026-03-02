import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDashboardStats } from '@/hooks/predios/useTerritories';
import { StatsCard } from '@/components/predios/StatsCard';
import { StatusBadge } from '@/components/predios/StatusBadge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Clock, CheckCircle, Building2, Search, MapPin, CheckCircle2, Circle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useDashboardStats();
  const [search, setSearch] = useState('');
  const [territoryFilter, setTerritoryFilter] = useState<string>('all');

  const filteredBuildings = stats?.buildings.filter(b => {
    const matchesSearch = search === '' || 
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.address.toLowerCase().includes(search.toLowerCase());
    const matchesTerritory = territoryFilter === 'all' || 
      b.territory_id === parseInt(territoryFilter);
    return matchesSearch && matchesTerritory;
  }) || [];

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
        <p className="text-muted-foreground">Visão geral dos prédios e vencimentos</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatsCard
          title="Vencidos"
          value={stats?.expired || 0}
          icon={AlertTriangle}
          variant="expired"
          href="/buildings?filter=overdue"
        />
        <StatsCard
          title="Vence em 7 dias"
          value={stats?.warning7 || 0}
          icon={Clock}
          variant="warning"
          href="/buildings?filter=due_7"
        />
        <StatsCard
          title="Vence em 15 dias"
          value={stats?.warning15 || 0}
          icon={Clock}
          variant="warning"
          href="/buildings?filter=due_15"
        />
        <StatsCard
          title="Em dia"
          value={stats?.onTime || 0}
          icon={CheckCircle}
          variant="success"
          href="/buildings?filter=ok"
        />
        <StatsCard
          title="Concluídos"
          value={stats?.completed || 0}
          icon={CheckCircle2}
          variant="default"
        />
        <StatsCard
          title="Não iniciados"
          value={stats?.notStarted || 0}
          icon={Circle}
          variant="default"
        />
      </div>

      {/* Filters */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou endereço..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={territoryFilter} onValueChange={setTerritoryFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Todos territórios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos territórios</SelectItem>
              {Array.from({ length: 31 }, (_, i) => i + 1).map(t => (
                <SelectItem key={t} value={t.toString()}>
                  Território {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Buildings List */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-semibold flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Prédios ({filteredBuildings.length})
          </h2>
        </div>

        {filteredBuildings.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {stats?.total === 0 ? (
              <div>
                <p>Nenhum prédio cadastrado ainda.</p>
                <Link to="/buildings/new" className="text-primary hover:underline">
                  Cadastrar primeiro prédio
                </Link>
              </div>
            ) : (
              <p>Nenhum prédio encontrado com os filtros aplicados.</p>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {filteredBuildings.slice(0, 20).map((building) => (
              <Link
                key={building.id}
                to={`/buildings/${building.id}`}
                className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">{building.name}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      T{building.territory_id}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{building.address}</p>
                  {building.last_letter_done_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Última carta: {format(new Date(building.last_letter_done_at), "dd/MM/yyyy", { locale: ptBR })}
                      {building.total_apartments > 0 && (
                        <span className="ml-2">
                          ({building.done_apartments}/{building.total_apartments} apts)
                        </span>
                      )}
                    </p>
                  )}
                  {!building.last_letter_done_at && building.last_letter_sent_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Última carta: {format(new Date(building.last_letter_sent_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  )}
                </div>
                <StatusBadge status={building.status} label={building.status_label} />
              </Link>
            ))}
            {filteredBuildings.length > 20 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Mostrando 20 de {filteredBuildings.length} prédios. 
                <Link to="/buildings" className="text-primary hover:underline ml-1">
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
