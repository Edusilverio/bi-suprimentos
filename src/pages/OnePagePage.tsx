import { useEffect, useRef, useState } from 'react';
import { BarChart3, DollarSign, FileText, Activity, PenTool, CheckSquare, CheckCheck, CheckCircle, FileCheck, User, Package, Calendar, Download } from 'lucide-react';
import { exportarRelatorio } from '@/lib/exportRelatorio';
import { PageHeader } from '@/components/PageHeader';
import { ComboChart } from '@/components/ComboChart';
import {
  monthlyData,
  percentualContratado,
  proximasContratacoes,
  ultimasContratacoes,
  savingData,
  contratosStatusMock,
} from '@/mocks/charts';
import { mockFornecedores } from '@/mocks/fornecedores';
import {
  useOnepageKpis,
  useSpendMensal,
  useTopFornecedores,
  useUltimasContratacoes,
  useProximasContratacoes,
} from '@/hooks/useOnepage';
import { useOneKpis } from '@/hooks/useOneKpis';
import { useUltimasContratacoes as useOneUltimasContratacoes, useContratosTabela } from '@/hooks/useOneTables';
import { EmConstrucaoTag } from '@/components/EmConstrucaoTag';
import { DebugTooltip } from '@/components/DebugTooltip';
import { TabelaExpansivel } from '@/components/TabelaExpansivel';
import { buildFilterStrings } from '@/lib/debugFilters';
import { useAuthStore } from '@/stores/useAuthStore';
import { useFilterStore } from '@/stores/useFilterStore';
import { useFilterOptions } from '@/hooks/useFilterOptions';
import { useAnalystFilter } from '@/hooks/useAnalystFilter';
import { FilterBar } from '@/components/FilterBar';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Line, LabelList,
} from 'recharts';
import {
  useRequisicoesPorMes,
  useSpendMensalChart,
  useTopFornecedoresChart,
} from '@/hooks/useOneCharts';
import { usePercentualContratado } from '@/hooks/usePercentualContratado';
import { DrillDownModal } from '@/components/onepage/DrillDownModal';
import { RankingObrasChart } from '@/components/onepage/RankingObrasChart';
import {
  TiposContratacaoToggle,
  TIPOS_DEFAULT,
  TIPO_DB_VALUE,
  toggleExclusivo,
  type TipoContratacao,
} from '@/components/onepage/TiposContratacaoToggle';
import { KpiCard, type KpiIconColor } from '@/components/KpiCard';

import { Skeleton } from '@/components/ui/skeleton';
import { config } from '@/config/env';
import type { GlobalFilters } from '@/types/domain';
import type { ReactNode } from 'react';

const useMocksFlag = config.useMocks;

/* Paleta cinza / navy para gráficos */
const CHART_BAR_STRONG = '#374151';
const CHART_BAR_MEDIUM = '#6B7280';
const CHART_BAR_LIGHT = '#9CA3AF';
const CHART_LINE_NAVY = '#1B2A4A';

const top15Mock = [...mockFornecedores]
  .sort((a, b) => b.valorTotal - a.valorTotal)
  .map(f => ({ nome: f.nome, valor: Math.round(f.valorTotal / 1000) }));

const fmtCurrency = (v: number) =>
  v != null ? `R$ ${Math.abs(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` : '-';

const fmtCurrencyFull = (v: number) =>
  `R$ ${Number(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatEixoSpend = (v: number): string => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v}`;
};

