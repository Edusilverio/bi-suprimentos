import { supabase } from '@/lib/supabase';
import { fetchAllRows } from '@/lib/fetchAll';

export type LancamentoSustentabilidadeRow = {
  id: number;
  cost_collector: string | null;
  mes_referencia: string | null;
  status: string | null;
  etapa_obra: string | null;
  num_colaboradores: number | null;
  email_obra: string | null;
  origem: string | null;
  created_at: string | null;
  agua_m3: number | null;
  energia_kwh: number | null;
  diesel_gerador1_l: number | null;
  diesel_gerador2_l: number | null;
  diesel_gerador3_l: number | null;
  entulho_limpo_cacamba: number | null;
  madeira_cacamba: number | null;
  gesso_cacamba: number | null;
  classe_c_cacamba: number | null;
  reciclaveis_bag: number | null;
  misto_cacamba: number | null;
  perigoso_cacamba: number | null;
  sucata_cacamba: number | null;
  solo_terra_m3: number | null;
  aprovado_por: string | null;
  aprovado_por_nome: string | null;
  aprovado_em: string | null;
  motivo_reprovacao: string | null;
  anexo_agua_url: string | null;
  anexo_energia_url: string | null;
  anexo_coletas_url: string | null;
};

export async function fetchLancamentosSustentabilidade(): Promise<LancamentoSustentabilidadeRow[]> {
  const query = (supabase.from('vw_lancamentos_sustentabilidade' as any) as any)
    .select('*')
    .order('created_at', { ascending: false });
  const { data, error } = await fetchAllRows<LancamentoSustentabilidadeRow>(query);
  if (error) throw new Error(error);
  return data;
}

export async function decidirLancamentos(
  ids: number[],
  decisao: 'aprovado' | 'reprovado',
  motivo: string | null,
): Promise<{ ok: boolean; afetados?: number; decisao?: string; erro?: string }> {
  const { data, error } = await (supabase as any).rpc('fn_decidir_lancamento', {
    p_ids: ids,
    p_decisao: decisao,
    p_motivo: motivo,
  });
  if (error) return { ok: false, erro: error.message };
  return (data ?? { ok: false, erro: 'Resposta vazia' }) as any;
}
