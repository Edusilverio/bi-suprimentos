import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuthStore, getFirstAllowedRoute } from '@/stores/useAuthStore';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const checks = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    matches: password.length > 0 && password === confirm,
  };
  const allValid = checks.minLength && checks.hasUpper && checks.hasNumber && checks.matches;

  if (!user) {
    navigate('/login', { replace: true });
    return null;
  }

  const handleSave = async () => {
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // PASSO 1: Atualizar senha no Auth
      const { error: authError } = await supabase.auth.updateUser({ password });

      if (authError) {
        console.error('Erro ao atualizar senha no Auth:', authError);
        setError(authError.message);
        setLoading(false);
        return;
      }

      console.log('Senha atualizada no Auth com sucesso');

      // PASSO 2: Buscar sessão atual para garantir que
      // o usuário ainda está autenticado
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        setError('Sessão expirada. Faça login novamente.');
        setLoading(false);
        return;
      }

      const userId = session.user.id;
      console.log('Atualizando must_change_password para userId:', userId);

      // PASSO 3: Atualizar must_change_password no banco
      const { error: dbError, data: dbData } = await (supabase.from('usuarios') as any)
        .update({ must_change_password: false })
        .eq('id', userId)
        .select();

      console.log('DB update result - error:', dbError);
      console.log('DB update result - data:', dbData);

      if (dbError) {
        console.error('Erro ao atualizar must_change_password:', dbError);
        // Mesmo com erro no DB, continuar pois a senha foi trocada
        // O admin pode corrigir manualmente se necessário
      }

      // PASSO 4: Atualizar o store
      useAuthStore.setState(s => ({
        user: s.user
          ? { ...s.user, must_change_password: false }
          : null,
      }));

      console.log('Store atualizado');
      toast.success('Senha definida com sucesso!');

      // PASSO 5: Redirecionar para primeira página permitida
      const { user: updatedUser } = useAuthStore.getState();
      navigate(getFirstAllowedRoute(updatedUser), { replace: true });
    } catch (err) {
      console.error('Erro inesperado:', err);
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-lg p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center mb-3">
            <Lock className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Defina sua nova senha</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">
            Por segurança, você precisa alterar sua senha temporária antes de continuar.
          </p>
        </div>

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
            Salvar nova senha
          </button>
        </div>
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
