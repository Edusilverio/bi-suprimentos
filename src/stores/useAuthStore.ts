import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { config } from '@/config/env'
import { PAGINAS_SISTEMA } from '@/config/paginas'
import type { UsuarioRow, NivelUsuario, CargoUsuario } from '@/lib/database.types'
import type { AuthUser } from '@/types/domain'

const mockUsers = [
  { id: '1', name: 'Carlos Admin', email: 'admin@exemplo.com.br', password: '123456', cargo: 'admin' as CargoUsuario, nivel: 1 as NivelUsuario, ativo: true },
  { id: '2', name: 'Ana Gestora', email: 'gestor@exemplo.com.br', password: '123456', cargo: 'gestor' as CargoUsuario, nivel: 2 as NivelUsuario, ativo: true },
  { id: '3', name: 'Pedro Analista', email: 'analista@exemplo.com.br', password: '123456', cargo: 'analista' as CargoUsuario, nivel: 3 as NivelUsuario, ativo: true },
]

// Default routes per nivel (used as fallback only — actual access uses paginas_habilitadas)
export const getFirstAllowedRoute = (user: AuthUser | null): string => {
  if (!user) return '/login'
  if (user.nivel <= 1) return '/concorrencias'
  if (user.cargo === 'aprovador') return '/aprovacao-sustentabilidade'
  const first = user.paginas_habilitadas[0]
  if (!first) return '/unauthorized'
  const found = PAGINAS_SISTEMA.find(p => p.key === first)
  return found?.rota ?? '/unauthorized'
}

interface AuthState {
  user: AuthUser | null
  initialized: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  init: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateUser: (patch: Partial<AuthUser>) => void
}

const useMocks = config.useMocks

async function loadProfile(userId: string, email: string): Promise<AuthUser | null> {
  const { data: profile } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', userId)
    .single() as { data: UsuarioRow | null }

  if (!profile || !profile.ativo) return null

  // Páginas
  const { data: paginas } = await supabase
    .from('usuario_paginas')
    .select('pagina, habilitada')
    .eq('usuario_id', userId) as { data: { pagina: string; habilitada: boolean }[] | null }

  // Obras
  const { data: obras } = await supabase
    .from('usuario_obras')
    .select('obra, habilitada')
    .eq('usuario_id', userId) as { data: { obra: string; habilitada: boolean }[] | null }

  // Substituições de férias via RPC SECURITY DEFINER (bypassa RLS de usuarios)
  const { data: substituidos } = await supabase.rpc('rpc_get_my_substituidos' as any)

  const nivel = profile.nivel as NivelUsuario

  const paginasHabilitadas = nivel <= 1
    ? PAGINAS_SISTEMA.map(p => p.key)
    : (paginas ?? []).filter(p => p.habilitada).map(p => p.pagina)

  const obrasHabilitadas = nivel <= 1
    ? []
    : (obras ?? []).filter(o => o.habilitada).map(o => o.obra)

  const nomesSubstitutos: string[] = (substituidos as string[] | null) ?? []

  const nomesVisiveis = [profile.name, ...nomesSubstitutos]

  return {
    id: profile.id,
    email,
    name: profile.name,
    cargo: profile.cargo,
    nivel,
    ativo: profile.ativo,
    must_change_password: !!profile.must_change_password,
    modo_ferias: !!profile.modo_ferias,
    paginas_habilitadas: paginasHabilitadas,
    obras_habilitadas: obrasHabilitadas,
    nomes_visiveis: nomesVisiveis,
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  initialized: false,

  init: async () => {
    if (useMocks) {
      set({ initialized: true })
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const user = await loadProfile(session.user.id, session.user.email ?? '')
        if (user) {
          set({ user, initialized: true })
          return
        }
      }
    } catch (e) {
      console.error('Auth init error:', e)
    }
    set({ initialized: true })
  },

  login: async (email: string, password: string) => {
    if (useMocks) {
      const found = mockUsers.find(u => u.email === email && u.password === password)
      if (found) {
        const { password: _, ...rest } = found
        set({
          user: {
            ...rest,
            email,
            must_change_password: false,
            modo_ferias: false,
            paginas_habilitadas: PAGINAS_SISTEMA.map(p => p.key),
            obras_habilitadas: [],
            nomes_visiveis: [rest.name],
          },
        })
        return true
      }
      return false
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) return false

    const user = await loadProfile(data.user.id, data.user.email ?? email)
    if (!user) return false

    set({ user })
    return true
  },

  logout: async () => {
    if (!useMocks) {
      await supabase.auth.signOut()
    }
    set({ user: null })
  },

  refreshProfile: async () => {
    const cur = get().user
    if (!cur) return
    if (useMocks) return
    const user = await loadProfile(cur.id, cur.email)
    if (user) set({ user })
  },

  updateUser: (patch) => {
    const cur = get().user
    if (!cur) return
    set({ user: { ...cur, ...patch } })
  },
}))
