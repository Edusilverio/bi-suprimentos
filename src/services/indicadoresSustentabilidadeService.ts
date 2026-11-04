import { supabase } from '@/lib/supabase';
import { fetchAllRows } from '@/lib/fetchAll';

export type IndicadorSustentabilidadeRow = {
  cost_collector: string | null;
  mes_referencia: string | null;
  status: string | null;
  etapa_obra: string | null;
  num_colaboradores: number | null;

  area_construida_m2: number | null;
  area_obra_m2: number | null;

  meta_agua: number | null;
  meta_energia: number | null;
  meta_residuos: number | null;

  agua_m3: number | null;
  agua_concessionaria_m3: number | null;
  agua_pipa_m3: number | null;
  energia_kwh: number | null;
  diesel_l: number | null;

  residuo_entulho_m3: number | null;
  residuo_madeira_m3: number | null;
  residuo_gesso_m3: number | null;
  residuo_classe_c_m3: number | null;
  residuo_misto_m3: number | null;
  residuo_perigoso_m3: number | null;
  residuo_sucata_m3: number | null;
  residuo_reciclavel_m3: number | null;
  residuo_solo_m3: number | null;
  residuo_total_m3: number | null;

  perc_cacamba_mista: number | null;

  co2_kg: number | null;
  co2_kg_acum: number | null;



  ind_agua: number | null;
  ind_energia: number | null;
  ind_residuos: number | null;

  ind_agua_acum: number | null;
  ind_energia_acum: number | null;
  ind_residuos_acum: number | null;
};

export async function fetchIndicadoresSustentabilidade(): Promise<IndicadorSustentabilidadeRow[]> {
  const query = supabase
    .from('vw_indicadores_sustentabilidade' as any)
    .select('*')
    .order('mes_referencia', { ascending: true });
  const { data, error } = await fetchAllRows<IndicadorSustentabilidadeRow>(query);
  if (error) throw new Error(error);
  return data;
}
