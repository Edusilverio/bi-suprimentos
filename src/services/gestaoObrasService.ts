import { supabase } from '@/lib/supabase'

export type StatusObra = 'ATIVA' | 'FINALIZADA' | 'PRE_OBRA' | 'NAO_E_OBRA'

export type ObraRow = {
  cost_collector: string
  cliente: string | null
  foto_url: string | null
  custo_atual: number | string | null
  porcentagem: number | null
  status_obra: StatusObra | null
  area_construida_m2: number | string | null
  meta_agua: number | string | null
  meta_energia: number | string | null
  meta_residuos: number | string | null
}

export type ObraFiltros = {
  busca?: string
  status?: StatusObra[]
}

const PLACEHOLDER_URL_FRAGMENT = 'PLACEHOLDER_PLANEJAMENTO'

export function isPlaceholderFoto(url: string | null | undefined): boolean {
  if (!url) return true
  return url.toUpperCase().includes(PLACEHOLDER_URL_FRAGMENT)
}

export function slugifyCostCollector(cost_collector: string): string {
  return cost_collector
    .replace(/Ç/g, 'C').replace(/ç/g, 'c')
    .replace(/[ÁÀÃÂÄáàãâä]/g, 'A')
    .replace(/[ÉÈÊËéèêë]/g, 'E')
    .replace(/[ÍÌÎÏíìîï]/g, 'I')
    .replace(/[ÓÒÕÔÖóòõôö]/g, 'O')
    .replace(/[ÚÙÛÜúùûü]/g, 'U')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '_')
}

export async function listarObras(filtros: ObraFiltros = {}) {
  // vw_gestao_obras = excel_custo_obra + obras operacionais (requests/pedidos) ainda não cadastradas
  let q = (supabase.from('vw_gestao_obras' as any) as any)
    .select('cost_collector, cliente, foto_url, custo_atual, porcentagem, status_obra, area_construida_m2, meta_agua, meta_energia, meta_residuos')
  if (filtros.busca) {
    q = q.ilike('cost_collector', `%${filtros.busca}%`)
  }
  if (filtros.status && filtros.status.length) {
    q = q.in('status_obra', filtros.status)
  }
  q = q.order('cost_collector')
  const { data, error } = await q
  return { data: (data as ObraRow[] | null) ?? [], error }
}

export async function atualizarObra(cost_collector: string, dados: Partial<ObraRow>) {
  // upsert: obras auto-descobertas (ainda não em excel_custo_obra) são criadas ao editar
  return await (supabase.from('excel_custo_obra' as any) as any)
    .upsert({ cost_collector, ...dados }, { onConflict: 'cost_collector' })
}

export async function criarObra(dados: Partial<ObraRow> & { cost_collector: string }) {
  return await (supabase.from('excel_custo_obra' as any) as any).insert(dados)
}

export async function obraExiste(cost_collector: string): Promise<boolean> {
  const { data } = await (supabase.from('excel_custo_obra' as any) as any)
    .select('cost_collector')
    .eq('cost_collector', cost_collector)
    .maybeSingle()
  return !!data
}

export async function uploadFoto(file: File, cost_collector: string): Promise<string> {
  const slug = slugifyCostCollector(cost_collector)
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const filename = `${slug}_${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from(((import.meta.env.VITE_STORAGE_PREFIX as string | undefined) ?? "") + "fotos-obras")
    .upload(filename, file, { upsert: false, contentType: file.type })
  if (error) throw error
  const { data } = supabase.storage.from(((import.meta.env.VITE_STORAGE_PREFIX as string | undefined) ?? "") + "fotos-obras").getPublicUrl(filename)
  return data.publicUrl
}

export async function removerFotoStorage(foto_url: string | null) {
  if (!foto_url) return
  try {
    const marker = `/${import.meta.env.VITE_STORAGE_PREFIX ?? ""}fotos-obras/`
    const idx = foto_url.indexOf(marker)
    if (idx === -1) return
    const path = foto_url.substring(idx + marker.length)
    await supabase.storage.from(((import.meta.env.VITE_STORAGE_PREFIX as string | undefined) ?? "") + "fotos-obras").remove([path])
  } catch {
    // ignore
  }
}
