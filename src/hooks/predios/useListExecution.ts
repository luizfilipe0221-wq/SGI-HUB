import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabasePredios as supabase } from '@/integrations/supabase/predios';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import { useAuditLog } from './useAuditLog';
import { BuildingWithStatus, GeneratedListItem } from '@/lib/predios/types';
import { calculateBuildingStatus } from '@/lib/predios/building-utils';

export interface ListItemWithProgress extends GeneratedListItem {
  building: BuildingWithStatus;
  completed_letters_count: number;
}

// Get a single list item with full building data
export function useListItem(listItemId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['list-item', listItemId],
    queryFn: async (): Promise<ListItemWithProgress | null> => {
      if (!listItemId) return null;

      const { data, error } = await supabase
        .from('generated_list_items')
        .select(`
          *,
          building:buildings(*)
        `)
        .eq('id', listItemId)
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        ...data,
        building: calculateBuildingStatus(data.building),
        completed_letters_count: data.completed_letters_count ?? 0,
      } as ListItemWithProgress;
    },
        // Refetch more frequently to keep data fresh
    staleTime: 5000,
    refetchOnMount: 'always',
  });
}

// Get list items with real-time progress for a list
export function useListItemsWithProgress(listId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['list-items-progress', listId],
    queryFn: async (): Promise<ListItemWithProgress[]> => {
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
        building: calculateBuildingStatus(item.building),
        completed_letters_count: item.completed_letters_count ?? 0,
      })) as ListItemWithProgress[];
    },
        // Refetch more frequently
    staleTime: 5000,
    refetchOnMount: 'always',
  });
}

// Get navigation info for a list item (prev/next buildings)
export function useListItemNavigation(listId: string, currentItemId: string | undefined) {
  const { data: items } = useListItemsWithProgress(listId);

  if (!items || !currentItemId) {
    return { prev: null, next: null, current: null, total: 0, position: 0 };
  }

  const currentIndex = items.findIndex(item => item.id === currentItemId);
  if (currentIndex === -1) {
    return { prev: null, next: null, current: null, total: items.length, position: 0 };
  }

  return {
    prev: currentIndex > 0 ? items[currentIndex - 1] : null,
    next: currentIndex < items.length - 1 ? items[currentIndex + 1] : null,
    current: items[currentIndex],
    total: items.length,
    position: currentIndex + 1,
  };
}

// Update planned letters count for a list item
export function useUpdatePlannedLetters() {
  const queryClient = useQueryClient();
  const { log } = useAuditLog();

  return useMutation({
    mutationFn: async ({ itemId, plannedCount, listId }: { 
      itemId: string; 
      plannedCount: number;
      listId: string;
    }) => {
      const { data: oldItem } = await supabase
        .from('generated_list_items')
        .select('letters_planned')
        .eq('id', itemId)
        .single();

      const { error } = await supabase
        .from('generated_list_items')
        .update({ letters_planned: plannedCount })
        .eq('id', itemId);

      if (error) throw error;

      await log({
        action: 'LIST_ITEM_UPDATED',
        entityType: 'generated_list_item',
        entityId: itemId,
        oldData: { letters_planned: oldItem?.letters_planned },
        newData: { letters_planned: plannedCount },
      });

      return { listId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['list-items-progress', data.listId] });
      queryClient.invalidateQueries({ queryKey: ['generated-list-items'] });
      toast({ title: 'Meta de cartas atualizada!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar meta', description: error.message, variant: 'destructive' });
    },
  });
}

