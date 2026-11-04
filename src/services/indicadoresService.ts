import { supabase } from '@/lib/supabase';
import { fetchAllRows } from '@/lib/fetchAll';

export type IndicadorDef = {
  indicador: string;
  label: string;
  unidade: string | null;
  cor: string;
  base: boolean;
  link: string | null;
  ordem: number;
};

export type IndicadorValor = {
  indicador: string;
  data_ref: string;
  valor: number;
};

export async function fetchIndicadoresDef(): Promise<IndicadorDef[]> {
  const { data, error } = await supabase
    .from('indicadores_def' as any)
    .select('indicador, label, unidade, cor, base, link, ordem')
    .order('ordem');
  if (error) throw error;
  return (data ?? []) as IndicadorDef[];
}

export async function fetchIndicadoresValores(): Promise<IndicadorValor[]> {
  const query = supabase
    .from('indicadores_valores' as any)
    .select('indicador, data_ref, valor')
    .order('data_ref');
  const { data, error } = await fetchAllRows<IndicadorValor>(query);
  if (error) throw new Error(error);
  return data;
}
