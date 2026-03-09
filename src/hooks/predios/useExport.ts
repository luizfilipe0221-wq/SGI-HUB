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
        .from('predios')
        .select('*')
        .order('territorio')
        .order('nome');

      if (options.territoryId) {
        query = query.eq('territorio', options.territoryId.toString());
      }

      const { data: buildings, error } = await query;
      if (error) throw error;
      if (!buildings || buildings.length === 0) {
        toast({ title: 'Atenção', description: 'Nenhum dado para exportar', variant: 'destructive' });
        return;
      }

      // Format data
      const rows = buildings.map((b) => ({
        'Território': b.territorio || '-',
        'Nome': b.nome,
        'Endereço': b.endereco || '-',
        'Andares': b.andares || '-',
        'Apts/Andar': b.aptos_por_andar || '-',
        'Total Apts': b.total_aptos || '-',
        'Observações': b.observacoes || '-',
        'Cartas Entregues': b.cartas_entregues_historico || '-',
        'Lista Original': b.lista_original || '-',
        'Ativo': b.ativo ? 'Sim' : 'Não',
        'Criado em': new Date(b.criado_em).toLocaleDateString('pt-BR'),
      }));

      if (options.format === 'csv') {
        // Generate CSV
        const headers = Object.keys(rows[0]);
        const csvContent = [
          headers.join(';'),
          ...rows.map(row => headers.map(h => `"${(row as Record<string, unknown>)[h] || ''}"`).join(';'))
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
          ...rows.map(row => headers.map(h => (row as Record<string, unknown>)[h] || '').join('\t'))
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
