import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [canReset, setCanReset] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setCanReset(true);
    });
    // Se chegou via link com token na URL, o evento já é disparado
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setCanReset(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const checks = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    matches: password.length > 0 && password === confirm,
  };
  const allValid = checks.minLength && checks.hasUpper && checks.hasNumber && checks.matches;

  const handleSave = async () => {
    if (!allValid) return;
    setError('');
    setLoading(true);
    const { error: e } = await supabase.auth.updateUser({ password });
    if (e) {
      setError(e.message);
      setLoading(false);
      return;
    }
    setSuccess(true);
    setTimeout(() => {
      supabase.auth.signOut();
      navigate('/login', { replace: true });
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-lg p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center mb-3">
            <Lock className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Redefinir senha</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">
            Defina uma nova senha para sua conta.
          </p>
        </div>

        {!canReset ? (
          <p className="text-sm text-muted-foreground text-center">
            Aguardando validação do link de recuperação...
          </p>
        ) : success ? (
          <p className="text-sm text-emerald-600 text-center font-medium">
            Senha atualizada! Redirecionando para login...
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Nova senha</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-xl bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary pr-10"
                  disabled={loading}
                />
                <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Confirmar senha</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-xl bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary pr-10"
                  disabled={loading}
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <Rule ok={checks.minLength}>Mínimo 8 caracteres</Rule>
              <Rule ok={checks.hasUpper}>Pelo menos 1 letra maiúscula</Rule>
              <Rule ok={checks.hasNumber}>Pelo menos 1 número</Rule>
              <Rule ok={checks.matches}>Senhas coincidem</Rule>
            </div>

            {error && <p className="text-sm text-destructive font-medium">{error}</p>}

            <button
              onClick={handleSave}
              disabled={!allValid || loading}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Redefinir senha
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Rule({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex items-center gap-2 ${ok ? 'text-emerald-600' : 'text-muted-foreground'}`}>
      {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
      <span>{children}</span>
    </div>
  );
}
