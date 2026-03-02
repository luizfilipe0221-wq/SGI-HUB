/**
 * Supabase client dedicado ao módulo Gestão de Prédios.
 * Aponta para o projeto bpihvzfvpkgbedupuvbh que contém as tabelas:
 * territories, buildings, building_activity_log, generated_lists, etc.
 */
import { createClient } from '@supabase/supabase-js';

const PREDIOS_URL = import.meta.env.VITE_SUPABASE_PREDIOS_URL as string;
const PREDIOS_KEY = import.meta.env.VITE_SUPABASE_PREDIOS_KEY as string;

export const supabasePredios = createClient(PREDIOS_URL, PREDIOS_KEY, {
    auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
    },
});
