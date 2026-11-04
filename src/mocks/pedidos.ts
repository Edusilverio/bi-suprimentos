const fornecedores = ['Fornecedor A', 'Fornecedor B', 'Fornecedor C', 'Fornecedor D', 'Fornecedor E'];
const analistas = ['Maria Silva', 'João Santos', 'Ana Costa', 'Pedro Lima', 'Lucas Rocha'];
const obras = ['Obra Alpha', 'Obra Beta', 'Obra Gamma', 'Obra Delta', 'Obra Epsilon'];
const statuses = ['ped_em_aprovacao', 'a_formalizar', 'ped_em_validacao'] as const;

export interface Pedido {
  id: string;
  nPedido: string;
  descricao: string;
  fornecedor: string;
  analista: string;
  status: string;
  obra: string;
  data: string;
  valor: number;
}

export const mockPedidos: Pedido[] = Array.from({ length: 30 }, (_, i) => ({
  id: `p${i + 1}`,
  nPedido: `PED-${String(2024000 + i + 1)}`,
  descricao: `Pedido ${i + 1} - Compra`,
  fornecedor: fornecedores[i % fornecedores.length],
  analista: analistas[i % analistas.length],
  status: statuses[i % statuses.length],
  obra: obras[i % obras.length],
  data: `2024-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
  valor: Math.round((Math.random() * 300000 + 5000) * 100) / 100,
}));

export const pedidoAnalistas = [...new Set(mockPedidos.map(p => p.analista))];
export const pedidoObras = [...new Set(mockPedidos.map(p => p.obra))];
