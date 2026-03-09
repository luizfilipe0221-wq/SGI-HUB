import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { usePredios, useDeletePredio } from '@/hooks/predios/usePredios';
import { useExport } from '@/hooks/predios/useExport';
import { usePermissions } from '@/hooks/predios/usePermissions';
import { PermissionGate } from '@/components/predios/PermissionGate';
import { PERMISSIONS } from '@/lib/predios/auth-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, MapPin, Building2, Trash2, Edit, MoreVertical, Download, X } from 'lucide-react';
import { Predio } from '@/lib/predios/types';

export default function Buildings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTerritory = searchParams.get('territory') || 'all';

  const [search, setSearch] = useState('');
  const [territoryFilter, setTerritoryFilter] = useState(initialTerritory);

  const { data: buildings, isLoading } = usePredios();
  const deleteBuilding = useDeletePredio();
  const { exportBuildings } = useExport();
  const { hasPermission } = usePermissions();

  const filteredBuildings = useMemo(() => {
    let result = buildings || [];

    // Filter by territory
    if (territoryFilter !== 'all') {
      result = result.filter(b => b.territorio === territoryFilter);
    }

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(b =>
        b.nome.toLowerCase().includes(searchLower) ||
        (b.endereco && b.endereco.toLowerCase().includes(searchLower))
      );
    }

    return result;
  }, [buildings, search, territoryFilter]);

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

  const clearFilters = () => {
    setSearch('');
    setTerritoryFilter('all');
    setSearchParams(new URLSearchParams());
  };

  const handleExport = (format: 'csv' | 'xlsx') => {
    exportBuildings({
      format,
      territoryId: territoryFilter !== 'all' ? parseInt(territoryFilter) : undefined,
    });
  };

  // Get unique territories for the filter dropdown
  const uniqueTerritories = useMemo(() => {
    if (!buildings) return [];
    const territories = buildings.map(b => b.territorio).filter(Boolean) as string[];
    return Array.from(new Set(territories)).sort((a, b) => {
      // Try numeric sort first
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [buildings]);

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
            {filteredBuildings.length} prédio{filteredBuildings.length !== 1 ? 's' : ''} encontrado{filteredBuildings.length !== 1 ? 's' : ''}
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
              <Link to="/predios/buildings/new">
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
              {uniqueTerritories.map(t => (
                <SelectItem key={t} value={t}>
                  Território {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(search || territoryFilter !== 'all') && (
            <Button variant="ghost" onClick={clearFilters} className="px-3">
              <X className="w-4 h-4 mr-2" />
              Limpar
            </Button>
          )}
        </div>
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
              <Link to="/predios/buildings/new">
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar Prédio
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBuildings.map((building) => (
            <div
              key={building.id}
              className="glass-card rounded-xl p-4 hover:shadow-md transition-shadow relative"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      to={`/predios/buildings/${building.id}`}
                      className="font-semibold hover:text-primary transition-colors truncate"
                    >
                      {building.nome}
                    </Link>
                    {building.territorio && (
                      <Badge variant="secondary" className="font-normal text-xs py-0 h-5">
                        <MapPin className="w-3 h-3 mr-1" />
                        T{building.territorio}
                      </Badge>
                    )}
                    {!building.ativo && (
                      <Badge variant="destructive" className="font-normal text-xs py-0 h-5">
                        Inativo
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate mb-2">
                    {building.endereco || 'Sem endereço cadastrado'}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      {building.total_aptos} aptos ({building.andares} andares)
                    </span>
                    {building.aptos_por_andar && (
                      <span>{building.aptos_por_andar} por andar</span>
                    )}
                    {building.observacoes && (
                      <span className="truncate max-w-[200px]" title={building.observacoes}>
                        Obs: {building.observacoes}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/predios/buildings/${building.id}`}>
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
                              Esta ação não pode ser desfeita. O prédio "{building.nome}" e todo seu histórico serão excluídos permanentemente.
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
          ))}
        </div>
      )}
    </div>
  );
}
