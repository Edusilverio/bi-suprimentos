export interface Fornecedor {
  id: string;
  nome: string;
  avaliacao: { prazo: number; qualidade: number; preco: number };
  nContratos: number;
  valorTotal: number;
}

export const mockFornecedores: Fornecedor[] = [
  { id: 'f1', nome: 'Construtora Norte', avaliacao: { prazo: 8.5, qualidade: 9.0, preco: 7.5 }, nContratos: 12, valorTotal: 2500000 },
  { id: 'f2', nome: 'Metalúrgica Central', avaliacao: { prazo: 7.0, qualidade: 8.5, preco: 8.0 }, nContratos: 8, valorTotal: 1800000 },
  { id: 'f3', nome: 'Elétrica Sul', avaliacao: { prazo: 9.0, qualidade: 7.5, preco: 6.5 }, nContratos: 15, valorTotal: 3200000 },
  { id: 'f4', nome: 'Hidráulica Express', avaliacao: { prazo: 6.5, qualidade: 8.0, preco: 9.0 }, nContratos: 6, valorTotal: 950000 },
  { id: 'f5', nome: 'Pavimentação ABC', avaliacao: { prazo: 8.0, qualidade: 8.5, preco: 7.0 }, nContratos: 10, valorTotal: 4100000 },
  { id: 'f6', nome: 'Terraplanagem Rápida', avaliacao: { prazo: 7.5, qualidade: 7.0, preco: 8.5 }, nContratos: 9, valorTotal: 2100000 },
  { id: 'f7', nome: 'Pintura Total', avaliacao: { prazo: 9.5, qualidade: 9.0, preco: 6.0 }, nContratos: 14, valorTotal: 800000 },
  { id: 'f8', nome: 'Fundações Profundas', avaliacao: { prazo: 6.0, qualidade: 9.5, preco: 5.5 }, nContratos: 4, valorTotal: 5600000 },
  { id: 'f9', nome: 'Isolamentos Térmicos', avaliacao: { prazo: 8.0, qualidade: 8.0, preco: 8.0 }, nContratos: 7, valorTotal: 1200000 },
  { id: 'f10', nome: 'Serralheria Master', avaliacao: { prazo: 7.0, qualidade: 7.5, preco: 9.0 }, nContratos: 11, valorTotal: 1600000 },
  { id: 'f11', nome: 'Concretagem Prime', avaliacao: { prazo: 8.5, qualidade: 9.0, preco: 7.0 }, nContratos: 13, valorTotal: 3800000 },
  { id: 'f12', nome: 'Acabamentos Finos', avaliacao: { prazo: 9.0, qualidade: 9.5, preco: 5.0 }, nContratos: 5, valorTotal: 700000 },
  { id: 'f13', nome: 'Transportes Leste', avaliacao: { prazo: 7.5, qualidade: 6.5, preco: 9.5 }, nContratos: 16, valorTotal: 2900000 },
  { id: 'f14', nome: 'Segurança Obra Certa', avaliacao: { prazo: 8.0, qualidade: 8.5, preco: 7.5 }, nContratos: 10, valorTotal: 1100000 },
  { id: 'f15', nome: 'Topografia Digital', avaliacao: { prazo: 9.0, qualidade: 9.0, preco: 8.0 }, nContratos: 3, valorTotal: 450000 },
];
