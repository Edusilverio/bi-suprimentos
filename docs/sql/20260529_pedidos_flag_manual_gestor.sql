

DROP POLICY IF EXISTS "pedidos_flag_manual_admin" ON public.pedidos_flag_manual;
DROP POLICY IF EXISTS "pedidos_flag_manual_admin_gestor" ON public.pedidos_flag_manual;

CREATE POLICY "pedidos_flag_manual_admin_gestor"
  ON public.pedidos_flag_manual
  FOR ALL
  USING (get_my_nivel() <= 2)
  WITH CHECK (get_my_nivel() <= 2);
