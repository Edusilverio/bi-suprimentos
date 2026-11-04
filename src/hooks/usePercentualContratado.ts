import { useState, useEffect, useCallback, useRef } from 'react'
import { getPercentualContratado, type PercentualContratadoRow } from '@/services/onepageService'
import type { UseQueryResult } from '@/types/domain'

export function usePercentualContratado(filters: { obras?: string[] }): UseQueryResult<PercentualContratadoRow[]> {
  const [data, setData] = useState<PercentualContratadoRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const reqId = useRef(0)

  const fetch = useCallback(async () => {
    const meuId = ++reqId.current
    setLoading(true)
    const result = await getPercentualContratado(filters)
    if (meuId !== reqId.current) return
    setData(result.data)
    setError(result.error)
    setLoading(false)
  }, [JSON.stringify(filters)]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}
