import { supabase } from '@/lib/supabase'
import type { ServiceResult } from '@/types/domain'
import { gerarMeses, ultimosNMeses } from '@/lib/avaliacao'
import { applyCostCollectorExclusoes } from '@/lib/filters'

export type AvaliacaoMensalRow = {
  mes: string
  otimo: number
  bom: number
  regular: number
  ruim: number
}

export type AvaliacaoFornecedorRow = {
  supplier_corporate_name: string | null
  quality_supply_type: string | null
  cost_collector: string | null
  general_rating: number | null
  observation: string | null
  month_and_year_formatted: string | null
}

export type AvaliacaoFiltros = {
  obras?: string[]
  fornecedor?: string
  dataInicio?: string
  dataFim?: string
  grupos?: string[]
}

// Resolve os fornecedores que atuam nos grupos (mesma lógica das Parcerias),
// via RPC — comma-safe (o grupo vai como parâmetro, não na URL do PostgREST).
async function fornecedoresDoGrupo(grupos?: string[]): Promise<string[] | null> {
  if (!grupos?.length) return null
  const { data, error } = await (supabase as any).rpc('fn_fornecedores_por_grupo', { p_grupos: grupos })
  if (error || !data) return []
  return (data as { fornecedor: string }[]).map(r => r.fornecedor).filter(Boolean)
}

export type AvaliacaoTabelaFiltros = AvaliacaoFiltros & {
  rating?: number | null
  ratings?: number[] | null
  mes?: string | null
}

// Parse "YYYY-MM-DD" como data local para evitar shift de timezone
function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function janelaMeses(filters: AvaliacaoFiltros): string[] {
  if (filters.dataInicio && filters.dataFim) {
    return gerarMeses(parseLocalDate(filters.dataInicio), parseLocalDate(filters.dataFim))
  }
  return ultimosNMeses(12)
}

export async function getAvaliacaoMensal(
  filters: AvaliacaoFiltros
): Promise<ServiceResult<AvaliacaoMensalRow[]>> {
  try {
    const meses = janelaMeses(filters)
    const ratings: Array<{ key: keyof Omit<AvaliacaoMensalRow, 'mes'>; value: number }> = [
      { key: 'otimo', value: 40 },
      { key: 'bom', value: 30 },
      { key: 'regular', value: 20 },
      { key: 'ruim', value: 10 },
    ]

    const acc: Record<string, AvaliacaoMensalRow> = {}
    meses.forEach(m => {
      acc[m] = { mes: m, otimo: 0, bom: 0, regular: 0, ruim: 0 }
    })

    // Filtro de grupo: mesmos fornecedores das Parcerias.
    const fornGrupo = await fornecedoresDoGrupo(filters.grupos)
    if (fornGrupo && fornGrupo.length === 0) {
      return { data: meses.map(m => acc[m]), error: null }
    }

    // Contagem exata via HEAD request — sem paginação, sem risco de duplicação/perda
    const tasks: Promise<void>[] = []
    for (const mes of meses) {
      for (const r of ratings) {
        tasks.push((async () => {
          let q = (supabase as any)
            .from('vw_global_avaliacao_fornecedores' as any)
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)
            .eq('month_and_year_formatted', mes)
            .eq('general_rating', r.value)
          if (filters.obras?.length) q = q.in('cost_collector', filters.obras)
          if (filters.fornecedor) q = q.ilike('supplier_corporate_name', `%${filters.fornecedor}%`)
          if (fornGrupo) q = q.in('supplier_corporate_name', fornGrupo)
          q = applyCostCollectorExclusoes(q)
          
          const { count, error } = await q
          if (error) return
          acc[mes][r.key] = count ?? 0
        })())
      }
    }
    await Promise.all(tasks)

    return { data: meses.map(m => acc[m]), error: null }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}

export async function getFornecedoresAvaliacao(
  filters: AvaliacaoTabelaFiltros
): Promise<ServiceResult<AvaliacaoFornecedorRow[]>> {
  try {
    const PAGE = 1000
    let from = 0
    const all: AvaliacaoFornecedorRow[] = []

    // Filtro de grupo: mesmos fornecedores das Parcerias.
    const fornGrupo = await fornecedoresDoGrupo(filters.grupos)
    if (fornGrupo && fornGrupo.length === 0) return { data: [], error: null }

    while (true) {
      let query = (supabase as any)
        .from('vw_global_avaliacao_fornecedores' as any)
        .select(
          'supplier_corporate_name, quality_supply_type, cost_collector, general_rating, observation, month_and_year_formatted'
        )
        .eq('is_active', true)
        .order('month_and_year_formatted', { ascending: false, nullsFirst: false })
        .range(from, from + PAGE - 1)

      if (filters.obras?.length) query = query.in('cost_collector', filters.obras)
      if (filters.fornecedor)
        query = query.ilike('supplier_corporate_name', `%${filters.fornecedor}%`)
      if (fornGrupo) query = query.in('supplier_corporate_name', fornGrupo)
      query = applyCostCollectorExclusoes(query)
      if (filters.rating) query = query.eq('general_rating', filters.rating)
      if (filters.ratings && filters.ratings.length > 0 && filters.ratings.length < 4) {
        query = query.in('general_rating', filters.ratings)
      }

      if (filters.mes) {
        query = query.eq('month_and_year_formatted', filters.mes)
      } else {
        const meses = janelaMeses(filters)
        query = query.in('month_and_year_formatted', meses)
      }

      

      const { data, error } = await query
      if (error) return { data: null, error: error.message }
      const chunk = (data as AvaliacaoFornecedorRow[]) ?? []
      all.push(...chunk)
      if (chunk.length < PAGE) break
      from += PAGE
      if (from > 200000) break
    }

    // Ordena por data DECRESCENTE (mais recente primeiro). Formato "MM-YYYY".
    const parseMesAno = (s: string | null): number => {
      if (!s) return 0
      const [mm, yyyy] = s.split('-')
      return Number(yyyy) * 100 + Number(mm)
    }
    const ordenado = all.slice().sort((a, b) => {
      const d = parseMesAno(b.month_and_year_formatted) - parseMesAno(a.month_and_year_formatted)
      if (d !== 0) return d
      return (a.supplier_corporate_name ?? '').localeCompare(b.supplier_corporate_name ?? '')
    })

    return { data: ordenado, error: null }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}

