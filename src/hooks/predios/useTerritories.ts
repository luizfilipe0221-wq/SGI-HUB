import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabasePredios as supabase } from '@/integrations/supabase/predios';
import { TerritoryWithStats, Building } from '@/lib/predios/types';
import { calculateBuildingStatus, sortBuildingsByPriority } from '@/lib/predios/building-utils';
import { fetchApartmentStatsForBuildings } from '@/lib/predios/apartment-stats';
import { useAuth } from './useAuth';

/** Query defaults — avoid excessive re-fetches */
const QUERY_DEFAULTS = {
  staleTime: 60_000,
  refetchOnWindowFocus: false,
} as const;

export function useTerritories() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Real-time: invalidate territories when buildings or territories change
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('territories-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'territories' }, () => {
        queryClient.invalidateQueries({ queryKey: ['territories'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'buildings' }, () => {
        queryClient.invalidateQueries({ queryKey: ['territories'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  return useQuery({
    queryKey: ['territories'],
    enabled: !!user,
    ...QUERY_DEFAULTS,
    queryFn: async (): Promise<TerritoryWithStats[]> => {
      const [{ data: territories, error: terrError }, { data: buildings, error: buildError }] =
        await Promise.all([
          supabase.from('territories').select('*').order('id'),
          supabase.from('buildings').select('*'),
        ]);

      if (terrError) throw terrError;
      if (buildError) throw buildError;

      const buildingsList = (buildings || []) as Building[];
      const buildingIds = buildingsList.map(b => b.id);

      const apartmentStats = await fetchApartmentStatsForBuildings(buildingIds);

      const buildingsWithStatus = buildingsList.map(b =>
        calculateBuildingStatus(b, apartmentStats.get(b.id))
      );

      // Build territory map from DB data
      const territoryMap = new Map<number, TerritoryWithStats>();

      (territories || []).forEach(territory => {
        const territoryBuildings = buildingsWithStatus.filter(b => b.territory_id === territory.id);
        territoryMap.set(territory.id, {
          ...territory,
          buildings_count: territoryBuildings.length,
          expired_count: territoryBuildings.filter(b => b.status === 'expired').length,
        });
      });

      // Always return all 31 territories, filling in missing ones
      const allTerritories: TerritoryWithStats[] = [];
      for (let i = 1; i <= 31; i++) {
        if (territoryMap.has(i)) {
          allTerritories.push(territoryMap.get(i)!);
        } else {
          const territoryBuildings = buildingsWithStatus.filter(b => b.territory_id === i);
          allTerritories.push({
            id: i,
            name: null,
            user_id: user?.id || '',
            created_at: new Date().toISOString(),
            buildings_count: territoryBuildings.length,
            expired_count: territoryBuildings.filter(b => b.status === 'expired').length,
          });
        }
      }

      return allTerritories;
    },
  });
}

export function useDashboardStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dashboard-stats'],
    enabled: !!user,
    ...QUERY_DEFAULTS,
    queryFn: async () => {
      const { data: buildings, error } = await supabase
        .from('buildings')
        .select('*');

      if (error) throw error;

      const buildingsList = (buildings || []) as Building[];
      const buildingIds = buildingsList.map(b => b.id);

      const apartmentStats = await fetchApartmentStatsForBuildings(buildingIds);

      const buildingsWithStatus = buildingsList.map(b =>
        calculateBuildingStatus(b, apartmentStats.get(b.id))
      );

      const sortedBuildings = sortBuildingsByPriority(buildingsWithStatus);

      const expired = sortedBuildings.filter(b => b.status === 'expired').length;
      const warning7 = sortedBuildings.filter(b => b.status === 'warning' && b.days_until_due <= 7).length;
      const warning15 = sortedBuildings.filter(b =>
        (b.status === 'warning') ||
        (b.status === 'success' && b.days_until_due <= 15)
      ).length;
      const onTime = sortedBuildings.filter(b =>
        b.status === 'success' && b.days_until_due > 15
      ).length;
      const completed = sortedBuildings.filter(b => b.status === 'completed').length;
      const notStarted = sortedBuildings.filter(b => b.status === 'not_started').length;

      return {
        total: sortedBuildings.length,
        expired,
        warning7,
        warning15,
        onTime,
        completed,
        notStarted,
        buildings: sortedBuildings,
      };
    },
  });
}
