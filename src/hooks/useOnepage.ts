import { useState, useEffect, useCallback, useRef } from 'react'
import { getOnepageKpis, getSpendMensal, getTopFornecedores, getUltimasContratacoes, getProximasContratacoes } from '@/services/onepageService'
import type { UserScope } from '@/services/concorrenciasService'
import type { ContratoRow, RequestRow } from '@/lib/database.types'
import type { UseQueryResult, GlobalFilters, OnepageKpis, SpendMensal, FornecedorTop } from '@/types/domain'

export function useOnepageKpis(filters: GlobalFilters, scope?: UserScope): UseQueryResult<OnepageKpis> {
  const [data, setData] = useState<OnepageKpis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const reqId = useRef(0)

  const fetch = useCallback(async () => {
    const meuId = ++reqId.current
    setLoading(true)
    const result = await getOnepageKpis(filters, scope)
    if (meuId !== reqId.current) return
    setData(result.data)
    setError(result.error)
    setLoading(false)
  }, [JSON.stringify(filters), JSON.stringify(scope)])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useSpendMensal(filters: GlobalFilters): UseQueryResult<SpendMensal[]> {
  const [data, setData] = useState<SpendMensal[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const reqId = useRef(0)

  const fetch = useCallback(async () => {
    const meuId = ++reqId.current
    setLoading(true)
    const result = await getSpendMensal(filters)
    if (meuId !== reqId.current) return
    setData(result.data)
    setError(result.error)
    setLoading(false)
  }, [JSON.stringify(filters)])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useTopFornecedores(filters: GlobalFilters, limit = 15): UseQueryResult<FornecedorTop[]> {
  const [data, setData] = useState<FornecedorTop[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const reqId = useRef(0)

  const fetch = useCallback(async () => {
    const meuId = ++reqId.current
    setLoading(true)
    const result = await getTopFornecedores(filters, limit)
    if (meuId !== reqId.current) return
    setData(result.data)
    setError(result.error)
    setLoading(false)
  }, [JSON.stringify(filters), limit])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useUltimasContratacoes(filters: GlobalFilters, limit = 10, scope?: UserScope): UseQueryResult<ContratoRow[]> {
  const [data, setData] = useState<ContratoRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const reqId = useRef(0)

  const fetch = useCallback(async () => {
    const meuId = ++reqId.current
    setLoading(true)
    const result = await getUltimasContratacoes(filters, limit, scope)
    if (meuId !== reqId.current) return
    setData(result.data)
    setError(result.error)
    setLoading(false)
  }, [JSON.stringify(filters), limit, JSON.stringify(scope)])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useProximasContratacoes(filters: GlobalFilters, limit = 10, scope?: UserScope): UseQueryResult<RequestRow[]> {
  const [data, setData] = useState<RequestRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const reqId = useRef(0)

  const fetch = useCallback(async () => {
    const meuId = ++reqId.current
    setLoading(true)
    const result = await getProximasContratacoes(filters, limit, scope)
    if (meuId !== reqId.current) return
    setData(result.data)
    setError(result.error)
    setLoading(false)
  }, [JSON.stringify(filters), limit, JSON.stringify(scope)])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}
