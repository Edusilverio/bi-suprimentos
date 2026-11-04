import { supabase } from '@/lib/supabase'
import { fetchAllRows } from '@/lib/fetchAll'
import type { PedidoRow } from '@/lib/database.types'
import type { ServiceResult, GlobalFilters, PedidoKpis } from '@/types/domain'
import type { UserScope } from './concorrenciasService'
import { applyEscritorioFilter, applyExcluiAnalistasFormalizacao } from '@/lib/filters'

export const STATUS_MAP_PEDIDOS: Record<string, string[]> = {}

export const A_FORMALIZAR_EXCLUDED_OBRAS = [
  '%custos indiretos%',
  '%indiretos custo atlas%',
  '%acordo de preço%',
  '%projetos%',
  '%pré obra%',
]

const applyObrasExcluidas = (q: any) =>
  q.not('cost_collector', 'ilike', '%custos indiretos%')
    .not('cost_collector', 'ilike', '%indiretos custo atlas%')
    .not('cost_collector', 'ilike', '%acordo de preço%')
    .not('cost_collector', 'ilike', '%projetos%')
    .not('cost_collector', 'ilike', '%pré obra%')

const applyAFormalizarFilter = (q: any) =>
  applyObrasExcluidas(
    q.eq('purchase_order_type', 'Cotação')
      .ilike('purchase_order_status', '%aprovado%')
      .eq('flag_email_sent_boolean', false)
      .eq('flag_has_contract', false)
  )

const applyPedEmValidacaoFilter = (q: any, modoResp: boolean) => {
  let query = q
    .ilike('purchase_order_status', '%aprovado%')
    .eq('flag_has_contract', false)
    .eq('precisa_minuta', true)
  query = applyObrasExcluidas(query)
  if (modoResp) {
    // Modo Responsáveis: NÃO-Cotação (Consumo/Consumo Corp pulam formalização)
    query = query.neq('purchase_order_type', 'Cotação')
  } else {
    // Modo padrão: Cotação com regra de formalização (email enviado)
    query = query
      .eq('purchase_order_type', 'Cotação')
      .eq('flag_email_sent_boolean', true)
  }
  return query
}

async function getKeysDispensadas(): Promise<string[]> {
  const query = (supabase as any)
    .from('pedidos_flag_manual')
    .select('pedido_key')
    .eq('dispensado', true)
  const { data } = await fetchAllRows<{ pedido_key: string }>(query)
  return (data ?? []).map(d => d.pedido_key)
}

async function getKeysFormalizadas(): Promise<string[]> {
  const query = (supabase as any)
    .from('pedidos_flag_manual')
    .select('pedido_key')
    .eq('formalizado', true)
  const { data } = await fetchAllRows<{ pedido_key: string }>(query)
  return (data ?? []).map(d => d.pedido_key)
}

const excludeKeys = (q: any, keys: string[]) => {
  if (!keys.length) return q
  const list = keys.map(k => `"${k.replace(/"/g, '\\"')}"`).join(',')
  return q.not('key', 'in', `(${list})`)
}
const excludeDispensados = excludeKeys
const excludeFormalizados = excludeKeys


const tableFor = (modoResp: boolean) =>
  modoResp ? 'vw_pedidos_pendencia_responsavel' : 'vw_pedidos_com_minuta_flag'

function applyGlobalFilters(
  query: any,
  filters: GlobalFilters,
  scope?: UserScope,
  modoResp = false
) {
  if (scope?.nomesVisiveis && scope.nomesVisiveis.length > 0) {
    if (modoResp) {
      const cond = scope.nomesVisiveis
        .map(n => `quoting_negotiator_name.eq.${n},responsaveis_resolvidos.cs.{"${n}"}`)
        .join(',')
      query = query.or(cond)
    } else {
      query = query.in('quoting_negotiator_name', scope.nomesVisiveis)
    }
  } else if (filters.analista?.length) {
    if (modoResp) {
      const cond = filters.analista
        .map(n => `quoting_negotiator_name.eq.${n},responsaveis_resolvidos.cs.{"${n}"}`)
        .join(',')
      query = query.or(cond)
    } else {
      query = query.in('quoting_negotiator_name', filters.analista)
    }
  }

  if (scope?.obrasHabilitadas !== undefined && scope?.obrasHabilitadas !== null) {
    if (scope.obrasHabilitadas.length > 0) {
      query = query.in('cost_collector', scope.obrasHabilitadas)
    } else {
      query = query.eq('cost_collector', '__NENHUMA__')
    }
  }

  // Filtro manual de obra: sempre aplicado (intersecta com o escopo via AND).
  if (filters.obra?.length) {
    query = query.in('cost_collector', filters.obra)
  }

  if (filters.tipo?.length) query = query.in('purchase_order_type', filters.tipo)
  if (filters.periodo) {
    query = query
      .gte('negotiator_issue_date', filters.periodo[0])
      .lte('negotiator_issue_date', filters.periodo[1])
  }
  query = applyEscritorioFilter(query)
  return query
}

