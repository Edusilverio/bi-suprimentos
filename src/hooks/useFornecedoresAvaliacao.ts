import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getAvaliacaoMensal,
  getFornecedoresAvaliacao,
  type AvaliacaoFiltros,
  type AvaliacaoTabelaFiltros,
  type AvaliacaoMensalRow,
  type AvaliacaoFornecedorRow,
} from '@/services/fornecedoresAvaliacaoService'
import type { UseQueryResult } from '@/types/domain'

export function useAvaliacaoMensal(
  filters: AvaliacaoFiltros
): UseQueryResult<AvaliacaoMensalRow[]> {
  const [data, setData] = useState<AvaliacaoMensalRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const reqId = useRef(0)

  const fetch = useCallback(async () => {
    const meuId = ++reqId.current
    setLoading(true)
    const r = await getAvaliacaoMensal(filters)
    if (meuId !== reqId.current) return
    setData(r.data)
    setError(r.error)
    setLoading(false)
  }, [JSON.stringify(filters)])

  useEffect(() => {
    fetch()
  }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useFornecedoresAvaliacao(
  filters: AvaliacaoTabelaFiltros
): UseQueryResult<AvaliacaoFornecedorRow[]> {
  const [data, setData] = useState<AvaliacaoFornecedorRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const reqId = useRef(0)

  const fetch = useCallback(async () => {
    const meuId = ++reqId.current
    setLoading(true)
    const r = await getFornecedoresAvaliacao(filters)
    if (meuId !== reqId.current) return
    setData(r.data)
    setError(r.error)
    setLoading(false)
  }, [JSON.stringify(filters)])

  useEffect(() => {
    fetch()
  }, [fetch])
  return { data, loading, error, refetch: fetch }
}
