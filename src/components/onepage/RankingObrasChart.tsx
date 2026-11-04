import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LabelList,
} from 'recharts';
import { EyeOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useRankingObrasPorTipo } from '@/hooks/useOneCharts';
import type { OneChartFilters } from '@/services/onepageService';
import {
  TIPO_COLORS,
  TIPO_LABELS,
  TiposContratacaoToggle,
  type TipoContratacao,
} from './TiposContratacaoToggle';

const BAR_WIDTH = 100;
const MIN_WIDTH = 600;

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtMi = (v: number) =>
  v >= 1_000_000
    ? `R$ ${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000
    ? `R$ ${(v / 1_000).toFixed(0)}k`
    : `R$ ${v}`;

const makeTooltip =
  (ativos: TipoContratacao[]) =>
  ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const supV = ativos.includes('SUP') ? payload.find((p: any) => p.dataKey === 'sup')?.value ?? 0 : 0;
    const pdV  = ativos.includes('PD')  ? payload.find((p: any) => p.dataKey === 'pd')?.value  ?? 0 : 0;
    const apV  = ativos.includes('AP')  ? payload.find((p: any) => p.dataKey === 'ap')?.value  ?? 0 : 0;
    const total = supV + pdV + apV;

    return (
      <div className="bg-popover border border-border rounded shadow p-2 text-sm text-popover-foreground">
        <p className="font-semibold mb-1">{label}</p>
        {ativos.includes('SUP') && (
          <p>
            <span className="inline-block w-2 h-2 rounded-sm shrink-0 mr-2 align-middle" style={{ background: TIPO_COLORS.SUP }} />
            {TIPO_LABELS.SUP}: R$ {fmtBRL(supV)}
          </p>
        )}
        {ativos.includes('PD') && (
          <p>
            <span className="inline-block w-2 h-2 rounded-sm shrink-0 mr-2 align-middle" style={{ background: TIPO_COLORS.PD }} />
            {TIPO_LABELS.PD}: R$ {fmtBRL(pdV)}
          </p>
        )}
        {ativos.includes('AP') && (
          <p>
            <span className="inline-block w-2 h-2 rounded-sm shrink-0 mr-2 align-middle" style={{ background: TIPO_COLORS.AP }} />
            {TIPO_LABELS.AP}: R$ {fmtBRL(apV)}
          </p>
        )}
        <p className="font-semibold border-t border-border pt-1 mt-1">
          Total: R$ {fmtBRL(total)}
        </p>
      </div>
    );
  };

interface Props {
  filters: OneChartFilters;
  tiposAtivos: TipoContratacao[];
  onToggleTipo: (tipo: TipoContratacao) => void;
}

export function RankingObrasChart({ filters, tiposAtivos, onToggleTipo }: Props) {
  const { data, loading } = useRankingObrasPorTipo(filters);
  const allRows = useMemo(
    () =>
      (data ?? []).map((r: any) => ({
        ...r,
        total: (r.sup ?? 0) + (r.pd ?? 0) + (r.ap ?? 0),
      })),
    [data],
  );

  const [obrasOcultas, setObrasOcultas] = useState<Set<string>>(new Set());
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuAberto) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAberto(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuAberto]);

  const rows = useMemo(
    () => allRows.filter((r: any) => !obrasOcultas.has(r.obra)),
    [allRows, obrasOcultas],
  );

  const toggleObra = (obra: string) => {
    setObrasOcultas((prev) => {
      const next = new Set(prev);
      if (next.has(obra)) next.delete(obra);
      else next.add(obra);
      return next;
    });
  };

  const topStackKey: 'sup' | 'pd' | 'ap' | null = tiposAtivos.includes('AP')
    ? 'ap'
    : tiposAtivos.includes('PD')
    ? 'pd'
    : tiposAtivos.includes('SUP')
    ? 'sup'
    : null;

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <h3 className="title-style text-base">
            Ranking de Obras por Tipo de Contratação
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            Distribuição dos valores contratados por tipo (SUP / PD / AP) em cada obra.
            Role para o lado para ver mais obras.
          </p>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuAberto((v) => !v)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border border-border bg-card hover:bg-muted transition-colors"
          >
            <EyeOff className="h-3.5 w-3.5" />
            Obras
            {obrasOcultas.size > 0 && (
              <span className="ml-1 text-muted-foreground">({obrasOcultas.size} ocultas)</span>
            )}
          </button>
          {menuAberto && (
            <div className="absolute right-0 top-full mt-1 z-20 w-64 max-h-72 overflow-y-auto rounded-md border border-border bg-popover shadow-lg p-2">
              <div className="flex items-center justify-between px-1 pb-2 border-b border-border mb-1">
                <span className="text-[11px] uppercase text-muted-foreground">Obras visíveis</span>
                {obrasOcultas.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setObrasOcultas(new Set())}
                    className="text-[11px] text-primary hover:underline"
                  >
                    Mostrar todas
                  </button>
                )}
              </div>
              {allRows.map((r: any) => {
                const visivel = !obrasOcultas.has(r.obra);
                return (
                  <label
                    key={r.obra}
                    className="flex items-center gap-2 px-1 py-1 text-xs rounded hover:bg-muted cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={visivel}
                      onChange={() => toggleObra(r.obra)}
                    />
                    <span className="truncate" title={r.obra}>{r.obra}</span>
                  </label>
                );
              })}
              {allRows.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-2">Sem obras</div>
              )}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-[320px] w-full" />
      ) : rows.length === 0 ? (
        <div className="h-[320px] flex items-center justify-center text-sm text-muted-foreground">
          {allRows.length === 0 ? 'Sem dados' : 'Todas as obras estão ocultas'}
        </div>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div
            style={{
              width: Math.max(MIN_WIDTH, rows.length * BAR_WIDTH),
              height: 320,
              margin: '0 auto',
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rows}
                margin={{ top: 24, right: 20, bottom: 80, left: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="obra"
                  angle={-45}
                  textAnchor="end"
                  height={90}
                  interval={0}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v: string) =>
                    v && v.length > 18 ? v.slice(0, 16) + '…' : v
                  }
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v: number) => `R$ ${(v / 1_000_000).toFixed(1)}M`}
                />
                <Tooltip
                  content={makeTooltip(tiposAtivos)}
                  cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
                />
                {tiposAtivos.includes('SUP') && (
                  <Bar dataKey="sup" stackId="tipo" fill={TIPO_COLORS.SUP} name={TIPO_LABELS.SUP}>
                    {topStackKey === 'sup' && (
                      <LabelList
                        dataKey="total"
                        position="top"
                        formatter={(v: number) => (v > 0 ? fmtMi(v) : '')}
                        style={{ fontSize: 10, fill: '#111' }}
                      />
                    )}
                  </Bar>
                )}
                {tiposAtivos.includes('PD') && (
                  <Bar dataKey="pd" stackId="tipo" fill={TIPO_COLORS.PD} name={TIPO_LABELS.PD}>
                    {topStackKey === 'pd' && (
                      <LabelList
                        dataKey="total"
                        position="top"
                        formatter={(v: number) => (v > 0 ? fmtMi(v) : '')}
                        style={{ fontSize: 10, fill: '#111' }}
                      />
                    )}
                  </Bar>
                )}
                {tiposAtivos.includes('AP') && (
                  <Bar dataKey="ap" stackId="tipo" fill={TIPO_COLORS.AP} name={TIPO_LABELS.AP}>
                    {topStackKey === 'ap' && (
                      <LabelList
                        dataKey="total"
                        position="top"
                        formatter={(v: number) => (v > 0 ? fmtMi(v) : '')}
                        style={{ fontSize: 10, fill: '#111' }}
                      />
                    )}
                  </Bar>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="pt-3">
        <TiposContratacaoToggle ativos={tiposAtivos} onToggle={onToggleTipo} />
      </div>
    </div>
  );
}

export default RankingObrasChart;