// Manually complete a list item
export function useCompleteListItem() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { log } = useAuditLog();

  return useMutation({
    mutationFn: async ({ 
      itemId, 
      listId,
      buildingId,
      reason 
    }: { 
      itemId: string; 
      listId: string;
      buildingId: string;
      reason?: string;
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

      // Update building's last_worked_at
      const { error: buildingError } = await supabase
        .from('buildings')
        .update({
          last_worked_at: today,
          last_letter_sent_at: today,
        })
        .eq('id', buildingId);

      if (buildingError) throw buildingError;

      await log({
        action: 'LIST_ITEM_COMPLETED',
        entityType: 'generated_list_item',
        entityId: itemId,
        newData: { 
          completed_by: user!.id,
          completed_at: new Date().toISOString(),
          completion_reason: reason || 'manual',
        },
      });

      return { listId, itemId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['list-items-progress', data.listId] });
      queryClient.invalidateQueries({ queryKey: ['list-item', data.itemId] });
      queryClient.invalidateQueries({ queryKey: ['generated-list-items'] });
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      toast({ title: 'Prédio marcado como concluído!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao concluir item', description: error.message, variant: 'destructive' });
    },
  });
}

// Undo completion of a list item
export function useUndoCompleteListItem() {
  const queryClient = useQueryClient();
  const { log } = useAuditLog();

  return useMutation({
    mutationFn: async ({ 
      itemId, 
      listId 
    }: { 
      itemId: string; 
      listId: string;
    }) => {
      const { error } = await supabase
        .from('generated_list_items')
        .update({
          is_completed: false,
          completed_at: null,
        })
        .eq('id', itemId);

      if (error) throw error;

      await log({
        action: 'LIST_ITEM_UPDATED',
        entityType: 'generated_list_item',
        entityId: itemId,
        newData: { 
          action: 'undo_completion',
        },
      });

      return { listId, itemId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['list-items-progress', data.listId] });
      queryClient.invalidateQueries({ queryKey: ['list-item', data.itemId] });
      queryClient.invalidateQueries({ queryKey: ['generated-list-items'] });
      toast({ title: 'Conclusão desfeita' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao desfazer conclusão', description: error.message, variant: 'destructive' });
    },
  });
}

// Create session linked to list item
export function useCreateListLinkedSession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { log } = useAuditLog();

  return useMutation({
    mutationFn: async ({ 
      buildingId, 
      listItemId,
      listId,
      plannedCount, 
      apartmentIds 
    }: { 
      buildingId: string;
      listItemId: string;
      listId: string;
      plannedCount: number;
      apartmentIds: string[];
    }) => {
      // Create session with list_item_id
      const { data: session, error: sessionError } = await supabase
        .from('letter_sessions')
        .insert({
          building_id: buildingId,
          user_id: user!.id,
          planned_count: plannedCount,
          status: 'in_progress',
          list_item_id: listItemId,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Add apartments to session
      const sessionApartments = apartmentIds.map(aptId => ({
        session_id: session.id,
        apartment_id: aptId,
      }));

      const { error: aptsError } = await supabase
        .from('letter_session_apartments')
        .insert(sessionApartments);

      if (aptsError) throw aptsError;

      await log({
        action: 'SESSION_CREATED',
        entityType: 'letter_session',
        entityId: session.id,
        newData: {
          building_id: buildingId,
          list_item_id: listItemId,
          planned_count: plannedCount,
          apartments: apartmentIds.length,
        },
      });

      return { session, buildingId, listId, listItemId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['letter-sessions', data.buildingId] });
      queryClient.invalidateQueries({ queryKey: ['active-letter-session', data.buildingId] });
      queryClient.invalidateQueries({ queryKey: ['list-items-progress', data.listId] });
      queryClient.invalidateQueries({ queryKey: ['list-item', data.listItemId] });
      toast({ title: 'Sessão de cartas criada!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao criar sessão', description: error.message, variant: 'destructive' });
    },
  });
}

// Refresh list progress - helper to refetch list data
export function useRefreshListProgress() {
  const queryClient = useQueryClient();

  return (listId: string, listItemId?: string) => {
    queryClient.invalidateQueries({ queryKey: ['list-items-progress', listId] });
    if (listItemId) {
      queryClient.invalidateQueries({ queryKey: ['list-item', listItemId] });
    }
  };
}
