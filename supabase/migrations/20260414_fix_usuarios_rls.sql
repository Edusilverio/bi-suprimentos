
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'usuarios' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.usuarios', pol.policyname);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.get_my_nivel()
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nivel FROM public.usuarios WHERE id = auth.uid() AND ativo = true
$$;

CREATE POLICY "usuarios_select_own"
  ON public.usuarios FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "usuarios_select_admin"
  ON public.usuarios FOR SELECT TO authenticated
  USING (public.get_my_nivel() = 1);

CREATE POLICY "usuarios_insert_admin"
  ON public.usuarios FOR INSERT TO authenticated
  WITH CHECK (public.get_my_nivel() = 1);

CREATE POLICY "usuarios_update_admin"
  ON public.usuarios FOR UPDATE TO authenticated
  USING (public.get_my_nivel() = 1);

CREATE POLICY "usuarios_select_gestor"
  ON public.usuarios FOR SELECT TO authenticated
  USING (public.get_my_nivel() = 2);
