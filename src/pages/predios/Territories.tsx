import { Link } from 'react-router-dom';
import { useTerritories } from '@/hooks/predios/useTerritories';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Building2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Territories() {
  const { data: territories, isLoading } = useTerritories();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-64 mt-2" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Always show 31 territories - use data from hook or generate placeholders
  const displayTerritories = territories && territories.length > 0 
    ? territories 
    : Array.from({ length: 31 }, (_, i) => ({
        id: i + 1,
        name: null,
        user_id: '',
        created_at: new Date().toISOString(),
        buildings_count: 0,
        expired_count: 0,
      }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Territórios</h1>
        <p className="text-muted-foreground">Visualize os 31 territórios e seus prédios</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {displayTerritories.map((territory, index) => (
          <Link
            key={territory.id}
            to={`/buildings?territory=${territory.id}`}
            className={cn(
              "glass-card rounded-xl p-4 cursor-pointer group",
              "transform transition-all duration-200 ease-out",
              "hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5",
              "animate-fade-in"
            )}
            style={{
              animationDelay: `${index * 30}ms`,
              animationFillMode: 'backwards'
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={cn(
                "w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center",
                "transition-all duration-200 ease-out",
                "group-hover:bg-primary/20 group-hover:scale-110"
              )}>
                <MapPin className={cn(
                  "w-5 h-5 text-primary",
                  "transition-transform duration-200",
                  "group-hover:scale-105"
                )} />
              </div>
              <span className="text-2xl font-bold text-foreground">{territory.id}</span>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Building2 className="w-4 h-4" />
                <span>{territory.buildings_count} prédio{territory.buildings_count !== 1 ? 's' : ''}</span>
              </div>
              
              {territory.expired_count > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-destructive">
                  <AlertTriangle className="w-4 h-4 animate-pulse" />
                  <span>{territory.expired_count} vencido{territory.expired_count !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
