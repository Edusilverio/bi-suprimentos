import { supabase } from '@/lib/supabase'
import type { RequestRow } from '@/lib/database.types'
import type { ServiceResult, GlobalFilters, ConcorrenciaKpis } from '@/types/domain'
import { applyEscritorioFilter } from '@/lib/filters'

export const STATUS_MAP_CONCORRENCIAS: Record<string, string[]> = {
  a_delegar: ['Aguardando Distribuição (Depto de Suprimentos)'],
}

// Filtro composto para "À Iniciar": status "Pronta para Comprar" + cotação vazia ou agrupado.
export const A_INICIAR_STATUS = 'Pronta para Comprar'
export const A_INICIAR_COTACAO_FILTER =
  'quoting_number_with_status_concat.is.null,' +
  'quoting_number_with_status_concat.eq.,' +
  'quoting_number_with_status_concat.ilike.%agrupado%'

// Filtro composto para "Em Cotação": status "Pronta para Comprar" + cotação, reaberto, devolvido ou reprovado.
export const EM_COTACAO_COTACAO_FILTER =
  'quoting_number_with_status_concat.ilike.%cotação%,' +
  'quoting_number_with_status_concat.ilike.%reaberto%,' +
  'quoting_number_with_status_concat.ilike.%devolvido%,' +
  'quoting_number_with_status_concat.ilike.%reprovado%'

// Todos os outros cards usam filtros compostos.

export const STATUS_ENCERRADOS_CONCORRENCIAS = [
  'Requisição Encerrada',
  'Devolvida  (Gerente de Custos)',
  'Devolvida  (Gerente de Obra)',
  'Cancelada',
]

/**
 * Status terminais negativos: a requisição não existe mais como processo.
 * Espelha a exclusão aplicada em rpc_concorrencias_kpis (migration r2).
 */
export const STATUS_TERMINAIS_REQUESTS = [
  'Cancelada',
  'Pedido de Regularização Deletado',
  'Pedido Direto Deletado',
]


export type UserScope = {
  nomesVisiveis?: string[] | null
  obrasHabilitadas?: string[] | null
}

type FilterDebugOptions = {
  ignoreAnalystScope?: boolean
  ignoreObrasScope?: boolean
  appliedFilters?: string[]
  skippedFilters?: string[]
}

function isDebugEnabled() {
  try {
    return import.meta.env.VITE_DEBUG_CONCORRENCIAS === 'true'
      || localStorage.getItem('debug:concorrencias') === 'true'
  } catch {
    return import.meta.env.VITE_DEBUG_CONCORRENCIAS === 'true'
  }
}

function debugADelegar(context: string, payload: Record<string, unknown>) {
  if (!isDebugEnabled()) return
  console.groupCollapsed(`[Concorrências][À Delegar] ${context}`)
  console.table(payload.appliedFilters ?? [])
  console.table(payload.skippedFilters ?? [])
  console.debug(payload)
  console.groupEnd()
}

/**
 * Resolve as famílias de grupo (que podem conter vírgula no nome) para os valores
 * completos de material_group presentes nas requisições, via RPC — comma-safe
 * (as famílias vão como parâmetro, não na URL do PostgREST). Espelha exatamente
 * o predicado de rpc_concorrencias_kpis (material_group ILIKE ANY %família%).
 * Retorna null quando não há filtro de grupo; [] quando nenhum material_group casa.
 */
async function materialGroupsDaFamilia(grupos?: string[]): Promise<string[] | null> {
  if (!grupos?.length) return null
  const { data, error } = await (supabase as any).rpc('fn_material_groups_por_familia', {
    p_grupos: grupos,
  })
  if (error || !data) return []
  return (data as { material_group: string }[]).map(r => r.material_group).filter(Boolean)
}

