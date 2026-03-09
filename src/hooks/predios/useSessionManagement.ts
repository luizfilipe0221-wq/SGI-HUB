import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabasePredios as supabase } from '@/integrations/supabase/predios';
import { useAuth } from './useAuth';
import { useAuditLog } from './useAuditLog';
import { usePermissions } from './usePermissions';
import { toast } from '@/hooks/use-toast';
import { SessionWithDetails } from '@/lib/predios/list-generation-types';
import { useUndoActions } from './useUndoActions';

// Fetch all sessions for a building with full details
export function useBuildingSessionsDetailed(buildingId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['building-sessions-detailed', buildingId],
    queryFn: async (): Promise<SessionWithDetails[]> => {
      const { data, error } = await supabase
        .from('letter_sessions')
        .select(`
          *,
          apartments:letter_session_apartments(
            id,
            apartment_id,
            completed_at,
            apartment:building_apartments(
              id,
              apartment_number,
              letter_done,
              floor:building_floors(floor_label, floor_number)
            )
          ),
          list_item:generated_list_items(
            id,
            list_number,
            generated_list:generated_lists(id, name)
          )
        `)
        .eq('building_id', buildingId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(session => ({
        ...session,
        status: session.status as 'in_progress' | 'completed' | 'cancelled',
        apartments: (session.apartments || []).map((apt: {
          id: string;
          apartment_id: string;
          completed_at: string | null;
          apartment: {
            id: string;
            apartment_number: string;
            letter_done: boolean;
            floor: { floor_label: string; floor_number: number };
          };
        }) => ({
          id: apt.id,
          apartment_id: apt.apartment_id,
          completed_at: apt.completed_at,
          apartment: apt.apartment,
        })),
        list_item: session.list_item?.[0] || null,
      })) as SessionWithDetails[];
    },
  });
}

// Check if user can manage progress
export function useCanManageProgress() {
  const { hasPermission, isAdmin } = usePermissions();
  return isAdmin || hasPermission('manage_progress' as const);
}

// Delete a session and revert all its markings
export function useDeleteSession() {
  const queryClient = useQueryClient();
  const { log } = useAuditLog();
  const { pushUndo } = useUndoActions();

  return useMutation({
    mutationFn: async ({ session, buildingId }: { session: SessionWithDetails; buildingId: string }) => {
      // First, get all apartments in this session
      const apartmentIds = session.apartments.map(a => a.apartment_id);

      // Revert apartment markings
      if (apartmentIds.length > 0) {
        const { error: revertError } = await supabase
          .from('building_apartments')
          .update({
            letter_done: false,
            letter_done_at: null,
            letter_done_by: null,
          })
          .in('id', apartmentIds);

        if (revertError) throw revertError;
      }

      // Delete session apartments
      const { error: aptsError } = await supabase
        .from('letter_session_apartments')
        .delete()
        .eq('session_id', session.id);

      if (aptsError) throw aptsError;

      // Delete session
      const { error } = await supabase
        .from('letter_sessions')
        .delete()
        .eq('id', session.id);

      if (error) throw error;

      // Audit log
      await log({
        action: 'SESSION_CANCELLED',
        entityType: 'letter_session',
        entityId: session.id,
        oldData: {
          planned_count: session.planned_count,
          completed_count: session.completed_count,
          apartments_reverted: apartmentIds.length,
        },
      });

      // Track for undo (note: delete can't be undone since we don't store full state)
      // But we log it for audit purposes

      return { buildingId, revertedCount: apartmentIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['building-sessions-detailed', data.buildingId] });
      queryClient.invalidateQueries({ queryKey: ['letter-sessions', data.buildingId] });
      queryClient.invalidateQueries({ queryKey: ['active-letter-session', data.buildingId] });
      queryClient.invalidateQueries({ queryKey: ['building-apartments', data.buildingId] });
      queryClient.invalidateQueries({ queryKey: ['apartment-progress', data.buildingId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['buildings'] });

      toast({
        title: 'Sessão excluída!',
        description: `${data.revertedCount} apartamento(s) foram revertidos.`,
      });
    },
    onError: (error) => {
      toast({ title: 'Erro ao excluir sessão', description: error.message, variant: 'destructive' });
    },
  });
}

