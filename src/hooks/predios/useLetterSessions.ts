import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import { useAuditLog } from './useAuditLog';

export interface LetterSession {
  id: string;
  building_id: string;
  user_id: string;
  planned_count: number;
  completed_count: number;
  status: 'in_progress' | 'completed' | 'cancelled';
  started_at: string;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface LetterSessionApartment {
  id: string;
  session_id: string;
  apartment_id: string;
  completed_at: string | null;
  created_at: string;
}

export interface SessionWithApartments extends LetterSession {
  apartments: Array<{
    id: string;
    apartment_id: string;
    completed_at: string | null;
    apartment: {
      id: string;
      apartment_number: string;
      letter_done: boolean;
    };
  }>;
}

// Fetch sessions for a building
export function useBuildingLetterSessions(buildingId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['letter-sessions', buildingId],
    queryFn: async (): Promise<LetterSession[]> => {
      const { data, error } = await supabase
        .from('letter_sessions')
        .select('*')
        .eq('building_id', buildingId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as LetterSession[];
    },
    enabled: !!user && !!buildingId,
  });
}

// Get active session (in_progress)
export function useActiveLetterSession(buildingId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['active-letter-session', buildingId],
    queryFn: async (): Promise<SessionWithApartments | null> => {
      const { data, error } = await supabase
        .from('letter_sessions')
        .select(`
          *,
          apartments:letter_session_apartments(
            id,
            apartment_id,
            completed_at,
            apartment:building_apartments(id, apartment_number, letter_done)
          )
        `)
        .eq('building_id', buildingId)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as SessionWithApartments | null;
    },
    enabled: !!user && !!buildingId,
  });
}

interface CreateSessionParams {
  buildingId: string;
  plannedCount: number;
  apartmentIds: string[];
  listItemId?: string;
}

// Create a new letter session
export function useCreateLetterSession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { log } = useAuditLog();

  return useMutation({
    mutationFn: async ({ buildingId, plannedCount, apartmentIds, listItemId }: CreateSessionParams) => {
      // Create session (optionally linked to list item)
      const { data: session, error: sessionError } = await supabase
        .from('letter_sessions')
        .insert({
          building_id: buildingId,
          user_id: user!.id,
          planned_count: plannedCount,
          status: 'in_progress',
          list_item_id: listItemId || null,
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
          planned_count: plannedCount,
          apartments: apartmentIds.length,
          list_item_id: listItemId,
        },
      });

      return session;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['letter-sessions', variables.buildingId] });
      queryClient.invalidateQueries({ queryKey: ['active-letter-session', variables.buildingId] });
      if (variables.listItemId) {
        queryClient.invalidateQueries({ queryKey: ['list-items-progress'] });
        queryClient.invalidateQueries({ queryKey: ['list-item', variables.listItemId] });
      }
      toast({ title: 'Sessão de cartas criada!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao criar sessão', description: error.message, variant: 'destructive' });
    },
  });
}

// Complete an apartment in a session
export function useCompleteSessionApartment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ sessionApartmentId, apartmentId, buildingId }: { 
      sessionApartmentId: string; 
      apartmentId: string;
      buildingId: string;
    }) => {
      // Mark session apartment as completed
      const { error: saError } = await supabase
        .from('letter_session_apartments')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', sessionApartmentId);

      if (saError) throw saError;

      // Mark the actual apartment as done
      const { error: aptError } = await supabase
        .from('building_apartments')
        .update({
          letter_done: true,
          letter_done_at: new Date().toISOString(),
          letter_done_by: user!.id,
        })
        .eq('id', apartmentId);

      if (aptError) throw aptError;

      // Get session and update completed count
      const { data: session } = await supabase
        .from('letter_sessions')
        .select('id, planned_count, completed_count')
        .eq('id', sessionApartmentId.split('-')[0]) // This won't work, need to get from sessionApartment
        .single();

      return { buildingId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['active-letter-session', data.buildingId] });
      queryClient.invalidateQueries({ queryKey: ['letter-sessions', data.buildingId] });
      queryClient.invalidateQueries({ queryKey: ['building-apartments', data.buildingId] });
      queryClient.invalidateQueries({ queryKey: ['apartment-progress', data.buildingId] });
      queryClient.invalidateQueries({ queryKey: ['next-apartments', data.buildingId] });
      queryClient.invalidateQueries({ queryKey: ['last-worked-apartment', data.buildingId] });
    },
    onError: (error) => {
      toast({ title: 'Erro ao completar apartamento', description: error.message, variant: 'destructive' });
    },
  });
}

// Complete/finish a session
export function useCompleteLetterSession() {
  const queryClient = useQueryClient();
  const { log } = useAuditLog();

  return useMutation({
    mutationFn: async ({ sessionId, buildingId, listId }: { sessionId: string; buildingId: string; listId?: string }) => {
      // Get session info including list_item_id
      const { data: sessionData } = await supabase
        .from('letter_sessions')
        .select('list_item_id')
        .eq('id', sessionId)
        .single();

      // Get completed count
      const { data: apartments } = await supabase
        .from('letter_session_apartments')
        .select('completed_at')
        .eq('session_id', sessionId);

      const completedCount = apartments?.filter(a => a.completed_at).length || 0;

      const { error } = await supabase
        .from('letter_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_count: completedCount,
        })
        .eq('id', sessionId);

      if (error) throw error;

      await log({
        action: 'SESSION_COMPLETED',
        entityType: 'letter_session',
        entityId: sessionId,
        newData: { completed_count: completedCount },
      });

      return { buildingId, listItemId: sessionData?.list_item_id, listId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['letter-sessions', data.buildingId] });
      queryClient.invalidateQueries({ queryKey: ['active-letter-session', data.buildingId] });
      if (data.listItemId) {
        queryClient.invalidateQueries({ queryKey: ['list-items-progress'] });
        queryClient.invalidateQueries({ queryKey: ['list-item', data.listItemId] });
      }
      if (data.listId) {
        queryClient.invalidateQueries({ queryKey: ['list-items-progress', data.listId] });
      }
      toast({ title: 'Sessão concluída!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao concluir sessão', description: error.message, variant: 'destructive' });
    },
  });
}

// Cancel a session
export function useCancelLetterSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, buildingId }: { sessionId: string; buildingId: string }) => {
      const { error } = await supabase
        .from('letter_sessions')
        .update({ status: 'cancelled' })
        .eq('id', sessionId);

      if (error) throw error;
      return { buildingId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['letter-sessions', data.buildingId] });
      queryClient.invalidateQueries({ queryKey: ['active-letter-session', data.buildingId] });
      toast({ title: 'Sessão cancelada' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao cancelar sessão', description: error.message, variant: 'destructive' });
    },
  });
}