function applyGlobalFilters(
  query: any,
  filters: GlobalFilters,
  scope?: UserScope,
  options?: FilterDebugOptions & { matchedGroups?: string[] | null }
) {
  // Filtro por analista (nivel 3 com substitutos de férias).
  // À Delegar ainda não foi distribuído, então não deve restringir pelo analista logado.
  if (!options?.ignoreAnalystScope) {
    if (scope?.nomesVisiveis && scope.nomesVisiveis.length > 0) {
      // IMPORTANTE: usar .in() (sem .or()) para evitar colisão com outros .or()
      // aplicados depois (ex: cards "criar_pedido", "a_iniciar", "em_cotacao").
      // No PostgREST, dois .or() na mesma query podem se sobrescrever/conflitar.
      // Registros com negotiator_name NULL não pertencem a nenhum analista,
      // então não precisam aparecer no escopo de um analista específico.
      query = query.in('negotiator_name', scope.nomesVisiveis)
      options?.appliedFilters?.push(`analista automático: negotiator_name IN (${scope.nomesVisiveis.join(', ')})`)
    } else if (filters.analista?.length) {
      query = query.in('negotiator_name', filters.analista)
      options?.appliedFilters?.push(`analista manual: negotiator_name IN (${filters.analista.join(', ')})`)
    }
  } else {
    options?.skippedFilters?.push('analista ignorado: nomesVisiveis e filtro manual de analista não foram aplicados')
  }

  // Filtro por obras habilitadas (nivel >= 2)
  if (!options?.ignoreObrasScope && scope?.obrasHabilitadas !== undefined && scope?.obrasHabilitadas !== null) {
    if (scope.obrasHabilitadas.length > 0) {
      query = query.in('cost_collector', scope.obrasHabilitadas)
      options?.appliedFilters?.push(`obras habilitadas: cost_collector IN (${scope.obrasHabilitadas.length} obras)`)
    } else {
      // sem obras habilitadas = não vê nada
      query = query.eq('cost_collector', '__NENHUMA__')
      options?.appliedFilters?.push('obras habilitadas vazias: cost_collector = __NENHUMA__')
    }
  } else if (options?.ignoreObrasScope) {
    options?.skippedFilters?.push('obras habilitadas ignoradas: restrição automática por usuario_obras não foi aplicada')
  }

  // Filtro manual de obra: sempre aplicado (intersecta com o escopo via AND).
  if (filters.obra?.length) {
    query = query.in('cost_collector', filters.obra)
    options?.appliedFilters?.push(`obra manual: cost_collector IN (${filters.obra.join(', ')})`)
  }

  // Filtro de grupo de material — comma-safe: as famílias já foram resolvidas para
  // os valores completos de material_group (via RPC) e aplicadas com .in(), que
  // encoda cada valor individualmente (imune a vírgulas no nome do grupo).
  if (filters.grupos?.length) {
    const matched = options?.matchedGroups
    if (matched && matched.length > 0) {
      query = query.in('material_group', matched)
      options?.appliedFilters?.push(`grupo material: material_group IN (${matched.length} valores)`)
    } else {
      // Nenhum material_group casa com as famílias selecionadas → não retorna nada.
      query = query.eq('material_group', '__NENHUM__')
      options?.appliedFilters?.push('grupo material: nenhum valor casa → material_group = __NENHUM__')
    }
  }

  if (filters.periodo) {
    query = query
      .gte('changed_when', filters.periodo[0])
      .lte('changed_when', filters.periodo[1])
    options?.appliedFilters?.push(`período: changed_when entre ${filters.periodo[0]} e ${filters.periodo[1]}`)
  }
  query = applyEscritorioFilter(query)
  return query
}

