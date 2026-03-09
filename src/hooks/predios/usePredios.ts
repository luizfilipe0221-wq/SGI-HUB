import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Predio, PredioPendenteRow } from '@/lib/predios/types';
import { toast } from 'sonner';

export const usePredios = () => {
    return useQuery({
        queryKey: ['predios'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('predios')
                .select('*')
                .order('territorio', { ascending: true })
                .order('nome', { ascending: true });

            if (error) throw error;
            return data as Predio[];
        },
    });
};

export const usePredio = (id: string | number) => {
    return useQuery({
        queryKey: ['predio', Number(id)],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('predios')
                .select('*')
                .eq('id', Number(id))
                .single();

            if (error) throw error;
            return data as Predio;
        },
        enabled: !!id,
    });
};

export const usePrediosPendentes = () => {
    return useQuery({
        queryKey: ['predios_pendentes'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('predios_pendentes')
                .select('*')
                .order('tem_pendencia', { ascending: false, nullsFirst: false })
                .order('ultima_vez_em', { ascending: true, nullsFirst: true });

            if (error) throw error;
            return data as PredioPendenteRow[];
        },
    });
};

export const useCreatePredio = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (predioData: Omit<Predio, 'id' | 'criado_em'>) => {
            const { data, error } = await supabase
                .from('predios')
                .insert([predioData])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['predios'] });
            queryClient.invalidateQueries({ queryKey: ['predios_pendentes'] });
            toast.success('Prédio criado com sucesso');
        },
        onError: (error) => {
            toast.error('Erro ao criar prédio');
            console.error(error);
        },
    });
};

export const useUpdatePredio = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: { id: number | string; data: Partial<Predio> }) => {
            const { data, error } = await supabase
                .from('predios')
                .update(params.data)
                .eq('id', Number(params.id))
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['predios'] });
            queryClient.invalidateQueries({ queryKey: ['predio', Number(variables.id)] });
            queryClient.invalidateQueries({ queryKey: ['predios_pendentes'] });
            toast.success('Prédio atualizado com sucesso');
        },
        onError: (error) => {
            toast.error('Erro ao atualizar prédio');
            console.error(error);
        },
    });
};

export const useDeletePredio = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number | string) => {
            const { error } = await supabase
                .from('predios')
                .delete()
                .eq('id', Number(id));

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['predios'] });
            queryClient.invalidateQueries({ queryKey: ['predios_pendentes'] });
            toast.success('Prédio excluído com sucesso');
        },
        onError: (error) => {
            toast.error('Erro ao excluir prédio');
            console.error(error);
        },
    });
};
