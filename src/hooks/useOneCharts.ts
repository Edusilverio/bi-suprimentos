import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getRequisicoesPorMes,
  getSpendMensalChart,
  getTopFornecedoresChart,
  getRankingObrasPorTipo,
  type OneChartFilters,
  type RequisicaoMes,
  type SpendMensalPoint,
  type TopFornecedorPoint,
  type RankingObraTipo,
} from '@/services/onepageService'
import type { UseQueryResult } from '@/types/domain'

function useChart<T>(
  fetcher: (filters: OneChartFilters) => Promise<{ data: T | null; error: string | null }>,
  filters: OneChartFilters
): UseQueryResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const reqId = useRef(0)

  const fetch = useCallback(async () => {
    const meuId = ++reqId.current
    setLoading(true)
    const result = await fetcher(filters)
    if (meuId !== reqId.current) return
    setData(result.data)
    setError(result.error)
    setLoading(false)
  }, [JSON.stringify(filters)]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export const useRequisicoesPorMes = (filters: OneChartFilters): UseQueryResult<RequisicaoMes[]> =>
  useChart(getRequisicoesPorMes, filters)

export const useSpendMensalChart = (filters: OneChartFilters): UseQueryResult<SpendMensalPoint[]> =>
  useChart(getSpendMensalChart, filters)

export const useTopFornecedoresChart = (filters: OneChartFilters): UseQueryResult<TopFornecedorPoint[]> =>
  useChart(getTopFornecedoresChart, filters)

export const useRankingObrasPorTipo = (filters: OneChartFilters): UseQueryResult<RankingObraTipo[]> =>
  useChart(getRankingObrasPorTipo, filters)
