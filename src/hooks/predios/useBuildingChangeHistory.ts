import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/predios/useAuth';
import { useAuditLog } from '@/hooks/predios/useAuditLog';

export interface BuildingChangeRecord {
  id: string;
  building_id: string;
  user_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  change_source: 'manual' | 'extraction' | 'review' | 'import';
  created_at: string;
}

// Field labels for display
const FIELD_LABELS: Record<string, string> = {
  name: 'Nome',
  address: 'Endereço',
  territory_id: 'Território',
  floors_count: 'Andares',
  apartments_per_floor: 'Apts/Andar',
  apartments_total: 'Total Apts',
  default_cycle_days: 'Ciclo Padrão',
  custom_cycle_days: 'Ciclo Personalizado',
  notes: 'Observações',
  last_worked_at: 'Último Trabalho',
  last_letter_sent_at: 'Última Carta',
  progress_floors_done: 'Andares Feitos',
  progress_apartments_done: 'Apts Feitos',
};

export function getFieldLabel(fieldName: string): string {
  return FIELD_LABELS[fieldName] || fieldName;
}

export function useBuildingChangeHistory(buildingId: string) {
  return useQuery({
    queryKey: ['building-change-history', buildingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('building_change_history')
        .select('*')
        .eq('building_id', buildingId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BuildingChangeRecord[];
    },
    enabled: !!buildingId,
  });
}

export function useRecordBuildingChange() {
  const { user } = useAuth();
  const { log } = useAuditLog();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      buildingId,
      fieldName,
      oldValue,
      newValue,
      changeSource = 'manual',
    }: {
      buildingId: string;
      fieldName: string;
      oldValue: string | null;
      newValue: string | null;
      changeSource?: 'manual' | 'extraction' | 'review' | 'import';
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('building_change_history')
        .insert({
          building_id: buildingId,
          user_id: user.id,
          field_name: fieldName,
          old_value: oldValue,
          new_value: newValue,
          change_source: changeSource,
        });

      if (error) throw error;

      // Create audit log
      await log({
        action: 'BUILDING_UPDATED',
        entityType: 'building',
        entityId: buildingId,
        oldData: { [fieldName]: oldValue },
        newData: { [fieldName]: newValue, source: changeSource },
      });
    },
    onSuccess: (_, { buildingId }) => {
      queryClient.invalidateQueries({ queryKey: ['building-change-history', buildingId] });
    },
  });
}

// Utility to record multiple field changes at once
export function useRecordBuildingChanges() {
  const { user } = useAuth();
  const { log } = useAuditLog();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      buildingId,
      changes,
      changeSource = 'manual',
    }: {
      buildingId: string;
      changes: Array<{ fieldName: string; oldValue: string | null; newValue: string | null }>;
      changeSource?: 'manual' | 'extraction' | 'review' | 'import';
    }) => {
      if (!user) throw new Error('User not authenticated');
      if (changes.length === 0) return;

      const records = changes.map(change => ({
        building_id: buildingId,
        user_id: user.id,
        field_name: change.fieldName,
        old_value: change.oldValue,
        new_value: change.newValue,
        change_source: changeSource,
      }));

      const { error } = await supabase
        .from('building_change_history')
        .insert(records);

      if (error) throw error;

      // Create consolidated audit log
      const oldData: Record<string, unknown> = {};
      const newData: Record<string, unknown> = { source: changeSource };
      changes.forEach(c => {
        oldData[c.fieldName] = c.oldValue;
        newData[c.fieldName] = c.newValue;
      });

      await log({
        action: 'BUILDING_UPDATED',
        entityType: 'building',
        entityId: buildingId,
        oldData,
        newData,
      });
    },
    onSuccess: (_, { buildingId }) => {
      queryClient.invalidateQueries({ queryKey: ['building-change-history', buildingId] });
    },
  });
}
