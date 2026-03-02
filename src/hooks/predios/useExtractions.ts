import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/predios/useAuth';
import { useAuditLog } from '@/hooks/predios/useAuditLog';
import { toast } from '@/hooks/use-toast';

export interface Extraction {
  id: string;
  user_id: string;
  original_filename: string;
  storage_path: string;
  file_type: string;
  file_size: number;
  status: string;
  error_message: string | null;
  total_records: number;
  processed_records: number;
  reviewed_records: number;
  created_at: string;
  processed_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface ExtractedBuilding {
  id: string;
  extraction_id: string;
  user_id: string;
  name: string | null;
  address_street: string | null;
  address_number: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  full_address: string | null;
  quadra: string | null;
  lote: string | null;
  conjunto: string | null;
  building_identifier: string | null;
  units_total: number | null;
  notes: string | null;
  source_page: number | null;
  source_line: number | null;
  source_sheet: string | null;
  source_row: number | null;
  raw_data: Record<string, unknown> | null;
  status: string;
  validation_errors: string[] | null;
  created_at: string;
  reviewed_at: string | null;
  imported_building_id: string | null;
}

export function useExtractions() {
  const { user } = useAuth();
  const { log } = useAuditLog();
  const queryClient = useQueryClient();

  const { data: extractions, isLoading } = useQuery({
    queryKey: ['extractions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('extractions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Extraction[];
    },
    enabled: !!user,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('User not authenticated');

      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileType = fileExt === 'pdf' ? 'pdf' : fileExt === 'xlsx' ? 'xlsx' : 'xls';
      const storagePath = `${user.id}/${Date.now()}_${file.name}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      // Create extraction record
      const { data: extraction, error: insertError } = await supabase
        .from('extractions')
        .insert({
          user_id: user.id,
          original_filename: file.name,
          storage_path: storagePath,
          file_type: fileType,
          file_size: file.size,
          status: 'uploaded',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await log({
        action: 'FILE_UPLOADED',
        entityType: 'file',
        entityId: extraction.id,
        newData: { filename: file.name, size: file.size },
      });

      return extraction as Extraction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extractions'] });
      toast({ title: 'Sucesso', description: 'Arquivo enviado com sucesso' });
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast({ title: 'Erro', description: 'Falha ao enviar arquivo', variant: 'destructive' });
    },
  });

  const processMutation = useMutation({
    mutationFn: async (extractionId: string) => {
      const { data, error } = await supabase.functions.invoke('process-extraction', {
        body: { extractionId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extractions'] });
      toast({ title: 'Sucesso', description: 'Extração processada' });
    },
    onError: (error) => {
      console.error('Process error:', error);
      toast({ title: 'Erro', description: 'Falha ao processar extração', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (extraction: Extraction) => {
      // Delete from storage
      await supabase.storage.from('uploads').remove([extraction.storage_path]);
      
      // Delete extraction (cascades to extracted_buildings)
      const { error } = await supabase
        .from('extractions')
        .delete()
        .eq('id', extraction.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extractions'] });
      toast({ title: 'Sucesso', description: 'Extração excluída' });
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast({ title: 'Erro', description: 'Falha ao excluir extração', variant: 'destructive' });
    },
  });

  return {
    extractions,
    isLoading,
    upload: uploadMutation.mutateAsync,
    uploading: uploadMutation.isPending,
    process: processMutation.mutateAsync,
    processing: processMutation.isPending,
    deleteExtraction: deleteMutation.mutateAsync,
    deleting: deleteMutation.isPending,
  };
}

export function useExtractedBuildings(extractionId: string | undefined) {
  const { user } = useAuth();
  const { log } = useAuditLog();
  const queryClient = useQueryClient();

  const { data: buildings, isLoading } = useQuery({
    queryKey: ['extracted-buildings', extractionId],
    queryFn: async () => {
      if (!extractionId) return [];

      const { data, error } = await supabase
        .from('extracted_buildings')
        .select('*')
        .eq('extraction_id', extractionId)
        .order('source_row', { ascending: true });

      if (error) throw error;
      return data as ExtractedBuilding[];
    },
    enabled: !!extractionId && !!user,
  });

  const updateBuildingMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase
        .from('extracted_buildings')
        .update(updates as any)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extracted-buildings', extractionId] });
    },
  });

  const approveBuildingMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('extracted_buildings')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extracted-buildings', extractionId] });
    },
  });

  const rejectBuildingMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('extracted_buildings')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extracted-buildings', extractionId] });
    },
  });

  const importBuildingsMutation = useMutation({
    mutationFn: async (buildingIds: string[]) => {
      if (!user) throw new Error('User not authenticated');

      // Get approved buildings
      const { data: toImport, error: fetchError } = await supabase
        .from('extracted_buildings')
        .select('*')
        .in('id', buildingIds)
        .eq('status', 'approved');

      if (fetchError) throw fetchError;
      if (!toImport || toImport.length === 0) throw new Error('No buildings to import');

      // Import each building
      for (const extracted of toImport) {
        const address = [
          extracted.address_street,
          extracted.address_number,
          extracted.address_neighborhood,
          extracted.address_city,
          extracted.address_state,
          extracted.address_zip,
        ].filter(Boolean).join(', ') || extracted.full_address || 'Endereço não informado';

        const { data: building, error: insertError } = await supabase
          .from('buildings')
          .insert({
            user_id: user.id,
            territory_id: 1, // Default territory
            name: extracted.name || extracted.building_identifier || 'Prédio Importado',
            address,
            floors_count: 1, // Default
            apartments_total: extracted.units_total,
            notes: extracted.notes,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Update extracted building
        await supabase
          .from('extracted_buildings')
          .update({
            status: 'imported',
            imported_building_id: building.id,
          })
          .eq('id', extracted.id);
      }

      // Update extraction
      if (extractionId) {
        await supabase
          .from('extractions')
          .update({
            status: 'reviewed',
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id,
            reviewed_records: toImport.length,
          })
          .eq('id', extractionId);

        await log({
          action: 'EXTRACTION_REVIEWED',
          entityType: 'extraction',
          entityId: extractionId,
          newData: { imported_count: toImport.length },
        });
      }

      return toImport.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['extracted-buildings', extractionId] });
      queryClient.invalidateQueries({ queryKey: ['extractions'] });
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      toast({ title: 'Sucesso', description: `${count} prédio(s) importado(s)` });
    },
    onError: (error) => {
      console.error('Import error:', error);
      toast({ title: 'Erro', description: 'Falha ao importar prédios', variant: 'destructive' });
    },
  });

  return {
    buildings,
    isLoading,
    updateBuilding: updateBuildingMutation.mutateAsync,
    approveBuilding: approveBuildingMutation.mutateAsync,
    rejectBuilding: rejectBuildingMutation.mutateAsync,
    importBuildings: importBuildingsMutation.mutateAsync,
    importing: importBuildingsMutation.isPending,
  };
}
