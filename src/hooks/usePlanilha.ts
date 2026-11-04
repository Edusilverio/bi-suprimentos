import { useState, useEffect, useCallback } from 'react'
import { getRows, upsertRows, deleteRow } from '@/services/planilhasService'

export function usePlanilha(tableName: string) {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const result = await getRows(tableName)
    setRows(result.data ?? [])
    setError(result.error)
    setLoading(false)
  }, [tableName])

  useEffect(() => { fetch() }, [fetch])

  const upsert = async (data: any[]) => {
    const result = await upsertRows(tableName, data)
    if (!result.error) await fetch()
    return result
  }

  const remove = async (id: number | string) => {
    const result = await deleteRow(tableName, id)
    if (!result.error) await fetch()
    return result
  }

  return { rows, loading, error, refetch: fetch, upsert, remove }
}
