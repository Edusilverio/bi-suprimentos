import { useAuthStore } from '@/stores/useAuthStore'

/**
 * Aplica filtro de exclusão de "ESCRITÓRIO Atlas" (e variações como
 * "ESCRITÓRIO Atlas 2026") sobre cost_collector para usuários de
 * nível >= 2 (Gestor / Analista / Viewer).
 *
 * Níveis 0 (Root) e 1 (Admin) NÃO sofrem restrição.
 */
export const applyEscritorioFilter = (
  query: any,
  nivel?: number | null
): any => {
  const n = nivel ?? useAuthStore.getState().user?.nivel
  if (n !== null && n !== undefined && n >= 2) {
    return query.not('cost_collector', 'ilike', '%ESCRITÓRIO Atlas%')
  }
  return query
}

/**
 * Helper para filtrar listas em memória (ex.: opções do slicer de obras
 * derivadas de vw_obras, que retorna apenas o `nome`).
 */
export const filterObrasByNivel = (
  obras: string[],
  nivel?: number | null
): string[] => {
  const n = nivel ?? useAuthStore.getState().user?.nivel
  if (n !== null && n !== undefined && n >= 2) {
    return obras.filter(o => !/ESCRIT[ÓO]RIO\s+Atlas/i.test(o ?? ''))
  }
  return obras
}

// ============================================================
// Exclusões globais de cost_collector — ONE Page e Gestão de Fornecedores
// Cliente removeu estas obras/centros de custo de TODOS os indicadores
// agregados (KPIs, rankings, parcerias, avaliação, percentual contratado).
// Páginas Concorrências / Pedidos / Contratos NÃO usam estas exclusões.
// ============================================================
// ============================================================
// Analistas que NÃO entram nos buckets de formalização/minuta.
// Regra do cliente: pedidos/contratos destes analistas não devem
// aparecer em "À Formalizar" e "Pend. Minuta" (Pedidos) nem em
// "Enviar D4Sign" (Contratos). Aplicado tanto na lista (aqui) quanto
// nas RPCs de KPI (rpc_pedidos_kpis / rpc_contratos_kpis) para que o
// big number e a tabela fiquem consistentes.
// ============================================================
export const ANALISTAS_SEM_FORMALIZACAO = [
  'Marcos Teixeira Lima',
  'Patrícia Moura',
] as const

/** Exclui os ANALISTAS_SEM_FORMALIZACAO de uma query Supabase pela coluna de analista. */
export const applyExcluiAnalistasFormalizacao = (query: any, column: string): any => {
  const list = ANALISTAS_SEM_FORMALIZACAO.map(n => `"${n.replace(/"/g, '\\"')}"`).join(',')
  return query.not(column, 'in', `(${list})`)
}

export const COST_COLLECTOR_EXCLUIDOS = [
  'escritório atlas',
  'escritorio atlas',
  'acordo de preço',
  'acordo de preco',
  'custos indiretos',
  'indiretos custo atlas',
  'indiretos obras atlas',
  'projetos',
  'pré obra',
  'pre obra',
] as const

/**
 * Aplica .not('cost_collector','ilike','%termo%') para cada termo da
 * lista. Use em qualquer query Supabase onde a coluna cost_collector
 * esteja disponível (vw_global_pedidos, vw_global_contratos,
 * vw_global_requests, vw_global_avaliacao_fornecedores,
 * vw_parcerias_empresa, vw_percentual_contratado, etc.).
 */
export const applyCostCollectorExclusoes = (
  query: any,
  column = 'cost_collector'
): any => {
  for (const termo of COST_COLLECTOR_EXCLUIDOS) {
    query = query.not(column, 'ilike', `%${termo}%`)
  }
  return query
}

/**
 * Versão em memória: usar para filtrar resultados de views que NÃO
 * expõem cost_collector (ex.: vw_ranking_obras_tipo usa coluna `obra`).
 */
export const isCostCollectorExcluido = (nome: string | null | undefined): boolean => {
  if (!nome) return false
  const s = nome.toLowerCase()
  return COST_COLLECTOR_EXCLUIDOS.some(termo => s.includes(termo))
}
