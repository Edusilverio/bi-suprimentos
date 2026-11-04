import { useEffect, useMemo, useState, useCallback } from 'react';
import { Building2, Pencil, Plus, Search, Image as ImageIcon, Upload, Trash2, Loader2, X } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import {
  listarObras, atualizarObra, criarObra, obraExiste, uploadFoto, removerFotoStorage,
  isPlaceholderFoto, type ObraRow, type StatusObra,
} from '@/services/gestaoObrasService';

type StatusFilter = StatusObra | 'TODAS';

const STATUS_META: Record<StatusObra, { label: string; emoji: string; bg: string; text: string }> = {
  ATIVA:      { label: 'Ativa',      emoji: '🟢', bg: '#DCFCE7', text: '#166534' },
  FINALIZADA: { label: 'Finalizada', emoji: '🟡', bg: '#FEF3C7', text: '#92400E' },
  PRE_OBRA:   { label: 'Pré obra',   emoji: '🔵', bg: '#DBEAFE', text: '#1E3A8A' },
  NAO_E_OBRA: { label: 'N/A',        emoji: '⚪', bg: '#F3F4F6', text: '#4B5563' },
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const PAGE_SIZE = 20;

function formatCusto(v: number | string | null | undefined): string {
  if (v == null || v === '') return '—';
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[^\d.,-]/g, '').replace(',', '.'));
  if (!isFinite(n) || n === 0) return '—';
  if (Math.abs(n) >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (Math.abs(n) >= 1_000)     return `R$ ${(n / 1_000).toFixed(0)}k`;
  return `R$ ${n.toFixed(0)}`;
}

function parseNumeroBR(s: string): number | null {
  const t = s.trim();
  if (t === '') return null;
  // Se houver vírgula, o ponto é separador de milhar; caso contrário, ponto é decimal.
  const normalized = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  const n = Number(normalized);
  return isFinite(n) ? n : NaN as unknown as number;
}

function formatArea(v: number | string | null | undefined): string {
  if (v == null || v === '') return '—';
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  if (!isFinite(n)) return '—';
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

function StatusBadge({ status }: { status: StatusObra | null }) {
  const meta = status ? STATUS_META[status] : STATUS_META.NAO_E_OBRA;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium"
      style={{ backgroundColor: meta.bg, color: meta.text }}
    >
      <span>{meta.emoji}</span>{meta.label}
    </span>
  );
}

