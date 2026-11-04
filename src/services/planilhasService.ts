import { supabase } from '@/lib/supabase'
import type { ServiceResult } from '@/types/domain'

export async function getRows(
  tableName: string,
  page = 0,
  pageSize = 100
): Promise<ServiceResult<any[]>> {
  try {
    const { data, error, count } = await supabase
      .from(tableName as any)
      .select('*', { count: 'exact' })
      .range(page * pageSize, (page + 1) * pageSize - 1)

    return { data: data as any, error: error?.message ?? null, count: count ?? undefined }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}

export async function upsertRows(
  tableName: string,
  rows: any[]
): Promise<ServiceResult<any[]>> {
  try {
    const { data, error } = await supabase
      .from(tableName as any)
      .upsert(rows as any, { onConflict: 'id' })

    return { data: data as any, error: error?.message ?? null }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}

export async function deleteRow(
  tableName: string,
  id: number | string
): Promise<ServiceResult<null>> {
  try {
    const { error } = await supabase
      .from(tableName as any)
      .delete()
      .eq('id', id as any)

    return { data: null, error: error?.message ?? null }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}
