import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabasePredios as supabase } from '@/integrations/supabase/predios';
import { Building, BuildingWithStatus, BuildingActivityLog } from '@/lib/predios/types';
import { calculateBuildingStatus } from '@/lib/predios/building-utils';
import { fetchApartmentStatsForBuildings } from '@/lib/predios/apartment-stats';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

/** Query defaults for all buildings hooks — avoid excessive re-fetches */
const QUERY_DEFAULTS = {
  staleTime: 60_000,          // data is fresh for 1 minute
  refetchOnWindowFocus: false, // don't re-fetch when user switches tabs
} as const;

export function useBuildings(territoryId?: number) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Real-time subscription: invalidate when buildings or apartments change
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('buildings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'buildings' }, () => {
        queryClient.invalidateQueries({ queryKey: ['buildings'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'building_apartments' }, () => {
        queryClient.invalidateQueries({ queryKey: ['buildings'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  return useQuery({
    queryKey: ['buildings', territoryId],
    enabled: !!user,
    ...QUERY_DEFAULTS,
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

      const apartmentStats = await fetchApartmentStatsForBuildings(buildingIds);

      return buildingsList.map(building =>
        calculateBuildingStatus(building, apartmentStats.get(building.id))
      );
    },
  });
}

export function useBuilding(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['building', id],
    enabled: !!user,
    ...QUERY_DEFAULTS,
    queryFn: async (): Promise<BuildingWithStatus | null> => {
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const apartmentStats = await fetchApartmentStatsForBuildings([id]);
      return calculateBuildingStatus(data as Building, apartmentStats.get(id));
    },
  });
}

export function useBuildingActivities(buildingId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['building-activities', buildingId],
    enabled: !!user,
    ...QUERY_DEFAULTS,
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

      const { error: updateError } = await supabase
        .from('buildings')
        .update({
          last_worked_at: today,
          last_letter_sent_at: today,
        })
        .eq('id', buildingId);

      if (updateError) throw updateError;

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
      apartmentsDone,
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
