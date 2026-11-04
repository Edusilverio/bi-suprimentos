import { supabase } from '@/lib/supabase'
import type { ServiceResult } from '@/types/domain'
import { applyCostCollectorExclusoes } from '@/lib/filters'

export type ParceriaFornecedor = {
  fornecedor: string
  valor: number
  qtdObras: number
}

export type ParceriaDetalhe = {
  fornecedor: string | null
  grupo: string | null
  obra: string | null
  valor: number | null
}

export type ParceriasFiltros = {
  obras?: string[]
  grupos?: string[]
  fornecedor?: string
  dataInicio?: string
  dataFim?: string
}

async function fetchPedidosPaginated(buildQuery: (q: any) => any): Promise<any[]> {
  const PAGE = 1000
  let from = 0
  const all: any[] = []
  while (true) {
    let q = (supabase as any)
      .from('vw_parcerias_empresa')
      .select('sup_corporate_name, cost_collector, value, material_group, negotiator_issue_date')
      .not('sup_corporate_name', 'is', null)
      .order('sup_corporate_name', { ascending: true })
      .range(from, from + PAGE - 1)
    q = buildQuery(q)
    const { data, error } = await q
    if (error) {
      console.error('[fetchPedidosPaginated] erro:', error)
      throw error
    }
    const chunk = (data as any[]) ?? []
    all.push(...chunk)
    if (chunk.length < PAGE) break
    from += PAGE
    if (from > 500000) break
  }
  return all
}

function applyCommonFilters(filters: ParceriasFiltros, includeObras: boolean) {
  return (q: any) => {
    if (includeObras && filters.obras?.length) q = q.in('cost_collector', filters.obras)
    if (filters.fornecedor)
      q = q.ilike('sup_corporate_name', `%${filters.fornecedor}%`)
    if (filters.dataInicio) q = q.gte('negotiator_issue_date', filters.dataInicio)
    if (filters.dataFim)
      q = q.lte('negotiator_issue_date', `${filters.dataFim}T23:59:59`)
    // Exclusões padronizadas de cost_collector (escritório, projetos,
    // pré obra, acordo de preço, indiretos, custos indiretos).
    q = applyCostCollectorExclusoes(q)
    return q
  }
}



function filtraGrupo(mg: string | null, grupos?: string[]): boolean {
  if (!grupos?.length) return true
  if (!mg) return false
  const lista = mg.split(';').map(g => g.trim().toUpperCase())
  return grupos.some(f => lista.includes(f.trim().toUpperCase()))
}

export async function getParceriasFornecedores(
  filters: ParceriasFiltros
): Promise<ServiceResult<ParceriaFornecedor[]>> {
  try {
    const hasObras = !!filters.obras?.length

    // Busca A (universo global): sem o filtro de obras — usada apenas
    // para contar em quantas obras cada fornecedor atua na empresa toda.
    const dataGlobal = await fetchPedidosPaginated(applyCommonFilters(filters, false))

    // Busca B (recorte exibido): aplica também o filtro de obras.
    // Se não houver filtro de obras, reaproveita a Busca A (evita chamada
    // duplicada à rede).
    const dataRecorte = hasObras
      ? await fetchPedidosPaginated(applyCommonFilters(filters, true))
      : dataGlobal

    // qtdObrasGlobal: nº total de obras distintas do fornecedor em toda a
    // empresa (respeitando grupos, período, fornecedor e exclusões).
    const obrasGlobalPorFornecedor: Record<string, Set<string>> = {}
    for (const row of dataGlobal) {
      if (!filtraGrupo(row.material_group, filters.grupos)) continue
      const nome = (row.sup_corporate_name as string).trim()
      if (!obrasGlobalPorFornecedor[nome]) obrasGlobalPorFornecedor[nome] = new Set()
      if (row.cost_collector) obrasGlobalPorFornecedor[nome].add(row.cost_collector)
    }

    // Valor: somado no recorte exibido.
    const acc: Record<string, { valor: number }> = {}
    for (const row of dataRecorte) {
      if (!filtraGrupo(row.material_group, filters.grupos)) continue
      const nome = (row.sup_corporate_name as string).trim()
      if (!acc[nome]) acc[nome] = { valor: 0 }
      acc[nome].valor += Number(row.value ?? 0)
    }

    const resultado = Object.entries(acc)
      .map(([fornecedor, v]) => ({
        fornecedor,
        valor: v.valor,
        // Nº de obras = universo GLOBAL (empresa toda). Se o fornecedor
        // não aparecer na Busca A (edge case), cai para 0.
        qtdObras: obrasGlobalPorFornecedor[fornecedor]?.size ?? 0,
      }))
      // Critério de parceria: 2+ obras na empresa (mesmo com recorte de obra).
      .filter(f => f.qtdObras >= 2)
      .sort((a, b) => b.valor - a.valor)

    return { data: resultado, error: null }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}

export async function getParceriaDetalhe(
  fornecedor: string,
  filters: Omit<ParceriasFiltros, 'fornecedor' | 'grupos'> & { grupos?: string[] }
): Promise<ServiceResult<ParceriaDetalhe[]>> {
  try {
    const PAGE = 1000
    let from = 0
    const all: any[] = []
    while (true) {
      let q = (supabase as any)
        .from('vw_parcerias_empresa')
        .select('sup_corporate_name, material_group, cost_collector, value, negotiator_issue_date')
        .eq('sup_corporate_name', fornecedor)
        .order('value', { ascending: false, nullsFirst: false })
        .range(from, from + PAGE - 1)
      if (filters.obras?.length) q = q.in('cost_collector', filters.obras)
      if (filters.dataInicio) q = q.gte('negotiator_issue_date', filters.dataInicio)
      if (filters.dataFim)
        q = q.lte('negotiator_issue_date', `${filters.dataFim}T23:59:59`)
      q = applyCostCollectorExclusoes(q)

      const { data, error } = await q

      if (error) return { data: null, error: error.message }
      const chunk = (data as any[]) ?? []
      all.push(...chunk)
      if (chunk.length < PAGE) break
      from += PAGE
      if (from > 200000) break
    }

    const filtrado = all.filter(p => filtraGrupo(p.material_group, filters.grupos))
    return {
      data: filtrado.map(p => ({
        fornecedor: p.sup_corporate_name,
        grupo: p.material_group,
        obra: p.cost_collector,
        valor: p.value,
      })),
      error: null,
    }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}

export async function getMaterialGroupOptions(): Promise<ServiceResult<string[]>> {
  try {
    const PAGE = 1000
    let from = 0
    const set = new Set<string>()
    while (true) {
      const { data, error } = await (supabase as any)
        .from('cotacoes' as any)
        .select('material_group')
        .not('material_group', 'is', null)
        .range(from, from + PAGE - 1)
      if (error) return { data: null, error: error.message }
      const chunk = (data as any[]) ?? []
      for (const r of chunk) {
        if (!r.material_group) continue
        r.material_group
          .split(';')
          .map((g: string) => g.trim())
          .filter(Boolean)
          .forEach((g: string) => set.add(g))
      }
      if (chunk.length < PAGE) break
      from += PAGE
      if (from > 500000) break
    }
    return { data: Array.from(set).sort((a, b) => a.localeCompare(b)), error: null }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}
