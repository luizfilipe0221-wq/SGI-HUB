import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabasePredios as supabase } from '@/integrations/supabase/predios';
import { useAuth } from './useAuth';
import { useAuditLog } from './useAuditLog';
import { toast } from '@/hooks/use-toast';
import { UndoAction, UndoActionType } from '@/lib/predios/list-generation-types';

// In-memory undo stack (session-based, clears on page refresh)
let undoStack: UndoAction[] = [];

export function useUndoActions() {
  const { user } = useAuth();
  const { log } = useAuditLog();
  const queryClient = useQueryClient();
  const [lastAction, setLastAction] = useState<UndoAction | null>(null);

  // Sync with local stack
  useEffect(() => {
    const latest = undoStack[undoStack.length - 1];
    setLastAction(latest || null);
  }, []);

  const pushUndo = useCallback(async (action: Omit<UndoAction, 'id' | 'user_id' | 'created_at' | 'expires_at' | 'can_undo'>) => {
    const newAction: UndoAction = {
      id: crypto.randomUUID(),
      user_id: user?.id || '',
      ...action,
      can_undo: true,
      created_at: new Date().toISOString(),
      expires_at: null, // null = session-based
    };

    undoStack.push(newAction);
    setLastAction(newAction);

    // Optionally persist to DB for cross-session undo
    // For now, we keep it in memory only (session-based)

    return newAction;
  }, [user]);

  const performUndo = useMutation({
    mutationFn: async () => {
      const action = undoStack.pop();
      if (!action) {
        throw new Error('Nenhuma ação para desfazer');
      }

      // Perform undo based on action type
      switch (action.action_type) {
        case 'MARK_APARTMENT': {
          // Revert: unmark apartment
          const { error } = await supabase
            .from('building_apartments')
            .update({
              letter_done: false,
              letter_done_at: null,
              letter_done_by: null,
            })
            .eq('id', action.entity_id);

          if (error) throw error;

          // Also update session if applicable
          if (action.current_state?.session_apartment_id) {
            await supabase
              .from('letter_session_apartments')
              .update({ completed_at: null })
              .eq('id', action.current_state.session_apartment_id as string);

            // Update session completed_count
            if (action.current_state?.session_id) {
              const { data: session } = await supabase
                .from('letter_sessions')
                .select('completed_count')
                .eq('id', action.current_state.session_id as string)
                .single();

              if (session) {
                await supabase
                  .from('letter_sessions')
                  .update({ completed_count: Math.max(0, session.completed_count - 1) })
                  .eq('id', action.current_state.session_id as string);
              }
            }
          }
          break;
        }

        case 'UNMARK_APARTMENT': {
          // Revert: mark apartment again
          const prev = action.previous_state;
          const { error } = await supabase
            .from('building_apartments')
            .update({
              letter_done: true,
              letter_done_at: prev?.letter_done_at as string || new Date().toISOString(),
              letter_done_by: prev?.letter_done_by as string || user?.id,
            })
            .eq('id', action.entity_id);

          if (error) throw error;
          break;
        }

        case 'CREATE_SESSION': {
          // Revert: delete the session
          // First reset any apartments that were marked
          const { data: sessionApts } = await supabase
            .from('letter_session_apartments')
            .select('apartment_id')
            .eq('session_id', action.entity_id);

          if (sessionApts?.length) {
            await supabase
              .from('building_apartments')
              .update({
                letter_done: false,
                letter_done_at: null,
                letter_done_by: null,
              })
              .in('id', sessionApts.map(a => a.apartment_id));
          }

          // Delete session apartments
          await supabase
            .from('letter_session_apartments')
            .delete()
            .eq('session_id', action.entity_id);

          // Delete session
          const { error } = await supabase
            .from('letter_sessions')
            .delete()
            .eq('id', action.entity_id);

          if (error) throw error;
          break;
        }

        case 'COMPLETE_SESSION': {
          // Revert: set status back to in_progress
          const { error } = await supabase
            .from('letter_sessions')
            .update({
              status: 'in_progress',
              completed_at: null,
            })
            .eq('id', action.entity_id);

          if (error) throw error;
          break;
        }

        case 'CANCEL_SESSION': {
          // Revert: set status back to in_progress
          const { error } = await supabase
            .from('letter_sessions')
            .update({
              status: 'in_progress',
            })
            .eq('id', action.entity_id);

          if (error) throw error;
          break;
        }

        default:
          throw new Error(`Tipo de ação não suportada: ${action.action_type}`);
      }

      // Audit log
      await log({
        action: 'LIST_ITEM_UPDATED', // Using existing action type
        entityType: action.entity_type as 'building' | 'generated_list' | 'generated_list_item' | 'letter_session' | 'apartment',
        entityId: action.entity_id,
        oldData: action.current_state as Record<string, unknown>,
        newData: { undone: true, action_type: action.action_type },
      });

      setLastAction(undoStack[undoStack.length - 1] || null);

      return action;
    },
    onSuccess: (action) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['building-apartments'] });
      queryClient.invalidateQueries({ queryKey: ['apartment-progress'] });
      queryClient.invalidateQueries({ queryKey: ['letter-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['active-letter-session'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['buildings'] });

      const actionLabels: Record<UndoActionType, string> = {
        MARK_APARTMENT: 'Marcação de apartamento',
        UNMARK_APARTMENT: 'Desmarcação de apartamento',
        CREATE_SESSION: 'Criação de sessão',
        COMPLETE_SESSION: 'Conclusão de sessão',
        CANCEL_SESSION: 'Cancelamento de sessão',
        DELETE_SESSION: 'Exclusão de sessão',
        REMOVE_APARTMENT_FROM_SESSION: 'Remoção de apartamento',
      };

      toast({ 
        title: 'Ação desfeita!',
        description: `${actionLabels[action.action_type] || action.action_type} foi revertida.`,
      });
    },
    onError: (error) => {
      toast({ title: 'Erro ao desfazer', description: error.message, variant: 'destructive' });
    },
  });

  const canUndo = undoStack.length > 0;

  const clearUndoStack = useCallback(() => {
    undoStack = [];
    setLastAction(null);
  }, []);

  return {
    pushUndo,
    performUndo: performUndo.mutate,
    isUndoing: performUndo.isPending,
    canUndo,
    lastAction,
    clearUndoStack,
    undoStackSize: undoStack.length,
  };
}
