import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { PAGINAS_SISTEMA } from '@/config/paginas';
import type { UsuarioRow } from '@/lib/database.types';

interface Props {
  open: boolean;
  onClose: () => void;
  user: UsuarioRow | null;
}

export function PermissoesModal({ open, onClose, user }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [paginas, setPaginas] = useState<Record<string, boolean>>({});
  // Obras
  const [obrasCatalogo, setObrasCatalogo] = useState<string[]>([]);
  const [obrasHab, setObrasHab] = useState<Record<string, boolean>>({});
  const [buscaObra, setBuscaObra] = useState('');
  const [salvandoTodas, setSalvandoTodas] = useState(false);

  // nível <= 1 (root/admin) enxerga tudo por regra — não há o que restringir.
  const gerenciaObras = !!user && user.nivel >= 2;

  useEffect(() => {
    if (!open || !user) return;
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    setBuscaObra('');
    try {
      // Páginas
      const { data: pgs } = await supabase
        .from('usuario_paginas')
        .select('pagina, habilitada')
        .eq('usuario_id', user.id);
      const pgMap: Record<string, boolean> = {};
      PAGINAS_SISTEMA.forEach(p => { pgMap[p.key] = false; });
      (pgs ?? []).forEach((p: any) => { pgMap[p.pagina] = !!p.habilitada; });
      setPaginas(pgMap);

      // Obras — catálogo SEMPRE ao vivo de vw_obras (obras novas aparecem
      // automaticamente), cruzado com o estado atual em usuario_obras.
      const [{ data: catalogo }, { data: doUsuario }] = await Promise.all([
        supabase.from('vw_obras' as any).select('nome'),
        supabase.from('usuario_obras').select('obra, habilitada').eq('usuario_id', user.id),
      ]);
      const nomes = ((catalogo as any[]) ?? [])
        .map((o: any) => o.nome as string)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
      const habMap: Record<string, boolean> = {};
      nomes.forEach(n => { habMap[n] = false; });
      ((doUsuario as any[]) ?? []).forEach((o: any) => {
        if (o.obra in habMap) habMap[o.obra] = !!o.habilitada;
      });
      setObrasCatalogo(nomes);
      setObrasHab(habMap);
    } finally {
      setLoading(false);
    }
  };

  const togglePagina = async (key: string, value: boolean) => {
    if (!user) return;
    setPaginas(prev => ({ ...prev, [key]: value }));
    const { error } = await (supabase.from('usuario_paginas') as any).upsert(
      { usuario_id: user.id, pagina: key, habilitada: value, updated_at: new Date().toISOString() },
      { onConflict: 'usuario_id,pagina' },
    );
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      setPaginas(prev => ({ ...prev, [key]: !value }));
    }
  };

  const toggleObra = async (obra: string, value: boolean) => {
    if (!user) return;
    setObrasHab(prev => ({ ...prev, [obra]: value }));
    const { error } = await (supabase.from('usuario_obras') as any).upsert(
      { usuario_id: user.id, obra, habilitada: value, updated_at: new Date().toISOString() },
      { onConflict: 'usuario_id,obra' },
    );
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      setObrasHab(prev => ({ ...prev, [obra]: !value }));
    }
  };

  const marcarTodas = async (value: boolean) => {
    if (!user || obrasCatalogo.length === 0) return;
    const anterior = obrasHab;
    setSalvandoTodas(true);
    setObrasHab(Object.fromEntries(obrasCatalogo.map(o => [o, value])));
    const now = new Date().toISOString();
    const { error } = await (supabase.from('usuario_obras') as any).upsert(
      obrasCatalogo.map(obra => ({ usuario_id: user.id, obra, habilitada: value, updated_at: now })),
      { onConflict: 'usuario_id,obra' },
    );
    setSalvandoTodas(false);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      setObrasHab(anterior);
    } else {
      toast({ title: 'Obras atualizadas', description: value ? 'Todas habilitadas.' : 'Todas desabilitadas.' });
    }
  };

  const obrasFiltradas = useMemo(() => {
    const q = buscaObra.trim().toLowerCase();
    return q ? obrasCatalogo.filter(o => o.toLowerCase().includes(q)) : obrasCatalogo;
  }, [obrasCatalogo, buscaObra]);

  const totalHabilitadas = useMemo(
    () => obrasCatalogo.filter(o => obrasHab[o]).length,
    [obrasCatalogo, obrasHab],
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Permissões — {user?.name}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col gap-5">
            {/* Páginas */}
            <div className="flex flex-col min-h-0">
              <h3 className="text-sm font-medium mb-3">Páginas</h3>
              <ScrollArea className="h-[220px] pr-3">
                <div className="space-y-2">
                  {PAGINAS_SISTEMA.map(p => (
                    <div key={p.key} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                      <span className="text-sm">{p.label}</span>
                      <Switch checked={!!paginas[p.key]} onCheckedChange={(v) => togglePagina(p.key, v)} />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Obras */}
            <div className="flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">
                  Obras
                  <span className="ml-2 text-xs text-muted-foreground font-normal">
                    {totalHabilitadas}/{obrasCatalogo.length} habilitadas
                  </span>
                </h3>
                {gerenciaObras && obrasCatalogo.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-7 text-xs" disabled={salvandoTodas}
                      onClick={() => marcarTodas(true)}>Marcar todas</Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" disabled={salvandoTodas}
                      onClick={() => marcarTodas(false)}>Desmarcar todas</Button>
                  </div>
                )}
              </div>

              {!gerenciaObras ? (
                <p className="text-xs text-muted-foreground p-3 border border-border rounded-lg bg-muted/10">
                  {user?.nivel !== undefined && user.nivel <= 1
                    ? 'Root e Admin enxergam todas as obras por regra — não há restrição a configurar.'
                    : 'Sem obras para configurar.'}
                </p>
              ) : (
                <>
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input value={buscaObra} onChange={e => setBuscaObra(e.target.value)}
                      placeholder="Buscar obra…" className="h-8 pl-8 text-xs" />
                  </div>
                  <ScrollArea className="h-[220px] pr-3">
                    <div className="space-y-2">
                      {obrasFiltradas.length === 0 && (
                        <p className="text-xs text-muted-foreground px-1 py-2">Nenhuma obra encontrada.</p>
                      )}
                      {obrasFiltradas.map(obra => (
                        <div key={obra} className="flex items-center justify-between p-2.5 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                          <span className="text-sm truncate pr-2">{obra}</span>
                          <Switch checked={!!obrasHab[obra]} onCheckedChange={(v) => toggleObra(obra, v)} />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
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
