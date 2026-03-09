import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Entrega } from '@/lib/predios/types';
import { toast } from 'sonner';

export const useEntregas = (lotePredioId: number | string) => {
    return useQuery({
        queryKey: ['entregas', Number(lotePredioId)],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('entregas')
                .select('*')
                .eq('lote_predio_id', Number(lotePredioId))
                .order('apartamento', { ascending: true });

            if (error) throw error;
            return data as Entrega[];
        },
        enabled: !!lotePredioId,
    });
};

export const useRegistrarEntrega = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (entregaData: Omit<Entrega, 'id' | 'entregue_em'>) => {
            const { data, error } = await supabase
                .from('entregas')
                .insert([entregaData])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['entregas', data.lote_predio_id] });
            // Invalidate do painel_lote ocorre porque o trigger de banco atualizou lotes_predios
            // Idealmente, a gente poderia extrair o lote_id do lote_predio, mas limpar todos os paineis já serve
            queryClient.invalidateQueries({ queryKey: ['painel_lote'] });
            queryClient.invalidateQueries({ queryKey: ['estatisticas_lotes'] });
            toast.success('Entrega registrada');
        },
        onError: (error) => {
            toast.error('Erro ao registrar entrega');
            console.error(error);
        },
    });
};

export const useRemoverEntrega = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            const { data, error } = await supabase
                .from('entregas')
                .delete()
                .eq('id', id)
                .select('lote_predio_id')
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['entregas', data.lote_predio_id] });
            queryClient.invalidateQueries({ queryKey: ['painel_lote'] });
            queryClient.invalidateQueries({ queryKey: ['estatisticas_lotes'] });
            toast.success('Registro de entrega removido');
        },
        onError: (error) => {
            toast.error('Erro ao remover entrega');
            console.error(error);
        },
    });
};
