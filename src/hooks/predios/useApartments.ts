import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabasePredios as supabase } from '@/integrations/supabase/predios';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import { useAuditLog } from './useAuditLog';

export interface BuildingFloor {
  id: string;
  building_id: string;
  floor_number: number;
  floor_label: string;
  created_at: string;
}

export interface BuildingApartment {
  id: string;
  building_id: string;
  floor_id: string;
  apartment_number: string;
  apartment_order: number;
  letter_done: boolean;
  letter_done_at: string | null;
  letter_done_by: string | null;
  letter_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApartmentWithFloor extends BuildingApartment {
  floor: BuildingFloor;
}

// Fetch floors for a building
export function useBuildingFloors(buildingId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['building-floors', buildingId],
    queryFn: async (): Promise<BuildingFloor[]> => {
      const { data, error } = await supabase
        .from('building_floors')
        .select('*')
        .eq('building_id', buildingId)
        .order('floor_number');

      if (error) throw error;
      return data || [];
    },
      });
}

// Fetch apartments for a building
export function useBuildingApartments(buildingId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['building-apartments', buildingId],
    queryFn: async (): Promise<ApartmentWithFloor[]> => {
      const { data, error } = await supabase
        .from('building_apartments')
        .select('*, floor:building_floors(*)')
        .eq('building_id', buildingId)
        .order('apartment_order');

      if (error) throw error;
      return (data || []).map(apt => ({
        ...apt,
        floor: apt.floor as BuildingFloor,
      }));
    },
      });
}

// Get next unworked apartments
export function useNextApartments(buildingId: string, count: number = 5) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['next-apartments', buildingId, count],
    queryFn: async (): Promise<BuildingApartment[]> => {
      const { data, error } = await supabase
        .from('building_apartments')
        .select('*')
        .eq('building_id', buildingId)
        .eq('letter_done', false)
        .order('apartment_order')
        .limit(count);

      if (error) throw error;
      return data || [];
    },
      });
}

// Get last worked apartment
export function useLastWorkedApartment(buildingId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['last-worked-apartment', buildingId],
    queryFn: async (): Promise<BuildingApartment | null> => {
      const { data, error } = await supabase
        .from('building_apartments')
        .select('*')
        .eq('building_id', buildingId)
        .eq('letter_done', true)
        .order('apartment_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
      });
}

// Get apartment progress stats
export function useApartmentProgress(buildingId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['apartment-progress', buildingId],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('building_apartments')
        .select('letter_done', { count: 'exact' })
        .eq('building_id', buildingId);

      if (error) throw error;

      const total = count || 0;
      const done = data?.filter(a => a.letter_done).length || 0;

      return { total, done, remaining: total - done };
    },
      });
}

interface GenerateUnitsParams {
  buildingId: string;
  floorsCount: number;
  apartmentsPerFloor: number;
  numberingStartsAt: 1 | 101; // 1 = térreo, 101 = pilotis
}

// Generate floors and apartments
export function useGenerateUnits() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { log } = useAuditLog();

  return useMutation({
    mutationFn: async ({ buildingId, floorsCount, apartmentsPerFloor, numberingStartsAt }: GenerateUnitsParams) => {
      // First check if units already generated
      const { data: building } = await supabase
        .from('buildings')
        .select('units_generated')
        .eq('id', buildingId)
        .single();

      if (building?.units_generated) {
        throw new Error('Este prédio já teve unidades geradas. Não é possível gerar novamente.');
      }

      const floors: Array<{
        building_id: string;
        floor_number: number;
        floor_label: string;
      }> = [];

      const apartments: Array<{
        building_id: string;
        floor_id?: string;
        apartment_number: string;
        apartment_order: number;
        floor_number: number;
      }> = [];

      let apartmentOrder = 0;

      // Generate floor and apartment data
      for (let floorIdx = 0; floorIdx < floorsCount; floorIdx++) {
        const floorNumber = floorIdx; // 0 = térreo, 1 = 1º andar, etc.
        const floorLabel = floorNumber === 0 ? 'Térreo' : `${floorNumber}º Andar`;

        floors.push({
          building_id: buildingId,
          floor_number: floorNumber,
          floor_label: floorLabel,
        });

        for (let aptIdx = 0; aptIdx < apartmentsPerFloor; aptIdx++) {
          let aptNumber: string;

          if (numberingStartsAt === 1) {
            // Térreo: 01, 02, 03... 1º andar: 101, 102... 2º andar: 201, 202...
            if (floorNumber === 0) {
              aptNumber = String(aptIdx + 1).padStart(2, '0');
            } else {
              aptNumber = String(floorNumber * 100 + aptIdx + 1);
            }
          } else {
            // Sem térreo: 1º andar = 101, 102... 2º andar = 201, 202...
            aptNumber = String((floorNumber + 1) * 100 + aptIdx + 1);
          }

          apartments.push({
            building_id: buildingId,
            apartment_number: aptNumber,
            apartment_order: apartmentOrder++,
            floor_number: floorNumber,
          });
        }
      }

      // Insert floors
      const { data: insertedFloors, error: floorsError } = await supabase
        .from('building_floors')
        .insert(floors)
        .select();

      if (floorsError) throw floorsError;

      // Create floor map for apartment insertion
      const floorMap = new Map(insertedFloors?.map(f => [f.floor_number, f.id]) || []);

      // Add floor_id to apartments
      const apartmentsWithFloorId = apartments.map(apt => ({
        building_id: apt.building_id,
        floor_id: floorMap.get(apt.floor_number)!,
        apartment_number: apt.apartment_number,
        apartment_order: apt.apartment_order,
      }));

      // Insert apartments
      const { error: aptsError } = await supabase
        .from('building_apartments')
        .insert(apartmentsWithFloorId);

      if (aptsError) throw aptsError;

      // Mark building as units generated
      const { error: updateError } = await supabase
        .from('buildings')
        .update({
          units_generated: true,
          units_generated_at: new Date().toISOString(),
          units_generated_by: user!.id,
          numbering_starts_at: numberingStartsAt,
          apartments_per_floor_config: apartmentsPerFloor,
        })
        .eq('id', buildingId);

      if (updateError) throw updateError;

      // Audit log
      await log({
        action: 'BUILDING_UPDATED',
        entityType: 'building',
        entityId: buildingId,
        newData: {
          action: 'units_generated',
          floors_count: floorsCount,
          apartments_per_floor: apartmentsPerFloor,
          total_apartments: floorsCount * apartmentsPerFloor,
          numbering_starts_at: numberingStartsAt,
        },
      });

      return { floorsCreated: floorsCount, apartmentsCreated: floorsCount * apartmentsPerFloor };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['building-floors', variables.buildingId] });
      queryClient.invalidateQueries({ queryKey: ['building-apartments', variables.buildingId] });
      queryClient.invalidateQueries({ queryKey: ['building', variables.buildingId] });
      toast({ 
        title: 'Unidades geradas com sucesso!',
        description: `${data.floorsCreated} andares e ${data.apartmentsCreated} apartamentos criados.`,
      });
    },
    onError: (error) => {
      toast({ title: 'Erro ao gerar unidades', description: error.message, variant: 'destructive' });
    },
  });
}

