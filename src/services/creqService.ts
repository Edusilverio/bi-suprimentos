import { supabase } from '@/lib/supabase'

export type CreqFarol = -2 | -1 | 0 | 1 | null

export type CreqItem = {
  id: number
  obra: string
  servico: string
  familia: string | null
  responsavel: string | null
  gerente: string | null
  matriz: string | null
  vinculo: string | null
  criterio: number | null
  prazo_aquisicao: number | null
  meses_pacote: number[] | null
  obra_tipo: string | null
  personalizada: boolean
  marco_data: string | null
  data_prev: string | null
  envio_solicitacao: string | null
  mes_contratacao: string | null
  farol_envio: CreqFarol
  farol_contratacao: CreqFarol
  status: string | null
  fornecedor: string | null
  observacao: string | null
  envio_manual: string | null
  contratacao_manual: string | null
  farol_manual: number | null
  updated_at: string | null
  // Fase 2 — auto-fill a partir do sistema (requisições/pedidos/contratos)
  status_efetivo: string | null
  status_origem: 'manual' | 'sistema' | null
  fornecedor_efetivo: string | null
  fornecedor_origem: 'manual' | 'sistema' | null
  sistema_status: string | null
  sistema_fornecedor: string | null
  sistema_envio_real: string | null
  sistema_contratacao_real: string | null
  aderencia_envio: number | null
  aderencia_contratacao: number | null
  // R4 — máscara cliente + financeiro
  inicio_servico: string | null
  envio_concorrencia: string | null
  inicio_servico_manual: string | null
  envio_concorrencia_manual: string | null
  valor_contratacao: number | null
  verba_corrigida: number | null
  // R4.8 — origem (admin)
  sistema_cost_collector: string | null
  sistema_tem_contrato: boolean
  sistema_tem_pedido: boolean
  sistema_tem_requisicao: boolean
  // R7
  cliente: string | null
  n_comentarios: number
}

export type CreqComentario = {
  id: number
  obra: string
  servico: string
  texto: string
  autor_nome: string | null
  created_at: string
}

export type CreqObra = {
  obra: string
  tipo: string | null
  personalizada: boolean
}

export async function getObrasCreq(): Promise<{ data: CreqObra[]; error: string | null }> {
  const { data, error } = await (supabase as any)
    .from('creq_obra_marcos')
    .select('obra, tipo, personalizada')
    .order('obra', { ascending: true })
  return {
    data: (data as any[])?.map(r => ({ obra: r.obra, tipo: r.tipo, personalizada: r.personalizada })) ?? [],
    error: error?.message ?? null,
  }
}

export const CREQ_TODAS = '__todas__'

export async function getCreq(obra: string): Promise<{ data: CreqItem[]; error: string | null }> {
  if (!obra) return { data: [], error: null }
  let q = (supabase as any).from('vw_creq').select('*')
  if (obra !== CREQ_TODAS) q = q.eq('obra', obra)
  q = obra === CREQ_TODAS
    ? q.order('obra', { ascending: true }).order('servico', { ascending: true })
    : q.order('servico', { ascending: true })
  const { data, error } = await q
  return { data: (data as CreqItem[]) ?? [], error: error?.message ?? null }
}

// Patch parcial dos campos editáveis do item.
export type CreqItemPatch = Partial<
  Pick<CreqItem, 'status' | 'fornecedor' | 'observacao' | 'envio_manual' | 'contratacao_manual' | 'farol_manual'
    | 'inicio_servico_manual' | 'envio_concorrencia_manual' | 'valor_contratacao' | 'verba_corrigida'>
>

export async function updateCreqItem(
  id: number,
  patch: CreqItemPatch,
): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await (supabase as any)
    .from('creq_itens')
    .update({ ...patch, updated_at: new Date().toISOString(), updated_by: user?.id ?? null })
    .eq('id', id)
  return { error: error?.message ?? null }
}

export async function getComentarios(
  obra: string,
  servico: string,
): Promise<{ data: CreqComentario[]; error: string | null }> {
  const { data, error } = await (supabase as any)
    .from('creq_comentarios')
    .select('*')
    .eq('obra', obra)
    .eq('servico', servico)
    .order('created_at', { ascending: false })
  return { data: (data as CreqComentario[]) ?? [], error: error?.message ?? null }
}

// ---- Criação direta (sem Excel) ----
export type CreqMarcosInput = {
  inicio_obra?: string | null
  inicio_estrutura?: string | null
  termino_estrutura?: string | null
  termino_emboco?: string | null
  termino_obra?: string | null
}

export async function criarCreq(
  obra: string, tipo: string | null, marcos: CreqMarcosInput,
): Promise<{ ok: boolean; erro?: string; itens_novos?: number; cost_collector?: string }> {
  const { data, error } = await (supabase.rpc as any)('fn_creq_criar_obra', {
    p_obra: obra, p_tipo: tipo, p_marcos: marcos,
  })
  if (error) return { ok: false, erro: error.message }
  const r = Array.isArray(data) ? data[0] : data
  return r ?? { ok: false, erro: 'Sem resposta do servidor.' }
}

// Obras existentes na base operacional (para sugerir na criação)
export async function getObrasBase(): Promise<string[]> {
  const { data } = await (supabase as any)
    .from('vw_gestao_obras')
    .select('cost_collector')
    .ilike('cost_collector', 'OBRA %')
    .order('cost_collector')
  return (data as { cost_collector: string }[] ?? [])
    .map(r => r.cost_collector.replace(/^OBRA\s+/i, '').trim())
}

// ---- Importação (espelho) ----
export type CreqImportPayload = {
  obra: string
  tipo: string | null
  marcos: {
    inicio_obra: string | null
    inicio_estrutura: string | null
    termino_estrutura: string | null
    termino_emboco: string | null
    termino_obra: string | null
  }
  itens: { servico: string; status: string | null; fornecedor: string | null }[]
}

export async function importarCreq(
  payload: CreqImportPayload,
): Promise<{ ok: boolean; erro?: string; itens?: number; removidos?: number }> {
  const { data, error } = await (supabase.rpc as any)('fn_creq_importar_obra', { p_payload: payload })
  if (error) return { ok: false, erro: error.message }
  const r = Array.isArray(data) ? data[0] : data
  return r ?? { ok: false, erro: 'Sem resposta do servidor.' }
}

export async function addComentario(
  obra: string,
  servico: string,
  texto: string,
  autorNome: string | null,
): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await (supabase as any)
    .from('creq_comentarios')
    .insert({ obra, servico, texto, autor_id: user?.id ?? null, autor_nome: autorNome })
  return { error: error?.message ?? null }
}

// Exclusão de comentário — só gestor+ (garantido também por RLS no banco)
export async function deleteComentario(id: number): Promise<{ error: string | null }> {
  const { error } = await (supabase as any).from('creq_comentarios').delete().eq('id', id)
  return { error: error?.message ?? null }
}
