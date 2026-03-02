import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useBuildings, useDeleteBuilding } from '@/hooks/predios/useBuildings';
import { useExport } from '@/hooks/predios/useExport';
import { usePermissions } from '@/hooks/predios/usePermissions';
import { PermissionGate } from '@/components/predios/PermissionGate';
import { PERMISSIONS } from '@/lib/predios/auth-types';
import { StatusBadge } from '@/components/predios/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, MapPin, Building2, Trash2, Edit, MoreVertical, Download, X } from 'lucide-react';
import { format, addDays, isAfter, isBefore, isToday, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getProgressPercentage } from '@/lib/predios/building-utils';
import { BuildingWithStatus } from '@/lib/predios/types';

// Filter types from dashboard cards
type DashboardFilter = 'overdue' | 'due_7' | 'due_15' | 'ok' | null;

const FILTER_LABELS: Record<string, string> = {
  overdue: 'Vencidos',
  due_7: 'Vence em 7 dias',
  due_15: 'Vence em 15 dias',
  ok: 'Em dia',
};

// Helper function to filter buildings by dashboard status
function filterBuildingsByDashboardStatus(buildings: BuildingWithStatus[], filter: DashboardFilter): BuildingWithStatus[] {
  if (!filter) return buildings;
  
  const today = startOfDay(new Date());
  const in7Days = addDays(today, 7);
  const in15Days = addDays(today, 15);
  
  return buildings.filter(building => {
    // Calculate due date based on last_letter_sent_at + cycle_days
    const cycleDays = building.custom_cycle_days || building.default_cycle_days || 30;
    const lastLetter = building.last_letter_sent_at 
      ? startOfDay(new Date(building.last_letter_sent_at))
      : null;
    
    // If no letter was sent, use created_at as base
    const baseDate = lastLetter || startOfDay(new Date(building.created_at));
    const dueDate = addDays(baseDate, cycleDays);
    
    switch (filter) {
      case 'overdue':
        // Expired: due_date < today
        return isBefore(dueDate, today);
      case 'due_7':
        // Due in 7 days: today <= due_date <= today + 7 days
        return (isToday(dueDate) || isAfter(dueDate, today)) && 
               (isBefore(dueDate, in7Days) || dueDate.getTime() === in7Days.getTime());
      case 'due_15':
        // Due in 15 days: today <= due_date <= today + 15 days (but not in 7 days range)
        return isAfter(dueDate, in7Days) && 
               (isBefore(dueDate, in15Days) || dueDate.getTime() === in15Days.getTime());
      case 'ok':
        // On time: due_date > today + 15 days
        return isAfter(dueDate, in15Days);
      default:
        return true;
    }
  });
}

export default function Buildings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTerritory = searchParams.get('territory') || 'all';
  const initialFilter = searchParams.get('filter') as DashboardFilter;
  
  const [search, setSearch] = useState('');
  const [territoryFilter, setTerritoryFilter] = useState(initialTerritory);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dashboardFilter, setDashboardFilter] = useState<DashboardFilter>(initialFilter);
  
  // Sync dashboardFilter with URL
  useEffect(() => {
    const urlFilter = searchParams.get('filter') as DashboardFilter;
    if (urlFilter !== dashboardFilter) {
      setDashboardFilter(urlFilter);
    }
  }, [searchParams]);
  
  const { data: buildings, isLoading } = useBuildings(
    territoryFilter !== 'all' ? parseInt(territoryFilter) : undefined
  );
  const deleteBuilding = useDeleteBuilding();
  const { exportBuildings } = useExport();
  const { hasPermission } = usePermissions();

  const filteredBuildings = useMemo(() => {
    let result = buildings || [];
    
    // Apply dashboard filter first (from URL query param)
    if (dashboardFilter) {
      result = filterBuildingsByDashboardStatus(result, dashboardFilter);
    }
    
    // Then apply search and status filters
    result = result.filter(b => {
      const matchesSearch = search === '' ||
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.address.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
    
    return result;
  }, [buildings, dashboardFilter, search, statusFilter]);

  const handleTerritoryChange = (value: string) => {
    setTerritoryFilter(value);
    const newParams = new URLSearchParams(searchParams);
    if (value === 'all') {
      newParams.delete('territory');
    } else {
      newParams.set('territory', value);
    }
    setSearchParams(newParams);
  };

  const clearDashboardFilter = () => {
    setDashboardFilter(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('filter');
    setSearchParams(newParams);
  };

  const handleExport = (format: 'csv' | 'xlsx') => {
    exportBuildings({
      format,
      territoryId: territoryFilter !== 'all' ? parseInt(territoryFilter) : undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-14 rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Prédios</h1>
          <p className="text-muted-foreground">
            {buildings?.length || 0} prédio{(buildings?.length || 0) !== 1 ? 's' : ''} cadastrado{(buildings?.length || 0) !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <PermissionGate permission={PERMISSIONS.EXPORT_DATA}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  Exportar CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                  Exportar Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </PermissionGate>
          <PermissionGate permission={PERMISSIONS.CREATE_PREDIOS}>
            <Button asChild>
              <Link to="/buildings/new">
                <Plus className="w-4 h-4 mr-2" />
                Novo Prédio
              </Link>
            </Button>
          </PermissionGate>
        </div>
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
          <Select value={territoryFilter} onValueChange={handleTerritoryChange}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Território" />
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="expired">Vencidos</SelectItem>
              <SelectItem value="warning">Vencendo</SelectItem>
              <SelectItem value="success">Em dia</SelectItem>
              <SelectItem value="completed">Concluídos</SelectItem>
              <SelectItem value="not_started">Não iniciados</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Active Dashboard Filter Indicator */}
        {dashboardFilter && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
            <span className="text-sm text-muted-foreground">Filtro do Dashboard:</span>
            <Badge variant="secondary" className="gap-1.5 pr-1">
              {FILTER_LABELS[dashboardFilter]}
              <button
                onClick={clearDashboardFilter}
                className="ml-1 rounded-full hover:bg-muted p-0.5 transition-colors"
                aria-label="Remover filtro"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          </div>
        )}
      </div>

      {/* Buildings List */}
      {filteredBuildings.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Nenhum prédio encontrado</h3>
          <p className="text-muted-foreground mb-4">
            {buildings?.length === 0 
              ? 'Comece cadastrando seu primeiro prédio.' 
              : 'Tente ajustar os filtros de busca.'}
          </p>
          {buildings?.length === 0 && (
            <Button asChild>
              <Link to="/buildings/new">
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar Prédio
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBuildings.map((building) => {
            const progress = getProgressPercentage(building);

            return (
              <div
                key={building.id}
                className="glass-card rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link 
                        to={`/buildings/${building.id}`}
                        className="font-semibold hover:text-primary transition-colors truncate"
                      >
                        {building.name}
                      </Link>
                      <span className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
                        <MapPin className="w-3 h-3" />
                        T{building.territory_id}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mb-2">{building.address}</p>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{building.floors_count} andar{building.floors_count !== 1 ? 'es' : ''}</span>
                      {building.last_letter_sent_at && (
                        <span>
                          Última carta: {format(new Date(building.last_letter_sent_at), "dd/MM/yy", { locale: ptBR })}
                        </span>
                      )}
                      {progress > 0 && (
                        <span>Progresso: {Math.round(progress)}%</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={building.status} label={building.status_label} />
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/buildings/${building.id}`}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </Link>
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onSelect={(e) => e.preventDefault()}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir prédio?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O prédio "{building.name}" e todo seu histórico serão excluídos permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteBuilding.mutate(building.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
