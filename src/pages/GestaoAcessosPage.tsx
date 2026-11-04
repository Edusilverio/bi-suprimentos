import { useState, useEffect } from 'react';
import { Lock, Plus, Pencil, Loader2, Trash2, Settings, Palmtree, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/useAuthStore';
import { cargoLabel, cargoBadgeClass, cn } from '@/lib/utils';
import type { UsuarioRow } from '@/lib/database.types';
import { UserModal } from '@/components/admin/UserModal';
import { PermissoesModal } from '@/components/admin/PermissoesModal';
import { FeriasModal } from '@/components/admin/FeriasModal';

export default function GestaoAcessosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<UsuarioRow | null>(null);
  const [permTarget, setPermTarget] = useState<UsuarioRow | null>(null);
  const [feriasTarget, setFeriasTarget] = useState<UsuarioRow | null>(null);
  const [resetTarget, setResetTarget] = useState<UsuarioRow | null>(null);
  const [resetEmail, setResetEmail] = useState('');
  const [resetting, setResetting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UsuarioRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const { toast } = useToast();
  const { user: currentUser } = useAuthStore();

  const isRoot = currentUser?.cargo === 'root';
  const isAdmin = currentUser?.cargo === 'admin';

  const fetchUsuarios = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .order('nivel', { ascending: true })
      .order('name', { ascending: true });
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
    let list = (data as UsuarioRow[]) ?? [];

    // Visibilidade: admin não vê root nem outros admins
    if (isAdmin) {
      list = list.filter(u => u.nivel >= 2 || u.id === currentUser?.id);
    }

    setUsuarios(list);
    setLoading(false);
  };

  useEffect(() => { fetchUsuarios(); }, [isAdmin, currentUser?.id]);

  const canEdit = (target: UsuarioRow): boolean => {
    if (target.id === currentUser?.id) return true; // pode editar a si mesmo
    if (isRoot) return true;
    if (isAdmin) return target.nivel >= 2;
    return false;
  };

  const canDelete = (target: UsuarioRow): boolean => {
    if (target.id === currentUser?.id) return false;
    if (isRoot) return true;
    if (isAdmin) return target.nivel >= 2;
    return false;
  };

  const canResetPassword = (target: UsuarioRow): boolean => {
    if (target.id === currentUser?.id) return true; // pode resetar a própria senha
    if (isRoot) return true;
    if (isAdmin) return target.nivel >= 2;
    return false;
  };

  const toggleAtivo = async (user: UsuarioRow) => {
    if (!canEdit(user)) return;
    const { error } = await (supabase.from('usuarios') as any)
      .update({ ativo: !user.ativo })
      .eq('id', user.id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      fetchUsuarios();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');

    const { error: dbError } = await (supabase.from('usuarios') as any)
      .delete()
      .eq('id', deleteTarget.id);

    if (dbError) {
      setDeleteError('Erro ao excluir usuário. Tente novamente.');
      toast({ title: 'Erro', description: dbError.message, variant: 'destructive' });
      setDeleting(false);
      return;
    }

    const { data: { session: delSession } } = await supabase.auth.getSession();
    const { error: fnError } = await supabase.functions.invoke(((import.meta.env.VITE_FUNCTIONS_PREFIX as string | undefined) ?? "") + "admin-create-users", {
      body: { action: 'delete', userId: deleteTarget.id },
      headers: { Authorization: `Bearer ${delSession?.access_token}` },
    });

    if (fnError) {
      toast({
        title: 'Aviso',
        description: 'Usuário removido do sistema mas pode ainda conseguir fazer login. Contate o suporte técnico.',
        variant: 'destructive',
      });
    }

    const deletedName = deleteTarget.name;
    setUsuarios(prev => prev.filter(u => u.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast({ title: 'Sucesso', description: `Usuário ${deletedName} excluído com sucesso` });
    setDeleting(false);
  };

  const [resetTempPassword, setResetTempPassword] = useState('');

  const handleResetPassword = async () => {
    if (!resetTarget || !resetEmail.trim()) {
      toast({ title: 'Erro', description: 'Informe o e-mail do usuário.', variant: 'destructive' });
      return;
    }
    setResetting(true);
    setResetTempPassword('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke(((import.meta.env.VITE_FUNCTIONS_PREFIX as string | undefined) ?? "") + "admin-create-users", {
        body: {
          action: 'reset-password',
          userId: resetTarget.id,
          email: resetEmail.trim(),
          nome: resetTarget.name,
        },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error || !data?.ok) {
        const msg = data?.error?.message || data?.error || error?.message || 'Erro ao resetar senha.';
        toast({ title: 'Erro', description: typeof msg === 'string' ? msg : JSON.stringify(msg), variant: 'destructive' });
      } else if (data.tempPassword) {
        setResetTempPassword(data.tempPassword);
        toast({ title: 'Sucesso', description: `Senha temporária gerada para ${resetTarget.name}` });
      } else {
        toast({ title: 'Sucesso', description: `Reset de senha enviado para ${resetEmail.trim()}` });
        setResetTarget(null);
        setResetEmail('');
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message || 'Erro inesperado.', variant: 'destructive' });
    } finally {
      setResetting(false);
    }
  };

  const openCreate = () => { setEditUser(null); setModalOpen(true); };
  const openEdit = (u: UsuarioRow) => { setEditUser(u); setModalOpen(true); };

  const handleUserCreated = () => {
    fetchUsuarios();
  };

  return (
    <div className="page-container">
      <PageHeader title="GESTÃO DE ACESSOS" icon={<Lock className="h-5 w-5 text-primary-foreground" />} />
      <div className="flex justify-end mb-4">
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" /> Novo Usuário
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium">Nome</th>
                <th className="text-left px-4 py-3 font-medium">Cargo</th>
                <th className="text-left px-4 py-3 font-medium">Nível</th>
                <th className="text-left px-4 py-3 font-medium">Férias</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => {
                const isSelf = currentUser?.id === u.id;
                const editable = canEdit(u);
                const deletable = canDelete(u);
                return (
                  <tr key={u.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-foreground">
                      <div className="flex items-center gap-2">
                        <span>{u.name}</span>
                        {isSelf && <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">Você</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn('text-[10px] px-2 py-0.5 rounded font-medium', cargoBadgeClass(u.cargo))}>
                        {cargoLabel(u.cargo)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.nivel}</td>
                    <td className="px-4 py-3">
                      {u.modo_ferias && (
                        <Badge className="text-[10px] px-2 py-0.5 rounded bg-amber-400 text-amber-950 border-amber-400">
                          <Palmtree className="h-3 w-3 mr-1" /> Férias
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={u.ativo ? 'default' : 'destructive'} className="text-xs">
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {editable && (
                          <button
                            onClick={() => openEdit(u)}
                            className="p-1.5 hover:text-primary hover:bg-muted rounded transition-colors"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {editable && (
                          <button
                            onClick={() => setPermTarget(u)}
                            className="p-1.5 hover:text-primary hover:bg-muted rounded transition-colors"
                            title="Permissões"
                          >
                            <Settings className="h-4 w-4" />
                          </button>
                        )}
                        {editable && (
                          <button
                            onClick={() => setFeriasTarget(u)}
                            className={cn(
                              'p-1.5 hover:bg-muted rounded transition-colors',
                              u.modo_ferias ? 'text-amber-500' : 'hover:text-primary',
                            )}
                            title="Modo Férias"
                          >
                            <Palmtree className="h-4 w-4" />
                          </button>
                        )}
                        {canResetPassword(u) && (
                          <button
                            onClick={() => { setResetEmail(isSelf ? (currentUser?.email ?? '') : ''); setResetTempPassword(''); setResetTarget(u); }}
                            className="p-1.5 hover:text-primary hover:bg-muted rounded transition-colors"
                            title="Reset de senha"
                          >
                            <Mail className="h-4 w-4" />
                          </button>
                        )}
                        {editable && !isSelf && (
                          <Switch
                            checked={u.ativo}
                            onCheckedChange={() => toggleAtivo(u)}
                            className="ml-1"
                          />
                        )}
                        {deletable && (
                          <button
                            onClick={() => { setDeleteError(''); setDeleteTarget(u); }}
                            className="p-1.5 text-destructive hover:bg-destructive/10 rounded transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <UserModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        user={editUser}
        currentUserCargo={currentUser?.cargo ?? ''}
        onSaved={fetchUsuarios}
        onCreated={handleUserCreated}
      />

      <PermissoesModal
        open={!!permTarget}
        onClose={() => setPermTarget(null)}
        user={permTarget}
      />

      <FeriasModal
        open={!!feriasTarget}
        onClose={() => setFeriasTarget(null)}
        user={feriasTarget}
        onUpdated={fetchUsuarios}
      />

      {/* Reset password dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(o) => { if (!o) { setResetTarget(null); setResetEmail(''); setResetTempPassword(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset de senha</DialogTitle>
          </DialogHeader>
          {resetTempPassword ? (
            <div className="space-y-4 py-2">
              <div className="p-4 border border-border rounded-lg bg-muted/30 space-y-2">
                <p className="text-sm font-medium text-foreground">Nova senha temporária:</p>
                <code className="block p-2 bg-background border border-border rounded text-sm font-mono text-primary select-all">
                  {resetTempPassword}
                </code>
                <p className="text-[11px] text-muted-foreground">
                  Copie e envie ao usuário <strong className="text-foreground">{resetTarget?.name}</strong>. Ele será obrigado a trocar no próximo login.
                </p>
              </div>
              <Button onClick={() => { setResetTarget(null); setResetTempPassword(''); setResetEmail(''); }} className="w-full">
                Fechar
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Informe o e-mail da conta de <strong className="text-foreground">{resetTarget?.name}</strong> para executar o reset de senha de forma compatível com a função publicada.
              </p>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">E-mail do usuário</label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="vitor.souza@exemplo.com.br"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setResetTarget(null); setResetEmail(''); }} disabled={resetting}>
                  Cancelar
                </Button>
                <Button onClick={handleResetPassword} disabled={resetting || !resetEmail.trim()}>
                  {resetting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processando...</> : 'Confirmar reset'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir usuário</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir o usuário <strong className="text-foreground">{deleteTarget?.name}</strong>?
          </p>
          <p className="text-sm text-muted-foreground">
            Esta ação não pode ser desfeita e o usuário perderá acesso imediato ao sistema.
          </p>
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Excluindo...</> : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
