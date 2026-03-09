/**
 * Shared utility for fetching apartment statistics for buildings.
 * Single source of truth — avoids code duplication between hooks.
 */
import { supabasePredios as supabase } from '@/integrations/supabase/predios';
import { ApartmentStats } from './building-utils';

/**
 * Fetch apartment stats for a list of buildings in a single query.
 * Returns a map of building_id -> ApartmentStats.
 */
export async function fetchApartmentStatsForBuildings(
    buildingIds: string[]
): Promise<Map<string, ApartmentStats>> {
    if (buildingIds.length === 0) return new Map();

    const { data, error } = await supabase
        .from('building_apartments')
        .select('building_id, letter_done, letter_done_at')
        .in('building_id', buildingIds);

    if (error) throw error;

    const statsMap = new Map<string, ApartmentStats>();

    // Initialize all buildings with zero stats
    buildingIds.forEach((id) => {
        statsMap.set(id, { total: 0, done: 0, lastDoneAt: null });
    });

    // Aggregate apartment data
    (data || []).forEach((apt) => {
        const current = statsMap.get(apt.building_id)!;
        current.total++;

        if (apt.letter_done) {
            current.done++;

            if (apt.letter_done_at) {
                if (!current.lastDoneAt || apt.letter_done_at > current.lastDoneAt) {
                    current.lastDoneAt = apt.letter_done_at;
                }
            }
        }
    });

    return statsMap;
}
