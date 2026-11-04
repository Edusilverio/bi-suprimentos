import { useAuthStore } from '@/stores/useAuthStore'

export const useAnalystFilter = () => {
  const user = useAuthStore(s => s.user)

  // APENAS nivel 3 (analista) tem filtro por nome.
  // nivel 4 (viewer) NÃO tem filtro por nome — vê tudo das obras habilitadas.
  // niveis 0,1,2 (root/admin/gestor) NÃO têm filtro por nome.
  const nomesVisiveis: string[] | null =
    user?.nivel === 3 ? (user.nomes_visiveis ?? (user.name ? [user.name] : null)) : null

  const analystName: string | null =
    user?.nivel === 3 && nomesVisiveis && nomesVisiveis.length === 1
      ? nomesVisiveis[0]
      : null

  // Filtro automático de obras: APENAS para nivel 2 (gestor) e 3 (analista).
  // nivel 0,1 (root/admin): sem restrição.
  // nivel 4 (viewer): sem restrição automática — vê via slicer manual.
  const obrasHabilitadas: string[] | null =
    user && user.nivel >= 2 && user.nivel <= 3 ? (user.obras_habilitadas ?? []) : null

  return {
    analystName,
    nomesVisiveis,
    isRestricted: user?.nivel === 3,
    obrasHabilitadas,
    nivel: user?.nivel ?? null,
  }
}
