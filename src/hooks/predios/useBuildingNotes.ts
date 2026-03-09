import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabasePredios as supabase } from '@/integrations/supabase/predios';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import { useAuditLog } from './useAuditLog';

export interface BuildingNote {
  id: string;
  building_id: string;
  user_id: string;
  content: string;
  is_current: boolean;
  created_at: string;
}

// Fetch current note for a building
export function useCurrentBuildingNote(buildingId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['building-note-current', buildingId],
    queryFn: async (): Promise<BuildingNote | null> => {
      const { data, error } = await supabase
        .from('building_notes')
        .select('*')
        .eq('building_id', buildingId)
        .eq('is_current', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
      });
}

// Fetch note history for a building
export function useBuildingNotesHistory(buildingId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['building-notes-history', buildingId],
    queryFn: async (): Promise<BuildingNote[]> => {
      const { data, error } = await supabase
        .from('building_notes')
        .select('*')
        .eq('building_id', buildingId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
      });
}

// Save/update building note
export function useSaveBuildingNote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { log } = useAuditLog();

  return useMutation({
    mutationFn: async ({ buildingId, content }: { buildingId: string; content: string }) => {
      // First, mark all existing notes as not current
      await supabase
        .from('building_notes')
        .update({ is_current: false })
        .eq('building_id', buildingId)
        .eq('is_current', true);

      // Insert new note as current
      const { data, error } = await supabase
        .from('building_notes')
        .insert({
          building_id: buildingId,
          user_id: user!.id,
          content: content.trim(),
          is_current: true,
        })
        .select()
        .single();

      if (error) throw error;

      await log({
        action: 'BUILDING_UPDATED',
        entityType: 'building',
        entityId: buildingId,
        newData: { notes_updated: true, content_length: content.length },
      });

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['building-note-current', variables.buildingId] });
      queryClient.invalidateQueries({ queryKey: ['building-notes-history', variables.buildingId] });
      toast({ title: 'Observações salvas!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao salvar observações', description: error.message, variant: 'destructive' });
    },
  });
}
