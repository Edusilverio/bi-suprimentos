const analistas = ['Maria Silva', 'João Santos', 'Ana Costa', 'Pedro Lima', 'Lucas Rocha'];
const tipos = ['Material', 'Serviço', 'Equipamento', 'Consultoria'];
const obras = ['Obra Alpha', 'Obra Beta', 'Obra Gamma', 'Obra Delta', 'Obra Epsilon'];
const statuses = ['a_delegar', 'a_iniciar', 'em_cotacao', 'em_aprovacao', 'criar_pedido'] as const;

export interface Concorrencia {
  id: string;
  nProcesso: string;
  descricao: string;
  analista: string;
  status: string;
  tipo: string;
  obra: string;
  data: string;
  valor: number;
}

export const mockConcorrencias: Concorrencia[] = Array.from({ length: 30 }, (_, i) => ({
  id: `c${i + 1}`,
  nProcesso: `CONC-${String(2024000 + i + 1)}`,
  descricao: `Concorrência ${i + 1} - ${tipos[i % tipos.length]}`,
  analista: analistas[i % analistas.length],
  status: statuses[i % statuses.length],
  tipo: tipos[i % tipos.length],
  obra: obras[i % obras.length],
  data: `2024-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
  valor: Math.round((Math.random() * 500000 + 10000) * 100) / 100,
}));

export const concorrenciaAnalistas = [...new Set(mockConcorrencias.map(c => c.analista))];
export const concorrenciaTipos = [...new Set(mockConcorrencias.map(c => c.tipo))];
export const concorrenciaObras = [...new Set(mockConcorrencias.map(c => c.obra))];
