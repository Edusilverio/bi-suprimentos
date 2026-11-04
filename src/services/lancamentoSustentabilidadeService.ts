import { supabase } from '@/lib/supabase';

export type LancamentoDados = {
  agua_concessionaria_m3?: number | string;
  agua_pipa_m3?: number | string;
  energia_kwh?: number | string;
  diesel_gerador1_l?: number | string;
  diesel_gerador2_l?: number | string;
  diesel_gerador3_l?: number | string;
  entulho_limpo_cacamba?: number | string;
  madeira_cacamba?: number | string;
  gesso_cacamba?: number | string;
  classe_c_cacamba?: number | string;
  misto_cacamba?: number | string;
  perigoso_cacamba?: number | string;
  sucata_cacamba?: number | string;
  reciclaveis_bag?: number | string;
  solo_terra_m3?: number | string;
  etapa_obra?: string;
  num_colaboradores?: number | string;
  // Anexos (URLs no storage): conta de água, conta de energia, relatório de coletas
  anexo_agua_url?: string;
  anexo_energia_url?: string;
  anexo_coletas_url?: string;
};

const BUCKET_ANEXOS = ((import.meta.env.VITE_STORAGE_PREFIX as string | undefined) ?? "") + "anexos-sustentabilidade";

/** Faz upload de um anexo do lançamento e devolve a URL pública. */
export async function uploadAnexoSustentabilidade(
  file: File,
  cost_collector: string,
  mes_referencia: string, // YYYY-MM-01
  tipo: 'agua' | 'energia' | 'coletas',
): Promise<string> {
  const slug = cost_collector.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toUpperCase();
  const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
  const path = `${slug}/${mes_referencia}/${tipo}_${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET_ANEXOS)
    .upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET_ANEXOS).getPublicUrl(path);
  return data.publicUrl;
}

export type SubmeterResponse = {
  ok: boolean;
  erro?: string;
  mensagem?: string;
  substituiu_anterior?: boolean;
  obra?: string;
  mes_referencia?: string;
  id?: string;
};

export async function submeterLancamento(
  cost_collector: string,
  mes_referencia: string, // YYYY-MM-01
  dados: LancamentoDados,
): Promise<SubmeterResponse> {
  const { data, error } = await (supabase as any).rpc('fn_submeter_lancamento_sustentabilidade', {
    p_cost_collector: cost_collector,
    p_mes_referencia: mes_referencia,
    p_dados: dados,
  });
  if (error) {
    return { ok: false, erro: error.message };
  }
  return (data as SubmeterResponse) ?? { ok: false, erro: 'Resposta vazia do servidor' };
}
