import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabasePredios as supabase } from '@/integrations/supabase/predios';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import { ListBatch, BatchWithLists, AutoGenerationConfig, ManualGenerationConfig } from '@/lib/predios/list-generation-types';

export function useListBatches() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['list-batches'],
    queryFn: async (): Promise<BatchWithLists[]> => {
      // Fetch batches with their lists
      const { data: batches, error: batchError } = await supabase
        .from('list_batches')
        .select('*')
        .order('created_at', { ascending: false });

      if (batchError) throw batchError;

      // Fetch lists grouped by batch
      const { data: lists, error: listsError } = await supabase
        .from('generated_lists')
        .select(`
          *,
          items:generated_list_items(is_completed, building_id)
        `)
        .order('created_at', { ascending: false });

      if (listsError) throw listsError;

      // Also fetch lists without batch (legacy)
      const listsByBatch: Record<string, typeof lists> = {};
      lists?.forEach(list => {
        const batchId = (list as unknown as { batch_id?: string }).batch_id || 'no-batch';
        if (!listsByBatch[batchId]) {
          listsByBatch[batchId] = [];
        }
        listsByBatch[batchId].push(list);
      });

      // Map batches with their lists and stats
      const result: BatchWithLists[] = (batches || []).map(batch => {
        const batchLists = listsByBatch[batch.id] || [];
        const allItems = batchLists.flatMap(l => (l as unknown as { items: Array<{ is_completed: boolean }> }).items || []);
        
        return {
          id: batch.id,
          user_id: batch.user_id,
          name: batch.name,
          generation_mode: batch.generation_mode as 'auto' | 'manual',
          config_json: batch.config_json as unknown as AutoGenerationConfig | ManualGenerationConfig,
          created_at: batch.created_at,
          lists: batchLists.map(l => ({
            id: l.id,
            user_id: l.user_id,
            name: l.name,
            batch_id: (l as unknown as { batch_id?: string }).batch_id || null,
            config_json: l.config_json as Record<string, unknown>,
            created_at: l.created_at,
          })),
          total_buildings: allItems.length,
          completed_buildings: allItems.filter(i => i.is_completed).length,
        };
      });

      // Add virtual batch for lists without a batch
      const noBatchLists = listsByBatch['no-batch'];
      if (noBatchLists?.length) {
        const allItems = noBatchLists.flatMap(l => (l as unknown as { items: Array<{ is_completed: boolean }> }).items || []);
        result.push({
          id: 'legacy',
          user_id: user?.id || '',
          name: 'Listas Anteriores',
          generation_mode: 'manual',
          config_json: { mode: 'manual' } as ManualGenerationConfig,
          created_at: noBatchLists[0].created_at,
          lists: noBatchLists.map(l => ({
            id: l.id,
            user_id: l.user_id,
            name: l.name,
            batch_id: null,
            config_json: l.config_json as Record<string, unknown>,
            created_at: l.created_at,
          })),
          total_buildings: allItems.length,
          completed_buildings: allItems.filter(i => i.is_completed).length,
        });
      }

      return result;
    },
    enabled: !!user,
  });
}

export function useCreateListBatch() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      name, 
      generation_mode, 
      config 
    }: { 
      name: string; 
      generation_mode: 'auto' | 'manual'; 
      config: AutoGenerationConfig | ManualGenerationConfig;
    }) => {
      const { data, error } = await supabase
        .from('list_batches')
        .insert([{
          user_id: user!.id,
          name,
          generation_mode,
          config_json: JSON.parse(JSON.stringify(config)),
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list-batches'] });
    },
    onError: (error) => {
      toast({ title: 'Erro ao criar lote', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateListBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from('list_batches')
        .update({ name })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list-batches'] });
      toast({ title: 'Lote renomeado!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao renomear lote', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteListBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // This will cascade delete all lists in the batch
      const { error } = await supabase
        .from('list_batches')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list-batches'] });
      queryClient.invalidateQueries({ queryKey: ['generated-lists'] });
      toast({ title: 'Lote excluído!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao excluir lote', description: error.message, variant: 'destructive' });
    },
  });
}
