const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export const monthlyData = months.map((month) => ({
  month,
  requisicoes: Math.floor(Math.random() * 50 + 20),
  spend: Math.round((Math.random() * 2000000 + 500000)),
  processosContratados: Math.floor(Math.random() * 30 + 5),
}));

export const percentualContratado = [
  { categoria: 'Obra Alpha', contratado: 75, naoContratado: 25 },
  { categoria: 'Obra Beta', contratado: 60, naoContratado: 40 },
  { categoria: 'Obra Gamma', contratado: 85, naoContratado: 15 },
  { categoria: 'Obra Delta', contratado: 45, naoContratado: 55 },
  { categoria: 'Obra Epsilon', contratado: 70, naoContratado: 30 },
];

export const proximasContratacoes = [
  { id: 1, descricao: 'Aço CA-50', grupo: 'Estrutural', obra: 'Obra Alpha', valor: 250000, previsao: '2024-03-15', reqEntregue: true },
  { id: 2, descricao: 'Concreto Usinado', grupo: 'Estrutural', obra: 'Obra Beta', valor: 180000, previsao: '2024-03-20', reqEntregue: false },
  { id: 3, descricao: 'Esquadrias Alumínio', grupo: 'Acabamento', obra: 'Obra Gamma', valor: 95000, previsao: '2024-04-01', reqEntregue: true },
  { id: 4, descricao: 'Cabeamento Elétrico', grupo: 'Elétrica', obra: 'Obra Delta', valor: 42000, previsao: '2024-04-10', reqEntregue: false },
  { id: 5, descricao: 'Tubulação PVC', grupo: 'Hidráulica', obra: 'Obra Epsilon', valor: 38000, previsao: '2024-04-15', reqEntregue: true },
];

export const ultimasContratacoes = [
  { id: 1, descricao: 'Cimento CP-V', grupo: 'Insumos', fornecedor: 'Concretagem Prime', obra: 'Obra Alpha', valor: 320000, data: '2024-02-28' },
  { id: 2, descricao: 'Mão de obra civil', grupo: 'Serviço', fornecedor: 'Construtora Norte', obra: 'Obra Beta', valor: 450000, data: '2024-02-25' },
  { id: 3, descricao: 'Pintura externa', grupo: 'Acabamento', fornecedor: 'Pintura Total', obra: 'Obra Gamma', valor: 85000, data: '2024-02-20' },
  { id: 4, descricao: 'Terraplanagem', grupo: 'Serviço', fornecedor: 'Terraplanagem Rápida', obra: 'Obra Delta', valor: 620000, data: '2024-02-15' },
  { id: 5, descricao: 'Instalação elétrica', grupo: 'Elétrica', fornecedor: 'Elétrica Sul', obra: 'Obra Epsilon', valor: 190000, data: '2024-02-10' },
];

export const savingData = [
  { id: 1, descricao: 'Aço estrutural', obra: 'Obra Alpha', estimado: 300000, contratado: 250000, saving: -50000 },
  { id: 2, descricao: 'Concreto', obra: 'Obra Beta', estimado: 200000, contratado: 180000, saving: -20000 },
  { id: 3, descricao: 'Esquadrias', obra: 'Obra Gamma', estimado: 120000, contratado: 95000, saving: -25000 },
  { id: 4, descricao: 'Elétrica', obra: 'Obra Delta', estimado: 55000, contratado: 42000, saving: -13000 },
  { id: 5, descricao: 'Hidráulica', obra: 'Obra Epsilon', estimado: 48000, contratado: 38000, saving: -10000 },
];

export const contratosStatusMock = [
  { id: 1, fornecedor: 'Concretagem Prime', grupo: 'Insumos', obra: 'Obra Alpha', status: 'Assinado' },
  { id: 2, fornecedor: 'Construtora Norte', grupo: 'Serviço', obra: 'Obra Beta', status: 'Em Assinatura' },
  { id: 3, fornecedor: 'Elétrica Sul', grupo: 'Elétrica', obra: 'Obra Gamma', status: 'Pendente Aprovação' },
  { id: 4, fornecedor: 'Pintura Total', grupo: 'Acabamento', obra: 'Obra Delta', status: 'Assinado' },
  { id: 5, fornecedor: 'Terraplanagem Rápida', grupo: 'Serviço', obra: 'Obra Epsilon', status: 'Em Assinatura' },
  { id: 6, fornecedor: 'Hidráulica Express', grupo: 'Hidráulica', obra: 'Obra Alpha', status: 'Aprovado' },
];
