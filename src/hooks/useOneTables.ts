import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getUltimasContratacoesOne,
  getContratosTabela,
  type UltimaContratacaoRow,
  type ContratoTabelaRow,
} from '@/services/onepageService'
import type { UseQueryResult } from '@/types/domain'

export function useUltimasContratacoes(filters: {
  obras?: string[]
  analistas?: string[]
  dataInicio?: string
  dataFim?: string
  obrasHabilitadas?: string[] | null
  tipos?: string[]
}): UseQueryResult<UltimaContratacaoRow[]> {
  const [data, setData] = useState<UltimaContratacaoRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const reqId = useRef(0)

  const fetch = useCallback(async () => {
    const meuId = ++reqId.current
    setLoading(true)
    const result = await getUltimasContratacoesOne(filters)
    if (meuId !== reqId.current) return
    setData(result.data)
    setError(result.error)
    setLoading(false)
  }, [JSON.stringify(filters)]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useContratosTabela(filters: {
  obras?: string[]
  analistas?: string[]
  dataInicio?: string
  dataFim?: string
  obrasHabilitadas?: string[] | null
}): UseQueryResult<ContratoTabelaRow[]> {
  const [data, setData] = useState<ContratoTabelaRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const reqId = useRef(0)

  const fetch = useCallback(async () => {
    const meuId = ++reqId.current
    setLoading(true)
    const result = await getContratosTabela(filters)
    if (meuId !== reqId.current) return
    setData(result.data)
    setError(result.error)
    setLoading(false)
  }, [JSON.stringify(filters)]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}
