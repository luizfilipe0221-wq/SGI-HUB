import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/predios/useAuth';
import { useAuditLog } from '@/hooks/predios/useAuditLog';
import { toast } from '@/hooks/use-toast';

interface ExportOptions {
  format: 'csv' | 'xlsx';
  territoryId?: number;
}

export function useExport() {
  const { user } = useAuth();
  const { log } = useAuditLog();

  const exportBuildings = useCallback(async (options: ExportOptions) => {
    if (!user) {
      toast({ title: 'Erro', description: 'Usuário não autenticado', variant: 'destructive' });
      return;
    }

    try {
      // Fetch buildings
      let query = supabase
        .from('buildings')
        .select('*, territories(name)')
        .order('territory_id')
        .order('name');

      if (options.territoryId) {
        query = query.eq('territory_id', options.territoryId);
      }

      const { data: buildings, error } = await query;
      if (error) throw error;
      if (!buildings || buildings.length === 0) {
        toast({ title: 'Atenção', description: 'Nenhum dado para exportar', variant: 'destructive' });
        return;
      }

      // Format data
      const rows = buildings.map((b: any) => ({
        'Território': b.territories?.name || `Território ${b.territory_id}`,
        'Nome': b.name,
        'Endereço': b.address,
        'Andares': b.floors_count,
        'Apts/Andar': b.apartments_per_floor || '-',
        'Total Apts': b.apartments_total || '-',
        'Ciclo (dias)': b.custom_cycle_days || b.default_cycle_days,
        'Última Carta': b.last_letter_sent_at || '-',
        'Último Trabalho': b.last_worked_at || '-',
        'Andares Feitos': b.progress_floors_done,
        'Apts Feitos': b.progress_apartments_done,
        'Notas': b.notes || '-',
        'Criado em': new Date(b.created_at).toLocaleDateString('pt-BR'),
      }));

      if (options.format === 'csv') {
        // Generate CSV
        const headers = Object.keys(rows[0]);
        const csvContent = [
          headers.join(';'),
          ...rows.map(row => headers.map(h => `"${(row as any)[h] || ''}"`).join(';'))
        ].join('\n');

        // Download
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `predios_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // For XLSX, we'll use a simple CSV approach since xlsx library is heavy
        // In production, you'd use xlsx library
        const headers = Object.keys(rows[0]);
        const csvContent = [
          headers.join('\t'),
          ...rows.map(row => headers.map(h => (row as any)[h] || '').join('\t'))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `predios_${new Date().toISOString().split('T')[0]}.xls`;
        a.click();
        URL.revokeObjectURL(url);
      }

      await log({
        action: 'DATA_EXPORTED',
        entityType: 'building',
        newData: { format: options.format, count: buildings.length, territoryId: options.territoryId },
      });

      toast({ title: 'Sucesso', description: `${buildings.length} registro(s) exportado(s)` });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: 'Erro', description: 'Falha ao exportar dados', variant: 'destructive' });
    }
  }, [user, log]);

  return { exportBuildings };
}
