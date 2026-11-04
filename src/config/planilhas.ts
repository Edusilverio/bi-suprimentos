export type PlanilhaColumn = {
  key: string;
  label: string;
  type: "text" | "number" | "integer" | "boolean";
  width?: number;
  readonly?: boolean;
  colIndex?: number; // índice da coluna no Excel (0-based). undefined = coluna não vem do Excel
};

export type PlanilhaConfig = {
  id: string;
  label: string;
  tableName: string;
  columns: PlanilhaColumn[];
};

export const PLANILHAS_CONFIG: PlanilhaConfig[] = [
  {
    id: "sla_familias",
    label: "SLA Famílias - CREQ",
    tableName: "excel_sla_familias",
    columns: [
      { key: "grupo_material", label: "Grupo de Material", type: "text", width: 280, colIndex: 0 },
      { key: "envio_concor", label: "Envio Concorrência", type: "integer", width: 80, colIndex: 1 },
      { key: "receb_prop", label: "Receb. Propostas", type: "integer", width: 80, colIndex: 2 },
      { key: "equaliz", label: "Equalização", type: "integer", width: 80, colIndex: 3 },
      { key: "negoc", label: "Negociação", type: "integer", width: 80, colIndex: 4 },
      { key: "sla_1_subtotal", label: "SLA 1 Subtotal", type: "integer", width: 90, colIndex: 5 },
      { key: "aprovacao_cliente", label: "Aprovação Cliente", type: "integer", width: 100, colIndex: 6 },
      { key: "aprovacao_interna", label: "Aprovação Interna", type: "integer", width: 100, colIndex: 7 },
      { key: "formaliz", label: "Formalização", type: "integer", width: 80, colIndex: 8 },
      { key: "assinat_minuta", label: "Assinat. Minuta", type: "integer", width: 90, colIndex: 9 },
      { key: "sla_total", label: "SLA Total", type: "integer", width: 80, colIndex: 10 },
      { key: "concorrencia", label: "Concorrência", type: "integer", width: 90, colIndex: 11 },
      { key: "mobilizacao", label: "Mobilização", type: "integer", width: 90, colIndex: 12 },
      { key: "sla_contratacao_final", label: "SLA Contratação Final", type: "integer", width: 120, colIndex: 13 },
      { key: "grau_dificuldade", label: "Grau Dificuldade", type: "integer", width: 90, colIndex: 14 },
      { key: "check_planilhas", label: "Tipo", type: "text", width: 100, colIndex: 15 },
      { key: "havera_minuta", label: "Haverá Minuta", type: "text", width: 90, colIndex: 16 },
    ],
  },
  {
    id: "familias",
    label: "Famílias",
    tableName: "excel_familias",
    columns: [
      { key: "familia", label: "Família", type: "text", width: 240, colIndex: 0 },
      { key: "tipo", label: "Tipo", type: "text", width: 120, colIndex: 1 },
      { key: "responsavel", label: "Responsável", type: "text", width: 120, colIndex: 2 },
      { key: "comprador_responsavel", label: "Comprador Responsável", type: "text", width: 180, colIndex: 3 },
      { key: "aux_creq", label: "Aux CREQ", type: "integer", width: 70, colIndex: 4 },
      { key: "check_creq_principal", label: "Check CREQ Principal", type: "text", width: 120, colIndex: 5 },
      { key: "envio_concor", label: "Envio Concorrência", type: "integer", width: 80, colIndex: 6 },
      { key: "receb_prop", label: "Receb. Propostas", type: "integer", width: 80, colIndex: 7 },
      { key: "equaliz", label: "Equalização", type: "integer", width: 80, colIndex: 8 },
      { key: "negoc", label: "Negociação", type: "integer", width: 80, colIndex: 9 },
      { key: "aprovacao", label: "Aprovação", type: "integer", width: 80, colIndex: 10 },
      { key: "formaliz", label: "Formalização", type: "integer", width: 80, colIndex: 11 },
      { key: "assinat_minuta", label: "Assinat. Minuta", type: "integer", width: 90, colIndex: 12 },
      { key: "tot", label: "Total", type: "integer", width: 70, colIndex: 13 },
      { key: "concorrencia", label: "Concorrência", type: "integer", width: 90, colIndex: 14 },
      { key: "mobilizacao", label: "Mobilização", type: "integer", width: 90, colIndex: 15 },
      { key: "sla_contratacao_final", label: "SLA Contratação Final", type: "integer", width: 120, colIndex: 16 },
      { key: "grau_dificuldade", label: "Grau Dificuldade", type: "integer", width: 90, colIndex: 17 },
    ],
  },
  {
    id: "insumos_prisma",
    label: "Insumos Prisma",
    tableName: "excel_insumos_prisma",
    columns: [
      { key: "codigo", label: "Código", type: "text", width: 90, colIndex: 0 },
      { key: "material", label: "Material", type: "text", width: 380, colIndex: 1 },
      { key: "unidade", label: "Unidade", type: "text", width: 70, colIndex: 2 },
      { key: "status", label: "Status", type: "text", width: 90, colIndex: 3 },
      { key: "tipo", label: "Tipo", type: "text", width: 200, colIndex: 4 },
      { key: "mat_grp", label: "Grupo de Material", type: "text", width: 200, colIndex: 5 },
    ],
  },
  {
    id: "familias_prisma",
    label: "Famílias Prisma",
    tableName: "excel_familias_prisma",
    columns: [
      { key: "familia_prisma", label: "Família Prisma", type: "text", width: 400, colIndex: 0 },
    ],
  },
  {
    id: "responsaveis_contratacao",
    label: "Responsáveis Contratação",
    tableName: "excel_responsaveis_contratacao",
    columns: [
      { key: "familia", label: "Família", type: "text", width: 320, colIndex: 0 },
      { key: "tipo", label: "Tipo", type: "text", width: 140, colIndex: 1 },
      { key: "area_responsavel", label: "Área Responsável", type: "text", width: 160, colIndex: 2 },
      { key: "responsavel", label: "Responsável (referência)", type: "text", width: 200, colIndex: 3 },
      { key: "responsaveis_padronizado", label: "Responsáveis (nome exato do usuário)", type: "text", width: 280, colIndex: 4 },
    ],
  },
  {
    id: "custo_obra",
    label: "Custo Obra - ONE Page",
    tableName: "excel_custo_obra",
    columns: [
      { key: "cost_collector", label: "Obra", type: "text", width: 320, colIndex: 0 },
      { key: "custo_atual", label: "Custo Atual", type: "text", width: 200, colIndex: 1 },
      { key: "porcentagem", label: "Porcentagem Atual (%)", type: "number", width: 160, colIndex: 2 },
    ],
  },

];