export async function getConcorrencias(
  filters: GlobalFilters & { statusMacro?: string | null },
  page = 0,
  pageSize = 50,
  scope?: UserScope
): Promise<ServiceResult<RequestRow[]>> {
  try {
    const isADelegar = filters.statusMacro === 'a_delegar'
    const appliedFilters: string[] = []
    const skippedFilters: string[] = []
    // Resolve as famílias de grupo → valores completos de material_group (comma-safe).
    const matchedGroups = await materialGroupsDaFamilia(filters.grupos)
    let query = supabase
      .from('requests')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .not('request_status', 'in', `(${STATUS_TERMINAIS_REQUESTS.map(s => `"${s}"`).join(',')})`)
    query = applyGlobalFilters(query, filters, scope, {

      ignoreAnalystScope: isADelegar,
      ignoreObrasScope: isADelegar,
      appliedFilters,
      skippedFilters,
      matchedGroups,
    })

    if (filters.statusMacro === 'a_iniciar') {
      query = query
        .eq('request_status', A_INICIAR_STATUS)
        .or(A_INICIAR_COTACAO_FILTER)
      appliedFilters.push(`status macro À Iniciar: request_status = ${A_INICIAR_STATUS} e cotação vazia ou agrupado`)
    } else if (filters.statusMacro === 'em_cotacao') {
      query = query
        .eq('request_status', A_INICIAR_STATUS)
        .or(EM_COTACAO_COTACAO_FILTER)
      appliedFilters.push(`status macro Em Cotação: request_status = ${A_INICIAR_STATUS} e cotação contém cotação, reaberto, devolvido ou reprovado`)
    } else if (filters.statusMacro === 'em_aprovacao') {
      query = query
        .eq('request_status', 'Pronta para Comprar')
        .or('quoting_number_with_status_concat.ilike.%aguardando%')
      appliedFilters.push('status macro Em Aprovação: request_status = Pronta para Comprar e cotação contém aguardando')
    } else if (filters.statusMacro === 'criar_pedido') {
      // Alinhado com rpc_concorrencias_kpis: Mapa Liberado, sem Pedido Criado, PO vazia
      // e requisição não devolvida.
      query = query
        .not('request_status', 'ilike', '%devolvida%')
        .ilike('quoting_number_with_status_concat', '%mapa liberado%')
        .not('quoting_number_with_status_concat', 'ilike', '%pedido%criado%')
        .or(
          'purchase_order_number_with_rev.is.null,' +
          'purchase_order_number_with_rev.eq.'
        )
      appliedFilters.push('status macro Criar Pedido: cotação contém Mapa Liberado, NÃO contém Pedido Criado, e pedido vazio (NULL ou "")')

    } else if (filters.statusMacro && STATUS_MAP_CONCORRENCIAS[filters.statusMacro]) {
      query = query.in('request_status', STATUS_MAP_CONCORRENCIAS[filters.statusMacro])
      appliedFilters.push(`status macro: request_status IN (${STATUS_MAP_CONCORRENCIAS[filters.statusMacro].join(', ')})`)
    }

    if (isADelegar) {
      debugADelegar('getConcorrencias', {
        statusMacro: filters.statusMacro,
        appliedFilters,
        skippedFilters,
        filters,
        scope,
        page,
        pageSize,
      })
    }

    // Server-side range: traz uma janela suficientemente grande para a paginação
    // client-side do DataTable. Sem .range() o Supabase aplica um cap interno
    // que zerava a tabela em alguns cards (ex: Criar Pedido).
    const from = page * pageSize
    const to = from + pageSize - 1
    query = query.order('changed_when', { ascending: false }).range(from, to)

    const { data, error, count } = await query
    return { data, error: error?.message ?? null, count: count ?? undefined }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}

export async function getConcorrenciaKpis(
  filters: GlobalFilters,
  scope?: UserScope
): Promise<ServiceResult<ConcorrenciaKpis>> {
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

    const { data, error } = await (supabase as any).rpc('rpc_concorrencias_kpis', {
      p_obras: obrasFinais,
      p_analistas: analistasFinais,
      p_data_inicio: filters.periodo?.[0] ?? null,
      p_data_fim: filters.periodo?.[1] ?? null,
      p_grupos: filters.grupos?.length ? filters.grupos : null,
    })

    if (error) return { data: null, error: error.message }
    const row = Array.isArray(data) ? data[0] : data
    return {
      data: {
        aDelegar: Number(row?.a_delegar ?? 0),
        aIniciar: Number(row?.a_iniciar ?? 0),
        emCotacao: Number(row?.em_cotacao ?? 0),
        emAprovacao: Number(row?.em_aprovacao ?? 0),
        criarPedido: Number(row?.criar_pedido ?? 0),
        total: Number(row?.total ?? 0),
      },
      error: null,
    }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}

