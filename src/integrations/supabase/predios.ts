/**
 * Re-exporta o client principal do Supabase como `supabasePredios`.
 * O módulo Gestão de Prédios usa o mesmo banco que a Lista Telefônica.
 */
export { supabase as supabasePredios } from '@/integrations/supabase/client';
