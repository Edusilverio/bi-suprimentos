

CREATE OR REPLACE FUNCTION public.fn_replace_planilha(
  p_tabela text,
  p_dados  jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed text[] := ARRAY[
    'excel_sla_familias',
    'excel_familias',
    'excel_insumos_prisma',
    'excel_familias_prisma',
    'excel_responsaveis_contratacao',
    'excel_custo_obra'
  ];
  v_antes  bigint;
  v_depois bigint;
BEGIN
  IF NOT (p_tabela = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Tabela não permitida: %', p_tabela;
  END IF;

  IF p_dados IS NULL
     OR jsonb_typeof(p_dados) <> 'array'
     OR jsonb_array_length(p_dados) = 0 THEN
    RAISE EXCEPTION 'Dados vazios ou inválidos — import cancelado.';
  END IF;

  EXECUTE format('SELECT count(*) FROM public.%I', p_tabela) INTO v_antes;

  EXECUTE format('DELETE FROM public.%I', p_tabela);

  EXECUTE format(
    'INSERT INTO public.%I SELECT * FROM jsonb_populate_recordset(NULL::public.%I, $1)',
    p_tabela, p_tabela
  ) USING p_dados;

  EXECUTE format('SELECT count(*) FROM public.%I', p_tabela) INTO v_depois;

  RETURN jsonb_build_object(
    'qtd_antes',  v_antes,
    'qtd_depois', v_depois
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_replace_planilha(text, jsonb) TO authenticated;
