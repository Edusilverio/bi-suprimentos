export type RequestRow = {
  id: number
  negotiator_name: string | null
  number_formatted: string | null
  request_status: string | null
  quoting_number_with_status_concat: string | null
  purchase_order_number_with_rev: string | null
  cost_collector: string | null
  issue_date_formatted: string | null
  transmission_date_formatted: string | null
  release_date_level01: string | null
  release_date_level02: string | null
  changed_when: string | null
  emission_date_first_po: string | null
  key: string
  synced_at: string | null
}

export type PedidoRow = {
  id: number
  cost_collector: string | null
  cli_trade_name: string | null
  flag_email_sent_boolean: boolean | null
  flag_has_contract: boolean | null
  purchase_order_status: string | null
  purchase_order_number_with_review: string | null
  quoting_negotiator_name: string | null
  quoting_number_formatted: string | null
  purchase_order_type: string | null
  negotiator_issue_date: string | null
  releasing_date: string | null
  email_sent_date: string | null
  key: string
  synced_at: string | null
  precisa_minuta?: boolean | null
  sup_corporate_name?: string | null
  material_group?: string | null
  value?: number | null
  balance?: number | null
  responsaveis_resolvidos?: string[] | null
  tem_responsavel_invalido?: boolean | null
}

export type PedidoFlagManualRow = {
  pedido_key: string
  dispensado: boolean
  dispensado_por: string | null
  dispensado_em: string | null
  updated_at: string | null
}

export type ContratoRow = {
  id: number
  purchase_order_number_formatted: string | null
  uix: string | null
  cost_collector: string | null
  material_groups: string | null
  sup_corporate_name: string | null
  purchase_order_contract_status: string | null
  start_date_contract: string | null
  finish_date_contract: string | null
  value: number | null
  balance: number | null
  created_when: string | null
  created_by_name: string | null
  sent_to_approval_date: string | null
  released_date: string | null
  email_date: string | null
  key: string
  synced_at: string | null
}


export type ContratoVigenciaOkRow = {
  contrato_id: number
  ok: boolean
  updated_by: string | null
  updated_at: string | null
}

export type CotacaoRow = {
  id: number
  cost_collector: string | null
  negotiator_name: string | null
  quoting_number_formatted: string | null
  material_group: string | null
  data_quoting_formatted: string | null
  quoting_finish_date_formatted: string | null
  quoting_approval_level01_date: string | null
  quoting_approval_level02_date: string | null
  key: string
  synced_at: string | null
}

export type CargoUsuario = 'root' | 'admin' | 'gestor' | 'aprovador' | 'analista' | 'viewer'
export type NivelUsuario = 0 | 1 | 2 | 3 | 4

export type UsuarioRow = {
  id: string
  name: string
  cargo: CargoUsuario
  nivel: NivelUsuario
  ativo: boolean
  must_change_password: boolean
  modo_ferias: boolean
  created_at: string
}

export type UsuarioPaginaRow = {
  id: number
  usuario_id: string
  pagina: string
  habilitada: boolean
  updated_at: string
}

export type UsuarioObraRow = {
  id: number
  usuario_id: string
  obra: string
  habilitada: boolean
  updated_at: string
}

export type UsuarioFeriasSubstitutoRow = {
  id: number
  usuario_ferias: string
  substituto_id: string
  ativo: boolean
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      requests: { Row: RequestRow; Insert: Partial<RequestRow>; Update: Partial<RequestRow> }
      pedidos: { Row: PedidoRow; Insert: Partial<PedidoRow>; Update: Partial<PedidoRow> }
      contratos: { Row: ContratoRow; Insert: Partial<ContratoRow>; Update: Partial<ContratoRow> }
      contrato_vigencia_ok: { Row: ContratoVigenciaOkRow; Insert: Partial<ContratoVigenciaOkRow>; Update: Partial<ContratoVigenciaOkRow> }
      cotacoes: { Row: CotacaoRow; Insert: Partial<CotacaoRow>; Update: Partial<CotacaoRow> }
      usuarios: { Row: UsuarioRow; Insert: Partial<UsuarioRow>; Update: Partial<UsuarioRow> }
      usuario_paginas: { Row: UsuarioPaginaRow; Insert: Partial<UsuarioPaginaRow>; Update: Partial<UsuarioPaginaRow> }
      usuario_obras: { Row: UsuarioObraRow; Insert: Partial<UsuarioObraRow>; Update: Partial<UsuarioObraRow> }
      usuario_ferias_substitutos: { Row: UsuarioFeriasSubstitutoRow; Insert: Partial<UsuarioFeriasSubstitutoRow>; Update: Partial<UsuarioFeriasSubstitutoRow> }
      pedidos_flag_manual: { Row: PedidoFlagManualRow; Insert: Partial<PedidoFlagManualRow>; Update: Partial<PedidoFlagManualRow> }
    }
    Views: {
      vw_spend_mensal: { Row: { ano: number; mes: number; spend: number; processos: number } }
      vw_top_fornecedores: { Row: { fornecedor: string; total_contratado: number; quantidade_contratos: number } }
      vw_analistas: { Row: { nome: string } }
      vw_obras: { Row: { nome: string } }
      vw_tipos: { Row: { nome: string } }
      
    }
  }
}
