import { useQuery } from '@tanstack/react-query';
import { supabasePredios as supabase } from '@/integrations/supabase/predios';
import { TerritoryWithStats, Building } from '@/lib/predios/types';
import { calculateBuildingStatus, ApartmentStats, sortBuildingsByPriority } from '@/lib/predios/building-utils';
import { useAuth } from './useAuth';

interface ApartmentAggregation {
  building_id: string;
  total: number;
  done: number;
  last_done_at: string | null;
}

/**
 * Fetch apartment stats for all buildings in a single query.
 * Returns a map of building_id -> ApartmentStats
 */
async function fetchApartmentStatsForBuildings(buildingIds: string[]): Promise<Map<string, ApartmentStats>> {
  if (buildingIds.length === 0) return new Map();
  
  // Fetch all apartments for the given buildings
  const { data, error } = await supabase
    .from('building_apartments')
    .select('building_id, letter_done, letter_done_at')
    .in('building_id', buildingIds);
  
  if (error) throw error;
  
  // Aggregate stats per building
  const statsMap = new Map<string, ApartmentStats>();
  
  // Initialize all buildings with zero stats
  buildingIds.forEach(id => {
    statsMap.set(id, { total: 0, done: 0, lastDoneAt: null });
  });
  
  // Aggregate apartment data
  (data || []).forEach(apt => {
    const current = statsMap.get(apt.building_id)!;
    current.total++;
    
    if (apt.letter_done) {
      current.done++;
      
      // Track latest letter_done_at
      if (apt.letter_done_at) {
        if (!current.lastDoneAt || apt.letter_done_at > current.lastDoneAt) {
          current.lastDoneAt = apt.letter_done_at;
        }
      }
    }
  });
  
  return statsMap;
}

export function useTerritories() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['territories'],
    queryFn: async (): Promise<TerritoryWithStats[]> => {
      // Get territories from database
      const { data: territories, error: terrError } = await supabase
        .from('territories')
        .select('*')
        .order('id');

      if (terrError) throw terrError;

      // Get all buildings
      const { data: buildings, error: buildError } = await supabase
        .from('buildings')
        .select('*');

      if (buildError) throw buildError;

      const buildingsList = (buildings || []) as Building[];
      const buildingIds = buildingsList.map(b => b.id);
      
      // Fetch apartment stats for all buildings
      const apartmentStats = await fetchApartmentStatsForBuildings(buildingIds);

      // Calculate status for each building using apartment data
      const buildingsWithStatus = buildingsList.map(b => 
        calculateBuildingStatus(b, apartmentStats.get(b.id))
      );

      // Create a map of existing territories
      const territoryMap = new Map<number, TerritoryWithStats>();
      
      // Initialize with database territories
      (territories || []).forEach(territory => {
        const territoryBuildings = buildingsWithStatus.filter(
          b => b.territory_id === territory.id
        );
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
          // Create a placeholder territory for ones not in database
          const territoryBuildings = buildingsWithStatus.filter(
            b => b.territory_id === i
          );
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
    enabled: !!user,
  });
}

export function useDashboardStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      // Get all buildings
      const { data: buildings, error } = await supabase
        .from('buildings')
        .select('*');

      if (error) throw error;

      const buildingsList = (buildings || []) as Building[];
      const buildingIds = buildingsList.map(b => b.id);
      
      // Fetch apartment stats for all buildings
      const apartmentStats = await fetchApartmentStatsForBuildings(buildingIds);

      // Calculate status for each building using apartment data
      const buildingsWithStatus = buildingsList.map(b => 
        calculateBuildingStatus(b, apartmentStats.get(b.id))
      );

      // Sort buildings by priority (expired first, then warning, etc.)
      const sortedBuildings = sortBuildingsByPriority(buildingsWithStatus);

      // Calculate counts
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
    enabled: !!user,
  });
}
