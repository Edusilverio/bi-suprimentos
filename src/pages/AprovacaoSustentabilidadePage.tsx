import { useMemo, useState } from 'react';
import { ClipboardCheck, Loader2, CheckCircle2, XCircle, Paperclip } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { KpiCard } from '@/components/KpiCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAprovacaoSustentabilidade } from '@/hooks/useAprovacaoSustentabilidade';
import { decidirLancamentos, type LancamentoSustentabilidadeRow } from '@/services/aprovacaoSustentabilidadeService';

const PAGE_SIZE = 25;

function formatMes(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  if (!isFinite(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
}

function formatDataHora(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (!isFinite(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtNum(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function DecisaoBadge({ v }: { v: string | null }) {
  const isAprov = v === 'aprovado';
  const isRepr = v === 'reprovado';
  return (
    <Badge className={cn(
      'text-[10px] px-1.5 py-0 h-5 rounded font-medium',
      isAprov && 'bg-emerald-100 text-emerald-800 border-emerald-200',
      isRepr && 'bg-red-100 text-red-800 border-red-200',
      !isAprov && !isRepr && 'bg-muted text-muted-foreground border-border',
    )}>
      {isAprov ? 'Aprovado' : isRepr ? 'Reprovado' : (v ?? '—')}
    </Badge>
  );
}

export default function AprovacaoSustentabilidadePage() {
  const { rows, loading, error, reload } = useAprovacaoSustentabilidade();
  const { toast } = useToast();

  const [tab, setTab] = useState<'pendentes' | 'historico'>('pendentes');
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [detalhe, setDetalhe] = useState<LancamentoSustentabilidadeRow | null>(null);

  // Reprovar dialog
  const [reprovarAlvo, setReprovarAlvo] = useState<number[] | null>(null);
  const [motivo, setMotivo] = useState('');

  // Aprovar lote confirm
  const [aprovarLoteConfirm, setAprovarLoteConfirm] = useState<number[] | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(0);

  const pendentes = useMemo(() => rows.filter(r => r.status === 'pendente'), [rows]);
  const historico = useMemo(
    () => rows
      .filter(r => (r.status === 'aprovado' || r.status === 'reprovado') && r.aprovado_por)
      .sort((a, b) => (b.aprovado_em ?? '').localeCompare(a.aprovado_em ?? '')),
    [rows],
  );

  // KPIs
  const inicioMes = useMemo(() => {
    const d = new Date();
    d.setDate(1); d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);
  const aprovadosMes = rows.filter(r =>
    r.status === 'aprovado' && r.aprovado_por && r.aprovado_em &&
    new Date(r.aprovado_em).getTime() >= inicioMes,
  ).length;
  const reprovadosMes = rows.filter(r =>
    r.status === 'reprovado' && r.aprovado_por && r.aprovado_em &&
    new Date(r.aprovado_em).getTime() >= inicioMes,
  ).length;

  const idsPageAtual = useMemo(
    () => pendentes.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(r => r.id),
    [pendentes, page],
  );
  const allSelectedInPage = idsPageAtual.length > 0 && idsPageAtual.every(id => selecionados.has(id));

  const toggleAll = () => {
    setSelecionados(prev => {
      const next = new Set(prev);
      if (allSelectedInPage) idsPageAtual.forEach(id => next.delete(id));
      else idsPageAtual.forEach(id => next.add(id));
      return next;
    });
  };

  const toggleOne = (id: number) => {
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  async function executarDecisao(ids: number[], decisao: 'aprovado' | 'reprovado', motivoTxt: string | null) {
    if (ids.length === 0) return;
    setSubmitting(true);
    const res = await decidirLancamentos(ids, decisao, motivoTxt);
    setSubmitting(false);
    if (!res.ok) {
      toast({ title: 'Erro', description: res.erro ?? 'Falha ao registrar decisão.', variant: 'destructive' });
      return;
    }
    const label = decisao === 'aprovado' ? 'aprovado(s)' : 'reprovado(s)';
    toast({ title: 'Sucesso', description: `${res.afetados ?? ids.length} lançamento(s) ${label}.` });
    setSelecionados(new Set());
    setReprovarAlvo(null);
    setMotivo('');
    setAprovarLoteConfirm(null);
    setDetalhe(null);
    reload();
  }

  const pagedPendentes = pendentes.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPagesPend = Math.max(1, Math.ceil(pendentes.length / PAGE_SIZE));

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="APROVAÇÃO DE SUSTENTABILIDADE" icon={<ClipboardCheck className="h-5 w-5 text-primary-foreground" />} />
      <p className="text-sm text-muted-foreground -mt-4">Fila de aprovação dos lançamentos mensais das obras</p>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="Pendentes" value={pendentes.length.toLocaleString('pt-BR')} iconColor="blueSlate" />
        <KpiCard label="Aprovados no mês" value={aprovadosMes.toLocaleString('pt-BR')} iconColor="sageGreen" />
        <KpiCard label="Reprovados no mês" value={reprovadosMes.toLocaleString('pt-BR')} iconColor="red" />
      </div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v as any); setPage(0); }}>
        <TabsList>
          <TabsTrigger value="pendentes">Pendentes ({pendentes.length})</TabsTrigger>
          <TabsTrigger value="historico">Histórico ({historico.length})</TabsTrigger>
        </TabsList>

        {/* Pendentes */}
        <TabsContent value="pendentes" className="space-y-3">
          {selecionados.size > 0 && (
            <div className="flex items-center justify-between bg-primary/5 border border-primary/30 rounded-lg px-4 py-2.5">
              <span className="text-sm">{selecionados.size} lançamento(s) selecionado(s)</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={submitting}
                  onClick={() => setAprovarLoteConfirm(Array.from(selecionados))}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Aprovar selecionados ({selecionados.size})
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={submitting}
                  onClick={() => setReprovarAlvo(Array.from(selecionados))}
                >
                  <XCircle className="h-4 w-4 mr-1" /> Reprovar selecionados ({selecionados.size})
                </Button>
              </div>
            </div>
          )}

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-muted-foreground text-xs uppercase">
                  <th className="px-3 py-2 w-[40px]">
                    <Checkbox checked={allSelectedInPage} onCheckedChange={toggleAll} />
                  </th>
                  <th className="text-left px-3 py-2">Obra</th>
                  <th className="text-left px-3 py-2 w-[100px]">Mês</th>
                  <th className="text-left px-3 py-2">Lançado por</th>
                  <th className="text-right px-3 py-2 w-[120px]">Água (m³)</th>
                  <th className="text-right px-3 py-2 w-[130px]">Energia (kWh)</th>
                  <th className="text-right px-3 py-2 w-[110px]">Colab.</th>
                  <th className="text-right px-3 py-2 w-[200px]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin inline" />
                  </td></tr>
                )}
                {!loading && error && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-red-600">
                    Erro ao carregar: {error.message}
                  </td></tr>
                )}
                {!loading && !error && pagedPendentes.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    Nenhum lançamento pendente
                  </td></tr>
                )}
                {!loading && pagedPendentes.map(r => (
                  <tr
                    key={r.id}
                    className="border-b border-border/50 hover:bg-primary/5 cursor-pointer"
                    onClick={() => setDetalhe(r)}
                  >
                    <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={selecionados.has(r.id)}
                        onCheckedChange={() => toggleOne(r.id)}
                      />
                    </td>
                    <td className="px-3 py-2 font-medium">{r.cost_collector ?? '—'}</td>
                    <td className="px-3 py-2 text-xs tabular-nums">{formatMes(r.mes_referencia)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{r.email_obra ?? '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtNum(r.agua_m3)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtNum(r.energia_kwh)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.num_colaboradores ?? '—'}</td>
                    <td className="px-3 py-2 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2"
                          disabled={submitting}
                          onClick={() => executarDecisao([r.id], 'aprovado', null)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 px-2"
                          disabled={submitting}
                          onClick={() => setReprovarAlvo([r.id])}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Reprovar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && pendentes.length > PAGE_SIZE && (
              <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs">
                <span className="text-muted-foreground">
                  {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, pendentes.length)} de {pendentes.length}
                </span>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                  <Button size="sm" variant="outline" disabled={page >= totalPagesPend - 1} onClick={() => setPage(p => p + 1)}>Próxima</Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Histórico */}
        <TabsContent value="historico">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-muted-foreground text-xs uppercase">
                  <th className="text-left px-3 py-2">Obra</th>
                  <th className="text-left px-3 py-2 w-[100px]">Mês</th>
                  <th className="text-left px-3 py-2 w-[120px]">Decisão</th>
                  <th className="text-left px-3 py-2">Quem decidiu</th>
                  <th className="text-left px-3 py-2 w-[160px]">Quando</th>
                  <th className="text-left px-3 py-2">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin inline" />
                  </td></tr>
                )}
                {!loading && historico.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    Sem decisões registradas
                  </td></tr>
                )}
                {!loading && historico.map(r => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-primary/5 cursor-pointer" onClick={() => setDetalhe(r)}>
                    <td className="px-3 py-2 font-medium">{r.cost_collector ?? '—'}</td>
                    <td className="px-3 py-2 text-xs tabular-nums">{formatMes(r.mes_referencia)}</td>
                    <td className="px-3 py-2"><DecisaoBadge v={r.status} /></td>
                    <td className="px-3 py-2 text-xs">{r.aprovado_por_nome ?? '—'}</td>
                    <td className="px-3 py-2 text-xs tabular-nums">{formatDataHora(r.aprovado_em)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{r.motivo_reprovacao ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal Detalhe */}
      <Dialog open={!!detalhe} onOpenChange={o => !o && setDetalhe(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhe do lançamento</DialogTitle>
          </DialogHeader>
          {detalhe && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div><span className="text-muted-foreground">Obra:</span> <b>{detalhe.cost_collector ?? '—'}</b></div>
                <div><span className="text-muted-foreground">Mês:</span> {formatMes(detalhe.mes_referencia)}</div>
                <div><span className="text-muted-foreground">Status:</span> <DecisaoBadge v={detalhe.status} /></div>
                <div><span className="text-muted-foreground">Etapa:</span> {detalhe.etapa_obra ?? '—'}</div>
                <div><span className="text-muted-foreground">Colaboradores:</span> {detalhe.num_colaboradores ?? '—'}</div>
                <div><span className="text-muted-foreground">Origem:</span> {detalhe.origem ?? '—'}</div>
                <div className="col-span-2 sm:col-span-3"><span className="text-muted-foreground">Lançado por:</span> {detalhe.email_obra ?? '—'} — {formatDataHora(detalhe.created_at)}</div>
                {detalhe.aprovado_por_nome && (
                  <div className="col-span-2 sm:col-span-3">
                    <span className="text-muted-foreground">Decidido por:</span> {detalhe.aprovado_por_nome} em {formatDataHora(detalhe.aprovado_em)}
                    {detalhe.motivo_reprovacao ? <> — <i>{detalhe.motivo_reprovacao}</i></> : null}
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Consumos</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Água (m³):</span> {fmtNum(detalhe.agua_m3)}</div>
                  <div><span className="text-muted-foreground">Energia (kWh):</span> {fmtNum(detalhe.energia_kwh)}</div>
                  <div><span className="text-muted-foreground">Diesel gerador 1 (L):</span> {fmtNum(detalhe.diesel_gerador1_l)}</div>
                  <div><span className="text-muted-foreground">Diesel gerador 2 (L):</span> {fmtNum(detalhe.diesel_gerador2_l)}</div>
                  <div><span className="text-muted-foreground">Diesel gerador 3 (L):</span> {fmtNum(detalhe.diesel_gerador3_l)}</div>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Resíduos (m³/caçamba)</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Entulho limpo:</span> {fmtNum(detalhe.entulho_limpo_cacamba)}</div>
                  <div><span className="text-muted-foreground">Madeira:</span> {fmtNum(detalhe.madeira_cacamba)}</div>
                  <div><span className="text-muted-foreground">Gesso:</span> {fmtNum(detalhe.gesso_cacamba)}</div>
                  <div><span className="text-muted-foreground">Classe C:</span> {fmtNum(detalhe.classe_c_cacamba)}</div>
                  <div><span className="text-muted-foreground">Recicláveis (bag):</span> {fmtNum(detalhe.reciclaveis_bag)}</div>
                  <div><span className="text-muted-foreground">Misto:</span> {fmtNum(detalhe.misto_cacamba)}</div>
                  <div><span className="text-muted-foreground">Perigoso:</span> {fmtNum(detalhe.perigoso_cacamba)}</div>
                  <div><span className="text-muted-foreground">Sucata:</span> {fmtNum(detalhe.sucata_cacamba)}</div>
                  <div><span className="text-muted-foreground">Solo/terra:</span> {fmtNum(detalhe.solo_terra_m3)}</div>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Anexos (validação)</div>
                {(detalhe.anexo_agua_url || detalhe.anexo_energia_url || detalhe.anexo_coletas_url) ? (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {detalhe.anexo_agua_url && (
                      <a href={detalhe.anexo_agua_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 border border-border rounded-md hover:bg-muted">
                        <Paperclip className="h-3 w-3" /> Conta de água
                      </a>
                    )}
                    {detalhe.anexo_energia_url && (
                      <a href={detalhe.anexo_energia_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 border border-border rounded-md hover:bg-muted">
                        <Paperclip className="h-3 w-3" /> Conta de energia
                      </a>
                    )}
                    {detalhe.anexo_coletas_url && (
                      <a href={detalhe.anexo_coletas_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 border border-border rounded-md hover:bg-muted">
                        <Paperclip className="h-3 w-3" /> Relatório de coletas
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhum anexo enviado.</p>
                )}
              </div>

              {detalhe.status === 'pendente' && (
                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    variant="destructive"
                    disabled={submitting}
                    onClick={() => setReprovarAlvo([detalhe.id])}
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Reprovar
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={submitting}
                    onClick={() => executarDecisao([detalhe.id], 'aprovado', null)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Aprovar
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reprovar dialog */}
      <Dialog open={!!reprovarAlvo} onOpenChange={o => { if (!o) { setReprovarAlvo(null); setMotivo(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reprovar {reprovarAlvo?.length ?? 0} lançamento(s)</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Motivo (opcional)</label>
            <Textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Descreva brevemente o motivo da reprovação..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReprovarAlvo(null); setMotivo(''); }}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={submitting}
              onClick={() => reprovarAlvo && executarDecisao(reprovarAlvo, 'reprovado', motivo.trim() || null)}
            >
              {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
              Confirmar reprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Aprovar lote confirm */}
      <Dialog open={!!aprovarLoteConfirm} onOpenChange={o => !o && setAprovarLoteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Aprovar {aprovarLoteConfirm?.length ?? 0} lançamento(s)?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Essa ação registra a aprovação em lote. Não pode ser desfeita pela tela.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAprovarLoteConfirm(null)}>Cancelar</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={submitting}
              onClick={() => aprovarLoteConfirm && executarDecisao(aprovarLoteConfirm, 'aprovado', null)}
            >
              {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