export default function GestaoObrasPage() {
  const { toast } = useToast();
  const [busca, setBusca] = useState('');
  const debouncedBusca = useDebounce(busca, 300);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('TODAS');
  const [obras, setObras] = useState<ObraRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [editTarget, setEditTarget] = useState<ObraRow | null>(null);
  const [novaObra, setNovaObra] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const status = statusFilter === 'TODAS' ? undefined : [statusFilter];
    const { data, error } = await listarObras({ busca: debouncedBusca || undefined, status });
    if (error) toast({ title: 'Erro ao carregar obras', description: error.message, variant: 'destructive' });
    setObras(data);
    setPage(0);
    setLoading(false);
  }, [debouncedBusca, statusFilter, toast]);

  useEffect(() => { carregar(); }, [carregar]);

  const totalPages = Math.max(1, Math.ceil(obras.length / PAGE_SIZE));
  const paged = useMemo(() => obras.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [obras, page]);

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="GESTÃO DE OBRAS" icon={<Building2 className="h-5 w-5 text-primary-foreground" />} />
      <p className="text-sm text-muted-foreground -mt-4">Cadastro de obras, clientes, fotos e custos</p>

      <div className="bg-card border border-border rounded-lg p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar obra..."
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Status:</span>
          {(['TODAS','ATIVA','PRE_OBRA','FINALIZADA','NAO_E_OBRA'] as StatusFilter[]).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-2.5 py-1 rounded border text-[11px] font-medium transition',
                statusFilter === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border text-muted-foreground hover:text-foreground'
              )}
            >
              {s === 'TODAS' ? 'Todas' : STATUS_META[s as StatusObra].label}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <Button onClick={() => setNovaObra(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Nova obra
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-muted-foreground text-xs uppercase">
              <th className="text-left px-4 py-2 w-[80px]">Foto</th>
              <th className="text-left px-4 py-2">Obra</th>
              <th className="text-left px-4 py-2">Cliente</th>
              <th className="text-left px-4 py-2 w-[120px]">Custo</th>
              <th className="text-left px-4 py-2 w-[140px]">Área (m²)</th>
              <th className="text-left px-4 py-2 w-[140px]">Status</th>
              <th className="text-right px-4 py-2 w-[80px]">Ação</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin inline" />
              </td></tr>
            )}
            {!loading && paged.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Nenhuma obra encontrada</td></tr>
            )}
            {!loading && paged.map(o => (
              <tr
                key={o.cost_collector}
                onClick={() => setEditTarget(o)}
                className="border-b border-border/50 hover:bg-primary/5 cursor-pointer"
              >
                <td className="px-4 py-2">
                  {o.foto_url ? (
                    <img src={o.foto_url} alt="" className="w-[50px] h-[40px] object-cover rounded-md" />
                  ) : (
                    <div className="w-[50px] h-[40px] rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-4 w-4" />
                    </div>
                  )}
                </td>
                <td className="px-4 py-2 font-medium">{o.cost_collector}</td>
                <td className="px-4 py-2 text-muted-foreground">{o.cliente || '—'}</td>
                <td className="px-4 py-2">{formatCusto(o.custo_atual)}</td>
                <td className="px-4 py-2 tabular-nums">{formatArea(o.area_construida_m2)}</td>
                <td className="px-4 py-2"><StatusBadge status={o.status_obra} /></td>
                <td className="px-4 py-2 text-right">
                  <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); setEditTarget(o); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && obras.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs">
            <span className="text-muted-foreground">{page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, obras.length)} de {obras.length}</span>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próxima</Button>
            </div>
          </div>
        )}
      </div>

      {editTarget && (
        <EditarObraModal
          obra={editTarget}
          isNova={false}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); carregar(); }}
        />
      )}
      {novaObra && (
        <EditarObraModal
          obra={{ cost_collector: '', cliente: '', foto_url: null, custo_atual: null, porcentagem: null, status_obra: 'PRE_OBRA', area_construida_m2: null, meta_agua: null, meta_energia: null, meta_residuos: null }}
          isNova={true}
          onClose={() => setNovaObra(false)}
          onSaved={() => { setNovaObra(false); carregar(); }}
        />
      )}
    </div>
  );
}

