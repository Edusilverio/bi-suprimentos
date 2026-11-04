import { useNavigate } from 'react-router-dom';
import { ShieldX } from 'lucide-react';

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <ShieldX className="h-16 w-16 text-destructive mx-auto" />
        <h2 className="text-2xl font-bold text-foreground">Acesso não autorizado</h2>
        <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90">
          Voltar
        </button>
      </div>
    </div>
  );
}
