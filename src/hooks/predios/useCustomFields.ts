import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/predios/useAuth';
import { useAuditLog } from '@/hooks/predios/useAuditLog';
import { toast } from '@/hooks/use-toast';

export interface CustomFieldDefinition {
  id: string;
  name: string;
  label: string;
  field_type: 'text' | 'number' | 'boolean' | 'select';
  options: string[] | null;
  is_required: boolean;
  display_order: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CustomFieldValue {
  id: string;
  building_id: string;
  field_id: string;
  value: string | null;
  created_at: string;
  updated_at: string;
}

// Fetch active custom field definitions
export function useCustomFieldDefinitions() {
  return useQuery({
    queryKey: ['custom-field-definitions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_field_definitions')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as CustomFieldDefinition[];
    },
  });
}

// Fetch all custom field definitions (for admin)
export function useAllCustomFieldDefinitions() {
  return useQuery({
    queryKey: ['custom-field-definitions-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_field_definitions')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as CustomFieldDefinition[];
    },
  });
}

// CRUD operations for custom fields (admin only)
export function useCreateCustomField() {
  const { user } = useAuth();
  const { log } = useAuditLog();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      label: string;
      field_type: 'text' | 'number' | 'boolean' | 'select';
      options?: string[];
      is_required?: boolean;
      display_order?: number;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data: field, error } = await supabase
        .from('custom_field_definitions')
        .insert({
          ...data,
          options: data.options || null,
          is_required: data.is_required || false,
          display_order: data.display_order || 0,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      await log({
        action: 'PERMISSION_GRANTED', // Reusing action type for custom field creation
        entityType: 'permission',
        entityId: field.id,
        newData: { type: 'custom_field_created', ...data },
      });

      return field;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-field-definitions'] });
      queryClient.invalidateQueries({ queryKey: ['custom-field-definitions-all'] });
      toast({ title: 'Sucesso', description: 'Campo personalizado criado' });
    },
    onError: (error) => {
      toast({ title: 'Erro', description: 'Falha ao criar campo', variant: 'destructive' });
      console.error(error);
    },
  });
}

export function useUpdateCustomField() {
  const { log } = useAuditLog();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: Partial<CustomFieldDefinition> & { id: string }) => {
      const { error } = await supabase
        .from('custom_field_definitions')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      await log({
        action: 'PERMISSION_GRANTED',
        entityType: 'permission',
        entityId: id,
        newData: { type: 'custom_field_updated', ...data },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-field-definitions'] });
      queryClient.invalidateQueries({ queryKey: ['custom-field-definitions-all'] });
      toast({ title: 'Sucesso', description: 'Campo atualizado' });
    },
    onError: (error) => {
      toast({ title: 'Erro', description: 'Falha ao atualizar campo', variant: 'destructive' });
      console.error(error);
    },
  });
}

export function useDeleteCustomField() {
  const { log } = useAuditLog();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('custom_field_definitions')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      await log({
        action: 'PERMISSION_REVOKED',
        entityType: 'permission',
        entityId: id,
        newData: { type: 'custom_field_deleted' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-field-definitions'] });
      queryClient.invalidateQueries({ queryKey: ['custom-field-definitions-all'] });
      toast({ title: 'Sucesso', description: 'Campo removido' });
    },
    onError: (error) => {
      toast({ title: 'Erro', description: 'Falha ao remover campo', variant: 'destructive' });
      console.error(error);
    },
  });
}

// Custom field values for buildings
export function useBuildingCustomFieldValues(buildingId: string) {
  return useQuery({
    queryKey: ['building-custom-field-values', buildingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('building_custom_field_values')
        .select('*')
        .eq('building_id', buildingId);

      if (error) throw error;
      return data as CustomFieldValue[];
    },
    enabled: !!buildingId,
  });
}

export function useSaveCustomFieldValues() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      buildingId,
      values,
    }: {
      buildingId: string;
      values: Record<string, string | null>;
    }) => {
      // Upsert each field value
      const upserts = Object.entries(values).map(([fieldId, value]) => ({
        building_id: buildingId,
        field_id: fieldId,
        value: value,
      }));

      if (upserts.length === 0) return;

      const { error } = await supabase
        .from('building_custom_field_values')
        .upsert(upserts, { onConflict: 'building_id,field_id' });

      if (error) throw error;
    },
    onSuccess: (_, { buildingId }) => {
      queryClient.invalidateQueries({ queryKey: ['building-custom-field-values', buildingId] });
    },
  });
}
