import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ListConfig, ListPatternConfig, Building, BuildingWithStatus } from '@/lib/predios/types';
import { calculateBuildingStatus, sortBuildingsByPriority } from '@/lib/predios/building-utils';
import { useAuth } from './useAuth';
import { useAuditLog } from './useAuditLog';
import { useCreateListBatch } from './useListBatches';
import { ManualGenerationConfig } from '@/lib/predios/list-generation-types';
import { toast } from '@/hooks/use-toast';
import { format, subDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GeneratedItem {
  list_number: number;
  position_in_list: number;
  building_id: string;
  letters_planned: number;
  letters_mode: 'PER_FLOOR' | 'PER_APARTMENT';
  snapshot_last_letter_sent_at: string | null;
  snapshot_due_date: string;
  building: BuildingWithStatus;
  fallback_used?: boolean;
}

interface GenerateListsParams {
  config: ListConfig;
  patterns: string[];
}

export function useListGeneration() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { log } = useAuditLog();
  const createBatch = useCreateListBatch();

  return useMutation({
    mutationFn: async ({ config, patterns }: GenerateListsParams) => {
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

      // Group buildings by territory
      const buildingsByTerritory: Record<number, BuildingWithStatus[]> = {};
      availableBuildings.forEach(b => {
        if (!buildingsByTerritory[b.territory_id]) {
          buildingsByTerritory[b.territory_id] = [];
        }
        buildingsByTerritory[b.territory_id].push(b);
      });

      // Sort each territory's buildings by priority (expired first, then by days_until_due)
      Object.keys(buildingsByTerritory).forEach(key => {
        buildingsByTerritory[Number(key)] = sortBuildingsByPriority(buildingsByTerritory[Number(key)]);
      });

      // Track used buildings to avoid repetition across ALL lists
      const usedBuildingIds = new Set<string>();
      const generatedItems: GeneratedItem[] = [];
      const patternsConfig: ListPatternConfig[] = [];
      const fallbackWarnings: string[] = [];

      // Parse patterns
      const parsePattern = (str: string): number[] => {
        return str
          .split(',')
          .map(s => parseInt(s.trim()))
          .filter(n => !isNaN(n) && n >= 1 && n <= 31);
      };

      // Generate each list with its specific pattern
      for (let listNum = 1; listNum <= config.lists_count; listNum++) {
        const patternString = patterns[listNum - 1] || patterns[0] || '';
        const pattern = parsePattern(patternString);
        
        if (pattern.length === 0) continue;

        let position = 1;
        let fallbackUsed = false;
        const fallbackTerritories: number[] = [];

        // Count how many buildings per territory are needed
        const territoryCounts: Record<number, number> = {};
        pattern.forEach(t => {
          territoryCounts[t] = (territoryCounts[t] || 0) + 1;
        });

        // Process territories in pattern order
        for (const territoryId of Object.keys(territoryCounts).map(Number)) {
          const countNeeded = territoryCounts[territoryId];
          const available = (buildingsByTerritory[territoryId] || [])
            .filter(b => !usedBuildingIds.has(b.id));

          // Take buildings from this territory
          const selected = available.slice(0, countNeeded);

          // If not enough buildings, check if we need fallback
          if (selected.length < countNeeded) {
            const shortage = countNeeded - selected.length;
            fallbackUsed = true;
            fallbackWarnings.push(
              `Lista ${listNum}: Território ${territoryId} precisa de ${countNeeded} prédios, mas só tem ${selected.length} disponíveis. Faltam ${shortage}.`
            );
            
            // Try to find fallback from other territories
            const allOtherAvailable = Object.entries(buildingsByTerritory)
              .filter(([tid]) => Number(tid) !== territoryId)
              .flatMap(([tid, buildings]) => 
                buildings
                  .filter(b => !usedBuildingIds.has(b.id))
                  .map(b => ({ ...b, fallbackFromTerritory: Number(tid) }))
              )
              .sort((a, b) => a.days_until_due - b.days_until_due);

            const fallbackBuildings = allOtherAvailable.slice(0, shortage);
            fallbackBuildings.forEach(b => {
              if (!fallbackTerritories.includes(b.fallbackFromTerritory)) {
                fallbackTerritories.push(b.fallbackFromTerritory);
              }
            });

            // Add fallback buildings
            fallbackBuildings.forEach(building => {
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
                fallback_used: true,
              });
            });
          }

          // Add selected buildings from target territory
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

        // Save pattern config for this list
        patternsConfig.push({
          list_number: listNum,
          territory_pattern: pattern,
          fallback_used: fallbackUsed,
          fallback_territories: fallbackTerritories.length > 0 ? fallbackTerritories : undefined,
        });
      }

      // Create batch first
      const batchName = `Lote Manual ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`;
      const batchConfig: ManualGenerationConfig = {
        mode: 'manual',
        lists_count: config.lists_count,
        letters_per_building: config.letters_planned,
        letters_mode: config.letters_mode,
        avoid_recent_days: config.avoid_recent_days,
        patterns: patterns,
      };

      const batch = await createBatch.mutateAsync({
        name: batchName,
        generation_mode: 'manual',
        config: batchConfig,
      });

      // Create the list record with full config including individual patterns
      const listName = `Lista ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`;
      const fullConfig: ListConfig = {
        ...config,
        patterns_per_list: patternsConfig,
      };
      
      const { data: listData, error: listError } = await supabase
        .from('generated_lists')
        .insert([{
          user_id: user!.id,
          name: listName,
          config_json: JSON.parse(JSON.stringify(fullConfig)),
          batch_id: batch.id,
        }])
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

      // Audit log
      await log({
        action: 'LIST_GENERATED',
        entityType: 'generated_list',
        entityId: listData.id,
        newData: {
          name: listName,
          lists_count: config.lists_count,
          patterns: patternsConfig,
          items_count: generatedItems.length,
          fallback_warnings: fallbackWarnings,
        },
      });

      return { 
        list: listData, 
        items: generatedItems,
        warnings: fallbackWarnings,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['generated-lists'] });
      queryClient.invalidateQueries({ queryKey: ['list-batches'] });
      if (result.warnings.length > 0) {
        toast({ 
          title: 'Listas geradas com avisos!',
          description: `${result.items.length} prédios em ${result.list.name}. ${result.warnings.length} aviso(s) de fallback.`,
          variant: 'default',
        });
      } else {
        toast({ title: 'Listas geradas com sucesso!' });
      }
    },
    onError: (error) => {
      toast({ title: 'Erro ao gerar listas', description: error.message, variant: 'destructive' });
    },
  });
}
