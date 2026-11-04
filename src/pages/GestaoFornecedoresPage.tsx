import { useMemo, useState, useEffect, useRef } from 'react';
import { Building2, Search, X, Layers, ChevronDown, Download } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Line, LabelList,
} from 'recharts';
import { PageHeader } from '@/components/PageHeader';
import { FilterBar } from '@/components/FilterBar';
import { TabelaExpansivel } from '@/components/TabelaExpansivel';
import { useFilterStore } from '@/stores/useFilterStore';
import { useFilterOptions } from '@/hooks/useFilterOptions';
import { RATING_MAP, classificarRating, formatarMesAbbr } from '@/lib/avaliacao';
import { useAvaliacaoMensal, useFornecedoresAvaliacao } from '@/hooks/useFornecedoresAvaliacao';
import { useParceriasFornecedores, useParceriaDetalhe, useMaterialGroups } from '@/hooks/useParcerias';
import { DebugTooltip } from '@/components/DebugTooltip';
import { buildFilterStrings } from '@/lib/debugFilters';
import { exportarRelatorio } from '@/lib/exportRelatorio';


const CHART_BAR_GRAY = '#6B7280';
const CHART_LINE_NAVY = '#1B2A4A';

type Classif = 'Otimo' | 'Bom' | 'Regular' | 'Ruim';
const CLASSIFS: Classif[] = ['Otimo', 'Bom', 'Regular', 'Ruim'];
const CLASSIF_RATING: Record<Classif, number> = { Otimo: 40, Bom: 30, Regular: 20, Ruim: 10 };
const CLASSIF_LABEL: Record<Classif, string> = { Otimo: 'Ótimo', Bom: 'Bom', Regular: 'Regular', Ruim: 'Ruim' };
const CLASSIF_COLOR: Record<Classif, string> = {
  Otimo: '#10B981',
  Bom: '#3B82F6',
  Regular: '#F59E0B',
  Ruim: '#EF4444',
};

const OBRAS_MOCK = ['Obra Alpha', 'Obra Beta', 'Obra Gamma', 'Obra Delta', 'Obra Epsilon'];


