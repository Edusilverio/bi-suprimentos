import { supabase } from '@/lib/supabase'
import type { ContratoRow, RequestRow } from '@/lib/database.types'
import type { ServiceResult, GlobalFilters, OnepageKpis, SpendMensal, FornecedorTop } from '@/types/domain'
import { STATUS_ENCERRADOS_CONCORRENCIAS } from './concorrenciasService'
import { STATUS_EM_ASSINATURA_CONTRATOS } from './contratosService'
import { STATUS_MAP_CONCORRENCIAS } from './concorrenciasService'
import type { UserScope } from './concorrenciasService'
import { applyCostCollectorExclusoes, isCostCollectorExcluido } from '@/lib/filters'
import { fetchAllRows } from '@/lib/fetchAll'

/**
 * Aplica filtro de purchase_order_type tolerante a variações (ex.: en-dash
 * em "Pedido Consumo - Corp"). Usa .or() com .eq() para tipos exatos e
 * .ilike() para AP. Quando tipos é vazio/undefined, não aplica nada.
 */
function applyTipoPedidoFilter(query: any, tipos?: string[]) {
  if (!tipos?.length) return query
  const parts = tipos.map((t) =>
    /corp/i.test(t)
      ? `purchase_order_type.ilike.%Consumo%Corp%`
      : `purchase_order_type.eq.${t}`,
  )
  return query.or(parts.join(','))
}
// NOTE: ONE Page usa views globais (vw_global_*) que bypassam RLS.
// Por isso NÃO aplicamos mais escopo de obras/analistas implícito
// (applyObrasScope / applyEscritorioFilter / scope.nomesVisiveis).
// Apenas filtros EXPLÍCITOS do usuário + exclusões padronizadas
// de cost_collector (escritório, projetos, pré obra, etc.).

function applyRequestFilters(query: any, filters: GlobalFilters, _scope?: UserScope) {
  if (filters.analista?.length) {
    query = query.in('negotiator_name', filters.analista)
  }
  if (filters.obra?.length) {
    query = query.in('cost_collector', filters.obra)
  }
  if (filters.periodo) {
    query = query
      .gte('issue_date_formatted', filters.periodo[0])
      .lte('issue_date_formatted', filters.periodo[1])
  }
  query = applyCostCollectorExclusoes(query)
  return query
}

function applyContratoFilters(query: any, filters: GlobalFilters, _scope?: UserScope) {
  if (filters.obra?.length) {
    query = query.in('cost_collector', filters.obra)
  }
  if (filters.periodo) {
    query = query
      .gte('start_date_contract', filters.periodo[0])
      .lte('start_date_contract', filters.periodo[1])
  }
  query = applyCostCollectorExclusoes(query)
  return query
}