// Mark apartment as done
export function useMarkApartmentDone() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { log } = useAuditLog();

  return useMutation({
    mutationFn: async ({ apartmentId, notes, listItemId, listId }: { 
      apartmentId: string; 
      notes?: string;
      listItemId?: string;
      listId?: string;
    }) => {
      const { data, error } = await supabase
        .from('building_apartments')
        .update({
          letter_done: true,
          letter_done_at: new Date().toISOString(),
          letter_done_by: user!.id,
          letter_notes: notes || null,
        })
        .eq('id', apartmentId)
        .select('building_id, apartment_number')
        .single();

      if (error) throw error;

      await log({
        action: 'LETTER_SENT',
        entityType: 'building',
        entityId: data.building_id,
        newData: { apartment: data.apartment_number },
      });

      return { ...data, listItemId, listId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['building-apartments', data.building_id] });
      queryClient.invalidateQueries({ queryKey: ['apartment-progress', data.building_id] });
      queryClient.invalidateQueries({ queryKey: ['next-apartments', data.building_id] });
      queryClient.invalidateQueries({ queryKey: ['last-worked-apartment', data.building_id] });
      queryClient.invalidateQueries({ queryKey: ['building', data.building_id] });
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      // Also invalidate list progress if in list execution mode
      if (data.listItemId) {
        queryClient.invalidateQueries({ queryKey: ['list-item', data.listItemId] });
      }
      if (data.listId) {
        queryClient.invalidateQueries({ queryKey: ['list-items-progress', data.listId] });
      }
    },
    onError: (error) => {
      toast({ title: 'Erro ao marcar apartamento', description: error.message, variant: 'destructive' });
    },
  });
}

// Unmark apartment
export function useUnmarkApartmentDone() {
  const queryClient = useQueryClient();
  const { log } = useAuditLog();

  return useMutation({
    mutationFn: async ({ apartmentId, listItemId, listId }: { 
      apartmentId: string;
      listItemId?: string;
      listId?: string;
    }) => {
      const { data, error } = await supabase
        .from('building_apartments')
        .update({
          letter_done: false,
          letter_done_at: null,
          letter_done_by: null,
          letter_notes: null,
        })
        .eq('id', apartmentId)
        .select('building_id, apartment_number')
        .single();

      if (error) throw error;

      await log({
        action: 'BUILDING_UPDATED',
        entityType: 'building',
        entityId: data.building_id,
        newData: { apartment_unmarked: data.apartment_number },
      });

      return { ...data, listItemId, listId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['building-apartments', data.building_id] });
      queryClient.invalidateQueries({ queryKey: ['apartment-progress', data.building_id] });
      queryClient.invalidateQueries({ queryKey: ['next-apartments', data.building_id] });
      queryClient.invalidateQueries({ queryKey: ['last-worked-apartment', data.building_id] });
      queryClient.invalidateQueries({ queryKey: ['building', data.building_id] });
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      // Also invalidate list progress if in list execution mode
      if (data.listItemId) {
        queryClient.invalidateQueries({ queryKey: ['list-item', data.listItemId] });
      }
      if (data.listId) {
        queryClient.invalidateQueries({ queryKey: ['list-items-progress', data.listId] });
      }
    },
    onError: (error) => {
      toast({ title: 'Erro ao desmarcar apartamento', description: error.message, variant: 'destructive' });
    },
  });
}
