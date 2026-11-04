import { useMemo, useState, useEffect } from 'react';
import { TrendingUp, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/useAuthStore';
import { GerenciarIndicadoresModal } from '@/components/indicadores/GerenciarIndicadoresModal';
import { PageHeader } from '@/components/PageHeader';
import { useIndicadores } from '@/hooks/useIndicadores';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

const MES_LABELS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function fmtMesAno(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  return `${MES_LABELS[(m ?? 1) - 1]}/${String(y).slice(2)}`;
}

function fmtValorAbs(v: number | null | undefined): string {
  if (v == null || !isFinite(Number(v))) return '—';
  return Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

function fmtPct(v: number | null | undefined): string {
  if (v == null || !isFinite(Number(v))) return '—';
  const sinal = v > 0 ? '+' : '';
  return `${sinal}${v.toFixed(2).replace('.', ',')}%`;
}

function toDateInput(iso: string): string { return iso.slice(0, 10); }

export default function IndicadoresMercadoPage() {
  const { def, valores, loading, reload } = useIndicadores();
  const user = useAuthStore(s => s.user);
  const isAdmin = (user?.nivel ?? 99) <= 1;
  const [adminOpen, setAdminOpen] = useState(false);

  // Meses únicos ordenados
  const mesesTodos = useMemo(() => {
    const set = new Set(valores.map(v => v.data_ref.slice(0, 10)));
    return Array.from(set).sort();
  }, [valores]);

  const [dataDe, setDataDe] = useState<string>('');
  const [dataAte, setDataAte] = useState<string>('');
  useEffect(() => {
    if (mesesTodos.length && !dataDe && !dataAte) {
      const hoje = new Date();
      const ultimoMesFechado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const dozeMesesAtras = new Date(ultimoMesFechado.getFullYear(), ultimoMesFechado.getMonth() - 11, 1);
      const iso = (d: Date) => d.toISOString().slice(0, 10);
      const alvoDe = iso(dozeMesesAtras);
      const alvoAte = iso(ultimoMesFechado);
      const dentro = mesesTodos.filter(m => m >= alvoDe && m <= alvoAte);
      if (dentro.length) {
        setDataDe(dentro[0]);
        setDataAte(dentro[dentro.length - 1]);
      } else {
        setDataDe(mesesTodos[0]);
        setDataAte(mesesTodos[mesesTodos.length - 1]);
      }
    }
  }, [mesesTodos, dataDe, dataAte]);

  const [ativos, setAtivos] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (def.length && ativos.size === 0) setAtivos(new Set(def.map(d => d.indicador)));
  }, [def]);

  const mesesPeriodo = useMemo(
    () => mesesTodos.filter(m => (!dataDe || m >= dataDe) && (!dataAte || m <= dataAte)),
    [mesesTodos, dataDe, dataAte]
  );

  // Variação ACUMULADA por indicador com rebase no primeiro mês do período que tem dado
  const variacaoPorInd = useMemo(() => {
    const map: Record<string, Record<string, number | null>> = {};
    for (const d of def) {
      const serieNoPeriodo = valores
        .filter(v => v.indicador === d.indicador)
        .map(v => ({ key: v.data_ref.slice(0, 10), valor: Number(v.valor) }))
        .filter(x => mesesPeriodo.includes(x.key))
        .sort((a, b) => a.key.localeCompare(b.key));
      const inner: Record<string, number | null> = {};
      const base = serieNoPeriodo.find(x => isFinite(x.valor) && x.valor !== 0);
      if (base) {
        for (const x of serieNoPeriodo) {
          inner[x.key] = isFinite(x.valor) ? (x.valor / base.valor - 1) * 100 : null;
        }
      }
      map[d.indicador] = inner;
    }
    return map;
  }, [def, valores, mesesPeriodo]);

  // Valor absoluto por indicador
  const valorPorInd = useMemo(() => {
    const map: Record<string, Record<string, number | null>> = {};
    for (const v of valores) {
      const k = v.data_ref.slice(0, 10);
      if (!map[v.indicador]) map[v.indicador] = {};
      map[v.indicador][k] = Number(v.valor);
    }
    return map;
  }, [valores]);

  // Dados do gráfico
  const chartData = useMemo(() => {
    return mesesPeriodo.map(m => {
      const row: Record<string, any> = { data_ref: m, mes: fmtMesAno(m) };
      for (const d of def) {
        row[d.indicador] = variacaoPorInd[d.indicador]?.[m] ?? null;
      }
      return row;
    });
  }, [mesesPeriodo, def, variacaoPorInd]);

  const toggleInd = (ind: string) => {
    const next = new Set(ativos);
    if (next.has(ind)) next.delete(ind);
    else next.add(ind);
    setAtivos(next);
  };

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <PageHeader title="INDICADORES DE MERCADO" icon={<TrendingUp className="h-5 w-5 text-primary-foreground" />} />
          <p className="text-xs text-muted-foreground mt-1">Acompanhamento de mercado — variação acumulada (%) no período</p>
        </div>
        {isAdmin && (
          <Button size="sm" variant="outline" onClick={() => setAdminOpen(true)}>
            <Settings className="h-4 w-4 mr-1" /> Gerenciar dados
          </Button>
        )}
      </div>

      {isAdmin && (
        <GerenciarIndicadoresModal
          open={adminOpen}
          onOpenChange={setAdminOpen}
          def={def}
          valores={valores}
          onSaved={reload}
        />
      )}

      {/* Filtros */}
      <div className="filter-bar">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium">Data:</span>
          <label className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground">De</span>
            <input
              type="date"
              value={dataDe}
              min={mesesTodos[0]}
              max={mesesTodos[mesesTodos.length - 1]}
              onChange={e => setDataDe(e.target.value)}
              className="px-2 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
          <label className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground">Até</span>
            <input
              type="date"
              value={dataAte}
              min={dataDe || mesesTodos[0]}
              max={mesesTodos[mesesTodos.length - 1]}
              onChange={e => setDataAte(e.target.value)}
              className="px-2 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
        </div>
      </div>

      {/* Card gráfico */}
      <div className="rounded-lg border border-border bg-card shadow-sm p-6 space-y-6">
        <h3 className="title-style text-lg text-center">Acompanhamento de mercado</h3>

        {loading ? (
          <Skeleton className="h-[420px] w-full" />
        ) : (
          <div className="h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 24, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                  label={{ value: 'Variação', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#5D7A9A' } }}
                />
                <Tooltip
                  formatter={(v: any, name: string) => {
                    const d = def.find(x => x.indicador === name);
                    return [fmtPct(v as number | null), d?.label ?? name];
                  }}
                  labelFormatter={(l) => `Mês: ${l}`}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                {def.filter(d => ativos.has(d.indicador)).map(d => (
                  <Line
                    key={d.indicador}
                    type="monotone"
                    dataKey={d.indicador}
                    name={d.indicador}
                    stroke={d.cor}
                    strokeWidth={d.base ? 4 : 2}
                    dot={{ r: 2.5 }}
                    activeDot={{ r: 4 }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Botões seletores */}
        <div className="flex flex-wrap gap-2 justify-center">
          {def.map(d => {
            const on = ativos.has(d.indicador);
            return (
              <button
                key={d.indicador}
                type="button"
                onClick={() => toggleInd(d.indicador)}
                className={`flex items-center gap-2 px-3 py-1.5 border rounded-full text-xs transition hover:scale-105 ${
                  on ? 'bg-white border-gray-300' : 'bg-gray-100 border-gray-200 opacity-50'
                }`}
              >
                <span className="w-3 h-3 rounded-sm" style={{ background: on ? d.cor : '#CCCCCC' }} />
                {d.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setAtivos(new Set(def.map(d => d.indicador)))}
            className="px-3 py-1.5 border border-gray-300 rounded-full text-xs bg-white hover:bg-gray-50"
          >Todos</button>
          <button
            type="button"
            onClick={() => setAtivos(new Set())}
            className="px-3 py-1.5 border border-gray-300 rounded-full text-xs bg-white hover:bg-gray-50"
          >Limpar</button>
        </div>

        {/* Tabela valores absolutos */}
        <div className="overflow-auto border border-border rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground sticky left-0 bg-muted/50">Indicador</th>
                {mesesPeriodo.map(m => (
                  <th key={m} className="text-right px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">{fmtMesAno(m)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {def.map(d => (
                <tr key={d.indicador} className="border-t border-border">
                  <td className="px-3 py-2 sticky left-0 bg-card">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: d.cor }} />
                      <span className={d.base ? 'font-semibold' : ''}>{d.label}</span>
                    </span>
                  </td>
                  {mesesPeriodo.map(m => (
                    <td key={m} className="text-right px-3 py-2 tabular-nums whitespace-nowrap">
                      {fmtValorAbs(valorPorInd[d.indicador]?.[m] ?? null)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-muted-foreground text-center">
          Dólar atualizado automaticamente pelo Banco Central (BCB/SGS) — média mensal. Demais indicadores em carga manual.
        </p>
      </div>
    </div>
  );
}
