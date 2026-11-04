

DROP POLICY IF EXISTS "requests_select_a_delegar_authenticated" ON public.requests;

CREATE POLICY "requests_select_a_delegar_authenticated"
  ON public.requests
  FOR SELECT
  TO authenticated
  USING (request_status = 'Aguardando Distribuição (Depto de Suprimentos)');
