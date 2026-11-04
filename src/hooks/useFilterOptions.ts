import { useState, useEffect } from 'react'
import { getOpcoesAnalista, getOpcoesTipo, getOpcoesGrupoMaterial } from '@/services/filtersService'
import { config } from '@/config/env'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/useAuthStore'
import { filterObrasByNivel } from '@/lib/filters'

interface FilterOptions {
  analistas: string[]
  obras: string[]
  tipos: string[]
  grupos: string[]
  loading: boolean
}

export function useFilterOptions(): FilterOptions {
  const [analistas, setAnalistas] = useState<string[]>([])
  const [obras, setObras] = useState<string[]>([])
  const [tipos, setTipos] = useState<string[]>([])
  const [grupos, setGrupos] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const user = useAuthStore(s => s.user)

  useEffect(() => {
    if (config.useMocks) { setLoading(false); return }

    const loadObras = async (): Promise<string[]> => {
      // nivel >= 2 com obras restritas: usar usuario_obras habilitadas
      if (user && user.nivel >= 2) {
        if (user.obras_habilitadas.length === 0) return []
        const { data } = await supabase
          .from('usuario_obras')
          .select('obra')
          .eq('usuario_id', user.id)
          .eq('habilitada', true) as { data: { obra: string }[] | null }
        const lista = (data ?? []).map(d => d.obra).filter(Boolean).sort()
        return filterObrasByNivel(lista, user.nivel)
      }
      // nivel <= 1: todas as obras
      const { data } = await supabase.from('vw_obras' as any).select('nome')
      return ((data as any[]) || []).map((d: any) => d.nome).filter(Boolean).sort()
    }

    Promise.all([
      getOpcoesAnalista(),
      loadObras(),
      getOpcoesTipo(),
      getOpcoesGrupoMaterial(),
    ]).then(([a, o, t, g]) => {
      setAnalistas(a.data ?? [])
      setObras(o)
      setTipos(t.data ?? [])
      setGrupos(g.data ?? [])
      setLoading(false)
    })
  }, [user?.id, user?.nivel, user?.obras_habilitadas.length])

  return { analistas, obras, tipos, grupos, loading }
}
