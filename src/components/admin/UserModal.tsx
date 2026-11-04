import { useState, useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { generateTempPassword, nivelFromCargo } from '@/lib/utils';
import { PAGINAS_SISTEMA } from '@/config/paginas';
import type { UsuarioRow, CargoUsuario } from '@/lib/database.types';

interface Props {
  open: boolean;
  onClose: () => void;
  user: UsuarioRow | null;
  currentUserCargo: string;
  onSaved: () => void;
  onCreated: (u: UsuarioRow) => void;
}

export function UserModal({ open, onClose, user, currentUserCargo, onSaved, onCreated }: Props) {
  const isEdit = !!user;
  const isRoot = currentUserCargo === 'root';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cargo, setCargo] = useState<CargoUsuario>('analista');
  const [ativo, setAtivo] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [tempPasswordDisplay, setTempPasswordDisplay] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setName(user.name);
      setCargo(user.cargo);
      setAtivo(user.ativo);
    } else {
      setName('');
      setEmail('');
      setCargo('analista');
      setAtivo(true);
    }
    setFormError('');
    setTempPasswordDisplay('');
  }, [user, open]);

  const cargoOptions = useMemo(() => {
    const opts: { value: CargoUsuario; label: string }[] = [
      { value: 'gestor', label: 'Gestor' },
      { value: 'aprovador', label: 'Aprovador' },
      { value: 'analista', label: 'Analista' },
      { value: 'viewer', label: 'Viewer' },
    ];
    if (isRoot) {
      opts.unshift({ value: 'admin', label: 'Admin' });
    }
    return opts;
  }, [isRoot]);

  const nivel = nivelFromCargo(cargo);

  const handleSave = async () => {
    setFormError('');

    if (name.trim().length < 3) {
      setFormError('Nome deve ter no mínimo 3 caracteres.');
      return;
    }

    if (isEdit) {
      setSaving(true);
      const { error } = await (supabase.from('usuarios') as any)
        .update({ name: name.trim(), cargo, nivel, ativo })
        .eq('id', user!.id);
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Sucesso', description: 'Usuário atualizado.' });
        onSaved();
        onClose();
      }
      setSaving(false);
      return;
    }

    // Create
    if (!email.trim() || !email.includes('@')) {
      setFormError('E-mail inválido.');
      return;
    }

    setSaving(true);
    const tempPassword = generateTempPassword();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setFormError('Sessão expirada. Faça login novamente.');
      setSaving(false);
      return;
    }

    const { data: fnData, error: fnError } = await supabase.functions.invoke(((import.meta.env.VITE_FUNCTIONS_PREFIX as string | undefined) ?? "") + "admin-create-users", {
      body: { action: 'create', email: email.trim(), password: tempPassword, email_confirm: true },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (fnError || !fnData?.ok) {
      const errMsg = fnData?.error?.msg || fnData?.error?.message || fnError?.message || 'Erro ao criar usuário.';
      const isEmailTaken = typeof errMsg === 'string' && errMsg.toLowerCase().includes('already');
      setFormError(isEmailTaken ? 'Este e-mail já está cadastrado.' : errMsg);
      setSaving(false);
      return;
    }

    const authUserId = fnData.data?.id;
    if (!authUserId) {
      setFormError('Erro inesperado: UUID não retornado.');
      setSaving(false);
      return;
    }

    const insertPayload = {
      id: authUserId,
      name: name.trim(),
      cargo,
      nivel,
      ativo,
      must_change_password: true,
      modo_ferias: false,
    };
    const { error: dbError } = await (supabase.from('usuarios') as any).insert(insertPayload);

    if (dbError) {
      setFormError('Usuário criado no auth mas falhou ao salvar perfil. Contate o suporte.');
      toast({ title: 'Erro', description: dbError.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    // Popular usuario_paginas (todas false)
    await (supabase.from('usuario_paginas') as any).insert(
      PAGINAS_SISTEMA.map(p => ({
        usuario_id: authUserId,
        pagina: p.key,
        habilitada: false,
      })),
    );

    // Popular usuario_obras com obras distintas — habilitadas por padrão.
    // Novo membro já enxerga todas as obras ao entrar; o admin restringe
    // depois os casos excepcionais pelo modal de Permissões. Evita o
    // "usuário novo não vê nenhuma obra".
    const { data: obrasDisponiveis } = await supabase.from('vw_obras').select('nome');
    if (obrasDisponiveis && obrasDisponiveis.length > 0) {
      await (supabase.from('usuario_obras') as any).insert(
        obrasDisponiveis.map((o: any) => ({
          usuario_id: authUserId,
          obra: o.nome,
          habilitada: true,
        })),
      );
    }

    setTempPasswordDisplay(tempPassword);
    toast({ title: 'Sucesso', description: `Usuário ${name.trim()} criado com sucesso` });
    onCreated({ ...insertPayload, created_at: new Date().toISOString() } as UsuarioRow);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setTempPasswordDisplay(''); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
        </DialogHeader>

        {tempPasswordDisplay ? (
          <div className="space-y-4 py-2">
            <div className="p-4 border border-border rounded-lg bg-muted/30 space-y-2">
              <p className="text-sm font-medium text-foreground">Senha temporária gerada:</p>
              <code className="block p-2 bg-background border border-border rounded text-sm font-mono text-primary select-all">
                {tempPasswordDisplay}
              </code>
              <p className="text-[11px] text-muted-foreground">
                Copie esta senha e envie ao usuário. Ele será obrigado a trocar no primeiro login.
              </p>
            </div>
            <Button onClick={() => { setTempPasswordDisplay(''); onClose(); }} className="w-full">
              Fechar
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome completo</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome completo" />
              {cargo !== 'viewer' && (
                <p className="text-[11px] text-amber-500">⚠️ O nome deve ser idêntico ao cadastro no sistema de origem para o filtro funcionar.</p>
              )}
            </div>

            {!isEdit && (
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vitor.souza@exemplo.com.br" />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Cargo</Label>
              <Select value={cargo} onValueChange={(v) => setCargo(v as CargoUsuario)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {cargoOptions.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Nível</Label>
              <Input value={nivel} disabled className="bg-muted" />
            </div>

            <div className="flex items-center gap-3">
              <Label>Ativo</Label>
              <Switch checked={ativo} onCheckedChange={setAtivo} />
            </div>

            {!isEdit && (
              <div className="p-2.5 border border-border rounded-md bg-muted/10">
                <p className="text-[11px] text-muted-foreground">
                  ℹ️ Uma senha temporária será gerada automaticamente. O usuário deverá trocá-la no primeiro acesso.
                </p>
              </div>
            )}

            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando...</> : 'Salvar'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
