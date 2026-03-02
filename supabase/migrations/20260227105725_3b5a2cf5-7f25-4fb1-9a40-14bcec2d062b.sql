
-- Fix: existing policies are RESTRICTIVE which blocks access when no PERMISSIVE policy exists.
-- We need PERMISSIVE policies for the anon role to read/write data.

-- ADMINS: allow SELECT for login (senha_hash is exposed but needed for manual auth)
CREATE POLICY "allow_select_admins" ON public.admins FOR SELECT USING (true);

-- LISTAS: add INSERT and UPDATE policies
CREATE POLICY "allow_insert_listas" ON public.listas FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update_listas" ON public.listas FOR UPDATE USING (true);

-- LISTA_CONTATOS: add INSERT and UPDATE policies  
CREATE POLICY "allow_insert_lista_contatos" ON public.lista_contatos FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update_lista_contatos" ON public.lista_contatos FOR UPDATE USING (true);
