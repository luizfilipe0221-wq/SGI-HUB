import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Building, BuildingWithStatus } from '@/lib/predios/types';
import { calculateBuildingStatus, sortBuildingsByPriority } from '@/lib/predios/building-utils';
import { useAuth } from './useAuth';
import { useAuditLog } from './useAuditLog';
import { toast } from '@/hooks/use-toast';
import { format, subDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AutoGenerationConfig } from '@/lib/predios/list-generation-types';
import { useCreateListBatch } from './useListBatches';

interface GeneratedItem {
  list_number: number;
  position_in_list: number;
  building_id: string;
  letters_planned: number;
  letters_mode: 'PER_FLOOR' | 'PER_APARTMENT';
  snapshot_last_letter_sent_at: string | null;
  snapshot_due_date: string;
  building: BuildingWithStatus;
}

export function useAutoListGeneration() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { log } = useAuditLog();
  const createBatch = useCreateListBatch();

  return useMutation({
    mutationFn: async (config: AutoGenerationConfig) => {
      // 1. Fetch all buildings with apartment stats
      const { data: buildingsData, error: buildingsError } = await supabase
        .from('buildings')
        .select('*');

      if (buildingsError) throw buildingsError;

      // 2. Get apartment stats for dynamic status calculation
      const { data: apartmentStats, error: statsError } = await supabase
        .from('building_apartments')
        .select('building_id, letter_done, letter_done_at');

      if (statsError) throw statsError;

      // Aggregate stats per building
      const statsMap: Record<string, { total: number; done: number; lastDoneAt: string | null }> = {};
      apartmentStats?.forEach(apt => {
        if (!statsMap[apt.building_id]) {
          statsMap[apt.building_id] = { total: 0, done: 0, lastDoneAt: null };
        }
        statsMap[apt.building_id].total++;
        if (apt.letter_done) {
          statsMap[apt.building_id].done++;
          if (apt.letter_done_at && (!statsMap[apt.building_id].lastDoneAt || apt.letter_done_at > statsMap[apt.building_id].lastDoneAt!)) {
            statsMap[apt.building_id].lastDoneAt = apt.letter_done_at;
          }
        }
      });

      // Calculate building statuses
      const buildings = (buildingsData || []).map(b => 
        calculateBuildingStatus(b as Building, statsMap[b.id])
      );

      // 3. Apply filters
      let availableBuildings = [...buildings];

      // Filter by included/excluded territories
      if (config.included_territories?.length) {
        availableBuildings = availableBuildings.filter(b => 
          config.included_territories!.includes(b.territory_id)
        );
      }
      if (config.excluded_territories?.length) {
        availableBuildings = availableBuildings.filter(b => 
          !config.excluded_territories!.includes(b.territory_id)
        );
      }

      // Exclude recently worked buildings
      if (config.avoid_recent_days > 0) {
        const cutoffDate = subDays(new Date(), config.avoid_recent_days);
        availableBuildings = availableBuildings.filter(b => {
          if (!b.last_worked_at) return true;
          return parseISO(b.last_worked_at) < cutoffDate;
        });
      }

      // Only include buildings with pending apartments
      availableBuildings = availableBuildings.filter(b => 
        b.status !== 'completed' && b.done_apartments < b.total_apartments
      );

      // 4. Apply priority sorting
      switch (config.priority_mode) {
        case 'expired':
          // Expired first, then by days until due
          availableBuildings = sortBuildingsByPriority(availableBuildings);
          break;
        case 'least_recent':
          // Sort by last_worked_at ascending (nulls first)
          availableBuildings.sort((a, b) => {
            if (!a.last_worked_at && !b.last_worked_at) return 0;
            if (!a.last_worked_at) return -1;
            if (!b.last_worked_at) return 1;
            return new Date(a.last_worked_at).getTime() - new Date(b.last_worked_at).getTime();
          });
          break;
        case 'balanced':
          // Group by territory, then round-robin
          const byTerritory: Record<number, BuildingWithStatus[]> = {};
          availableBuildings.forEach(b => {
            if (!byTerritory[b.territory_id]) byTerritory[b.territory_id] = [];
            byTerritory[b.territory_id].push(b);
          });
          // Sort each territory by priority
          Object.keys(byTerritory).forEach(key => {
            byTerritory[Number(key)] = sortBuildingsByPriority(byTerritory[Number(key)]);
          });
          // Round-robin selection
          const balanced: BuildingWithStatus[] = [];
          const territoryIds = Object.keys(byTerritory).map(Number);
          let maxLen = Math.max(...territoryIds.map(t => byTerritory[t].length));
          for (let i = 0; i < maxLen; i++) {
            for (const tid of territoryIds) {
              if (byTerritory[tid][i]) {
                balanced.push(byTerritory[tid][i]);
              }
            }
          }
          availableBuildings = balanced;
          break;
        case 'all':
        default:
          // Combine: expired first, then least recent, balanced by territory
          availableBuildings = sortBuildingsByPriority(availableBuildings);
          break;
      }

      // 5. Distribute buildings across lists
      const totalNeeded = config.lists_count * config.buildings_per_list;
      const usedBuildingIds = new Set<string>();
      const generatedItems: GeneratedItem[] = [];
      const warnings: string[] = [];

      for (let listNum = 1; listNum <= config.lists_count; listNum++) {
        const listBuildings: BuildingWithStatus[] = [];
        
        for (let i = 0; i < config.buildings_per_list; i++) {
          // Find next available building not yet used
          const next = availableBuildings.find(b => !usedBuildingIds.has(b.id));
          
          if (next) {
            usedBuildingIds.add(next.id);
            listBuildings.push(next);
          }
        }

        if (listBuildings.length < config.buildings_per_list) {
          warnings.push(
            `Lista ${listNum}: Apenas ${listBuildings.length} de ${config.buildings_per_list} prédios disponíveis`
          );
        }

        // Add items for this list
        listBuildings.forEach((building, idx) => {
          generatedItems.push({
            list_number: listNum,
            position_in_list: idx + 1,
            building_id: building.id,
            letters_planned: config.letters_per_building,
            letters_mode: config.letters_mode,
            snapshot_last_letter_sent_at: building.last_letter_sent_at,
            snapshot_due_date: building.due_date?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
            building,
          });
        });
      }

      if (generatedItems.length === 0) {
        throw new Error('Nenhum prédio disponível para gerar listas. Verifique os filtros aplicados.');
      }

      // 6. Create batch
      const batchName = `Lote ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`;
      const batch = await createBatch.mutateAsync({
        name: batchName,
        generation_mode: 'auto',
        config: config,
      });

      // 7. Create generated_lists (one per list_number)
      const listNumbers = [...new Set(generatedItems.map(i => i.list_number))];
      const listsToCreate = listNumbers.map(num => ({
        user_id: user!.id,
        name: `Lista ${num} - ${format(new Date(), "dd/MM", { locale: ptBR })}`,
        config_json: JSON.parse(JSON.stringify(config)),
        batch_id: batch.id,
      }));

      const { data: createdLists, error: listsError } = await supabase
        .from('generated_lists')
        .insert(listsToCreate)
        .select();

      if (listsError) throw listsError;

      // Map list_number to generated_list_id
      const listIdMap: Record<number, string> = {};
      createdLists?.forEach((list, idx) => {
        listIdMap[listNumbers[idx]] = list.id;
      });

      // 8. Create list items
      const itemsToCreate = generatedItems.map(item => ({
        generated_list_id: listIdMap[item.list_number],
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
        .insert(itemsToCreate);

      if (itemsError) throw itemsError;

      // 9. Audit log
      await log({
        action: 'LIST_GENERATED',
        entityType: 'generated_list',
        entityId: batch.id,
        newData: {
          mode: 'auto',
          batch_name: batchName,
          lists_count: config.lists_count,
          buildings_per_list: config.buildings_per_list,
          total_items: generatedItems.length,
          warnings,
        },
      });

      return {
        batch,
        lists: createdLists,
        items: generatedItems,
        warnings,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['generated-lists'] });
      queryClient.invalidateQueries({ queryKey: ['list-batches'] });
      
      if (result.warnings.length > 0) {
        toast({ 
          title: 'Listas geradas com avisos!',
          description: `${result.items.length} prédios em ${result.lists?.length || 0} listas. ${result.warnings.length} aviso(s).`,
          variant: 'default',
        });
      } else {
        toast({ 
          title: 'Listas geradas com sucesso!',
          description: `${result.items.length} prédios em ${result.lists?.length || 0} listas.`,
        });
      }
    },
    onError: (error) => {
      toast({ title: 'Erro ao gerar listas', description: error.message, variant: 'destructive' });
    },
  });
}
