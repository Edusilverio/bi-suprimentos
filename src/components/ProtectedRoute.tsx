import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { ROTA_TO_PAGINA_KEY } from '@/config/paginas';

interface ProtectedRouteProps {
  children: React.ReactNode;
  path: string;
}

export function ProtectedRoute({ children, path }: ProtectedRouteProps) {
  const user = useAuthStore(s => s.user);
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace />;

  // Forçar troca de senha
  if (user.must_change_password && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  // Root e admin sempre passam
  if (user.nivel <= 1) return <>{children}</>;

  // Aprovação de Sustentabilidade: aprovador/admin/root
  if (path === '/aprovacao-sustentabilidade') {
    if (user.cargo === 'aprovador') return <>{children}</>;
    return <Navigate to="/unauthorized" replace />;
  }

  // Gestão de acessos e Logs: apenas root/admin
  if (path === '/admin/acessos' || path === '/logs') {
    return <Navigate to="/unauthorized" replace />;
  }

  const paginaKey = ROTA_TO_PAGINA_KEY[path];
  if (paginaKey && user.paginas_habilitadas.includes(paginaKey)) {
    return <>{children}</>;
  }
  return <Navigate to="/unauthorized" replace />;
}