const fmtCurrency = (v: number) =>
  `R$ ${Number(v ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;

function AvaliacaoBadge({ rating }: { rating: number | null }) {
  const { label, cor } = classificarRating(rating ?? -1);
  return (
    <span
      className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border"
      style={{
        color: cor,
        borderColor: `${cor}55`,
        backgroundColor: `${cor}22`,
      }}
    >
      {label}
    </span>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-lg shadow-sm flex flex-col">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="title-style text-sm">{title}</h2>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </div>
  );
}

export default function GestaoFornecedoresPage() {
  const { activeObras, activePeriod } = useFilterStore();
  const { obras: dbObras } = useFilterOptions();
  const [search, setSearch] = useState('');
  const [searchAplicado, setSearchAplicado] = useState('');
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<string | null>(null);
  const [mesSelecionado, setMesSelecionado] = useState<string | null>(null);
  const chartScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearchAplicado(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Fornecedor efetivo do filtro de página: a seleção no gráfico tem precedência sobre a busca.
  const fornecedorEfetivo = fornecedorSelecionado ?? (searchAplicado || undefined);



  const toLocalISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dataInicio = activePeriod?.[0] ? toLocalISO(activePeriod[0]) : undefined;
  const dataFim = activePeriod?.[1] ? toLocalISO(activePeriod[1]) : undefined;

  // Filtro EXCLUSIVO de classificação (mesmo padrão SUP/PD/AP)
  const [classifVisiveis, setClassifVisiveis] = useState<Classif[]>(CLASSIFS);
  const handleClickClassif = (c: Classif) => {
    setClassifVisiveis(prev => {
      if (prev.length === 4) return [c];
      if (prev.length === 1 && prev[0] === c) return [...CLASSIFS];
      return [c];
    });
  };
  const ratingsAtivos = useMemo(
    () => classifVisiveis.map(c => CLASSIF_RATING[c]),
    [classifVisiveis]
  );

  const [gruposSelecionados, setGruposSelecionados] = useState<string[]>([]);

  const baseFilters = useMemo(
    () => ({
      obras: activeObras,
      fornecedor: fornecedorEfetivo,
      dataInicio,
      dataFim,
      grupos: gruposSelecionados,
    }),
    [activeObras, fornecedorEfetivo, dataInicio, dataFim, gruposSelecionados]
  );


  const { data: avaliacaoMensal, loading: loadingChart } = useAvaliacaoMensal(baseFilters);

  const { data: avaliacaoRows, loading: loadingTabela } = useFornecedoresAvaliacao({
    ...baseFilters,
    mes: mesSelecionado,
    ratings: classifVisiveis.length < 4 ? ratingsAtivos : null,
  });

  const chartData = useMemo(
    () =>
      (avaliacaoMensal ?? []).map(r => ({
        ...r,
        mesLabel: formatarMesAbbr(r.mes),
        total: (r.otimo ?? 0) + (r.bom ?? 0) + (r.regular ?? 0) + (r.ruim ?? 0),
      })),
    [avaliacaoMensal]
  );

  const classifCounts = useMemo(() => {
    const c = { Otimo: 0, Bom: 0, Regular: 0, Ruim: 0 } as Record<Classif, number>;
    for (const r of chartData) {
      c.Otimo += r.otimo ?? 0;
      c.Bom += r.bom ?? 0;
      c.Regular += r.regular ?? 0;
      c.Ruim += r.ruim ?? 0;
    }
    return c;
  }, [chartData]);

  // Janela visível padrão: últimos 6 meses (N-6); scroll horizontal revela meses anteriores.
  const MESES_VISIVEIS = 6;
  const chartWidth = Math.max(100, (chartData.length / MESES_VISIVEIS) * 100);


  // Posiciona o scroll no LADO DIREITO (mês mais recente visível) ao montar / atualizar dados
  useEffect(() => {
    const el = chartScrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [chartData.length]);

  const handleMesClick = (entry: any) => {
    const mes = entry?.payload?.mes;
    if (!mes) return;
    setMesSelecionado(prev => (prev === mes ? null : mes));
  };


  const tabelaAvaliacao = useMemo(
    () =>
      (avaliacaoRows ?? []).map(r => ({
        fornecedor: r.supplier_corporate_name ?? '—',
        tipo: r.quality_supply_type ?? '—',
        obra: r.cost_collector ?? '—',
        rating: r.general_rating,
        observacao: r.observation ?? '',
        mes: r.month_and_year_formatted ?? '—',
      })),
    [avaliacaoRows]
  );

  // ---------- Parcerias (dados reais) ----------
  const [grupoOpen, setGrupoOpen] = useState(false);
  const grupoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFornecedorSelecionado(null);
  }, [searchAplicado, activeObras, gruposSelecionados, dataInicio, dataFim]);
  const [expandirTodos, setExpandirTodos] = useState(false);

  const { data: gruposOpts } = useMaterialGroups();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (grupoRef.current && !grupoRef.current.contains(e.target as Node)) setGrupoOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const parceriasFilters = useMemo(
    () => ({
      obras: activeObras,
      grupos: gruposSelecionados,
      fornecedor: searchAplicado || undefined,
      dataInicio,
      dataFim,
    }),
    [activeObras, gruposSelecionados, searchAplicado, dataInicio, dataFim]
  );

  const { data: parcerias, loading: loadingParcerias } = useParceriasFornecedores(parceriasFilters);
  const { data: parceriaDetalhe, loading: loadingDetalhe } = useParceriaDetalhe(
    fornecedorSelecionado,
    parceriasFilters
  );

  const parceriasOrdenadas = parcerias ?? [];
  const parceriasChart = expandirTodos ? parceriasOrdenadas : parceriasOrdenadas.slice(0, 15);
  const chartParceriasData = parceriasChart.map(p => ({
    nome: p.fornecedor,
    valor: Math.round((p.valor ?? 0) / 1000),
    obras: p.qtdObras,
  }));
  const chartParceriasWidth = Math.max(100, (chartParceriasData.length / 15) * 100);

  const tabelaParcerias = useMemo(() => {
    if (fornecedorSelecionado) {
      return (parceriaDetalhe ?? []).map(d => ({
        fornecedor: d.fornecedor ?? '—',
        grupo: d.grupo ?? '—',
        obra: d.obra ?? '—',
        valor: d.valor ?? 0,
      }));
    }
    return parceriasOrdenadas.map(p => ({
      fornecedor: p.fornecedor,
      grupo: '—',
      obra: `${p.qtdObras} obras`,
      valor: p.valor,
    }));
  }, [fornecedorSelecionado, parceriaDetalhe, parceriasOrdenadas]);

  const handleParceriaBarClick = (entry: any) => {
    const nome = entry?.payload?.nome;
    if (!nome) return;
    setFornecedorSelecionado(prev => (prev === nome ? null : nome));
  };

  const [exporting, setExporting] = useState<null | 'avaliacao' | 'parcerias'>(null);
  const handleExport = async (secao: 'avaliacao' | 'parcerias') => {
    setExporting(secao);
    try {
      const obraLabel = activeObras?.length === 1 ? activeObras[0] : 'TODAS_AS_OBRAS';
      const di = dataInicio ?? '';
      const df = dataFim ?? '';
      const queryParams: Record<string, string | undefined> = {
        obra: obraLabel,
        obras: activeObras?.length ? activeObras.join('|') : '',
        fornecedor: searchAplicado || '',
        classificacoes: classifVisiveis.length < 4 ? classifVisiveis.join(',') : '',
        grupos: gruposSelecionados.length ? gruposSelecionados.join('|') : '',
        mes: mesSelecionado ?? '',
        dataInicio: di,
        dataFim: df,
        modo: 'export',
        secao,
      };
      const blocos =
        secao === 'avaliacao'
          ? ['.relatorio-cabecalho', '.relatorio-aval-grafico', '.relatorio-aval-chunk']
          : ['.relatorio-cabecalho', '.relatorio-parc-grafico', '.relatorio-parc-chunk'];
      const prefix = secao === 'avaliacao' ? 'Avaliacao_Fornecedores' : 'Parcerias_Fornecedores';
      await exportarRelatorio({
        rota: '/relatorio/gestao-fornecedores',
        queryParams,
        filename: `${prefix}_${obraLabel}_${di}_${df}.pdf`,
        blocos,
      });
    } finally {
      setExporting(null);
    }
  };

  // Tick customizado — trunca nomes longos (14 chars + …); nome completo no <title>.
  const TickTruncado = (props: any) => {
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
          fontSize={10}
        >
          <title>{raw}</title>
          {label}
        </text>
      </g>
    );
  };



  return (
    <div className="page-container">
      <div className="max-w-[1400px] mx-auto w-full px-4">
      <PageHeader
        title="GESTÃO DE FORNECEDORES"
        icon={<Building2 className="h-5 w-5 text-primary-foreground" />}
      />

      <div className="filter-bar mb-4">
        <FilterBar obras={dbObras.length ? dbObras : OBRAS_MOCK} />

        <div ref={grupoRef} className="relative">
          <button
            onClick={() => setGrupoOpen(!grupoOpen)}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground min-w-[140px] hover:opacity-90 transition-opacity"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Grupo</span>
            {gruposSelecionados.length > 0 && (
              <span className="ml-auto bg-primary-foreground/20 text-primary-foreground text-xs rounded-full px-1.5 py-0.5 font-medium">
                {gruposSelecionados.length}
              </span>
            )}
          </button>
          {grupoOpen && (
            <div className="absolute z-50 top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg min-w-[220px] max-h-72 overflow-auto">
              {gruposOpts.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">Sem grupos</div>
              ) : (
                gruposOpts.map(g => (
                  <label key={g} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={gruposSelecionados.includes(g)}
                      onChange={() =>
                        setGruposSelecionados(prev =>
                          prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
                        )
                      }
                      className="rounded accent-primary"
                    />
                    {g}
                  </label>
                ))
              )}
            </div>
          )}
        </div>

        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar fornecedor..."
            className="pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-[240px]"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => handleExport('avaliacao')}
            disabled={!!exporting}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-60"
            style={{ backgroundColor: CHART_LINE_NAVY }}
          >
            <Download className="h-4 w-4" />
            {exporting === 'avaliacao' ? 'Gerando...' : 'Exportar Avaliação'}
          </button>
          <button
            onClick={() => handleExport('parcerias')}
            disabled={!!exporting}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-60"
            style={{ backgroundColor: CHART_LINE_NAVY }}
          >
            <Download className="h-4 w-4" />
            {exporting === 'parcerias' ? 'Gerando...' : 'Exportar Parcerias'}
          </button>
        </div>
      </div>



      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* AVALIAÇÃO */}
        <SectionCard title="Avaliação">
          <DebugTooltip info={{
            source: 'avaliacao_fornecedores (general_rating, month_and_year_formatted)',
            aggregation: 'COUNT GROUP BY mês e classificação',
            filters: [
              `Janela: últimos ${chartData.length || 12} meses (visíveis: ${MESES_VISIVEIS}, scroll horizontal)`,
              'Mapeamento: 40=Ótimo, 30=Bom, 20=Regular, 10=Ruim',
              activeObras?.length ? `Obras: ${activeObras.join(', ')}` : 'Obras: TODAS',
            ],
          }}>
          <div className="bg-background/40 border border-border/60 rounded-md p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-muted-foreground">
                Avaliação mensal por classificação
              </h3>
              {mesSelecionado && (
                <button
                  onClick={() => setMesSelecionado(null)}
                  className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> limpar seleção
                </button>
              )}
            </div>
            <div ref={chartScrollRef} className="overflow-x-auto">
              <div style={{ width: `${chartWidth}%`, minWidth: '100%' }}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mesLabel" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 8,
                        color: 'hsl(var(--foreground))',
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="otimo" name="Ótimo" stackId="a" fill={RATING_MAP[40].cor} cursor="pointer" onClick={handleMesClick} hide={!classifVisiveis.includes('Otimo')} />
                    <Bar dataKey="bom" name="Bom" stackId="a" fill={RATING_MAP[30].cor} cursor="pointer" onClick={handleMesClick} hide={!classifVisiveis.includes('Bom')} />
                    <Bar dataKey="regular" name="Regular" stackId="a" fill={RATING_MAP[20].cor} cursor="pointer" onClick={handleMesClick} hide={!classifVisiveis.includes('Regular')} />
                    <Bar dataKey="ruim" name="Ruim" stackId="a" fill={RATING_MAP[10].cor} cursor="pointer" onClick={handleMesClick} hide={!classifVisiveis.includes('Ruim')}>
                      <LabelList dataKey="total" position="top" style={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Legenda fixa abaixo do gráfico — botões clicáveis (filtro exclusivo) */}
            <div className="flex flex-wrap gap-2 justify-center mt-3 pb-1">
              {CLASSIFS.map(c => {
                const ativo = classifVisiveis.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleClickClassif(c)}
                    title={`Filtrar por ${CLASSIF_LABEL[c]}`}
                    className={`flex items-center gap-1.5 px-2.5 py-1 border rounded-full text-[11px] transition hover:scale-105 ${
                      ativo
                        ? 'bg-card border-border text-foreground'
                        : 'bg-muted/40 border-border/40 opacity-50 text-muted-foreground'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-sm"
                      style={{ background: ativo ? CLASSIF_COLOR[c] : '#CCCCCC' }}
                    />
                    {CLASSIF_LABEL[c]}
                    <span className="text-muted-foreground/80 tabular-nums">({classifCounts[c] ?? 0})</span>
                  </button>
                );
              })}
            </div>

            <p className="text-[10px] text-muted-foreground mt-1">
              {loadingChart
                ? 'Carregando...'
                : 'Clique em um mês para filtrar a tabela abaixo. Role para o lado para ver meses anteriores.'}
            </p>
          </div>
          </DebugTooltip>

          <DebugTooltip info={{
            source: 'avaliacao_fornecedores (supplier_corporate_name, quality_supply_type, cost_collector, general_rating, observation)',
            aggregation: 'Lista ordenada por DATA DESC (mais recente primeiro)',
            filters: [
              activeObras?.length ? `Obras: ${activeObras.join(', ')}` : 'Obras: TODAS',
              mesSelecionado ? `Mês: ${mesSelecionado}` : 'Mês: TODOS',
            ],
          }}>
          <TabelaExpansivel
            titulo={`Fornecedores — Avaliação${mesSelecionado ? ` · ${mesSelecionado}` : ''}${loadingTabela ? ' (carregando...)' : ''}`}
            nomeArquivo="fornecedores_avaliacao"
            dados={tabelaAvaliacao}
            colunas={[
              { key: 'fornecedor', label: 'Fornecedor', width: '28%' },
              { key: 'tipo', label: 'Tipo', width: '15%' },
              { key: 'obra', label: 'Obra', width: '18%' },
              {
                key: 'rating',
                label: 'Avaliação',
                width: '12%',
                render: v => <AvaliacaoBadge rating={v} />,
              },
              {
                key: 'observacao',
                label: 'Observação',
                width: '27%',
                render: v => (v && String(v).trim()) || '—',
              },
              {
                key: 'mes',
                label: 'Data',
                onlyModal: true,
                render: v => v ?? '—',
              },
            ]}
          />
          </DebugTooltip>
        </SectionCard>



        {/* PARCERIAS */}
        <SectionCard title="Parcerias">
          <DebugTooltip info={{
            source: 'vw_parcerias_empresa (visão empresa — ignora RLS de analista)',
            aggregation: 'SUM(value) e COUNT(DISTINCT cost_collector) GROUP BY fornecedor',
            filters: [
              'Apenas fornecedores com 2 ou mais obras distintas',
              'Exclui fornecedores com Atlas no nome',
              'Exclui obras: Custos Indiretos, Indiretos Obras Atlas, Acordo de Preço',
              activeObras.length ? `Obras: ${activeObras.join(', ')}` : 'Obras: TODAS',
              ...(dataInicio && dataFim
                ? [`Período: ${dataInicio} a ${dataFim}`]
                : ['Período: não filtrado']),
              gruposSelecionados.length ? `Grupos: ${gruposSelecionados.join(', ')}` : 'Grupos: TODOS',
              '⚠️ Visão empresa: NÃO aplica filtro de analista',
            ],
          }}>


          <div className="bg-background/40 border border-border/60 rounded-md p-3">
            <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
              <h3 className="text-xs font-semibold text-muted-foreground">
                {expandirTodos ? 'Todos os fornecedores' : 'TOP 15 Fornecedores'} — Custo x Nº de obras
              </h3>
              <div className="flex items-center gap-2">
                {fornecedorSelecionado && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary border border-primary/30">
                    <span className="text-muted-foreground">Filtrando:</span>
                    {fornecedorSelecionado}
                    <button
                      onClick={() => setFornecedorSelecionado(null)}
                      className="hover:text-foreground"
                      title="Limpar filtro de fornecedor"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}

                {parceriasOrdenadas.length > 15 && (
                  <button
                    onClick={() => setExpandirTodos(v => !v)}
                    className="text-[10px] inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                  >
                    <ChevronDown className="h-3 w-3" />
                    {expandirTodos ? 'Mostrar TOP 15' : `Expandir (${parceriasOrdenadas.length})`}
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <div style={{ width: `${chartParceriasWidth}%`, minWidth: '100%' }}>
                {chartParceriasData.length === 0 ? (
                  <div className="py-16 text-center text-xs text-muted-foreground">
                    Nenhum fornecedor com 2 ou mais obras encontrado para os filtros atuais.
                  </div>
                ) : (
                <ResponsiveContainer width="100%" height={460}>
                  <ComposedChart data={chartParceriasData} margin={{ top: 30, right: 30, left: 10, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="nome" tick={<TickTruncado />} interval={0} height={80} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `R$ ${v}k`} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 8,
                        color: 'hsl(var(--foreground))',
                        fontSize: 12,
                      }}
                      formatter={(value: any, name: string) =>
                        name === 'Custo (R$ mil)' ? [`R$ ${Number(value).toLocaleString('pt-BR')}k`, name] : [value, name]
                      }
                    />
                    <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: 11, paddingBottom: 12, paddingTop: 4 }} />

                    <Bar yAxisId="left" dataKey="valor" name="Custo (R$ mil)" fill={CHART_BAR_GRAY} cursor="pointer" onClick={handleParceriaBarClick} />
                    <Line yAxisId="right" type="monotone" dataKey="obras" name="Nº de obras" stroke="#FB2B67" strokeWidth={2} dot={{ r: 3, fill: '#FB2B67' }} />

                  </ComposedChart>
                </ResponsiveContainer>
                )}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {loadingParcerias
                ? 'Carregando...'
                : 'Apenas fornecedores com 2 ou mais obras. Clique em uma barra para ver o detalhamento.'}
            </p>
            <p className="text-[10px] text-muted-foreground/80 italic mt-0.5">
              Nº de obras considera o universo da empresa (todas as obras), mesmo quando um filtro de obra está aplicado — o valor exibido respeita os filtros.
            </p>

          </div>
          </DebugTooltip>

          <DebugTooltip info={{
            source: 'vw_parcerias_empresa (drill-down por fornecedor selecionado — visão empresa)',
            aggregation: 'Lista por pedido',
            filters: [
              `Fornecedor: ${fornecedorSelecionado ?? 'NENHUM — visão geral'}`,
              'Exclui fornecedores com Atlas no nome',
              'Exclui obras: Custos Indiretos, Indiretos Obras Atlas, Acordo de Preço',
              ...buildFilterStrings({ dataInicio, dataFim, obras: activeObras }),
              gruposSelecionados.length ? `Grupos: ${gruposSelecionados.join(', ')}` : 'Grupos: TODOS',
              '⚠️ Visão empresa: NÃO aplica filtro de analista',
            ],
          }}>

          <TabelaExpansivel
            titulo={`Fornecedores — Parcerias${
              fornecedorSelecionado ? ` · ${fornecedorSelecionado}` : ''
            }${loadingDetalhe || loadingParcerias ? ' (carregando...)' : ''}`}
            nomeArquivo="fornecedores_parcerias"
            dados={tabelaParcerias}
            colunas={[
              { key: 'fornecedor', label: 'Fornecedores', width: '40%' },
              { key: 'grupo', label: 'Grupo', width: '20%' },
              { key: 'obra', label: 'Obra', width: '20%' },
              { key: 'valor', label: 'Valor', width: '20%', render: v => fmtCurrency(v) },
            ]}
          />
          </DebugTooltip>
        </SectionCard>
      </div>
      </div>
    </div>
  );
}
