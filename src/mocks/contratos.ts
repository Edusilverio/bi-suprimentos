const fornecedores = ['Fornecedor A', 'Fornecedor B', 'Fornecedor C', 'Fornecedor D', 'Fornecedor E'];
const analistas = ['Maria Silva', 'João Santos', 'Ana Costa', 'Pedro Lima', 'Lucas Rocha'];
const tipos = ['Serviço', 'Material', 'Locação', 'Consultoria'];
const obras = ['Obra Alpha', 'Obra Beta', 'Obra Gamma', 'Obra Delta', 'Obra Epsilon'];
const statuses = ['pendente_aprovacao', 'enviar_d4sign', 'em_assinatura'] as const;

export interface Contrato {
  id: string;
  nContrato: string;
  fornecedor: string;
  analista: string;
  status: string;
  tipo: string;
  obra: string;
  dataInicio: string;
  valor: number;
}

export const mockContratos: Contrato[] = Array.from({ length: 30 }, (_, i) => ({
  id: `ct${i + 1}`,
  nContrato: `CTR-${String(2024000 + i + 1)}`,
  fornecedor: fornecedores[i % fornecedores.length],
  analista: analistas[i % analistas.length],
  status: statuses[i % statuses.length],
  tipo: tipos[i % tipos.length],
  obra: obras[i % obras.length],
  dataInicio: `2024-${String((i % 12) + 1).padStart(2, '0')}-01`,
  valor: Math.round((Math.random() * 1000000 + 50000) * 100) / 100,
}));

export const contratoAnalistas = [...new Set(mockContratos.map(c => c.analista))];
export const contratoTipos = [...new Set(mockContratos.map(c => c.tipo))];
export const contratoObras = [...new Set(mockContratos.map(c => c.obra))];
