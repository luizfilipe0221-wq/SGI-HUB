import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Lote, EstatisticasLoteRow, PainelLoteRow } from '@/lib/predios/types';
import { toast } from 'sonner';

export const useLotes = () => {
    return useQuery({
        queryKey: ['lotes'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('lotes')
                .select('*')
                .order('criado_em', { ascending: false });

            if (error) throw error;
            return data as Lote[];
        },
    });
};

export const useEstatisticasLotes = () => {
    return useQuery({
        queryKey: ['estatisticas_lotes'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('estatisticas_lote')
                .select('*')
                .order('lote_id', { ascending: false });

            if (error) throw error;
            return data as EstatisticasLoteRow[];
        },
    });
};

export const useEstatisticasLote = (loteId: number | string) => {
    return useQuery({
        queryKey: ['estatisticas_lotes', Number(loteId)],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('estatisticas_lote')
                .select('*')
                .eq('lote_id', Number(loteId))
                .single();

            if (error) throw error;
            return data as EstatisticasLoteRow;
        },
        enabled: !!loteId,
    });
};

export const usePainelLote = (loteId: number | string) => {
    return useQuery({
        queryKey: ['painel_lote', Number(loteId)],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('painel_lote')
                .select('*')
                .eq('lote_id', Number(loteId))
                .order('territorio', { ascending: true })
                .order('predio_nome', { ascending: true });

            if (error) throw error;
            return data as PainelLoteRow[];
        },
        enabled: !!loteId,
    });
};

export const useCreateLote = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ loteData, predioIds }: { loteData: { nome: string } & Partial<Lote>; predioIds: number[] }) => {
            // 1. Cria o Lote
            const insertPayload = loteData as { nome: string };
            const { data: lote, error: loteError } = await supabase
                .from('lotes')
                .insert([insertPayload])
                .select()
                .single();

            if (loteError) throw loteError;

            // 2. Associa os prédios ao lote
            if (predioIds.length > 0) {
                const lotePredios = predioIds.map(predio_id => ({
                    lote_id: lote.id,
                    predio_id,
                    meta_cartas: 1, // Padrão
                    status: 'nao_iniciado' as const
                }));

                const { error: lpError } = await supabase
                    .from('lote_predios')
                    .insert(lotePredios);

                if (lpError) throw lpError;
            }

            return lote;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lotes'] });
            queryClient.invalidateQueries({ queryKey: ['estatisticas_lotes'] });
            queryClient.invalidateQueries({ queryKey: ['predios_pendentes'] });
            toast.success('Lote criado com sucesso');
        },
        onError: (error) => {
            toast.error('Erro ao criar lote');
            console.error(error);
        },
    });
};

export const useFinalizarLote = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number | string) => {
            const { data, error } = await supabase
                .from('lotes')
                .update({ finalizado: true, finalizado_em: new Date().toISOString() })
                .eq('id', Number(id))
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['lotes'] });
            queryClient.invalidateQueries({ queryKey: ['estatisticas_lotes'] });
            queryClient.invalidateQueries({ queryKey: ['painel_lote', Number(variables)] });
            toast.success('Lote finalizado com sucesso');
        },
        onError: (error) => {
            toast.error('Erro ao finalizar lote');
            console.error(error);
        },
    });
};

export const useDeleteLote = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number | string) => {
            const { error } = await supabase
                .from('lotes')
                .delete()
                .eq('id', Number(id));

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lotes'] });
            queryClient.invalidateQueries({ queryKey: ['estatisticas_lotes'] });
            queryClient.invalidateQueries({ queryKey: ['predios_pendentes'] });
            toast.success('Lote excluído com sucesso');
        },
        onError: (error) => {
            toast.error('Erro ao excluir lote');
            console.error(error);
        },
    });
};

export const useMudarStatusLotePredio = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, status }: { id: number; status: 'nao_iniciado' | 'em_andamento' | 'concluido' | 'pendente' }) => {
            const updates: Record<string, unknown> = { status, concluido_manualmente: status === 'concluido' };
            if (status === 'concluido') {
                updates.concluido_em = new Date().toISOString();
            }

            const { data, error } = await supabase
                .from('lote_predios')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['painel_lote', data.lote_id] });
            queryClient.invalidateQueries({ queryKey: ['estatisticas_lotes'] });
            toast.success('Status do prédio atualizado');
        },
        onError: (error) => {
            toast.error('Erro ao atualizar status');
            console.error(error);
        },
    });
};
