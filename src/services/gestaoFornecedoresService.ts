import { supabase } from '@/lib/supabase'
import { fetchAllRows } from '@/lib/fetchAll'
import type { ContratoRow, CotacaoRow } from '@/lib/database.types'
import type { ServiceResult, GlobalFilters, FornecedorResumo, FornecedorTop } from '@/types/domain'
import { applyCostCollectorExclusoes } from '@/lib/filters'

export async function getFornecedoresList(
  _filters: GlobalFilters
): Promise<ServiceResult<FornecedorResumo[]>> {
  try {
    // Reescrito para usar vw_global_pedidos com exclusões padronizadas.
    // (vw_top_fornecedores agregada não permite filtrar cost_collector.)
    let q: any = supabase
      .from('vw_global_pedidos' as any)
      .select('sup_corporate_name, value, cost_collector')
      .eq('is_active', true)
      .like('purchase_order_status', 'Aprovado%')
      .not('sup_corporate_name', 'is', null)
      .not('sup_corporate_name', 'ilike', '%Atlas%')
    q = applyCostCollectorExclusoes(q)

    const PAGE = 1000
    let from = 0
    const acc: Record<string, { total: number; qtd: number }> = {}
    while (true) {
      const { data, error } = await q.range(from, from + PAGE - 1)
      if (error) return { data: null, error: error.message }
      const chunk = (data as any[]) ?? []
      for (const row of chunk) {
        const nome = (row.sup_corporate_name ?? '').trim()
        if (!nome) continue
        if (!acc[nome]) acc[nome] = { total: 0, qtd: 0 }
        acc[nome].total += Number(row.value ?? 0)
        acc[nome].qtd += 1
      }
      if (chunk.length < PAGE) break
      from += PAGE
      if (from > 500000) break
    }

    const mapped: FornecedorResumo[] = Object.entries(acc)
      .map(([fornecedor, v]) => ({
        fornecedor,
        contratos: v.qtd,
        total: v.total,
      }))
      .sort((a, b) => b.total - a.total)

    return { data: mapped, error: null }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}

export async function getContratosPorFornecedor(
  fornecedor: string,
  filters: GlobalFilters
): Promise<ServiceResult<ContratoRow[]>> {
  try {
    let query = supabase
      .from('vw_global_contratos' as any)
      .select('*')
      .eq('is_active', true)
      .eq('sup_corporate_name', fornecedor)
    if (filters.obra?.length) query = query.in('cost_collector', filters.obra)
    query = applyCostCollectorExclusoes(query)
    query = query.order('created_when', { ascending: false })

    const { data, error } = await fetchAllRows<any>(query)
    return { data, error }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}

export async function getCotacoesPorFornecedor(
  _fornecedor: string
): Promise<ServiceResult<CotacaoRow[]>> {
  // TODO: join cotacoes → pedidos via quoting_number_formatted quando mapeamento estiver disponível
  return { data: [], error: null }
}
