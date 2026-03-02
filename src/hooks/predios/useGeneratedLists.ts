import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabasePredios as supabase } from '@/integrations/supabase/predios';
import { GeneratedList, GeneratedListItem, ListConfig, Building, BuildingWithStatus } from '@/lib/predios/types';
import { calculateBuildingStatus, sortBuildingsByPriority } from '@/lib/predios/building-utils';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import { format, subDays, addDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function useGeneratedLists() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['generated-lists'],
    queryFn: async (): Promise<GeneratedList[]> => {
      const { data, error } = await supabase
        .from('generated_lists')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        config_json: item.config_json as unknown as ListConfig,
      })) as GeneratedList[];
    },
    enabled: !!user,
  });
}

export function useGeneratedListItems(listId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['generated-list-items', listId],
    queryFn: async (): Promise<(GeneratedListItem & { building: BuildingWithStatus })[]> => {
      const { data, error } = await supabase
        .from('generated_list_items')
        .select(`
          *,
          building:buildings(*)
        `)
        .eq('generated_list_id', listId)
        .order('list_number')
        .order('position_in_list');

      if (error) throw error;

      return (data || []).map(item => ({
        ...item,
        building: calculateBuildingStatus(item.building as Building),
      })) as (GeneratedListItem & { building: BuildingWithStatus })[];
    },
    enabled: !!user && !!listId,
  });
}

interface GenerateListsParams {
  config: ListConfig;
}

export function useGenerateLists() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ config }: GenerateListsParams) => {
      // Fetch all buildings
      const { data: buildingsData, error: buildingsError } = await supabase
        .from('buildings')
        .select('*');

      if (buildingsError) throw buildingsError;

      const buildings = (buildingsData || []).map(b => 
        calculateBuildingStatus(b as Building)
      );

      // Filter out recently worked buildings if avoid_recent_days > 0
      const cutoffDate = subDays(new Date(), config.avoid_recent_days);
      let availableBuildings = buildings.filter(b => {
        if (!b.last_worked_at) return true;
        return parseISO(b.last_worked_at) < cutoffDate;
      });

      // If not enough buildings after filtering, include all
      const totalNeeded = config.lists_count * config.per_list;
      if (availableBuildings.length < totalNeeded) {
        availableBuildings = buildings;
      }

      // Group buildings by territory
      const buildingsByTerritory: Record<number, BuildingWithStatus[]> = {};
      availableBuildings.forEach(b => {
        if (!buildingsByTerritory[b.territory_id]) {
          buildingsByTerritory[b.territory_id] = [];
        }
        buildingsByTerritory[b.territory_id].push(b);
      });

      // Sort each territory's buildings by priority
      Object.keys(buildingsByTerritory).forEach(key => {
        buildingsByTerritory[Number(key)] = sortBuildingsByPriority(buildingsByTerritory[Number(key)]);
      });

      // Track used buildings to avoid repetition
      const usedBuildingIds = new Set<string>();

      // Generate lists
      const generatedItems: Array<{
        list_number: number;
        position_in_list: number;
        building_id: string;
        letters_planned: number;
        letters_mode: 'PER_FLOOR' | 'PER_APARTMENT';
        snapshot_last_letter_sent_at: string | null;
        snapshot_due_date: string;
        building: BuildingWithStatus;
      }> = [];

      for (let listNum = 1; listNum <= config.lists_count; listNum++) {
        let position = 1;
        
        // Count how many buildings per territory are needed for this pattern
        const territoryCounts: Record<number, number> = {};
        config.territory_pattern.forEach(t => {
          territoryCounts[t] = (territoryCounts[t] || 0) + 1;
        });

        // For each territory in the pattern
        for (const territoryId of Object.keys(territoryCounts).map(Number)) {
          const count = territoryCounts[territoryId];
          const available = (buildingsByTerritory[territoryId] || [])
            .filter(b => !usedBuildingIds.has(b.id));

          // Take top priority buildings from this territory
          const selected = available.slice(0, count);

          selected.forEach(building => {
            usedBuildingIds.add(building.id);
            generatedItems.push({
              list_number: listNum,
              position_in_list: position++,
              building_id: building.id,
              letters_planned: config.letters_planned,
              letters_mode: config.letters_mode,
              snapshot_last_letter_sent_at: building.last_letter_sent_at,
              snapshot_due_date: building.due_date.toISOString().split('T')[0],
              building,
            });
          });
        }
      }

      // Create the list record
      const listName = `Lista ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`;
      
      const { data: listData, error: listError } = await supabase
        .from('generated_lists')
        .insert({
          user_id: user!.id,
          name: listName,
          config_json: JSON.parse(JSON.stringify(config)),
        })
        .select()
        .single();

      if (listError) throw listError;

      // Create list items
      if (generatedItems.length > 0) {
        const items = generatedItems.map(item => ({
          generated_list_id: listData.id,
          user_id: user!.id,
          list_number: item.list_number,
          position_in_list: item.position_in_list,
          building_id: item.building_id,
          letters_planned: item.letters_planned,
          letters_mode: item.letters_mode,
          snapshot_last_letter_sent_at: item.snapshot_last_letter_sent_at,
          snapshot_due_date: item.snapshot_due_date,
        }));

        const { error: itemsError } = await supabase
          .from('generated_list_items')
          .insert(items);

        if (itemsError) throw itemsError;
      }

      return { list: listData, items: generatedItems };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generated-lists'] });
      toast({ title: 'Listas geradas com sucesso!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao gerar listas', description: error.message, variant: 'destructive' });
    },
  });
}

export function useMarkListItemComplete() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ itemId, buildingId, lettersCount }: { 
      itemId: string; 
      buildingId: string;
      lettersCount: number;
    }) => {
      const today = new Date().toISOString().split('T')[0];

      // Mark item as completed
      const { error: itemError } = await supabase
        .from('generated_list_items')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', itemId);

      if (itemError) throw itemError;

      // Update building
      const { error: buildingError } = await supabase
        .from('buildings')
        .update({
          last_worked_at: today,
          last_letter_sent_at: today,
        })
        .eq('id', buildingId);

      if (buildingError) throw buildingError;

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
      queryClient.invalidateQueries({ queryKey: ['generated-list-items'] });
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      toast({ title: 'Item marcado como concluído!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao marcar item', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteGeneratedList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('generated_lists')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generated-lists'] });
      toast({ title: 'Lista excluída!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao excluir lista', description: error.message, variant: 'destructive' });
    },
  });
}
