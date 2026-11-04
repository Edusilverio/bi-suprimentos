export const PAGINAS_SISTEMA = [
  { key: 'concorrencias',       label: 'Concorrências',       rota: '/concorrencias' },
  { key: 'pedidos',             label: 'Pedidos',             rota: '/pedidos' },
  { key: 'contratos',           label: 'Contratos',           rota: '/contratos' },
  { key: 'creq',                label: 'CREQ',                rota: '/creq' },
  { key: 'one-page',            label: 'Gestão de Suprimentos', rota: '/one-page' },
  { key: 'gestao-fornecedores', label: 'Gestão Fornecedores', rota: '/gestao-fornecedores' },
  { key: 'planilhas',           label: 'Planilhas',           rota: '/planilhas' },
  { key: 'indicadores-mercado', label: 'Indicadores de Mercado', rota: '/indicadores-mercado' },
  { key: 'indicadores-sustentabilidade', label: 'Sustentabilidade', rota: '/indicadores-sustentabilidade' },
  { key: 'lancamento-sustentabilidade',  label: 'Lançamento Sustentabilidade', rota: '/lancamento-sustentabilidade' },
] as const

export const PAGINAS_ADMIN = [
  { key: 'admin-acessos', label: 'Gestão de Acessos', rota: '/admin/acessos' },
  { key: 'gestao-obras',  label: 'Gestão de Obras',   rota: '/gestao-obras' },
  { key: 'aprovacao-sustentabilidade', label: 'Aprovação Sustentabilidade', rota: '/aprovacao-sustentabilidade' },
  { key: 'logs',          label: 'Logs',              rota: '/logs' },
] as const

export type PaginaKey = typeof PAGINAS_SISTEMA[number]['key']

export const ROTA_TO_PAGINA_KEY: Record<string, string> = {
  '/concorrencias': 'concorrencias',
  '/pedidos': 'pedidos',
  '/contratos': 'contratos',
  '/creq': 'creq',
  '/one-page': 'one-page',
  '/gestao-fornecedores': 'gestao-fornecedores',
  '/planilhas': 'planilhas',
  '/indicadores-mercado': 'indicadores-mercado',
  '/indicadores-sustentabilidade': 'indicadores-sustentabilidade',
  '/lancamento-sustentabilidade': 'lancamento-sustentabilidade',
  '/admin/acessos': 'admin-acessos',
  '/gestao-obras': 'gestao-obras',
  '/aprovacao-sustentabilidade': 'aprovacao-sustentabilidade',
  '/logs': 'logs',
}
