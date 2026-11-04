import type { CargoUsuario, NivelUsuario } from '@/lib/database.types'

export type GlobalFilters = {
  analista: string[]
  obra: string[]
  tipo: string[]
  periodo: [string, string] | null
  grupos?: string[]
}

export type MacroFilter = {
  page: 'concorrencias' | 'pedidos' | 'contratos'
  statusKey: string
  label: string
} | null

export type ServiceResult<T> = {
  data: T | null
  error: string | null
  count?: number
}

export type UseQueryResult<T> = {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export type AuthUser = {
  id: string
  email: string
  name: string
  cargo: CargoUsuario
  nivel: NivelUsuario
  ativo: boolean
  must_change_password: boolean
  modo_ferias: boolean
  paginas_habilitadas: string[]
  obras_habilitadas: string[]
  nomes_visiveis: string[]
}

export type ConcorrenciaKpis = {
  aDelegar: number
  aIniciar: number
  emCotacao: number
  emAprovacao: number
  criarPedido: number
  total: number
}

export type PedidoKpis = {
  emAprovacao: number
  aFormalizar: number
  emValidacao: number
  total: number
}

export type ContratoKpis = {
  emEdicao: number
  emAprovacao: number
  enviarD4Sign: number
  emAssinatura: number
  total: number
}

export type OnepageKpis = {
  totalContratado: number
  requisicoes: number
  emAndamento: number
  processosConcluidos: number
  emAssinatura: number
  assinados: number
}

export type SpendMensal = {
  ano: number
  mes: number
  spend: number
  processos: number
}

export type FornecedorTop = {
  fornecedor: string
  totalContratado: number
  quantidadeContratos: number
}

export type FornecedorResumo = {
  fornecedor: string
  contratos: number
  total: number
}