const fmtCurrencySigned = (v: number) =>
  v != null
    ? `${v < 0 ? '-' : ''}R$ ${Math.abs(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
    : '-';

const TickFornecedor = (props: any) => {
  const { x, y, payload } = props;
  const raw = String(payload?.value ?? '');
  const label = raw.length > 14 ? raw.slice(0, 12) + '…' : raw;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        transform="rotate(-45)"
        textAnchor="end"
        dy={4}
        dx={-4}
        fill="hsl(var(--muted-foreground))"
        fontSize={9}
      >
        <title>{raw}</title>
        {label}
      </text>
    </g>
  );
};

/* ---------- KPI Tile (wrapper sobre KpiCard padrão) ---------- */



function KpiTile({
  label,
  value,
  icon,
  iconColor = 'blue',
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  iconColor?: KpiIconColor;
  accent?: boolean;
}) {
  return (
    <KpiCard
      label={label}
      value={value}
      icon={icon}
      iconColor={iconColor}
      clickable={false}
    />
  );
}

function PanelCard({ title, children, className = '', headerRight }: { title: string; children: ReactNode; className?: string; headerRight?: ReactNode }) {
  return (
    <div className={`bg-card border border-border rounded-lg shadow-sm p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3 gap-2">
        <h3 className="title-style text-base">{title}</h3>
        {headerRight}
      </div>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = (status ?? '').toLowerCase();
  let cls = 'bg-[hsl(var(--badge-neutral-bg))] text-[hsl(var(--badge-neutral-text))]';
  if (s.includes('assinad')) cls = 'bg-[hsl(var(--badge-success-bg))] text-[hsl(var(--badge-success-text))]';
  else if (s.includes('enviado')) cls = 'bg-[hsl(38_92%_90%)] text-[hsl(38_92%_30%)] dark:bg-[hsl(38_60%_20%)] dark:text-[hsl(38_92%_70%)]';
  else if (s.includes('aprovado')) cls = 'bg-[hsl(210_92%_90%)] text-[hsl(210_92%_30%)] dark:bg-[hsl(210_60%_20%)] dark:text-[hsl(210_92%_70%)]';
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${cls}`}>{status}</span>;
}

function MiniTable({
  columns,
  data,
  emptyLabel = 'Sem dados',
}: {
  columns: { key: string; label: string; render?: (row: any) => ReactNode; align?: 'left' | 'right' | 'center' }[];
  data: any[];
  emptyLabel?: string;
}) {
  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-card z-10">
          <tr className="border-b border-border">
            {columns.map(c => (
              <th
                key={c.key}
                className={`py-2 font-medium text-muted-foreground uppercase tracking-wide text-[10px] ${
                  c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left'
                }`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              style={{ backgroundColor: i % 2 ? 'hsl(var(--table-odd))' : 'hsl(var(--table-even))' }}
              className="border-b border-border/40"
            >
              {columns.map(c => (
                <td
                  key={c.key}
                  className={`py-2 px-1 ${
                    c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                >
                  {c.render ? c.render(row) : (row[c.key] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="py-4 text-center text-muted-foreground">
                {emptyLabel}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function PercentualBars({ data }: { data: { categoria: string; contratado: number }[] }) {
  return (
    <div className="space-y-3">
      {data.map((row, i) => (
        <div key={i}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-foreground font-medium">{row.categoria}</span>
            <span className="text-muted-foreground">{row.contratado}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${row.contratado}%`, backgroundColor: CHART_BAR_MEDIUM }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function OnePagePage() {
  const { user } = useAuthStore();

  const reportRef = useRef<HTMLDivElement>(null);

  /* Força light mode enquanto a ONE Page estiver montada */
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    root.classList.remove('dark');
    return () => {
      if (wasDark) root.classList.add('dark');
    };
  }, []);

  const { activeAnalistas, activeObras, activeTipos, activePeriod, setPeriod } = useFilterStore();
  const { analistas: dbAnalistas, obras: dbObras } = useFilterOptions();
  const { nomesVisiveis, obrasHabilitadas } = useAnalystFilter();
  const scope = { nomesVisiveis, obrasHabilitadas };

  /* ONE Page padrão: ano corrente (01/jan do ano atual → hoje).
     Só aplica se o usuário ainda não tiver escolhido período — não sobrescreve seleção. */
  const periodoPadraoOnePage = (): [Date, Date] => {
    const hoje = new Date();
    return [new Date(hoje.getFullYear(), 0, 1), hoje];
  };
  useEffect(() => {
    if (!activePeriod) setPeriod(periodoPadraoOnePage());
  }, [activePeriod, setPeriod]);

  /* Período efetivo já vale na 1ª renderização (evita flash sem filtro) */
  const periodoEfetivo: [Date, Date] = activePeriod ?? periodoPadraoOnePage();
  const dataInicio = periodoEfetivo[0].toISOString().slice(0, 10);
  const dataFim = periodoEfetivo[1].toISOString().slice(0, 10);
  const periodoLabel = `${periodoEfetivo[0].toLocaleDateString('pt-BR')} a ${periodoEfetivo[1].toLocaleDateString('pt-BR')}`;

  const filters: GlobalFilters = { analista: activeAnalistas, obra: activeObras, tipo: activeTipos, periodo: [dataInicio, dataFim] };

  const { data: kpis } = useOnepageKpis(filters, scope);
  const { data: spendData } = useSpendMensal(filters);
  const { data: topFornecedores } = useTopFornecedores(filters);
  const { data: ultimas } = useUltimasContratacoes(filters, 10, scope);
  const { data: proximas } = useProximasContratacoes(filters, 10, scope);

  // === Filtro exclusivo de tipo de contratação (SUP/PD/AP) ===
  const [tiposAtivos, setTiposAtivos] = useState<TipoContratacao[]>(TIPOS_DEFAULT);
  // Debounce: estado "aplicado" às queries só atualiza após 300ms sem cliques
  const [tiposAplicados, setTiposAplicados] = useState<TipoContratacao[]>(TIPOS_DEFAULT);
  useEffect(() => {
    const t = setTimeout(() => setTiposAplicados(tiposAtivos), 300);
    return () => clearTimeout(t);
  }, [tiposAtivos]);
  const handleToggleTipo = (t: TipoContratacao) =>
    setTiposAtivos((prev) => toggleExclusivo(prev, t));

  // Sempre restringe ao universo SUP+PD+AP. Quando os 3 estão ativos,
  // envia os 3 valores; caso contrário, apenas os selecionados.
  const tiposPedidoDb =
    tiposAplicados.length === 3
      ? (Object.values(TIPO_DB_VALUE) as string[])
      : tiposAplicados.map((t) => TIPO_DB_VALUE[t]);

  const { data: oneKpis, loading: oneKpisLoading } = useOneKpis({
    obras: activeObras,
    analistas: activeAnalistas,
    tipos: tiposPedidoDb ?? activeTipos,
    dataInicio,
    dataFim,
    obrasHabilitadas,
  });

  const chartFilters = {
    obras: activeObras,
    analistas: activeAnalistas,
    dataInicio,
    dataFim,
    obrasHabilitadas,
    tipos: tiposPedidoDb,
  };

  const [drillModal, setDrillModal] = useState<{
    tipo: 'spend' | 'requisicoes';
    ano: number;
    mes: number;
    label: string;
  } | null>(null);

  const globalFilterStrings = buildFilterStrings({
    dataInicio,
    dataFim,
    obras: activeObras,
    analistas: activeAnalistas,
  });

  const { data: reqMesData, loading: reqMesLoading } = useRequisicoesPorMes(chartFilters);
  const { data: spendMesData, loading: spendMesLoading } = useSpendMensalChart(chartFilters);
  const { data: top15Data, loading: top15Loading } = useTopFornecedoresChart(chartFilters);
  const { data: percData, loading: percLoading } = usePercentualContratado({ obras: activeObras });

  const top15 = useMocksFlag
    ? top15Mock.map(t => ({ fornecedor: t.nome, contratado: t.valor, executado: t.valor, saldo: 0 }))
    : (top15Data ?? []).map(f => ({
        fornecedor: f.fornecedor,
        contratado: Math.round(f.contratado / 1000),
        executado: Math.round(f.executado / 1000),
        saldo: Math.round(f.saldo / 1000),
      }));

  const reqMesChart = useMocksFlag
    ? monthlyData.map((m: any) => ({ mes: m.month, quantidade: m.requisicoes }))
    : (reqMesData ?? []);

  const spendChartData = useMocksFlag
    ? monthlyData.map((m: any) => ({ mes: m.month, spend: m.spend, processos: m.processosContratados ?? m.requisicoes }))
    : (spendMesData ?? []);


  const proximasData = useMocksFlag
    ? proximasContratacoes
    : (proximas ?? []).map(r => ({ grupo: '-', obra: r.cost_collector ?? '-', reqEntregue: false }));

  const { data: oneUltimas, loading: oneUltimasLoading } = useOneUltimasContratacoes({
    obras: activeObras,
    analistas: activeAnalistas,
    dataInicio,
    dataFim,
    obrasHabilitadas,
    tipos: tiposPedidoDb,
  });
  const { data: oneContratos, loading: oneContratosLoading } = useContratosTabela({
    obras: activeObras,
    analistas: activeAnalistas,
    dataInicio,
    dataFim,
    obrasHabilitadas,
  });

  const ultimasData = useMocksFlag
    ? ultimasContratacoes
    : (oneUltimas ?? []).map(r => ({
        fornecedor: r.fornecedor ?? '-',
        grupo: r.grupo ?? '—',
        obra: r.obra ?? '-',
        valor: r.valor ?? 0,
      }));

  const contratosData = useMocksFlag
    ? contratosStatusMock
    : (oneContratos ?? []).map(r => ({
        fornecedor: r.fornecedor ?? '-',
        grupo: r.grupo ?? '—',
        obra: r.obra ?? '-',
        status: r.status ?? '-',
      }));

  const kpiContratado = oneKpisLoading
    ? null
    : `R$ ${((oneKpis?.contratado ?? 0) / 1e6).toFixed(1)}M`;

  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const obraLabel = activeObras?.length === 1 ? activeObras[0] : 'TODAS_AS_OBRAS';
      const di = dataInicio ?? '';
      const df = dataFim ?? '';
      await exportarRelatorio({
        rota: '/relatorio/gestao-suprimentos',
        queryParams: { obra: obraLabel, dataInicio: di, dataFim: df, modo: 'export' },
        filename: `Gestao_Suprimentos_${obraLabel}_${di}_${df}.pdf`,
        blocos: [
          '.relatorio-cabecalho',
          '.relatorio-kpis',
          '.relatorio-linha-1',
          '.relatorio-linha-2',
          '.relatorio-linha-3',
          '.relatorio-linha-4',
          '.relatorio-linha-5',
        ],
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="GESTÃO DE SUPRIMENTOS"
        icon={<BarChart3 className="h-5 w-5 text-primary-foreground" />}
      />

      {/* Barra de controles (NÃO entra no export) */}
      <div className="filter-bar mb-4">
        {!useMocksFlag ? (
          <div className="flex-1">
            <FilterBar analistas={dbAnalistas} obras={dbObras} />
          </div>
        ) : (
          <>
            <input
              className="px-3 py-2 border border-border rounded-xl text-sm bg-card text-foreground flex-1 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Buscar..."
            />
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90 transition-opacity">
              <User className="h-3.5 w-3.5" /> Analista
            </button>
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90 transition-opacity">
              <FileText className="h-3.5 w-3.5" /> Tipo
            </button>
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90 transition-opacity">
              <Package className="h-3.5 w-3.5" /> Obra
            </button>
            <div className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg bg-card">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs text-muted-foreground">Todo período</span>
            </div>
          </>
        )}
        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <TiposContratacaoToggle ativos={tiposAtivos} onToggle={handleToggleTipo} compact />
        </div>
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-muted text-muted-foreground border border-border"
          title="Período aplicado a todos os indicadores desta página"
        >
          <Calendar className="h-3 w-3" />
          Período: {periodoLabel}
        </span>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-60"
          style={{ backgroundColor: CHART_LINE_NAVY }}
        >
          <Download className="h-4 w-4" />
          {exporting ? 'Gerando...' : 'Exportar Relatório'}
        </button>
      </div>

      {/* ===== Área exportada ===== */}
      <div ref={reportRef} className="report-export-area space-y-3 bg-background p-1">
        {/* ===== Linha 1 — KPIs ===== */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <DebugTooltip info={{
            source: 'pedidos.value',
            aggregation: 'SUM(value)',
            filters: [
              ...globalFilterStrings,
              'Se analista aplicado → purchase_order_type = Cotação',
            ],
          }}>
            <KpiTile label="Contratado" value={oneKpisLoading ? <Skeleton className="h-7 w-24" /> : kpiContratado} icon={<DollarSign className="h-5 w-5" />} iconColor="pinkAtlas" />
          </DebugTooltip>

          <DebugTooltip info={{
            source: 'requests.id',
            aggregation: 'COUNT',
            filters: [
              'request_status = Pronta para Comprar',
              ...globalFilterStrings,
              'Sem filtro de tipo',
            ],
          }}>
            <KpiTile label="Requisições" value={oneKpisLoading ? <Skeleton className="h-7 w-12" /> : (oneKpis?.requisicoes ?? 0)} icon={<FileText className="h-5 w-5" />} iconColor="navyDeep" />
          </DebugTooltip>

          <DebugTooltip info={{
            source: 'requests.id',
            aggregation: 'COUNT',
            filters: [
              'request_status = Pronta para Comprar',
              'quoting_number_with_status_concat: vazio OU agrupado OU cotação OU reaberto OU aguardando',
              ...globalFilterStrings,
            ],
          }}>
            <KpiTile label="Em Andamento" value={oneKpisLoading ? <Skeleton className="h-7 w-12" /> : (oneKpis?.emAndamento ?? 0)} icon={<Activity className="h-5 w-5" />} iconColor="caramel" />
          </DebugTooltip>

          <DebugTooltip info={{
            source: 'pedidos.id',
            aggregation: 'COUNT',
            filters: [
              ...globalFilterStrings,
              'Conta todos os pedidos (sem filtro de status)',
            ],
          }}>
            <KpiTile label="Processos Concluídos" value={oneKpisLoading ? <Skeleton className="h-7 w-12" /> : (oneKpis?.processosConcluidos ?? 0)} icon={<CheckCircle className="h-5 w-5" />} iconColor="sageGreen" />
          </DebugTooltip>


          <DebugTooltip info={{
            source: 'contratos.purchase_order_contract_status',
            aggregation: 'COUNT',
            filters: [
              "Status contém 'enviado' OU 'assinado'",
              ...globalFilterStrings,
              'Data: created_when · Analista: created_by_name',
            ],
          }}>


            <div className="bg-white border border-border rounded-lg shadow-sm p-4 min-h-[120px] flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <span
                  className="inline-flex items-center justify-center h-9 w-9 rounded-lg"
                  style={{ backgroundColor: '#5D7A9A1A', color: '#5D7A9A' }}
                >
                  <FileCheck className="h-5 w-5" />
                </span>
                <span className="title-style text-[11px] leading-tight text-right pt-1" style={{ fontWeight: 600 }}>
                  Contratos
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <DebugTooltip info={{
                  source: 'contratos.purchase_order_contract_status',
                  aggregation: 'COUNT',
                  filters: [
                    "Status contém 'enviado'",
                    ...globalFilterStrings,
                    'Data: created_when · Analista: created_by_name',
                  ],
                }}>
                  <div>
                    <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
                      <PenTool className="h-3.5 w-3.5" />
                      <span className="text-[10px] uppercase">Em Assinatura</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground tabular-nums">
                      {oneKpisLoading ? <Skeleton className="h-6 w-10" /> : (oneKpis?.emAssinatura ?? 0)}
                    </p>
                  </div>
                </DebugTooltip>
                <DebugTooltip info={{
                  source: 'contratos.purchase_order_contract_status',
                  aggregation: 'COUNT',
                  filters: [
                    "Status contém 'assinado'",
                    ...globalFilterStrings,
                    'Data: created_when · Analista: created_by_name',
                  ],
                }}>
                  <div>
                    <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
                      <CheckCheck className="h-3.5 w-3.5" />
                      <span className="text-[10px] uppercase">Assinados</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground tabular-nums">
                      {oneKpisLoading ? <Skeleton className="h-6 w-10" /> : (oneKpis?.assinados ?? 0)}
                    </p>
                  </div>
                </DebugTooltip>
              </div>
            </div>
          </DebugTooltip>
        </div>

        {/* ===== Linha 2 — Contratos | Percentual Contratado ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-6">
            <DebugTooltip info={{
              source: 'contratos (sup_corporate_name, cost_collector, material_groups, purchase_order_contract_status, created_by_name)',
              aggregation: 'Lista completa',
              filters: [
                ...globalFilterStrings,
                'Data: created_when · Analista: created_by_name',
              ],
            }}>
              {oneContratosLoading && !useMocksFlag ? (
                <PanelCard title="Contratos">
                  <Skeleton className="h-[300px] w-full" />
                </PanelCard>
              ) : (
                <TabelaExpansivel
                  titulo="Contratos"
                  nomeArquivo="contratos"
                  dados={contratosData}
                  colunas={[
                    { key: 'fornecedor', label: 'Fornecedor', width: '35%' },
                    { key: 'grupo', label: 'Grupo', width: '30%', render: (v) => v ?? '—' },
                    { key: 'obra', label: 'Obra', width: '20%' },
                    { key: 'status', label: 'Status', width: '15%', render: (v) => <StatusBadge status={v} /> },
                  ]}
                />
              )}
            </DebugTooltip>
          </div>

          <div className="lg:col-span-6">
            <DebugTooltip info={{
              source: 'vw_percentual_contratado',
              aggregation: '% contratado por obra',
              filters: [
                activeObras?.length ? `obra IN (${activeObras.length})` : 'Todas as obras',
              ],
            }}>
              <PanelCard title="Percentual Contratado">
                {percLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                    {(percData ?? [])
                      .slice()
                      .sort((a, b) => (b.porcentagem ?? 0) - (a.porcentagem ?? 0))
                      .map((row, i) => {
                        const pct = Math.max(0, Math.min(100, row.porcentagem ?? 0));
                        return (
                          <div key={i} className="flex items-center gap-3 text-xs">
                            <span
                              className="truncate flex-1 min-w-0 text-foreground font-medium"
                              title={row.obra}
                            >
                              {row.obra}
                            </span>
                            <div className="w-32 h-2 rounded-full bg-muted overflow-hidden shrink-0">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${pct}%`, backgroundColor: '#6B7280' }}
                              />
                            </div>
                            <span className="w-14 text-right tabular-nums text-muted-foreground shrink-0">
                              {pct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                            </span>
                          </div>
                        );
                      })}
                    {(percData ?? []).length === 0 && (
                      <div className="text-xs text-muted-foreground text-center py-6">Sem dados</div>
                    )}
                  </div>
                )}
              </PanelCard>
            </DebugTooltip>
          </div>
        </div>

        {/* ===== Linha 3 — Últimas Contratações | Requisições por Mês ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-6">
            <DebugTooltip info={{
              source: 'pedidos (cost_collector, sup_corporate_name, material_group, value)',
              aggregation: 'Lista ordenada por value DESC',
              filters: [
                "purchase_order_status contém 'aprovado'",
                'value >= 100.000',
                "purchase_order_number_with_review termina em '-00'",
                ...globalFilterStrings,
              ],
            }}>
              {oneUltimasLoading && !useMocksFlag ? (
                <PanelCard title="Últimas Contratações">
                  <Skeleton className="h-[300px] w-full" />
                </PanelCard>
              ) : (
                <TabelaExpansivel
                  titulo="Últimas Contratações"
                  nomeArquivo="ultimas_contratacoes"
                  dados={ultimasData}
                  colunas={[
                    { key: 'fornecedor', label: 'Fornecedor', width: '35%' },
                    { key: 'grupo', label: 'Grupo', width: '30%', render: (v) => v ?? '—' },
                    { key: 'obra', label: 'Obra', width: '20%' },
                    { key: 'valor', label: 'Valor', width: '15%', render: (v) => fmtCurrency(v) },
                  ]}
                />
              )}
            </DebugTooltip>
          </div>

          <div className="lg:col-span-6">
            <DebugTooltip info={{
              source: 'requests.release_date_level02',
              aggregation: 'COUNT GROUP BY mês',
              filters: [
                'request_status = Pronta para Comprar',
                ...globalFilterStrings,
                'COM período → apenas meses no intervalo; SEM período → últimos 6 meses',
                '💡 Clique em uma barra para ver detalhes do mês',
              ],
            }}>
              {reqMesLoading && !useMocksFlag ? (
                <div className="bg-card border border-border rounded-lg shadow-sm p-4">
                  <Skeleton className="h-5 w-48 mb-3" />
                  <Skeleton className="h-[250px] w-full" />
                </div>
              ) : (
                <div className="bg-card border border-border rounded-lg shadow-sm p-4">
                  <h3 className="title-style text-base mb-3">Requisições por Mês</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={reqMesChart} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))',
                        }}
                      />
                      <Bar
                        dataKey="quantidade"
                        name="Requisições"
                        fill="#000000"
                        radius={[4, 4, 0, 0]}
                        cursor="pointer"
                        onClick={(d: any) => {
                          if (d?.ano && d?.mesNum) {
                            setDrillModal({ tipo: 'requisicoes', ano: d.ano, mes: d.mesNum, label: d.mes });
                          }
                        }}
                      >
                        <LabelList
                          dataKey="quantidade"
                          position="top"
                          formatter={(v: number) => (v > 0 ? v : '')}
                          style={{ fontSize: 10, fill: '#111' }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </DebugTooltip>
          </div>
        </div>

        {/* ===== Linha 4 — Spend | TOP 15 ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-6">
            <DebugTooltip info={{
              source: 'pedidos.value, pedidos.negotiator_issue_date',
              aggregation: 'SUM(value) e COUNT GROUP BY mês',
              filters: [
                ...globalFilterStrings,
                'Se analista aplicado → purchase_order_type = Cotação',
                '💡 Clique em uma barra para ver detalhes do mês (drill-down em contratos)',
              ],
            }}>
              {spendMesLoading && !useMocksFlag ? (
                <div className="bg-card border border-border rounded-lg shadow-sm p-4">
                  <Skeleton className="h-5 w-64 mb-3" />
                  <Skeleton className="h-[250px] w-full" />
                </div>
              ) : (
                <div className="bg-card border border-border rounded-lg shadow-sm p-4">
                  <h3 className="title-style text-base mb-3">Spend Mensal x Processos Contratados</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart data={spendChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis yAxisId="left" tickFormatter={formatEixoSpend} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))',
                        }}
                        formatter={(value: number, name: string) =>
                          name === 'Spend (R$)' ? [fmtCurrencyFull(value), name] : [value, name]
                        }
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar
                        yAxisId="left"
                        dataKey="spend"
                        name="Spend (R$)"
                        fill="#9CA3AF"
                        radius={[4, 4, 0, 0]}
                        cursor="pointer"
                        onClick={(d: any) => {
                          if (d?.ano && d?.mesNum) {
                            setDrillModal({ tipo: 'spend', ano: d.ano, mes: d.mesNum, label: d.mes });
                          }
                        }}
                      />
                      <Line yAxisId="right" dataKey="processos" name="Processos" stroke="#FB2B67" strokeWidth={2.5} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </DebugTooltip>
          </div>

          <div className="lg:col-span-6">
            <DebugTooltip info={{
              source: 'pedidos.value, pedidos.balance',
              aggregation: 'SUM(value), SUM(value)-SUM(balance), SUM(balance) GROUP BY sup_corporate_name',
              filters: [
                ...globalFilterStrings,
                "purchase_order_status LIKE 'Aprovado%'",
                'Exclui fornecedores com Atlas no nome',
                'Exclui obras "Acordo de Preço"',
                'Barra = Contratado · Escuro = Executado (value - balance) · Claro = Saldo (balance)',
                'Ranqueado por contratado DESC, TOP 15',
                'Se analista aplicado → purchase_order_type = Cotação',
              ],
            }}>
              <PanelCard title="TOP 15 Fornecedores (R$ mil)">
                {top15Loading && !useMocksFlag ? (
                  <Skeleton className="h-[360px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={340}>
                    <BarChart data={top15} margin={{ top: 10, right: 10, left: 10, bottom: 70 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="fornecedor"
                        interval={0}
                        height={70}
                        tick={<TickFornecedor />}
                      />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))',
                        }}
                        formatter={(value: number, name: string, item: any) => {
                          const p = item?.payload ?? {};
                          if (name === 'Executado') {
                            return [
                              `Contratado: R$ ${(p.contratado ?? 0).toLocaleString('pt-BR')} mil\nExecutado:  R$ ${(p.executado ?? 0).toLocaleString('pt-BR')} mil\nSaldo:      R$ ${(p.saldo ?? 0).toLocaleString('pt-BR')} mil`,
                              '',
                            ];
                          }
                          return [null as any, null as any];
                        }}
                      />
                      <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11, paddingBottom: 8 }} />
                      <Bar dataKey="executado" name="Executado" stackId="bar" fill="#9CA3AF" />
                      <Bar dataKey="saldo" name="Saldo" stackId="bar" fill="#FECDD3" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </PanelCard>
            </DebugTooltip>
          </div>
        </div>

        {/* ===== Ranking de Obras (Saving e Percentual Contratado ocultados) ===== */}
        <div>
          <DebugTooltip info={{
            source: 'vw_ranking_obras_tipo',
            aggregation: 'SUM(value) GROUP BY obra, tipo',
            filters: [
              'Apenas tipos SUP (Cotação), PD (Pedido Consumo) e AP (Pedido Consumo - Corp)',
              'Outros tipos (Regularização, Faturamento, Caixinha) ignorados',
              "purchase_order_status LIKE 'Aprovado%'",
              'Exclui Acordo de Preço e Atlas do eixo X',
              ...globalFilterStrings,
            ],
          }}>
            <RankingObrasChart filters={chartFilters} tiposAtivos={tiposAtivos} onToggleTipo={handleToggleTipo} />
          </DebugTooltip>
          {/* O.6/O.11: Painéis "Saving (CREQ)" e "Percentual Contratado" ocultados temporariamente.
              Hooks/dados mantidos (usePercentualContratado, savingData) para reativação futura. */}
        </div>


      </div>

      {drillModal && (
        <DrillDownModal
          tipo={drillModal.tipo}
          titulo={drillModal.tipo === 'spend' ? `Contratações de ${drillModal.label}` : `Requisições de ${drillModal.label}`}
          ano={drillModal.ano}
          mes={drillModal.mes}
          filters={chartFilters}
          onClose={() => setDrillModal(null)}
        />
      )}
    </div>
  );
}
