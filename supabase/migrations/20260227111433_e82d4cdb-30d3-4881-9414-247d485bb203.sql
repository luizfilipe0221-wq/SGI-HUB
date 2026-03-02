
-- Allow UPDATE on contatos (for admin editing)
CREATE POLICY "allow_update_contatos"
ON public.contatos FOR UPDATE
USING (true)
WITH CHECK (true);

-- Allow DELETE on listas
CREATE POLICY "allow_delete_listas"
ON public.listas FOR DELETE
USING (true);

-- Allow DELETE on lista_contatos
CREATE POLICY "allow_delete_lista_contatos"
ON public.lista_contatos FOR DELETE
USING (true);

-- Allow DELETE on registros (cascade)
CREATE POLICY "allow_delete_registros"
ON public.registros FOR DELETE
USING (true);

-- Drop the unique constraint on token_operador since multiple rows share the same token
ALTER TABLE public.lista_contatos DROP CONSTRAINT IF EXISTS lista_contatos_token_operador_key;
