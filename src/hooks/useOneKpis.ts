import { useState, useEffect, useCallback, useRef } from 'react'
import { getOneKpis, type OneKpisFilters, type OneKpis } from '@/services/onepageService'
import type { UseQueryResult } from '@/types/domain'

export function useOneKpis(filters: OneKpisFilters): UseQueryResult<OneKpis> {
  const [data, setData] = useState<OneKpis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const reqId = useRef(0)

  const fetch = useCallback(async () => {
    const meuId = ++reqId.current
    setLoading(true)
    const result = await getOneKpis(filters)
    if (meuId !== reqId.current) return
    setData(result.data)
    setError(result.error)
    setLoading(false)
  }, [JSON.stringify(filters)])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}
