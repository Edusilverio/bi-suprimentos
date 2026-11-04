import { useState, useEffect, useCallback } from 'react'
import { getFornecedoresList, getContratosPorFornecedor } from '@/services/gestaoFornecedoresService'
import type { ContratoRow } from '@/lib/database.types'
import type { UseQueryResult, GlobalFilters, FornecedorResumo } from '@/types/domain'

export function useFornecedoresList(filters: GlobalFilters): UseQueryResult<FornecedorResumo[]> {
  const [data, setData] = useState<FornecedorResumo[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const result = await getFornecedoresList(filters)
    setData(result.data)
    setError(result.error)
    setLoading(false)
  }, [JSON.stringify(filters)])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useContratosPorFornecedor(
  fornecedor: string | null,
  filters: GlobalFilters
): UseQueryResult<ContratoRow[]> {
  const [data, setData] = useState<ContratoRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!fornecedor) { setData(null); return }
    setLoading(true)
    const result = await getContratosPorFornecedor(fornecedor, filters)
    setData(result.data)
    setError(result.error)
    setLoading(false)
  }, [fornecedor, JSON.stringify(filters)])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}
