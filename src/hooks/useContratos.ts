import { useState, useEffect, useCallback } from 'react'
import { getContratos, getContratoKpis } from '@/services/contratosService'
import type { ContratoRow } from '@/lib/database.types'
import type { UseQueryResult, GlobalFilters, ContratoKpis } from '@/types/domain'
import { useDebounce } from './useDebounce'

export function useContratos(
  filters: GlobalFilters & { statusMacro?: string | null; modoBaixados?: boolean },
  page = 0,
  analystName?: string[] | null
): UseQueryResult<ContratoRow[]> & { count: number } {
  const [data, setData] = useState<ContratoRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [count, setCount] = useState(0)
  const filtersKey = useDebounce(JSON.stringify(filters), 300)
  const analystKey = useDebounce(JSON.stringify(analystName), 300)

  const fetch = useCallback(async () => {
    setLoading(true)
    const result = await getContratos(filters, page, 50, analystName)
    setData(result.data)
    setError(result.error)
    setCount(result.count ?? 0)
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, page, analystKey])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch, count }
}

export function useContratoKpis(
  filters: GlobalFilters,
  analystName?: string[] | null
): UseQueryResult<ContratoKpis> {
  const [data, setData] = useState<ContratoKpis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const filtersKey = useDebounce(JSON.stringify(filters), 300)
  const analystKey = useDebounce(JSON.stringify(analystName), 300)

  const fetch = useCallback(async () => {
    setLoading(true)
    const result = await getContratoKpis(filters, analystName)
    setData(result.data)
    setError(result.error)
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, analystKey])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}
