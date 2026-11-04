import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getParceriasFornecedores,
  getParceriaDetalhe,
  getMaterialGroupOptions,
  type ParceriaFornecedor,
  type ParceriaDetalhe,
  type ParceriasFiltros,
} from '@/services/fornecedoresService'
import type { UseQueryResult } from '@/types/domain'

export function useParceriasFornecedores(
  filters: ParceriasFiltros
): UseQueryResult<ParceriaFornecedor[]> {
  const [data, setData] = useState<ParceriaFornecedor[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const reqId = useRef(0)

  const fetch = useCallback(async () => {
    const meuId = ++reqId.current
    setLoading(true)
    const r = await getParceriasFornecedores(filters)
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

export function useParceriaDetalhe(
  fornecedor: string | null,
  filters: Omit<ParceriasFiltros, 'fornecedor'>
): UseQueryResult<ParceriaDetalhe[]> {
  const [data, setData] = useState<ParceriaDetalhe[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reqId = useRef(0)

  const fetch = useCallback(async () => {
    const meuId = ++reqId.current
    if (!fornecedor) {
      setData(null)
      return
    }
    setLoading(true)
    const r = await getParceriaDetalhe(fornecedor, filters)
    if (meuId !== reqId.current) return
    setData(r.data)
    setError(r.error)
    setLoading(false)
  }, [fornecedor, JSON.stringify(filters)])

  useEffect(() => {
    fetch()
  }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useMaterialGroups(): { data: string[]; loading: boolean } {
  const [data, setData] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let mounted = true
    getMaterialGroupOptions().then(r => {
      if (!mounted) return
      setData(r.data ?? [])
      setLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [])
  return { data, loading }
}
