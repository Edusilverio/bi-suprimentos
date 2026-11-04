import { useState, useEffect, useCallback } from 'react'
import { getObrasCreq, getCreq, type CreqItem, type CreqObra } from '@/services/creqService'

export function useObrasCreq() {
  const [data, setData] = useState<CreqObra[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const r = await getObrasCreq()
    setData(r.data)
    setError(r.error)
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useCreq(obra: string) {
  const [data, setData] = useState<CreqItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!obra) { setData([]); return }
    setLoading(true)
    const r = await getCreq(obra)
    setData(r.data)
    setError(r.error)
    setLoading(false)
  }, [obra])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}
