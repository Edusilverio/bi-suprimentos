import { supabase } from '@/lib/supabase'
import { fetchAllRows } from '@/lib/fetchAll'

export async function getFlagsBaixa(): Promise<Record<string, boolean>> {
  const query = (supabase as any)
    .from('contratos_flag_manual')
    .select('contrato_key, baixado')
  const { data, error } = await fetchAllRows<{ contrato_key: string; baixado: boolean }>(query)

  if (error || !data) return {}

  return data.reduce(
    (acc, row) => {
      acc[row.contrato_key] = row.baixado
      return acc
    },
    {} as Record<string, boolean>
  )
}

export async function toggleBaixa(
  contratoKey: string,
  baixado: boolean
): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await (supabase as any)
    .from('contratos_flag_manual')
    .upsert(
      {
        contrato_key: contratoKey,
        baixado,
        baixado_por: user?.id ?? null,
        baixado_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'contrato_key' }
    )

  return { error: error?.message ?? null }
}

export async function getKeysBaixadas(): Promise<string[]> {
  const query = (supabase as any)
    .from('contratos_flag_manual')
    .select('contrato_key')
    .eq('baixado', true)
  const { data } = await fetchAllRows<{ contrato_key: string }>(query)
  return (data ?? []).map(d => d.contrato_key)
}
