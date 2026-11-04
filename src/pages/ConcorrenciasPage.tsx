import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, FileCheck, Play, MessageSquare, CheckCircle, ListChecks, Loader2, UserPlus, PlayCircle, Search, ClipboardCheck, FilePlus, Layers } from 'lucide-react';
import { useFilterStore } from '@/stores/useFilterStore';
import { mockConcorrencias, concorrenciaAnalistas, concorrenciaTipos, concorrenciaObras } from '@/mocks/concorrencias';
import { useConcorrencias, useConcorrenciaKpis } from '@/hooks/useConcorrencias';
import { useFilterOptions } from '@/hooks/useFilterOptions';
import { useAnalystFilter } from '@/hooks/useAnalystFilter';
import { KpiCard } from '@/components/KpiCard';
import { DataTable } from '@/components/DataTable';
import { FilterBar } from '@/components/FilterBar';
import { PageHeader } from '@/components/PageHeader';
import SlaCell from '@/components/SlaCell';
import { config } from '@/config/env';
import { formatDate } from '@/lib/formatters';
import { diffDias, diffDiasVivo } from '@/lib/sla';
import { DebugTooltip } from '@/components/DebugTooltip';
import { buildFilterStrings } from '@/lib/debugFilters';
import type { GlobalFilters } from '@/types/domain';

const useMocks = config.useMocks;
const PAGE = 'concorrencias';
const kpiConfigs: { label: string; statusKey: string | null; icon: JSX.Element; iconColor: 'pinkAtlas'|'navyDeep'|'caramel'|'sageGreen'|'blueSlate'; debug: (fs: string[]) => { source: string; aggregation?: string; filters: string[] } }[] = [
  { label: 'À Delegar', statusKey: 'a_delegar', icon: <UserPlus className="h-5 w-5" />, iconColor: 'blueSlate', debug: (fs) => ({ source: 'requests.request_status', aggregation: 'COUNT', filters: ["request_status = 'Aguardando Distribuição (Depto de Suprimentos)'", 'Sempre mostra contagem total (não respeita filtros de Analista e Data)', ...fs] }) },
  { label: 'À Iniciar', statusKey: 'a_iniciar', icon: <PlayCircle className="h-5 w-5" />, iconColor: 'blueSlate', debug: (fs) => ({ source: 'requests (request_status, quoting_number_with_status_concat)', aggregation: 'COUNT', filters: ["request_status = 'Pronta para Comprar'", 'Pronta para Comprar SEM cotação ou agrupado (Reaberto e Devolvido foram para Em Cotação)', ...fs] }) },
  { label: 'Em Cotação', statusKey: 'em_cotacao', icon: <Search className="h-5 w-5" />, iconColor: 'caramel', debug: (fs) => ({ source: 'requests.quoting_number_with_status_concat', aggregation: 'COUNT', filters: ["request_status = 'Pronta para Comprar'", 'Pronta para Comprar com cotação, reaberto OU devolvido', ...fs] }) },
  { label: 'Em Aprovação', statusKey: 'em_aprovacao', icon: <ClipboardCheck className="h-5 w-5" />, iconColor: 'caramel', debug: (fs) => ({ source: 'requests.quoting_number_with_status_concat', aggregation: 'COUNT', filters: ["request_status = 'Pronta para Comprar'", 'cotação contém: aguardando', ...fs] }) },
  { label: 'Criar Pedido', statusKey: 'criar_pedido', icon: <FilePlus className="h-5 w-5" />, iconColor: 'navyDeep', debug: (fs) => ({ source: 'requests.quoting_number_with_status_concat', aggregation: 'COUNT', filters: ['cotação contém: Mapa Liberado', 'cotação NÃO contém: Pedido Criado', 'purchase_order_number_with_rev: vazio', ...fs] }) },
  { label: 'Total', statusKey: null as string | null, icon: <Layers className="h-5 w-5" />, iconColor: 'blueSlate', debug: (fs) => ({ source: 'requests', aggregation: 'soma dos 4 cards (sem À Delegar)', filters: fs }) },
];


const columnsFixas = [
  { key: 'number_formatted' as const, label: 'Nº Processo', dbField: 'requests.number_formatted' },
  { key: 'negotiator_name' as const, label: 'Analista', dbField: 'requests.negotiator_name' },
  { key: 'material_group' as const, label: 'Material', dbField: 'requests.material_group', render: (val: string | null) => val ?? '—' },
  { key: 'cost_collector' as const, label: 'Obra', dbField: 'requests.cost_collector' },
  { key: 'supplier_corporate_name' as const, label: 'Fornecedor', dbField: 'requests.supplier_corporate_name', render: (val: string | null) => val ?? '—' },
  { key: 'release_date_level02' as const, label: 'Data Aprovação', dbField: 'requests.release_date_level02', render: (val: string | null) => val ? formatDate(new Date(val).toISOString()) : '—' },
  { key: 'quoting_number_with_status_concat' as const, label: 'Cotação', dbField: 'requests.quoting_number_with_status_concat' },
  { key: 'purchase_order_number_with_rev' as const, label: 'Pedido', dbField: 'requests.purchase_order_number_with_rev' },
];
const statusColumn = { key: 'request_status' as const, label: 'Status', dbField: 'requests.request_status' };

