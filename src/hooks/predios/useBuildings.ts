import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Building, BuildingWithStatus, BuildingActivityLog } from '@/lib/predios/types';
import { calculateBuildingStatus, ApartmentStats } from '@/lib/predios/building-utils';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

/**
 * Fetch apartment stats for a list of buildings in a single query.
 */
async function fetchApartmentStatsForBuildings(buildingIds: string[]): Promise<Map<string, ApartmentStats>> {
  if (buildingIds.length === 0) return new Map();
  
  const { data, error } = await supabase
    .from('building_apartments')
    .select('building_id, letter_done, letter_done_at')
    .in('building_id', buildingIds);
  
  if (error) throw error;
  
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
      
      if (apt.letter_done_at) {
        if (!current.lastDoneAt || apt.letter_done_at > current.lastDoneAt) {
          current.lastDoneAt = apt.letter_done_at;
        }
      }
    }
  });
  
  return statsMap;
}

export function useBuildings(territoryId?: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['buildings', territoryId],
    queryFn: async (): Promise<BuildingWithStatus[]> => {
      let query = supabase
        .from('buildings')
        .select('*')
        .order('name');

      if (territoryId) {
        query = query.eq('territory_id', territoryId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const buildingsList = (data || []) as Building[];
      const buildingIds = buildingsList.map(b => b.id);
      
      // Fetch apartment stats for all buildings
      const apartmentStats = await fetchApartmentStatsForBuildings(buildingIds);

      return buildingsList.map(building => 
        calculateBuildingStatus(building, apartmentStats.get(building.id))
      );
    },
    enabled: !!user,
  });
}

export function useBuilding(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['building', id],
    queryFn: async (): Promise<BuildingWithStatus | null> => {
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Fetch apartment stats for this building
      const apartmentStats = await fetchApartmentStatsForBuildings([id]);

      return calculateBuildingStatus(data as Building, apartmentStats.get(id));
    },
    enabled: !!user && !!id,
  });
}

export function useBuildingActivities(buildingId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['building-activities', buildingId],
    queryFn: async (): Promise<BuildingActivityLog[]> => {
      const { data, error } = await supabase
        .from('building_activity_log')
        .select('*')
        .eq('building_id', buildingId)
        .order('activity_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as BuildingActivityLog[];
    },
    enabled: !!user && !!buildingId,
  });
}

export function useCreateBuilding() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (building: Omit<Building, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'last_worked_at' | 'last_letter_sent_at' | 'progress_floors_done' | 'progress_apartments_done' | 'units_generated' | 'units_generated_at' | 'units_generated_by' | 'numbering_starts_at' | 'apartments_per_floor_config'>) => {
      const { data, error } = await supabase
        .from('buildings')
        .insert({
          ...building,
          user_id: user!.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      queryClient.invalidateQueries({ queryKey: ['territories'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast({ title: 'Prédio cadastrado com sucesso!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao cadastrar prédio', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateBuilding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...building }: Partial<Building> & { id: string }) => {
      const { data, error } = await supabase
        .from('buildings')
        .update(building)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      queryClient.invalidateQueries({ queryKey: ['building', data.id] });
      queryClient.invalidateQueries({ queryKey: ['territories'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast({ title: 'Prédio atualizado com sucesso!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar prédio', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteBuilding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('buildings')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      queryClient.invalidateQueries({ queryKey: ['territories'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast({ title: 'Prédio excluído com sucesso!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao excluir prédio', description: error.message, variant: 'destructive' });
    },
  });
}

export function useMarkAsWorked() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ buildingId, lettersCount }: { buildingId: string; lettersCount: number }) => {
      const today = new Date().toISOString().split('T')[0];

      // Update building
      const { error: updateError } = await supabase
        .from('buildings')
        .update({
          last_worked_at: today,
          last_letter_sent_at: today,
        })
        .eq('id', buildingId);

      if (updateError) throw updateError;

      // Log activity
      const { error: logError } = await supabase
        .from('building_activity_log')
        .insert({
          building_id: buildingId,
          user_id: user!.id,
          activity_type: 'LETTER_SENT',
          activity_date: today,
          letters_count: lettersCount,
        });

      if (logError) throw logError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      queryClient.invalidateQueries({ queryKey: ['building-activities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast({ title: 'Registrado com sucesso!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao registrar', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateProgress() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      buildingId, 
      floorsDone, 
      apartmentsDone 
    }: { 
      buildingId: string; 
      floorsDone: number; 
      apartmentsDone: number;
    }) => {
      const { error: updateError } = await supabase
        .from('buildings')
        .update({
          progress_floors_done: floorsDone,
          progress_apartments_done: apartmentsDone,
        })
        .eq('id', buildingId);

      if (updateError) throw updateError;

      // Log activity
      const { error: logError } = await supabase
        .from('building_activity_log')
        .insert({
          building_id: buildingId,
          user_id: user!.id,
          activity_type: 'PROGRESS_UPDATE',
          activity_date: new Date().toISOString().split('T')[0],
          notes: `Andares: ${floorsDone}, Apartamentos: ${apartmentsDone}`,
        });

      if (logError) throw logError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      queryClient.invalidateQueries({ queryKey: ['building-activities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast({ title: 'Progresso atualizado!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar progresso', description: error.message, variant: 'destructive' });
    },
  });
}