export async function getPedidos(

  filters: GlobalFilters & { statusMacro?: string | null; modoResp?: boolean; modoDispensados?: boolean },
  page = 0,
  pageSize = 50,
  scope?: UserScope
): Promise<ServiceResult<PedidoRow[]>> {
  try {
    const modoResp = !!filters.modoResp
    const modoDispensados = !!filters.modoDispensados

    if (modoDispensados) {
      const keys = await getKeysDispensadas()
      if (keys.length === 0) return { data: [], error: null, count: 0 }
      let query = supabase
        .from('vw_pedidos_com_minuta_flag' as any)
        .select('*', { count: 'exact' })
        .in('key', keys)
      query = applyGlobalFilters(query, filters, scope, false)
      query = query
        .order('negotiator_issue_date', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1)
      const { data, error, count } = await query
      return { data, error: error?.message ?? null, count: count ?? undefined }
    }

    let query = supabase.from(tableFor(modoResp) as any).select('*', { count: 'exact' })

    if (filters.statusMacro === 'ped_em_validacao') {
      const keysPromise = getKeysDispensadas()
      query = applyGlobalFilters(query, filters, scope, modoResp)
      query = applyPedEmValidacaoFilter(query, modoResp)
      const keysDispensadas = await keysPromise
      query = excludeDispensados(query, keysDispensadas)
      // Regra: analistas sem formalização não entram em Pend. Minuta
      query = applyExcluiAnalistasFormalizacao(query, 'quoting_negotiator_name')

    } else {
      // Para os outros cards/tabela padrão, mantém lógica de Cotação
      query = applyGlobalFilters(query, filters, scope, false)
      query = query.eq('purchase_order_type', 'Cotação')

      if (filters.statusMacro === 'ped_em_aprovacao') {
        query = query
          .ilike('purchase_order_status', '%aguardando%')
          .like('purchase_order_number_with_review', '%-00')
      } else if (filters.statusMacro === 'a_formalizar') {
        query = applyAFormalizarFilter(query)
        const keysFormalizadas = await getKeysFormalizadas()
        query = excludeFormalizados(query, keysFormalizadas)
        // Regra: analistas sem formalização não entram em À Formalizar
        query = applyExcluiAnalistasFormalizacao(query, 'quoting_negotiator_name')
      }
    }

    const { data, error, count } = await query
    return { data, error: error?.message ?? null, count: count ?? undefined }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}

export async function getFormalizadosCount(): Promise<number> {
  return (await getKeysFormalizadas()).length
}



export async function getPedidoKpis(
  filters: GlobalFilters & { modoResp?: boolean },
  scope?: UserScope
): Promise<ServiceResult<PedidoKpis>> {
  try {
    const analistasFinais =
      scope?.nomesVisiveis && scope.nomesVisiveis.length > 0
        ? scope.nomesVisiveis
        : (filters.analista?.length ? filters.analista : null)

    const temHabilitadas = scope?.obrasHabilitadas != null
    const obrasFinais = temHabilitadas
      ? (scope!.obrasHabilitadas!.length === 0
          ? ['__NENHUMA__']
          : (filters.obra?.length
              ? scope!.obrasHabilitadas!.filter(o => filters.obra!.includes(o))
              : scope!.obrasHabilitadas!))
      : (filters.obra?.length ? filters.obra : null)

    const { data, error } = await (supabase as any).rpc('rpc_pedidos_kpis', {
      p_obras: obrasFinais,
      p_analistas: analistasFinais,
      p_data_inicio: filters.periodo?.[0] ?? null,
      p_data_fim: filters.periodo?.[1] ?? null,
      p_modo_resp: filters.modoResp ?? false,
    })

    if (error) return { data: null, error: error.message }
    const row = Array.isArray(data) ? data[0] : data
    return {
      data: {
        emAprovacao: Number(row?.ped_em_aprovacao ?? 0),
        aFormalizar: Number(row?.a_formalizar ?? 0),
        emValidacao: Number(row?.ped_em_validacao ?? 0),
        total: Number(row?.total ?? 0),
      },
      error: null,
    }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}