const mockColumns = [
  { key: 'nProcesso' as const, label: 'Nº Processo' },
  { key: 'descricao' as const, label: 'Descrição' },
  { key: 'analista' as const, label: 'Analista' },
  { key: 'status' as const, label: 'Status', render: (v: string) => <span className="capitalize">{v.replace(/_/g, ' ')}</span> },
  { key: 'tipo' as const, label: 'Tipo' },
  { key: 'obra' as const, label: 'Obra' },
  { key: 'data' as const, label: 'Data' },
  { key: 'valor' as const, label: 'Valor', render: (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
];

export default function ConcorrenciasPage() {
  const [showSLA, setShowSLA] = useState(false);
  const { activeMacroFilter, activeAnalistas, activeTipos, activeObras, activeGruposMaterial, setMacroFilter, clearMacroFilter, setPeriod } = useFilterStore();
  const macroStatus = activeMacroFilter?.page === PAGE ? activeMacroFilter.statusKey : null;
  const { analistas: dbAnalistas, obras: dbObras, tipos: dbTipos, grupos: dbGrupos } = useFilterOptions();
  const { nomesVisiveis, isRestricted, obrasHabilitadas } = useAnalystFilter();
  const scope = { nomesVisiveis, obrasHabilitadas };

  useEffect(() => { setPeriod(null); }, [setPeriod]);


  const { activePeriod } = useFilterStore();
  const periodoStr: [string, string] | null = activePeriod
    ? [activePeriod[0].toISOString(), activePeriod[1].toISOString()]
    : null;
  const filters: GlobalFilters = {
    analista: activeAnalistas,
    obra: activeObras,
    tipo: [],
    periodo: periodoStr,
    grupos: activeGruposMaterial,
  };

  // Supabase data
  const { data: supaData, loading } = useConcorrencias({ ...filters, statusMacro: macroStatus }, 0, scope);
  const { data: kpis } = useConcorrenciaKpis(filters, scope);

  const columns = useMemo(() => [
    ...columnsFixas.slice(0, 3),
    ...(showSLA ? [statusColumn] : []),
    ...columnsFixas.slice(3),
    ...(showSLA ? [
      {
        key: 'sla_envio_aprv' as const,
        label: 'Envio Aprv.',
        dbField: 'requests.transmission_date_formatted',
        render: (_: unknown, row: any) => <SlaCell dias={diffDias(row.issue_date_formatted, row.transmission_date_formatted)} />,
      },
      {
        key: 'sla_aprv_obra' as const,
        label: 'Aprv. Obra',
        dbField: 'requests.release_date_level01',
        render: (_: unknown, row: any) => <SlaCell dias={diffDias(row.transmission_date_formatted, row.release_date_level01)} />,
      },
      {
        key: 'sla_aprv_custos' as const,
        label: 'Aprv. Custos',
        dbField: 'requests.release_date_level02',
        render: (_: unknown, row: any) => <SlaCell dias={diffDias(row.release_date_level01, row.release_date_level02)} />,
      },
      {
        key: 'sla_delegado' as const,
        label: 'Delegado',
        dbField: 'requests.changed_when',
        render: (_: unknown, row: any) => <SlaCell dias={diffDias(row.release_date_level02, row.changed_when)} />,
      },
      {
        key: 'sla_pedido' as const,
        label: 'Pedido Emitido',
        dbField: 'requests.emission_date_first_po',
        render: (_: unknown, row: any) => <SlaCell dias={diffDias(row.changed_when, row.emission_date_first_po)} />,
      },
      {
        key: 'sla_total' as const,
        label: 'SLA Total',
        dbField: '(calculado)',
        render: (_: unknown, row: any) => {
          const { dias, aberto } = diffDiasVivo(row.issue_date_formatted, row.emission_date_first_po)

          if (dias === null) {
            return <span className="text-muted-foreground">—</span>
          }

          const color =
            dias < 0 ? 'text-red-500' :
            dias === 0 ? 'text-yellow-500' :
            dias <= 30 ? 'text-green-500' :
            dias <= 60 ? 'text-yellow-500' :
            'text-red-500'

          return (
            <span
              className={`${color} font-bold text-sm ${aberto ? 'italic' : ''}`}
              title={aberto ? 'Processo em andamento' : 'Processo finalizado'}
            >
              {dias}d{aberto ? '...' : ''}
            </span>
          )
        },
      },
    ] : []),
  ], [showSLA]);

  // Mock data fallback
  const globalFiltered = useMemo(() => {
    if (!useMocks) return [];
    let data = mockConcorrencias;
    if (activeAnalistas.length) data = data.filter(d => activeAnalistas.includes(d.analista));
    if (activeTipos.length) data = data.filter(d => activeTipos.includes(d.tipo));
    if (activeObras.length) data = data.filter(d => activeObras.includes(d.obra));
    return data;
  }, [activeAnalistas, activeTipos, activeObras]);

  const mockTableData = useMemo(() => {
    if (!macroStatus) return globalFiltered;
    return globalFiltered.filter(d => d.status === macroStatus);
  }, [globalFiltered, macroStatus]);

  const handleKpiClick = (statusKey: string | null, label: string) => {
    if (statusKey === null) clearMacroFilter();
    else if (macroStatus === statusKey) clearMacroFilter();
    else setMacroFilter(PAGE, statusKey, label);
  };

  const kpiValues = useMocks
    ? {
        a_delegar: globalFiltered.filter(d => d.status === 'a_delegar').length,
        a_iniciar: globalFiltered.filter(d => d.status === 'a_iniciar').length,
        em_cotacao: globalFiltered.filter(d => d.status === 'em_cotacao').length,
        em_aprovacao: globalFiltered.filter(d => d.status === 'em_aprovacao').length,
        criar_pedido: globalFiltered.filter(d => d.status === 'criar_pedido').length,
        total: globalFiltered.length,
      }
    : {
        a_delegar: kpis?.aDelegar ?? 0,
        a_iniciar: kpis?.aIniciar ?? 0,
        em_cotacao: kpis?.emCotacao ?? 0,
        em_aprovacao: kpis?.emAprovacao ?? 0,
        criar_pedido: kpis?.criarPedido ?? 0,
        total: kpis?.total ?? 0,
      };

  return (
    <div className="page-container">
      <PageHeader title="CONCORRÊNCIAS" icon={<ClipboardList className="h-5 w-5 text-primary-foreground" />} />
      <div className="flex items-center gap-3">
        <FilterBar
          analistas={isRestricted ? undefined : (useMocks ? concorrenciaAnalistas : dbAnalistas)}
          obras={useMocks ? concorrenciaObras : dbObras}
          grupos={useMocks ? undefined : dbGrupos}
        />
        <button
          onClick={() => setShowSLA(p => !p)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${showSLA ? 'bg-accent text-accent-foreground border-accent' : 'border-border text-muted-foreground'}`}
        >
          📊 SLA
        </button>
      </div>

      <div>
        <div className="flex-1">
          <div className="grid grid-cols-6 gap-3 mb-6">
            {kpiConfigs.map(kpi => {
              const fs = buildFilterStrings({
                dataInicio: activePeriod?.[0]?.toISOString().slice(0, 10),
                dataFim: activePeriod?.[1]?.toISOString().slice(0, 10),
                obras: activeObras,
                analistas: activeAnalistas,
              });
              return (
                <DebugTooltip key={kpi.label} info={kpi.debug(fs)}>
                  <KpiCard
                    label={kpi.label}
                    value={kpi.statusKey ? kpiValues[kpi.statusKey as keyof typeof kpiValues] : kpiValues.total}
                    statusKey={kpi.statusKey}
                    isActive={macroStatus === kpi.statusKey && kpi.statusKey !== null}
                    onClick={() => handleKpiClick(kpi.statusKey, kpi.label)}
                    icon={kpi.icon}
                    iconColor={kpi.iconColor}
                  />
                </DebugTooltip>
              );
            })}
          </div>
          {loading && !useMocks ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !useMocks && (supaData?.length ?? 0) === 0 && obrasHabilitadas !== null && obrasHabilitadas.length === 0 ? (
            <div className="border border-border rounded-lg p-12 text-center space-y-2">
              <p className="text-foreground font-medium">Nenhuma obra habilitada</p>
              <p className="text-sm text-muted-foreground">Contate o administrador para liberar o acesso às obras.</p>
            </div>
          ) : !useMocks && (supaData?.length ?? 0) === 0 ? (
            <div className="border border-border rounded-lg p-12 text-center space-y-2">
              <p className="text-foreground font-medium">Nenhum registro encontrado</p>
              <p className="text-sm text-muted-foreground">Tente ajustar os filtros aplicados.</p>
            </div>
          ) : (
            <DebugTooltip info={{
              source: 'requests (tabela completa)',
              aggregation: 'Lista filtrada',
              filters: [
                'Filtro macro: ' + (macroStatus ?? 'NENHUM — soma dos 5 cards'),
                ...buildFilterStrings({
                  dataInicio: activePeriod?.[0]?.toISOString().slice(0, 10),
                  dataFim: activePeriod?.[1]?.toISOString().slice(0, 10),
                  obras: activeObras,
                  analistas: activeAnalistas,
                }),
              ],
            }}>
              <DataTable
                columns={(useMocks ? mockColumns : columns) as any}
                data={(useMocks ? mockTableData : (supaData ?? [])) as any}
                filterLabel={activeMacroFilter?.page === PAGE ? activeMacroFilter.label : undefined}
                onRemoveFilter={clearMacroFilter}
              />
            </DebugTooltip>
          )}
        </div>
      </div>
    </div>
  );
}
