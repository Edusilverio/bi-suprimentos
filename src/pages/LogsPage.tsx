import { useMemo, useState } from 'react';
import { ScrollText, Loader2, Eye } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { KpiCard } from '@/components/KpiCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useLogsIngestao } from '@/hooks/useLogsIngestao';
import type { LogIngestaoRow } from '@/services/logsService';

const PAGE_SIZE = 20;

function formatDataHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (!isFinite(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function ResultadoBadge({ v }: { v: string | null }) {
  const isOk = (v ?? '').toLowerCase() === 'ok';
  const isErro = (v ?? '').toLowerCase() === 'erro';
  return (
    <Badge
      className={cn(
        'text-[10px] px-1.5 py-0 h-5 rounded font-medium',
        isOk    && 'bg-emerald-100 text-emerald-800 border-emerald-200',
        isErro  && 'bg-red-100 text-red-800 border-red-200',
        !isOk && !isErro && 'bg-muted text-muted-foreground border-border',
      )}
    >
      {v ?? '—'}
    </Badge>
  );
}

export default function LogsPage() {
  const { rows, loading, error } = useLogsIngestao();

  const [fUsuario, setFUsuario] = useState<string>('__all');
  const [fAcao, setFAcao] = useState<string>('__all');
  const [fResultado, setFResultado] = useState<string>('__all');
  const [fDe, setFDe] = useState<string>('');
  const [fAte, setFAte] = useState<string>('');
  const [busca, setBusca] = useState('');
  const [page, setPage] = useState(0);
  const [detalheAlvo, setDetalheAlvo] = useState<LogIngestaoRow | null>(null);

  const opcoesUsuario = useMemo(
    () => Array.from(new Set(rows.map(r => r.usuario_nome).filter(Boolean) as string[])).sort(),
    [rows],
  );
  const opcoesAcao = useMemo(
    () => Array.from(new Set(rows.map(r => r.acao).filter(Boolean) as string[])).sort(),
    [rows],
  );
  const opcoesResultado = useMemo(
    () => Array.from(new Set(rows.map(r => r.resultado).filter(Boolean) as string[])).sort(),
    [rows],
  );

  const filtrados = useMemo(() => {
    const deTs = fDe ? new Date(fDe + 'T00:00:00').getTime() : null;
    const ateTs = fAte ? new Date(fAte + 'T23:59:59').getTime() : null;
    const q = busca.trim().toLowerCase();
    return rows.filter(r => {
      if (fUsuario !== '__all' && r.usuario_nome !== fUsuario) return false;
      if (fAcao !== '__all' && r.acao !== fAcao) return false;
      if (fResultado !== '__all' && r.resultado !== fResultado) return false;
      if (deTs || ateTs) {
        const t = r.created_at ? new Date(r.created_at).getTime() : 0;
        if (deTs && t < deTs) return false;
        if (ateTs && t > ateTs) return false;
      }
      if (q) {
        const hay = `${r.usuario_nome ?? ''} ${r.acao ?? ''} ${r.entidade ?? ''} ${r.referencia ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, fUsuario, fAcao, fResultado, fDe, fAte, busca]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const paged = filtrados.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // KPIs
  const hojeStr = new Date().toDateString();
  const hoje = rows.filter(r => r.created_at && new Date(r.created_at).toDateString() === hojeStr);
  const usuariosHoje = new Set(hoje.map(r => r.usuario_nome).filter(Boolean)).size;
  const totalErros = rows.filter(r => (r.resultado ?? '').toLowerCase() === 'erro').length;

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="LOGS DE INGESTÃO" icon={<ScrollText className="h-5 w-5 text-primary-foreground" />} />
      <p className="text-sm text-muted-foreground -mt-4">Auditoria de ingestões e ações de dados</p>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="Total de ingestões" value={rows.length.toLocaleString('pt-BR')} iconColor="blueSlate" />
        <KpiCard label="Erros" value={totalErros.toLocaleString('pt-BR')} iconColor="red" />
        <KpiCard label="Usuários ativos hoje" value={usuariosHoje.toLocaleString('pt-BR')} iconColor="sageGreen" />
      </div>

      {/* Filtros */}
      <div className="bg-card border border-border rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Usuário</label>
          <Select value={fUsuario} onValueChange={v => { setFUsuario(v); setPage(0); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos</SelectItem>
              {opcoesUsuario.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Ação</label>
          <Select value={fAcao} onValueChange={v => { setFAcao(v); setPage(0); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todas</SelectItem>
              {opcoesAcao.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Resultado</label>
          <Select value={fResultado} onValueChange={v => { setFResultado(v); setPage(0); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos</SelectItem>
              {opcoesResultado.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">De</label>
          <Input type="date" value={fDe} onChange={e => { setFDe(e.target.value); setPage(0); }} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Até</label>
          <Input type="date" value={fAte} onChange={e => { setFAte(e.target.value); setPage(0); }} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Buscar</label>
          <Input value={busca} onChange={e => { setBusca(e.target.value); setPage(0); }} placeholder="Referência, ação…" />
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-muted-foreground text-xs uppercase">
              <th className="text-left px-4 py-2 w-[180px]">Data/Hora</th>
              <th className="text-left px-4 py-2">Usuário</th>
              <th className="text-left px-4 py-2">Ação</th>
              <th className="text-left px-4 py-2">Entidade</th>
              <th className="text-left px-4 py-2">Referência</th>
              <th className="text-left px-4 py-2 w-[100px]">Resultado</th>
              <th className="text-right px-4 py-2 w-[80px]">Detalhe</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin inline" />
              </td></tr>
            )}
            {!loading && error && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-red-600">
                Erro ao carregar logs: {error.message}
              </td></tr>
            )}
            {!loading && !error && paged.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Nenhum log encontrado</td></tr>
            )}
            {!loading && paged.map((r, i) => (
              <tr
                key={(r.id ?? '') + i}
                className="border-b border-border/50 hover:bg-primary/5"
              >
                <td className="px-4 py-2 tabular-nums text-xs">{formatDataHora(r.created_at)}</td>
                <td className="px-4 py-2">{r.usuario_nome ?? '—'}</td>
                <td className="px-4 py-2">{r.acao ?? '—'}</td>
                <td className="px-4 py-2 text-muted-foreground">{r.entidade ?? '—'}</td>
                <td className="px-4 py-2 text-muted-foreground">{r.referencia ?? '—'}</td>
                <td className="px-4 py-2"><ResultadoBadge v={r.resultado} /></td>
                <td className="px-4 py-2 text-right">
                  <Button size="icon" variant="ghost" onClick={() => setDetalheAlvo(r)} title="Ver detalhe">
                    <Eye className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtrados.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs">
            <span className="text-muted-foreground">
              {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, filtrados.length)} de {filtrados.length}
            </span>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próxima</Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal detalhe */}
      <Dialog open={!!detalheAlvo} onOpenChange={o => !o && setDetalheAlvo(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhe da ingestão</DialogTitle>
          </DialogHeader>
          {detalheAlvo && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Data:</span> {formatDataHora(detalheAlvo.created_at)}</div>
                <div><span className="text-muted-foreground">Usuário:</span> {detalheAlvo.usuario_nome ?? '—'}</div>
                <div><span className="text-muted-foreground">Ação:</span> {detalheAlvo.acao ?? '—'}</div>
                <div><span className="text-muted-foreground">Entidade:</span> {detalheAlvo.entidade ?? '—'}</div>
                <div><span className="text-muted-foreground">Referência:</span> {detalheAlvo.referencia ?? '—'}</div>
                <div><span className="text-muted-foreground">Resultado:</span> <ResultadoBadge v={detalheAlvo.resultado} /></div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">detalhe (JSON)</div>
                <pre className="bg-muted rounded p-3 text-[11px] overflow-x-auto whitespace-pre-wrap break-all">
{JSON.stringify(detalheAlvo.detalhe, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
