export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  cargo: 'admin' | 'gestor' | 'analista' | 'visualizador';
  nivel: 1 | 2 | 3 | 4;
}

export const mockUsers: User[] = [
  { id: '1', name: 'Carlos Admin', email: 'admin@exemplo.com.br', password: '123456', cargo: 'admin', nivel: 1 },
  { id: '2', name: 'Ana Gestora', email: 'gestor@exemplo.com.br', password: '123456', cargo: 'gestor', nivel: 2 },
  { id: '3', name: 'Pedro Analista', email: 'analista@exemplo.com.br', password: '123456', cargo: 'analista', nivel: 3 },
  { id: '4', name: 'Julia Viewer', email: 'viewer@exemplo.com.br', password: '123456', cargo: 'visualizador', nivel: 4 },
];

export const rolePermissions: Record<string, string[]> = {
  admin: ['/concorrencias', '/pedidos', '/contratos', '/one-page', '/gestao-fornecedores'],
  gestor: ['/concorrencias', '/pedidos', '/contratos', '/one-page', '/gestao-fornecedores'],
  analista: ['/concorrencias', '/pedidos', '/contratos'],
  visualizador: ['/one-page'],
};

export const getFirstAllowedRoute = (cargo: string): string => {
  return rolePermissions[cargo]?.[0] || '/login';
};
