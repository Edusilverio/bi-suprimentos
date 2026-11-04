import { useEffect, useState } from 'react';
import { Loader2, Palmtree, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import type { UsuarioRow } from '@/lib/database.types';

interface Props {
  open: boolean;
  onClose: () => void;
  user: UsuarioRow | null;
  onUpdated: () => void;
}

export function FeriasModal({ open, onClose, user, onUpdated }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [modoFerias, setModoFerias] = useState(false);
  const [analistas, setAnalistas] = useState<UsuarioRow[]>([]);
  const [substitutos, setSubstitutos] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open || !user) return;
    setModoFerias(!!user.modo_ferias);
    void loadData();
  }, [open, user?.id]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: an } = await supabase
        .from('usuarios')
        .select('*')
        .eq('ativo', true)
        .neq('id', user.id)
        .order('name', { ascending: true });

      setAnalistas((an as UsuarioRow[]) ?? []);

      const { data: subs } = await supabase
        .from('usuario_ferias_substitutos')
        .select('substituto_id, ativo')
        .eq('usuario_ferias', user.id)
        .eq('ativo', true);

      setSubstitutos(new Set((subs ?? []).map((s: any) => s.substituto_id)));
    } finally {
      setLoading(false);
    }
  };

  const toggleModoFerias = async (value: boolean) => {
    if (!user) return;
    const prev = modoFerias;
    setModoFerias(value);
    const { error } = await (supabase.from('usuarios') as any)
      .update({ modo_ferias: value })
      .eq('id', user.id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      setModoFerias(prev);
    } else {
      toast({ title: 'Sucesso', description: value ? 'Modo férias ativado.' : 'Modo férias desativado.' });
      onUpdated();
    }
  };

  const toggleSubstituto = async (substitutoId: string, checked: boolean) => {
    if (!user) return;
    const next = new Set(substitutos);
    if (checked) next.add(substitutoId); else next.delete(substitutoId);
    setSubstitutos(next);

    const { error } = await (supabase.from('usuario_ferias_substitutos') as any).upsert(
      {
        usuario_ferias: user.id,
        substituto_id: substitutoId,
        ativo: checked,
      },
      { onConflict: 'usuario_ferias,substituto_id' },
    );

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      const revert = new Set(substitutos);
      setSubstitutos(revert);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palmtree className="h-4 w-4 text-amber-500" />
            Modo Férias — {user?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/20">
          <div className="flex items-center gap-2">
            <Palmtree className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium">Modo férias {modoFerias ? 'ativo' : 'inativo'}</span>
          </div>
          <Switch checked={modoFerias} onCheckedChange={toggleModoFerias} />
        </div>

        {modoFerias && (
          <div className="flex-1 overflow-hidden flex flex-col mt-2">
            <p className="text-sm font-medium mb-2">Substitutos designados</p>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : (
              <ScrollArea className="h-[280px] pr-3">
                <div className="space-y-1.5">
                  {analistas.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum usuário disponível.</p>
                  ) : analistas.map(a => (
                    <label
                      key={a.id}
                      className="flex items-center gap-3 p-2.5 border border-border rounded-md hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <Checkbox
                        checked={substitutos.has(a.id)}
                        onCheckedChange={(c) => toggleSubstituto(a.id, !!c)}
                      />
                      <span className="text-sm flex-1">{a.name}</span>
                      <span className="text-[10px] text-muted-foreground capitalize">{a.cargo}</span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            )}

            <div className="mt-3 p-2.5 border border-border rounded-md bg-muted/10 flex gap-2 items-start">
              <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground">
                Os substitutos marcados poderão visualizar os processos deste analista enquanto o modo férias estiver ativo.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