// ============================================================
// Modal de edição/criação
// ============================================================
function EditarObraModal({
  obra, isNova, onClose, onSaved,
}: {
  obra: ObraRow;
  isNova: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [nome, setNome] = useState(obra.cost_collector);
  const [cliente, setCliente] = useState(obra.cliente ?? '');
  const [custo, setCusto] = useState<string>(obra.custo_atual != null ? String(obra.custo_atual) : '');
  const [status, setStatus] = useState<StatusObra>(obra.status_obra ?? 'PRE_OBRA');
  const [fotoUrl, setFotoUrl] = useState<string | null>(obra.foto_url);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [removerFoto, setRemoverFoto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [confirmaDescartar, setConfirmaDescartar] = useState(false);
  const [confirmaRemoverFoto, setConfirmaRemoverFoto] = useState(false);

  const toStr = (v: number | string | null | undefined) => (v == null || v === '' ? '' : String(v));
  const [areaConstruida, setAreaConstruida] = useState<string>(toStr(obra.area_construida_m2));
  const [metaAgua, setMetaAgua] = useState<string>(toStr(obra.meta_agua));
  const [metaEnergia, setMetaEnergia] = useState<string>(toStr(obra.meta_energia));
  const [metaResiduos, setMetaResiduos] = useState<string>(toStr(obra.meta_residuos));

  const dirty =
    nome !== obra.cost_collector ||
    cliente !== (obra.cliente ?? '') ||
    custo !== (obra.custo_atual != null ? String(obra.custo_atual) : '') ||
    status !== (obra.status_obra ?? 'PRE_OBRA') ||
    areaConstruida !== toStr(obra.area_construida_m2) ||
    metaAgua !== toStr(obra.meta_agua) ||
    metaEnergia !== toStr(obra.meta_energia) ||
    metaResiduos !== toStr(obra.meta_residuos) ||
    fotoFile !== null ||
    removerFoto;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!['image/jpeg', 'image/png'].includes(f.type)) {
      toast({ title: 'Arquivo inválido', description: 'Use JPG ou PNG.', variant: 'destructive' });
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      toast({ title: 'Arquivo muito grande', description: 'Tamanho máximo de 10MB.', variant: 'destructive' });
      return;
    }
    setFotoFile(f);
    setRemoverFoto(false);
    const reader = new FileReader();
    reader.onload = ev => setFotoPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleTentarFechar = () => {
    if (dirty) setConfirmaDescartar(true);
    else onClose();
  };

  const handleSalvar = async () => {
    if (isNova && !nome.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' });
      return;
    }

    // Validação sustentabilidade
    const area = parseNumeroBR(areaConstruida);
    const agua = parseNumeroBR(metaAgua);
    const energia = parseNumeroBR(metaEnergia);
    const residuos = parseNumeroBR(metaResiduos);

    if (Number.isNaN(area) || Number.isNaN(agua) || Number.isNaN(energia) || Number.isNaN(residuos)) {
      toast({ title: 'Valor numérico inválido', description: 'Verifique os campos de sustentabilidade.', variant: 'destructive' });
      return;
    }
    for (const [label, v] of [['Meta de água', agua], ['Meta de energia', energia], ['Meta de resíduos', residuos], ['Área construída', area]] as const) {
      if (v != null && v < 0) {
        toast({ title: `${label} inválido`, description: 'Não são aceitos valores negativos.', variant: 'destructive' });
        return;
      }
    }
    if (area != null && area === 0) {
      toast({ title: 'Área construída inválida', description: 'A área é usada como divisor no cálculo dos indicadores e não pode ser zero.', variant: 'destructive' });
      return;
    }

    setSalvando(true);
    let novaFotoUrl: string | null = fotoUrl;
    let fotoUpada: string | null = null;
    try {
      if (isNova) {
        const existe = await obraExiste(nome.trim());
        if (existe) {
          toast({ title: 'Obra já existe', description: 'cost_collector já cadastrado.', variant: 'destructive' });
          setSalvando(false);
          return;
        }
      }

      if (fotoFile) {
        novaFotoUrl = await uploadFoto(fotoFile, nome || obra.cost_collector);
        fotoUpada = novaFotoUrl;
      } else if (removerFoto) {
        novaFotoUrl = null;
      }

      const custoNum = custo.trim() === '' ? null : Number(custo.replace(',', '.'));
      const dados = {
        cliente: cliente.trim() || null,
        foto_url: novaFotoUrl,
        custo_atual: custoNum,
        status_obra: status,
        area_construida_m2: area,
        meta_agua: agua,
        meta_energia: energia,
        meta_residuos: residuos,
      };

      if (isNova) {
        const { error } = await criarObra({ cost_collector: nome.trim(), ...dados });
        if (error) throw error;
      } else {
        const { error } = await atualizarObra(obra.cost_collector, dados);
        if (error) throw error;
        if (removerFoto && obra.foto_url && !isPlaceholderFoto(obra.foto_url)) {
          await removerFotoStorage(obra.foto_url);
        }
      }
      toast({ title: 'Obra salva com sucesso' });
      onSaved();
    } catch (e: any) {
      // rollback foto
      if (fotoUpada) await removerFotoStorage(fotoUpada);
      toast({ title: 'Erro ao salvar', description: e?.message ?? String(e), variant: 'destructive' });
    } finally {
      setSalvando(false);
    }
  };

  const previewSrc = fotoPreview || (!removerFoto && fotoUrl ? fotoUrl : null);
  const showRemoverFoto = Boolean(fotoPreview) || (Boolean(fotoUrl) && !isPlaceholderFoto(fotoUrl) && !removerFoto);

  return (
    <Dialog open onOpenChange={(o) => { if (!o) handleTentarFechar(); }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNova ? 'Nova Obra' : 'Editar Obra'}</DialogTitle>
          <DialogDescription>
            {isNova ? 'Cadastre uma nova obra manualmente.' : 'Edite cliente, foto, custo e status.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nome da obra</label>
            <Input
              value={nome}
              onChange={e => setNome(e.target.value)}
              readOnly={!isNova}
              className={!isNova ? 'bg-muted cursor-not-allowed' : ''}
            />
            {!isNova && (
              <p className="text-[11px] text-amber-600 mt-1">⚠️ Nome vem do Prisma e não pode ser editado.</p>
            )}
          </div>

          <div className="border border-border rounded-lg p-3 space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Foto da obra</label>
            <div className="flex items-center gap-3">
              {previewSrc ? (
                <img src={previewSrc} alt="" className="w-[240px] h-[180px] object-cover rounded-lg border border-border" />
              ) : (
                <div className="w-[240px] h-[180px] rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <label className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border bg-background hover:bg-muted cursor-pointer">
                  <Upload className="h-3.5 w-3.5" /> Trocar foto
                  <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleFile} />
                </label>
                {showRemoverFoto && (
                  <Button size="sm" variant="outline" onClick={() => {
                    if (fotoPreview) {
                      setFotoFile(null);
                      setFotoPreview(null);
                    } else {
                      setConfirmaRemoverFoto(true);
                    }
                  }}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Remover
                  </Button>
                )}
                <p className="text-[10px] text-muted-foreground">Aceita JPG ou PNG (máx 10MB)</p>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Cliente</label>
            <Input value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Ex: Incorporadora Horizonte" />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Custo atual (R$)</label>
            <Input
              value={custo}
              onChange={e => setCusto(e.target.value)}
              placeholder="Apenas número (ex: 28507783.12)"
              inputMode="decimal"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(STATUS_META) as StatusObra[]).map(s => (
                <label
                  key={s}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer text-sm',
                    status === s ? 'border-primary bg-primary/5' : 'border-border'
                  )}
                >
                  <input type="radio" name="status" value={s} checked={status === s} onChange={() => setStatus(s)} />
                  <StatusBadge status={s} />
                </label>
              ))}
            </div>
          </div>

          <div className="border border-border rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">Sustentabilidade</h4>
              <span className="text-[10px] text-muted-foreground">Campos opcionais — vazio = não informado</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Área construída (m²)</label>
                <Input
                  value={areaConstruida}
                  onChange={e => setAreaConstruida(e.target.value)}
                  placeholder="Ex: 12500,50"
                  inputMode="decimal"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Usada como divisor no cálculo dos indicadores.</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Meta de água (m³/m²)</label>
                <Input
                  value={metaAgua}
                  onChange={e => setMetaAgua(e.target.value)}
                  placeholder="Ex: 0,25"
                  inputMode="decimal"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Meta de energia (kWh/m²)</label>
                <Input
                  value={metaEnergia}
                  onChange={e => setMetaEnergia(e.target.value)}
                  placeholder="Ex: 30,5"
                  inputMode="decimal"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Meta de resíduos (m³/m²)</label>
                <Input
                  value={metaResiduos}
                  onChange={e => setMetaResiduos(e.target.value)}
                  placeholder="Ex: 0,05"
                  inputMode="decimal"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleTentarFechar} disabled={salvando}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={salvando || !dirty}>
            {salvando ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Salvar
          </Button>
        </DialogFooter>

        <AlertDialog open={confirmaDescartar} onOpenChange={setConfirmaDescartar}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
              <AlertDialogDescription>As mudanças não salvas serão perdidas.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction onClick={() => { setConfirmaDescartar(false); onClose(); }}>Descartar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={confirmaRemoverFoto} onOpenChange={setConfirmaRemoverFoto}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover foto?</AlertDialogTitle>
              <AlertDialogDescription>A foto será removida ao salvar.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                setRemoverFoto(true);
                setFotoFile(null);
                setFotoPreview(null);
                setFotoUrl(null);
                setConfirmaRemoverFoto(false);
              }}>Remover</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
