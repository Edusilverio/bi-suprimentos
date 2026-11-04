import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, getFirstAllowedRoute } from '@/stores/useAuthStore';
import { Eye, EyeOff, Sun, Moon, Loader2 } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import atlasLogo from '@/assets/atlas-logo.png';
import atlasLogoDark from '@/assets/atlas-logo-dark.png';
import { config } from '@/config/env';

const useMocks = config.useMocks;

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore(s => s.login);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Preencha todos os campos.');
      return;
    }
    setLoading(true);
    try {
      const success = await login(email, password);
      if (success) {
        const user = useAuthStore.getState().user!;
        if (user.must_change_password) {
          navigate('/change-password', { replace: true });
        } else {
          navigate(getFirstAllowedRoute(user), { replace: true });
        }
      } else {
        setError('E-mail ou senha inválidos.');
      }
    } catch {
      setError('Erro ao conectar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative">
      <button
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
        className="absolute top-4 right-4 p-2 rounded-lg bg-card border border-border hover:bg-muted transition-colors"
      >
        {theme === 'dark' ? <Sun className="h-4 w-4 text-foreground" /> : <Moon className="h-4 w-4 text-foreground" />}
      </button>

      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-2xl shadow-lg p-8">
          <div className="flex flex-col items-center mb-8">
            <img src={atlasLogo} alt="Atlas Engenharia" className="h-20 w-auto object-contain block dark:hidden" />
            <img src={atlasLogoDark} alt="Atlas Engenharia" className="h-20 w-auto object-contain hidden dark:block" />
          </div>


          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-xl bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="seu@email.com"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-xl bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary pr-10"
                  placeholder="••••••"
                  disabled={loading}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-destructive font-medium">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Entrar
            </button>
          </form>

          {useMocks && (
            <div className="mt-6 border-t border-border pt-4">
              <p className="text-xs text-muted-foreground text-center mb-2">Usuários de teste:</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>admin@exemplo.com.br</div><div>gestor@exemplo.com.br</div>
                <div>analista@exemplo.com.br</div><div>viewer@exemplo.com.br</div>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-1">Senha: 123456</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
