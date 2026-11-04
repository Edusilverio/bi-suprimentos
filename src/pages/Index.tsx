import { Navigate } from 'react-router-dom';
import { useAuthStore, getFirstAllowedRoute } from '@/stores/useAuthStore';

const Index = () => {
  const user = useAuthStore(s => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.must_change_password) return <Navigate to="/change-password" replace />;
  return <Navigate to={getFirstAllowedRoute(user)} replace />;
};

export default Index;
