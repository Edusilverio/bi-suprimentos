import { useState, useEffect, useCallback } from 'react'
import { getPedidos, getPedidoKpis } from '@/services/pedidosService'
import type { UserScope } from '@/services/concorrenciasService'
import type { PedidoRow } from '@/lib/database.types'
import type { UseQueryResult, GlobalFilters, PedidoKpis } from '@/types/domain'
import { useDebounce } from './useDebounce'

export function usePedidos(
  filters: GlobalFilters & { statusMacro?: string | null; modoResp?: boolean; modoDispensados?: boolean },
  page = 0,
  scope?: UserScope
): UseQueryResult<PedidoRow[]> & { count: number } {
  const [data, setData] = useState<PedidoRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [count, setCount] = useState(0)
  const filtersKey = useDebounce(JSON.stringify(filters), 300)
  const scopeKey = useDebounce(JSON.stringify(scope), 300)

  const fetch = useCallback(async () => {
    setLoading(true)
    const result = await getPedidos(filters, page, 50, scope)
    setData(result.data)
    setError(result.error)
    setCount(result.count ?? 0)
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, page, scopeKey])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch, count }
}

export function usePedidoKpis(
  filters: GlobalFilters & { modoResp?: boolean },
  scope?: UserScope
): UseQueryResult<PedidoKpis> {
  const [data, setData] = useState<PedidoKpis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const filtersKey = useDebounce(JSON.stringify(filters), 300)
  const scopeKey = useDebounce(JSON.stringify(scope), 300)

  const fetch = useCallback(async () => {
    setLoading(true)
    const result = await getPedidoKpis(filters, scope)
    setData(result.data)
    setError(result.error)
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, scopeKey])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}
