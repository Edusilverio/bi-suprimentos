

ALTER TABLE public.requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotacoes  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leitura_autenticados_requests"  ON public.requests  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "leitura_autenticados_pedidos"   ON public.pedidos   FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "leitura_autenticados_contratos" ON public.contratos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "leitura_autenticados_cotacoes"  ON public.cotacoes  FOR SELECT USING (auth.role() = 'authenticated');

CREATE TABLE public.usuarios (
  id         uuid REFERENCES auth.users(id) PRIMARY KEY,
  name       text NOT NULL,
  cargo      text NOT NULL CHECK (cargo IN ('admin','gestor','analista','visualizador')),
  nivel      int  NOT NULL CHECK (nivel BETWEEN 1 AND 4),
  ativo      boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usuario_le_proprio_perfil" ON public.usuarios FOR SELECT USING (auth.uid() = id);