// Unmark a specific apartment from a session
export function useUnmarkSessionApartment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { log } = useAuditLog();
  const { pushUndo } = useUndoActions();

  return useMutation({
    mutationFn: async ({
      sessionApartmentId,
      apartmentId,
      buildingId,
      sessionId,
    }: {
      sessionApartmentId: string;
      apartmentId: string;
      buildingId: string;
      sessionId: string;
    }) => {
      // Get current state for undo
      const { data: currentApt } = await supabase
        .from('building_apartments')
        .select('letter_done, letter_done_at, letter_done_by')
        .eq('id', apartmentId)
        .single();

      // Unmark the apartment
      const { error: aptError } = await supabase
        .from('building_apartments')
        .update({
          letter_done: false,
          letter_done_at: null,
          letter_done_by: null,
        })
        .eq('id', apartmentId);

      if (aptError) throw aptError;

      // Update session apartment
      const { error: saError } = await supabase
        .from('letter_session_apartments')
        .update({ completed_at: null })
        .eq('id', sessionApartmentId);

      if (saError) throw saError;

      // Update session completed_count
      const { data: session } = await supabase
        .from('letter_sessions')
        .select('completed_count')
        .eq('id', sessionId)
        .single();

      if (session) {
        const newCount = Math.max(0, session.completed_count - 1);
        await supabase
          .from('letter_sessions')
          .update({
            completed_count: newCount,
            // If was completed, reopen it
            status: 'in_progress',
            completed_at: null,
          })
          .eq('id', sessionId);
      }

      // Track for undo
      await pushUndo({
        action_type: 'UNMARK_APARTMENT',
        entity_type: 'building_apartments',
        entity_id: apartmentId,
        previous_state: currentApt as Record<string, unknown>,
        current_state: { letter_done: false },
      });

      // Audit log
      await log({
        action: 'APARTMENT_MARKED',
        entityType: 'apartment',
        entityId: apartmentId,
        oldData: currentApt as Record<string, unknown>,
        newData: { letter_done: false, unmarked_by: user?.id },
      });

      return { buildingId, sessionId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['building-sessions-detailed', data.buildingId] });
      queryClient.invalidateQueries({ queryKey: ['letter-sessions', data.buildingId] });
      queryClient.invalidateQueries({ queryKey: ['active-letter-session', data.buildingId] });
      queryClient.invalidateQueries({ queryKey: ['building-apartments', data.buildingId] });
      queryClient.invalidateQueries({ queryKey: ['apartment-progress', data.buildingId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['buildings'] });

      toast({ title: 'Apartamento desmarcado!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao desmarcar', description: error.message, variant: 'destructive' });
    },
  });
}

// Remove apartment from session (without unmarking if it was marked elsewhere)
export function useRemoveApartmentFromSession() {
  const queryClient = useQueryClient();
  const { log } = useAuditLog();

  return useMutation({
    mutationFn: async ({
      sessionApartmentId,
      buildingId,
      sessionId,
    }: {
      sessionApartmentId: string;
      buildingId: string;
      sessionId: string;
    }) => {
      // Get session apartment info
      const { data: sa } = await supabase
        .from('letter_session_apartments')
        .select('apartment_id, completed_at')
        .eq('id', sessionApartmentId)
        .single();

      const wasCompleted = !!sa?.completed_at;

      // Delete from session
      const { error } = await supabase
        .from('letter_session_apartments')
        .delete()
        .eq('id', sessionApartmentId);

      if (error) throw error;

      // Update session counts
      const { data: session } = await supabase
        .from('letter_sessions')
        .select('planned_count, completed_count')
        .eq('id', sessionId)
        .single();

      if (session) {
        await supabase
          .from('letter_sessions')
          .update({
            planned_count: session.planned_count - 1,
            completed_count: wasCompleted ? session.completed_count - 1 : session.completed_count,
          })
          .eq('id', sessionId);
      }

      // Audit log
      await log({
        action: 'APARTMENT_MARKED',
        entityType: 'apartment',
        entityId: sa?.apartment_id || sessionApartmentId,
        newData: { removed_from_session: sessionId },
      });

      return { buildingId, sessionId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['building-sessions-detailed', data.buildingId] });
      queryClient.invalidateQueries({ queryKey: ['letter-sessions', data.buildingId] });
      queryClient.invalidateQueries({ queryKey: ['active-letter-session', data.buildingId] });

      toast({ title: 'Apartamento removido da sessão!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    },
  });
}
