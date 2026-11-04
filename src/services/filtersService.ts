import { supabase } from '@/lib/supabase'
import type { ServiceResult } from '@/types/domain'
import { useAuthStore } from '@/stores/useAuthStore'
import { fetchAllRows } from '@/lib/fetchAll'

// Ex-funcionários que devem aparecer no slicer APENAS para Admin (1) e Gestor (2).
// Analista (3) e Viewer (4) NÃO veem esses nomes.
const NOMES_RESTRITOS = ['Patrícia Moura', 'Marcos Teixeira Lima']

export async function getOpcoesAnalista(): Promise<ServiceResult<string[]>> {
  try {
    const query = supabase
      .from('vw_analistas' as any)
      .select('nome')
    const { data, error } = await fetchAllRows<{ nome: string }>(query)

    const base = (data || []).map((d: any) => d.nome).filter(Boolean) as string[]
    const nivel = useAuthStore.getState().user?.nivel ?? 99
    const set = new Set(base)
    if (nivel <= 2) {
      for (const n of NOMES_RESTRITOS) set.add(n)
    } else {
      for (const n of NOMES_RESTRITOS) set.delete(n)
    }
    const names = [...set].sort()
    return { data: names, error }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}

export async function getOpcoesObra(): Promise<ServiceResult<string[]>> {
  try {
    const query = supabase
      .from('vw_obras' as any)
      .select('nome')
    const { data, error } = await fetchAllRows<{ nome: string }>(query)

    const names = (data || []).map((d: any) => d.nome).filter(Boolean).sort()
    return { data: names, error }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}

export async function getOpcoesTipo(): Promise<ServiceResult<string[]>> {
  try {
    const query = supabase
      .from('vw_tipos' as any)
      .select('nome')
    const { data, error } = await fetchAllRows<{ nome: string }>(query)

    const names = (data || []).map((d: any) => d.nome).filter(Boolean).sort()
    return { data: names, error }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}

export async function getOpcoesGrupoMaterial(): Promise<ServiceResult<string[]>> {
  try {
    const query = supabase
      .from('vw_grupos_material' as any)
      .select('nome')
    const { data, error } = await fetchAllRows<{ nome: string }>(query)

    const names = (data || []).map((d: any) => d.nome).filter(Boolean).sort()
    return { data: names, error }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}
