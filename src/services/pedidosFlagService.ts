import { supabase } from '@/lib/supabase'
import { fetchAllRows } from '@/lib/fetchAll'

export async function getFlagsDispensa(): Promise<Record<string, boolean>> {
  const query = (supabase as any)
    .from('pedidos_flag_manual')
    .select('pedido_key, dispensado')
  const { data, error } = await fetchAllRows<{ pedido_key: string; dispensado: boolean }>(query)

  if (error || !data) return {}

  return data.reduce(
    (acc, row) => {
      acc[row.pedido_key] = row.dispensado
      return acc
    },
    {} as Record<string, boolean>
  )
}

export async function toggleDispensa(
  pedidoKey: string,
  dispensado: boolean
): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await (supabase as any)
    .from('pedidos_flag_manual')
    .upsert(
      {
        pedido_key: pedidoKey,
        dispensado,
        dispensado_por: user?.id ?? null,
        dispensado_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'pedido_key' }
    )

  return { error: error?.message ?? null }
}

export async function getFlagsFormalizado(): Promise<Record<string, boolean>> {
  const query = (supabase as any)
    .from('pedidos_flag_manual')
    .select('pedido_key, formalizado')
  const { data, error } = await fetchAllRows<{ pedido_key: string; formalizado: boolean }>(query)

  if (error || !data) return {}

  return data.reduce(
    (acc, row) => {
      acc[row.pedido_key] = row.formalizado
      return acc
    },
    {} as Record<string, boolean>
  )
}

export async function toggleFormalizado(
  pedidoKey: string,
  formalizado: boolean
): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await (supabase as any)
    .from('pedidos_flag_manual')
    .upsert(
      {
        pedido_key: pedidoKey,
        formalizado,
        formalizado_por: user?.id ?? null,
        formalizado_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'pedido_key' }
    )

  return { error: error?.message ?? null }
}