export async function getOnepageKpis(
  filters: GlobalFilters,
  scope?: UserScope
): Promise<ServiceResult<OnepageKpis>> {
  try {
    const reqBase = () => supabase.from('vw_global_requests' as any).select('*', { count: 'exact', head: true }).eq('is_active', true)
    const ctrBase = () => supabase.from('vw_global_contratos' as any).select('*', { count: 'exact', head: true }).eq('is_active', true)

    // For totalContratado we need the actual sum, not just count
    let sumQuery = supabase.from('vw_global_contratos' as any).select('value').eq('is_active', true)
    sumQuery = applyContratoFilters(sumQuery, filters, scope)

    const [
      sumResult,
      requisicoes,
      emAndamento,
      processosConcluidos,
      emAssinatura,
      assinados,
    ] = await Promise.all([
      fetchAllRows<{ value: number | null }>(sumQuery),
      applyRequestFilters(reqBase(), filters, scope),
      applyRequestFilters(reqBase(), filters, scope).not('request_status', 'in', `(${STATUS_ENCERRADOS_CONCORRENCIAS.map(s => `"${s}"`).join(',')})`),
      applyRequestFilters(reqBase(), filters, scope).in('request_status', STATUS_ENCERRADOS_CONCORRENCIAS),
      applyContratoFilters(ctrBase(), filters, scope).in('purchase_order_contract_status', STATUS_EM_ASSINATURA_CONTRATOS),
      applyContratoFilters(ctrBase(), filters, scope).in('purchase_order_contract_status', ['Assinado Digitalmente', 'Assinado Manualmente']),
    ])

    const totalContratado = (sumResult.data || []).reduce((acc, row) => acc + (row.value || 0), 0)

    return {
      data: {
        totalContratado,
        requisicoes: requisicoes.count ?? 0,
        emAndamento: emAndamento.count ?? 0,
        processosConcluidos: processosConcluidos.count ?? 0,
        emAssinatura: emAssinatura.count ?? 0,
        assinados: assinados.count ?? 0,
      },
      error: null,
    }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}

export async function getSpendMensal(
  _filters: GlobalFilters
): Promise<ServiceResult<SpendMensal[]>> {
  try {
    // Reescrito para usar vw_global_pedidos com exclusões padronizadas
    // (vw_spend_mensal agregada no banco ainda não tem as exclusões).
    let q: any = supabase
      .from('vw_global_pedidos_ultima_revisao' as any)
      .select('negotiator_issue_date, value, cost_collector')
      .eq('is_active', true)
      .not('negotiator_issue_date', 'is', null)
    q = applyCostCollectorExclusoes(q)
    const PAGE = 1000
    let from = 0
    const acc: Record<string, { ano: number; mes: number; total: number }> = {}
    while (true) {
      const { data, error } = await q.range(from, from + PAGE - 1)
      if (error) return { data: null, error: error.message }
      const chunk = (data as any[]) ?? []
      for (const row of chunk) {
        const d = new Date(row.negotiator_issue_date)
        if (isNaN(d.getTime())) continue
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`
        if (!acc[key]) acc[key] = { ano: d.getFullYear(), mes: d.getMonth() + 1, total: 0 }
        acc[key].total += Number(row.value ?? 0)
      }
      if (chunk.length < PAGE) break
      from += PAGE
      if (from > 500000) break
    }
    const mapped = Object.values(acc)
      .sort((a, b) => a.ano - b.ano || a.mes - b.mes)
      .map(r => ({ ano: r.ano, mes: r.mes, total_contratado: r.total } as any))
    return { data: mapped as any, error: null }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}

export async function getTopFornecedores(
  _filters: GlobalFilters,
  limit = 15
): Promise<ServiceResult<FornecedorTop[]>> {
  try {
    // Reescrito para usar vw_global_pedidos com exclusões padronizadas
    // (vw_top_fornecedores agregada não permite filtrar por cost_collector).
    let q: any = supabase
      .from('vw_global_pedidos_ultima_revisao' as any)
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
    const mapped = Object.entries(acc)
      .map(([fornecedor, v]) => ({
        fornecedor,
        totalContratado: v.total,
        quantidadeContratos: v.qtd,
      }))
      .sort((a, b) => b.totalContratado - a.totalContratado)
      .slice(0, limit)
    return { data: mapped, error: null }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}

export async function getUltimasContratacoes(
  filters: GlobalFilters,
  limit = 10,
  scope?: UserScope
): Promise<ServiceResult<ContratoRow[]>> {
  try {
    let query = supabase.from('vw_global_contratos' as any).select('*').eq('is_active', true)
    query = applyContratoFilters(query, filters, scope)
    query = query.order('released_date', { ascending: false }).limit(limit)

    const { data, error } = await query
    return { data, error: error?.message ?? null }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}

export async function getProximasContratacoes(
  filters: GlobalFilters,
  limit = 10,
  scope?: UserScope
): Promise<ServiceResult<RequestRow[]>> {
  try {
    let query = supabase.from('vw_global_requests' as any).select('*').eq('is_active', true)
    query = applyRequestFilters(query, filters, scope)
    query = query.in('request_status', STATUS_MAP_CONCORRENCIAS.criar_pedido)
    query = query.order('issue_date_formatted', { ascending: true }).limit(limit)

    const { data, error } = await query
    return { data, error: error?.message ?? null }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}

export type OneKpisFilters = {
  obras?: string[]
  analistas?: string[]
  dataInicio?: string
  dataFim?: string
  tipos?: string[]
  obrasHabilitadas?: string[] | null
}

/**
 * Visão GLOBAL — não aplica mais escopo de obras_habilitadas nem
 * exclusão de ESCRITÓRIO Atlas por nível. As views vw_global_* já
 * ignoram RLS. Aplica a lista padronizada de exclusões de
 * cost_collector (escritório, projetos, pré obra, acordo de preço,
 * indiretos, custos indiretos).
 */
function applyObrasScope(query: any, _obrasHabilitadas?: string[] | null) {
  return applyCostCollectorExclusoes(query)
}

export type OneKpis = {
  contratado: number
  requisicoes: number
  emAndamento: number
  processosConcluidos: number
  assinados: number
  emAssinatura: number
}

export async function getOneKpis(filters: OneKpisFilters): Promise<ServiceResult<OneKpis>> {
  try {
    // CONTRATADO
    let qContratado = supabase.from('vw_global_pedidos_ultima_revisao' as any).select('value').eq('is_active', true)
    if (filters.obras?.length) qContratado = qContratado.in('cost_collector', filters.obras)
    if (filters.analistas?.length) {
      qContratado = qContratado
        .in('quoting_negotiator_name', filters.analistas)
        .eq('purchase_order_type', 'Cotação')
    }
    qContratado = applyTipoPedidoFilter(qContratado, filters.tipos)
    if (filters.dataInicio) qContratado = qContratado.gte('negotiator_issue_date', filters.dataInicio)
    if (filters.dataFim) qContratado = qContratado.lte('negotiator_issue_date', filters.dataFim + 'T23:59:59')
    qContratado = applyObrasScope(qContratado, filters.obrasHabilitadas)
    const { data: pedidosValue } = await fetchAllRows<{ value: number | null }>(qContratado)
    const contratado = (pedidosValue ?? []).reduce((sum: number, p: any) => sum + (p.value ?? 0), 0)

    // REQUISIÇÕES (requests / release_date_level02)
    let qRequisicoes = supabase
      .from('vw_global_requests' as any)
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('request_status', 'Pronta para Comprar')
    if (filters.obras?.length) qRequisicoes = qRequisicoes.in('cost_collector', filters.obras)
    if (filters.analistas?.length) qRequisicoes = qRequisicoes.in('negotiator_name', filters.analistas)
    if (filters.dataInicio) qRequisicoes = qRequisicoes.gte('release_date_level02', filters.dataInicio)
    if (filters.dataFim) qRequisicoes = qRequisicoes.lte('release_date_level02', filters.dataFim + 'T23:59:59')
    qRequisicoes = applyObrasScope(qRequisicoes, filters.obrasHabilitadas)
    const { count: requisicoes } = await qRequisicoes

    // EM ANDAMENTO (requests / release_date_level02)
    let qEmAndamento = supabase
      .from('vw_global_requests' as any)
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('request_status', 'Pronta para Comprar')
      .or(
        'quoting_number_with_status_concat.is.null,' +
        'quoting_number_with_status_concat.ilike.%agrupado%,' +
        'quoting_number_with_status_concat.ilike.%cotação%,' +
        'quoting_number_with_status_concat.ilike.%reaberto%,' +
        'quoting_number_with_status_concat.ilike.%aguardando%'
      )
    if (filters.obras?.length) qEmAndamento = qEmAndamento.in('cost_collector', filters.obras)
    if (filters.analistas?.length) qEmAndamento = qEmAndamento.in('negotiator_name', filters.analistas)
    if (filters.dataInicio) qEmAndamento = qEmAndamento.gte('release_date_level02', filters.dataInicio)
    if (filters.dataFim) qEmAndamento = qEmAndamento.lte('release_date_level02', filters.dataFim + 'T23:59:59')
    qEmAndamento = applyObrasScope(qEmAndamento, filters.obrasHabilitadas)
    const { count: emAndamento } = await qEmAndamento

    // PROCESSOS CONCLUÍDOS (pedidos / negotiator_issue_date)
    let qProcessos = supabase.from('vw_global_pedidos_ultima_revisao' as any).select('*', { count: 'exact', head: true }).eq('is_active', true)
    if (filters.obras?.length) qProcessos = qProcessos.in('cost_collector', filters.obras)
    if (filters.analistas?.length) {
      qProcessos = qProcessos
        .in('quoting_negotiator_name', filters.analistas)
        .eq('purchase_order_type', 'Cotação')
    }
    qProcessos = applyTipoPedidoFilter(qProcessos, filters.tipos)
    if (filters.dataInicio) qProcessos = qProcessos.gte('negotiator_issue_date', filters.dataInicio)
    if (filters.dataFim) qProcessos = qProcessos.lte('negotiator_issue_date', filters.dataFim + 'T23:59:59')
    qProcessos = applyObrasScope(qProcessos, filters.obrasHabilitadas)
    const { count: processosConcluidos } = await qProcessos

    // CONTRATOS (contratos / created_when)
    let qAssinados: any = supabase
      .from('vw_global_contratos' as any)
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .ilike('purchase_order_contract_status', '%assinado%')
    let qEmAssinatura: any = supabase
      .from('vw_global_contratos' as any)
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .ilike('purchase_order_contract_status', '%enviado%')
    if (filters.obras?.length) {
      qAssinados = qAssinados.in('cost_collector', filters.obras)
      qEmAssinatura = qEmAssinatura.in('cost_collector', filters.obras)
    }
    if (filters.analistas?.length) {
      qAssinados = qAssinados.in('created_by_name', filters.analistas)
      qEmAssinatura = qEmAssinatura.in('created_by_name', filters.analistas)
    }
    if (filters.dataInicio) {
      qAssinados = qAssinados.gte('created_when', filters.dataInicio)
      qEmAssinatura = qEmAssinatura.gte('created_when', filters.dataInicio)
    }
    if (filters.dataFim) {
      qAssinados = qAssinados.lte('created_when', filters.dataFim + 'T23:59:59')
      qEmAssinatura = qEmAssinatura.lte('created_when', filters.dataFim + 'T23:59:59')
    }
    qAssinados = applyObrasScope(qAssinados, filters.obrasHabilitadas)
    qEmAssinatura = applyObrasScope(qEmAssinatura, filters.obrasHabilitadas)
    const { count: assinados } = await qAssinados
    const { count: emAssinatura } = await qEmAssinatura


    return {
      data: {
        contratado,
        requisicoes: requisicoes ?? 0,
        emAndamento: emAndamento ?? 0,
        processosConcluidos: processosConcluidos ?? 0,
        assinados: assinados ?? 0,
        emAssinatura: emAssinatura ?? 0,
      },
      error: null,
    }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}

// ============================================================
// ONE Page — Charts (real data)
// ============================================================

export type OneChartFilters = {
  obras?: string[]
  analistas?: string[]
  dataInicio?: string
  dataFim?: string
  obrasHabilitadas?: string[] | null
  /** purchase_order_type values (ex.: ['Cotação','Pedido Consumo']). Quando undefined → não filtra. */
  tipos?: string[]
}

const MESES_PT = [
  'jan','fev','mar','abr','mai','jun',
  'jul','ago','set','out','nov','dez',
]
const formatMesLabel = (yyyymm: string): string => {
  const [ano, mes] = yyyymm.split('-')
  return `${MESES_PT[parseInt(mes) - 1]}/${ano.slice(2)}`
}

export type RequisicaoMes = { mes: string; quantidade: number; ano: number; mesNum: number }

export async function getRequisicoesPorMes(
  filters: OneChartFilters
): Promise<ServiceResult<RequisicaoMes[]>> {
  try {
    let query = supabase
      .from('vw_global_requests' as any)
      .select('release_date_level02, cost_collector, negotiator_name')
      .eq('is_active', true)
      .eq('request_status', 'Pronta para Comprar')
      .not('release_date_level02', 'is', null)

    if (filters.obras?.length) query = query.in('cost_collector', filters.obras)
    if (filters.analistas?.length) query = query.in('negotiator_name', filters.analistas)
    if (filters.dataInicio) query = query.gte('release_date_level02', filters.dataInicio)
    if (filters.dataFim) query = query.lte('release_date_level02', filters.dataFim + 'T23:59:59')
    query = applyObrasScope(query, filters.obrasHabilitadas)

    const { data, error } = await fetchAllRows<any>(query)
    if (error) return { data: null, error }

    const contagem: Record<string, number> = {}
    const hasPeriodo = !!(filters.dataInicio || filters.dataFim)

    if (!hasPeriodo) {
      const hoje = new Date()
      for (let i = 5; i >= 0; i--) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
        contagem[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] = 0
      }
    }

    for (const row of data ?? []) {
      if (!row.release_date_level02) continue
      const d = new Date(row.release_date_level02)
      if (isNaN(d.getTime())) continue
      const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (hasPeriodo) {
        contagem[chave] = (contagem[chave] ?? 0) + 1
      } else if (chave in contagem) {
        contagem[chave]++
      }
    }

    const mesesOrdenados = Object.keys(contagem).sort()
    return {
      data: mesesOrdenados.map(m => {
        const [ano, mes] = m.split('-')
        return { mes: formatMesLabel(m), quantidade: contagem[m], ano: parseInt(ano), mesNum: parseInt(mes) }
      }),
      error: null,
    }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}

export type SpendMensalPoint = { mes: string; spend: number; processos: number; ano: number; mesNum: number }

export async function getSpendMensalChart(
  filters: OneChartFilters
): Promise<ServiceResult<SpendMensalPoint[]>> {
  try {
    let query: any = supabase
      .from('vw_global_pedidos_ultima_revisao' as any)
      .select('negotiator_issue_date, value, cost_collector, quoting_negotiator_name, purchase_order_type')
      .eq('is_active', true)
      .not('negotiator_issue_date', 'is', null)

    if (filters.obras?.length) query = query.in('cost_collector', filters.obras)
    if (filters.analistas?.length) {
      query = query
        .in('quoting_negotiator_name', filters.analistas)
        .eq('purchase_order_type', 'Cotação')
    }
    query = applyTipoPedidoFilter(query, filters.tipos)
    if (filters.dataInicio) query = query.gte('negotiator_issue_date', filters.dataInicio)
    if (filters.dataFim) query = query.lte('negotiator_issue_date', filters.dataFim + 'T23:59:59')
    query = applyObrasScope(query, filters.obrasHabilitadas)

    const { data, error } = await fetchAllRows<any>(query)
    if (error) return { data: null, error }

    const agrupado: Record<string, { spend: number; processos: number }> = {}

    if (!filters.dataInicio && !filters.dataFim) {
      const hoje = new Date()
      for (let i = 5; i >= 0; i--) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
        const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        agrupado[chave] = { spend: 0, processos: 0 }
      }
    }

    const hasPeriodoSpend = !!(filters.dataInicio || filters.dataFim)
    for (const row of (data ?? []) as any[]) {
      const d = new Date(row.negotiator_issue_date)
      if (isNaN(d.getTime())) continue
      const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (hasPeriodoSpend) {
        if (!agrupado[chave]) agrupado[chave] = { spend: 0, processos: 0 }
      } else if (!(chave in agrupado)) {
        continue
      }
      agrupado[chave].spend += row.value ?? 0
      agrupado[chave].processos += 1
    }

    const resultado = Object.entries(agrupado)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, v]) => {
        const [ano, mn] = mes.split('-')
        return { mes: formatMesLabel(mes), spend: v.spend, processos: v.processos, ano: parseInt(ano), mesNum: parseInt(mn) }
      })

    return { data: resultado, error: null }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}

export type TopFornecedorPoint = { fornecedor: string; contratado: number; executado: number; saldo: number }

export async function getTopFornecedoresChart(
  filters: OneChartFilters
): Promise<ServiceResult<TopFornecedorPoint[]>> {
  try {
    let query: any = supabase
      .from('vw_global_pedidos_ultima_revisao' as any)
      .select('sup_corporate_name, value, balance, cost_collector, quoting_negotiator_name, purchase_order_type, negotiator_issue_date, purchase_order_status')
      .eq('is_active', true)
      .like('purchase_order_status', 'Aprovado%')
      .not('sup_corporate_name', 'is', null)
      .not('sup_corporate_name', 'ilike', '%Atlas%')

    if (filters.obras?.length) query = query.in('cost_collector', filters.obras)
    if (filters.analistas?.length) {
      query = query
        .in('quoting_negotiator_name', filters.analistas)
        .eq('purchase_order_type', 'Cotação')
    }
    query = applyTipoPedidoFilter(query, filters.tipos)
    if (filters.dataInicio) query = query.gte('negotiator_issue_date', filters.dataInicio)
    if (filters.dataFim) query = query.lte('negotiator_issue_date', filters.dataFim + 'T23:59:59')
    query = applyObrasScope(query, filters.obrasHabilitadas)

    const { data, error } = await fetchAllRows<any>(query)
    if (error) return { data: null, error }

    const agrupado: Record<string, { contratado: number; saldo: number }> = {}
    for (const row of (data ?? []) as any[]) {
      const nome = (row.sup_corporate_name ?? '').trim()
      if (!nome) continue
      if (!agrupado[nome]) agrupado[nome] = { contratado: 0, saldo: 0 }
      agrupado[nome].contratado += row.value ?? 0
      agrupado[nome].saldo += row.balance ?? 0
    }

    const resultado = Object.entries(agrupado)
      .map(([fornecedor, v]) => ({
        fornecedor,
        contratado: v.contratado,
        executado: Math.max(0, v.contratado - v.saldo),
        saldo: v.saldo,
      }))
      .sort((a, b) => b.contratado - a.contratado)
      .slice(0, 15)

    return { data: resultado, error: null }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}


// ============================================================
// ONE Page — Tables (real data)
// ============================================================

export type UltimaContratacaoRow = {
  obra: string | null
  fornecedor: string | null
  grupo: string | null
  valor: number | null
}

export async function getUltimasContratacoesOne(filters: {
  obras?: string[]
  analistas?: string[]
  dataInicio?: string
  dataFim?: string
  obrasHabilitadas?: string[] | null
  tipos?: string[]
}): Promise<ServiceResult<UltimaContratacaoRow[]>> {
  try {
    let query: any = supabase
      .from('vw_global_pedidos_ultima_revisao' as any)
      .select('cost_collector, sup_corporate_name, material_group, value, purchase_order_status, negotiator_issue_date, quoting_negotiator_name, purchase_order_type, quoting_number_formatted')
      .eq('is_active', true)
      .in('purchase_order_status', ['Aprovado Workflow', 'Aprovado Workflow (Sem Aprovadores)'])
      .gte('value', 100000)

    if (filters.obras?.length) query = query.in('cost_collector', filters.obras)
    if (filters.analistas?.length) {
      query = query.in('quoting_negotiator_name', filters.analistas)
    }
    query = applyTipoPedidoFilter(query, filters.tipos)
    if (filters.dataInicio) query = query.gte('negotiator_issue_date', filters.dataInicio)
    if (filters.dataFim) query = query.lte('negotiator_issue_date', filters.dataFim + 'T23:59:59')
    query = applyObrasScope(query, filters.obrasHabilitadas)

    query = query.order('negotiator_issue_date', { ascending: false })

    const { data: pedidos, error } = await fetchAllRows<any>(query)
    if (error) return { data: null, error }

    // Enriquece grupo a partir de cotacoes (cost_collector + quoting_number_formatted).
    const cotacoesQuery: any = supabase
      .from('cotacoes' as any)
      .select('cost_collector, quoting_number_formatted, material_group')
      .not('material_group', 'is', null)
    const { data: cotacoesData } = await fetchAllRows<any>(cotacoesQuery)
    const chave = (cc: string | null, qn: string | null) => `${cc ?? ''}||${qn ?? ''}`
    const grupoMap = new Map<string, string>()
    for (const c of cotacoesData ?? []) {
      if (c.material_group) grupoMap.set(chave(c.cost_collector, c.quoting_number_formatted), c.material_group)
    }

    const enriched: UltimaContratacaoRow[] = ((pedidos ?? []) as any[]).map((p) => ({
      obra: p.cost_collector,
      fornecedor: p.sup_corporate_name,
      grupo: grupoMap.get(chave(p.cost_collector, p.quoting_number_formatted)) ?? p.material_group ?? null,
      valor: p.value,
    }))

    return { data: enriched, error: null }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}

export type ContratoTabelaRow = {
  fornecedor: string | null
  obra: string | null
  grupo: string | null
  status: string | null
  valor: number | null
}

export async function getContratosTabela(filters: {
  obras?: string[]
  analistas?: string[]
  dataInicio?: string
  dataFim?: string
  obrasHabilitadas?: string[] | null
}): Promise<ServiceResult<ContratoTabelaRow[]>> {
  try {
    let query: any = supabase
      .from('vw_global_contratos' as any)
      .select('sup_corporate_name, cost_collector, material_groups, purchase_order_contract_status, value, id, created_by_name, created_when')
      .eq('is_active', true)

    if (filters.obras?.length) query = query.in('cost_collector', filters.obras)
    if (filters.analistas?.length) query = query.in('created_by_name', filters.analistas)
    if (filters.dataInicio) query = query.gte('created_when', filters.dataInicio)
    if (filters.dataFim) query = query.lte('created_when', filters.dataFim + 'T23:59:59')
    query = applyObrasScope(query, filters.obrasHabilitadas)

    query = query.order('id', { ascending: false })


    const { data, error } = await fetchAllRows<any>(query)
    if (error) return { data: null, error }

    const resultado = (data ?? []).map((c: any) => ({
      fornecedor: c.sup_corporate_name,
      obra: c.cost_collector,
      grupo: c.material_groups,
      status: c.purchase_order_contract_status,
      valor: c.value ?? null,
    }))
    return { data: resultado, error: null }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}

// ============================================================
// ONE Page — Percentual Contratado (excel_custo_obra)
// ============================================================

export type PercentualContratadoRow = {
  obra: string
  porcentagem: number
  custoAtual?: number
  totalContratado?: number
}

export async function getPercentualContratado(
  filters: { obras?: string[] }
): Promise<ServiceResult<PercentualContratadoRow[]>> {
  try {
    let query: any = supabase
      .from('vw_percentual_contratado' as any)
      .select('*')

    if (filters.obras?.length) {
      query = query.in('cost_collector', filters.obras)
    }
    query = applyCostCollectorExclusoes(query)

    const { data, error } = await fetchAllRows<any>(query)
    if (error) return { data: null, error }

    const resultado = ((data ?? []) as any[])
      .map((r) => ({
        obra: r.cost_collector as string,
        porcentagem: Number(r.percentual_contratado ?? 0),
        custoAtual: Number(r.custo_atual ?? 0),
        totalContratado: Number(r.total_contratado ?? 0),
      }))
      .sort((a, b) => b.porcentagem - a.porcentagem)

    return { data: resultado, error: null }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}

// ============================================================
// ONE Page — Drill-down dos gráficos mensais
// ============================================================

export interface DetalheSpendRow {
  numero: string | null
  fornecedor: string | null
  grupo: string | null
  obra: string | null
  valor: number
  data: string | null
  analista: string | null
}

export interface DetalheRequisicaoRow {
  numero: string | null
  obra: string | null
  material: string | null
  analista: string | null
  status: string | null
  data: string | null
}

function mesIntervalo(ano: number, mes: number) {
  const mm = String(mes).padStart(2, '0')
  const ultimoDia = new Date(ano, mes, 0).getDate()
  return {
    inicio: `${ano}-${mm}-01T00:00:00`,
    fim: `${ano}-${mm}-${String(ultimoDia).padStart(2, '0')}T23:59:59`,
  }
}

export async function getDetalheSpendMes(
  ano: number,
  mes: number,
  filters: OneChartFilters,
): Promise<ServiceResult<DetalheSpendRow[]>> {
  try {
    const { inicio, fim } = mesIntervalo(ano, mes)
    let query: any = supabase
      .from('vw_global_pedidos_ultima_revisao' as any)
      .select('purchase_order_number_with_review, sup_corporate_name, material_group, cost_collector, value, negotiator_issue_date, quoting_negotiator_name, purchase_order_type')
      .eq('is_active', true)
      .gte('negotiator_issue_date', inicio)
      .lte('negotiator_issue_date', fim)

    if (filters.obras?.length) query = query.in('cost_collector', filters.obras)
    if (filters.analistas?.length) {
      query = query
        .in('quoting_negotiator_name', filters.analistas)
        .eq('purchase_order_type', 'Cotação')
    }
    query = applyTipoPedidoFilter(query, filters.tipos)
    query = applyObrasScope(query, filters.obrasHabilitadas)
    query = query.order('value', { ascending: false })

    const { data, error } = await fetchAllRows<any>(query)
    if (error) return { data: null, error }

    return {
      data: (data ?? []).map((r: any) => ({
        numero: r.purchase_order_number_with_review,
        fornecedor: r.sup_corporate_name,
        grupo: r.material_group,
        obra: r.cost_collector,
        valor: Number(r.value ?? 0),
        data: r.negotiator_issue_date,
        analista: r.quoting_negotiator_name,
      })),
      error: null,
    }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}

export async function getDetalheRequisicoesMes(
  ano: number,
  mes: number,
  filters: OneChartFilters,
): Promise<ServiceResult<DetalheRequisicaoRow[]>> {
  try {
    const { inicio, fim } = mesIntervalo(ano, mes)
    let query = supabase
      .from('vw_global_requests' as any)
      .select('number_formatted, cost_collector, material_group, negotiator_name, request_status, release_date_level02')
      .eq('is_active', true)
      .eq('request_status', 'Pronta para Comprar')
      .gte('release_date_level02', inicio)
      .lte('release_date_level02', fim)
      .order('release_date_level02', { ascending: false })

    if (filters.obras?.length) query = query.in('cost_collector', filters.obras)
    if (filters.analistas?.length) query = query.in('negotiator_name', filters.analistas)
    query = applyObrasScope(query, filters.obrasHabilitadas)

    const { data, error } = await fetchAllRows<any>(query)
    if (error) return { data: null, error }

    return {
      data: (data ?? []).map((r: any) => ({
        numero: r.number_formatted,
        obra: r.cost_collector,
        material: r.material_group,
        analista: r.negotiator_name,
        status: r.request_status,
        data: r.release_date_level02,
      })),
      error: null,
    }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}

// ============================================================
// ONE Page — Ranking de Obras por Tipo de Contratação
// ============================================================

export interface RankingObraTipo {
  obra: string
  sup: number
  pd: number
  ap: number
  total_3tipos: number
}

export async function getRankingObrasPorTipo(
  filters: OneChartFilters,
): Promise<ServiceResult<RankingObraTipo[]>> {
  try {
    let query: any = supabase
      .from('vw_ranking_obras_tipo' as any)
      .select('*')

    if (filters.obras?.length) {
      query = query.in('obra', filters.obras)
    }

    const orderedQuery = query.order('total_3tipos', { ascending: false })
    const { data, error } = await fetchAllRows<any>(orderedQuery)
    if (error) return { data: null, error }

    const mapped = ((data ?? []) as any[])
      .filter((r) => !isCostCollectorExcluido(r.obra))
      .map((r) => ({
        obra: String(r.obra ?? ''),
        sup: Number(r.sup ?? 0),
        pd: Number(r.pd ?? 0),
        ap: Number(r.ap ?? 0),
        total_3tipos: Number(r.total_3tipos ?? 0),
      }))

    return { data: mapped, error: null }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}

// ============================================================
// Relatório PDF — Info da obra (cliente, foto_url)
// ============================================================
export type ObraInfo = { cliente: string | null; foto_url: string | null }

export async function getObraInfo(obraName: string | null): Promise<ServiceResult<ObraInfo>> {
  if (!obraName) {
    return { data: { cliente: 'Atlas Engenharia', foto_url: null }, error: null }
  }
  try {
    const { data, error } = await supabase
      .from('excel_custo_obra' as any)
      .select('cliente, foto_url')
      .eq('cost_collector', obraName)
      .maybeSingle()
    if (error) {
      // colunas podem não existir ainda — fallback gracioso
      return { data: { cliente: null, foto_url: null }, error: null }
    }
    return {
      data: {
        cliente: (data as any)?.cliente ?? null,
        foto_url: (data as any)?.foto_url ?? null,
      },
      error: null,
    }
  } catch {
    return { data: { cliente: null, foto_url: null }, error: null }
  }
}
