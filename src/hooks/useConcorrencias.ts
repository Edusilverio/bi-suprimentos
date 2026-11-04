import { useState, useEffect, useCallback } from 'react'
import { getConcorrencias, getConcorrenciaKpis } from '@/services/concorrenciasService'
import type { UserScope } from '@/services/concorrenciasService'
import type { RequestRow } from '@/lib/database.types'
import type { UseQueryResult, GlobalFilters, ConcorrenciaKpis } from '@/types/domain'
import { useDebounce } from './useDebounce'


export function useConcorrencias(
  filters: GlobalFilters & { statusMacro?: string | null },
  page = 0,
  scope?: UserScope
): UseQueryResult<RequestRow[]> & { count: number } {
  const [data, setData] = useState<RequestRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [count, setCount] = useState(0)
  const filtersKey = useDebounce(JSON.stringify(filters), 300)
  const scopeKey = useDebounce(JSON.stringify(scope), 300)

  const fetch = useCallback(async () => {
    setLoading(true)
    const result = await getConcorrencias(filters, page, 5000, scope)
    setData(result.data)
    setError(result.error)
    setCount(result.count ?? 0)
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, page, scopeKey])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch, count }
}



export function useConcorrenciaKpis(
  filters: GlobalFilters,
  scope?: UserScope
): UseQueryResult<ConcorrenciaKpis> {
  const [data, setData] = useState<ConcorrenciaKpis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const filtersKey = useDebounce(JSON.stringify(filters), 300)
  const scopeKey = useDebounce(JSON.stringify(scope), 300)

  const fetch = useCallback(async () => {
    setLoading(true)
    const result = await getConcorrenciaKpis(filters, scope)
    setData(result.data)
    setError(result.error)
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, scopeKey])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }

}
