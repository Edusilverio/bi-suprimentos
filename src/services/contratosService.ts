import { supabase } from '@/lib/supabase'
import { fetchAllRows } from '@/lib/fetchAll'
import type { ContratoRow } from '@/lib/database.types'
import type { ServiceResult, GlobalFilters, ContratoKpis } from '@/types/domain'
import { applyEscritorioFilter, applyExcluiAnalistasFormalizacao } from '@/lib/filters'

export const STATUS_EM_ASSINATURA_CONTRATOS = [
  'Enviado para assinatura digital',
  'Enviado para plataforma digital (Aguardando Signatários)',
]

function applyGlobalFilters(query: any, filters: GlobalFilters, analystName?: string | string[] | null) {
  const analystNames = typeof analystName === 'string' ? [analystName] : analystName

  if (analystNames !== null && analystNames !== undefined && analystNames.length > 0) {
    query = query.or(
      `created_by_name.in.(${analystNames.map(n => `"${n}"`).join(',')}),created_by_name.is.null`
    )
  } else if (filters.analista?.length) {
    query = query.in('created_by_name', filters.analista)
  }

  if (filters.obra?.length) {
    query = query.in('cost_collector', filters.obra)
  }
  if (filters.tipo?.length) query = query.in('material_groups', filters.tipo)
  if (filters.periodo) {
    query = query
      .gte('start_date_contract', filters.periodo[0])
      .lte('start_date_contract', filters.periodo[1])
  }
  query = applyEscritorioFilter(query)
  return query
}

async function getKeysBaixadas(): Promise<string[]> {
  const query = (supabase as any)
    .from('contratos_flag_manual')
    .select('contrato_key')
    .eq('baixado', true)
  const { data } = await fetchAllRows<{ contrato_key: string }>(query)
  return (data ?? []).map(d => d.contrato_key)
}

const excludeBaixados = (q: any, keys: string[]) => {
  if (!keys.length) return q
  const list = keys.map(k => `"${k.replace(/"/g, '\\"')}"`).join(',')
  return q.not('key', 'in', `(${list})`)
}

export async function getContratos(
  filters: GlobalFilters & { statusMacro?: string | null; modoBaixados?: boolean },
  page = 0,
  pageSize = 50,
  analystName?: string | string[] | null
): Promise<ServiceResult<ContratoRow[]>> {
  try {
    const modoBaixados = !!filters.modoBaixados

    if (modoBaixados) {
      const keys = await getKeysBaixadas()
      if (keys.length === 0) return { data: [], error: null, count: 0 }
      let query = supabase
        .from('contratos')
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .in('key', keys)
      query = applyGlobalFilters(query, filters, analystName)
      query = query
        .order('created_when', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1)
      const { data, error, count } = await query
      return { data, error: error?.message ?? null, count: count ?? undefined }
    }

    let query = supabase.from('contratos').select('*', { count: 'exact' }).eq('is_active', true)
    query = applyGlobalFilters(query, filters, analystName)

    if (!filters.statusMacro) {
      query = query.in('purchase_order_contract_status', [
        'Em edição',
        'Reprovado',
        'Aprovado',
        'Enviado para assinatura digital',
        'Enviado para plataforma digital (Aguardando Signatários)',
      ])
    } else if (filters.statusMacro === 'em_edicao') {
      query = query.in('purchase_order_contract_status', ['Em edição', 'Reprovado'])
    } else if (filters.statusMacro === 'em_aprovacao') {
      query = query.ilike('purchase_order_contract_status', '%aguardando aprovação%')
    } else if (filters.statusMacro === 'enviar_d4sign') {
      query = query.eq('purchase_order_contract_status', 'Aprovado')
      // Regra: analistas sem formalização não entram em Enviar D4Sign
      query = applyExcluiAnalistasFormalizacao(query, 'created_by_name')
    } else if (filters.statusMacro === 'em_assinatura') {
      query = query.in('purchase_order_contract_status', STATUS_EM_ASSINATURA_CONTRATOS)
    }

    const keysBaixadas = await getKeysBaixadas()
    query = excludeBaixados(query, keysBaixadas)

    query = query
      .order('created_when', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1)

    const { data, error, count } = await query
    return { data, error: error?.message ?? null, count: count ?? undefined }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}

export async function getContratoKpis(
  filters: GlobalFilters,
  analystName?: string | string[] | null
): Promise<ServiceResult<ContratoKpis>> {
  try {
    const analystArr = analystName
      ? (typeof analystName === 'string' ? [analystName] : analystName)
      : null
    const analistasFinais =
      analystArr && analystArr.length > 0
        ? analystArr
        : (filters.analista?.length ? filters.analista : null)

    const obrasFinais = filters.obra?.length ? filters.obra : null

    const { data, error } = await (supabase as any).rpc('rpc_contratos_kpis', {
      p_obras: obrasFinais,
      p_analistas: analistasFinais,
      p_data_inicio: filters.periodo?.[0] ?? null,
      p_data_fim: filters.periodo?.[1] ?? null,
    })

    if (error) return { data: null, error: error.message }
    const row = Array.isArray(data) ? data[0] : data
    return {
      data: {
        emEdicao: Number(row?.em_edicao ?? 0),
        emAprovacao: Number(row?.em_aprovacao ?? 0),
        enviarD4Sign: Number(row?.enviar_d4sign ?? 0),
        emAssinatura: Number(row?.em_assinatura ?? 0),
        total: Number(row?.total ?? 0),
      },
      error: null,
    }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}

export async function getFornecedores(): Promise<ServiceResult<string[]>> {
  try {
    const query = supabase
      .from('contratos')
      .select('sup_corporate_name')
      .eq('is_active', true)
      .not('sup_corporate_name', 'is', null)
      .order('sup_corporate_name')
    const { data, error } = await fetchAllRows<{ sup_corporate_name: string | null }>(query)

    const unique = [...new Set((data || []).map(d => d.sup_corporate_name).filter(Boolean))] as string[]
    return { data: unique, error }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}

export async function getTiposContrato(): Promise<ServiceResult<string[]>> {
  try {
    const query = supabase
      .from('contratos')
      .select('material_groups')
      .eq('is_active', true)
      .not('material_groups', 'is', null)
      .order('material_groups')
    const { data, error } = await fetchAllRows<{ material_groups: string | null }>(query)

    const unique = [...new Set((data || []).map(d => d.material_groups).filter(Boolean))] as string[]
    return { data: unique, error }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}
