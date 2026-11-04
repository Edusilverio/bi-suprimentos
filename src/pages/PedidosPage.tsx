import { useEffect, useMemo, useState } from 'react';
import { ShoppingCart, CheckCircle, FileText, Search, ListChecks, Loader2, CheckCircle2, XCircle, ClipboardList, AlertTriangle, FolderArchive, ClipboardCheck, ShieldCheck, Layers } from 'lucide-react';

import { usePedidosFlag } from '@/hooks/usePedidosFlag';
import { useAuthStore } from '@/stores/useAuthStore';
import { useFilterStore } from '@/stores/useFilterStore';
import { mockPedidos, pedidoAnalistas, pedidoObras } from '@/mocks/pedidos';
import { usePedidos, usePedidoKpis } from '@/hooks/usePedidos';
import { useFilterOptions } from '@/hooks/useFilterOptions';
import { useAnalystFilter } from '@/hooks/useAnalystFilter';
import { KpiCard } from '@/components/KpiCard';
import { DataTable } from '@/components/DataTable';
import { FilterBar } from '@/components/FilterBar';
import { PageHeader } from '@/components/PageHeader';
import SlaCell from '@/components/SlaCell';
import { config } from '@/config/env';
import { formatDate } from '@/lib/formatters';
import { diffDias } from '@/lib/sla';
import { DebugTooltip } from '@/components/DebugTooltip';
import { buildFilterStrings } from '@/lib/debugFilters';
import type { GlobalFilters } from '@/types/domain';

const useMocksFlag = config.useMocks;
const PAGE = 'pedidos';
const kpiConfigs: { label: string; statusKey: string | null; icon: JSX.Element; iconColor: 'pinkAtlas'|'navyDeep'|'caramel'|'sageGreen'|'blueSlate'; debug: (fs: string[]) => { source: string; aggregation?: string; filters: string[] } }[] = [
  { label: 'Ped Em Aprovação', statusKey: 'ped_em_aprovacao', icon: <ClipboardCheck className="h-5 w-5" />, iconColor: 'caramel', debug: (fs) => ({ source: 'vw_pedidos_com_minuta_flag', aggregation: 'COUNT', filters: ['purchase_order_type = Cotação', "status LIKE '%aguardando%'", "número termina em '-00'", ...fs] }) },
  { label: 'À Formalizar', statusKey: 'a_formalizar', icon: <FileText className="h-5 w-5" />, iconColor: 'navyDeep', debug: (fs) => ({ source: 'vw_pedidos_com_minuta_flag', aggregation: 'COUNT', filters: ['purchase_order_type = Cotação', "status LIKE '%aprovado%'", 'flag_email_sent_boolean = false', 'flag_has_contract = false', 'Obras excluídas: Indiretos, Acordo de Preço, Projetos, Pré Obra', ...fs] }) },
  { label: 'Pend Minuta', statusKey: 'ped_em_validacao', icon: <ShieldCheck className="h-5 w-5" />, iconColor: 'caramel', debug: (fs) => ({ source: 'vw_pedidos_com_minuta_flag', aggregation: 'COUNT', filters: ['purchase_order_type = Cotação', "status LIKE '%aprovado%'", 'flag_email_sent_boolean = true', 'flag_has_contract = false', 'precisa_minuta = true (via excel_sla_familias)', 'Obras excluídas: Indiretos, Acordo de Preço, Projetos, Pré Obra', ...fs] }) },
  { label: 'Total', statusKey: null as string | null, icon: <Layers className="h-5 w-5" />, iconColor: 'blueSlate', debug: (fs) => ({ source: 'vw_pedidos_com_minuta_flag', aggregation: 'COUNT total', filters: fs }) },
];


const formatCurrency = (val: number | null | undefined) =>
  val == null ? '—' : `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const statusColumn = {
  key: 'purchase_order_status' as const,
  label: 'Status',
  dbField: 'pedidos.purchase_order_status',
  render: (val: string | null) => val ?? '—',
};

const buildBaseColumns = (showSLA: boolean) => [
  { key: 'purchase_order_number_with_review' as const, label: 'Nº Pedido', dbField: 'pedidos.purchase_order_number_with_review' },
  { key: 'sup_corporate_name' as const, label: 'Fornecedor', dbField: 'pedidos.sup_corporate_name', render: (val: string | null) => val ?? '—' },
  { key: 'quoting_negotiator_name' as const, label: 'Analista', dbField: 'pedidos.quoting_negotiator_name' },
  ...(showSLA ? [statusColumn] : []),
  { key: 'material_group' as const, label: 'Material', dbField: 'pedidos.material_group', render: (val: string | null) => val ?? '—' },
  { key: 'purchase_order_type' as const, label: 'Tipo', dbField: 'pedidos.purchase_order_type' },
  { key: 'cost_collector' as const, label: 'Obra', dbField: 'pedidos.cost_collector' },
  { key: 'value' as const, label: 'Valor', dbField: 'pedidos.value', render: (val: number | null) => formatCurrency(val) },
  { key: 'balance' as const, label: 'Saldo', dbField: 'pedidos.balance', render: (val: number | null) => formatCurrency(val) },
  { key: 'negotiator_issue_date' as const, label: 'Data', dbField: 'pedidos.negotiator_issue_date', render: (val: string | null) => formatDate(val) },
];

const mockColumns = [
  { key: 'nPedido' as const, label: 'Nº Pedido' },
  { key: 'descricao' as const, label: 'Descrição' },
  { key: 'fornecedor' as const, label: 'Fornecedor' },
  { key: 'analista' as const, label: 'Analista' },
  { key: 'status' as const, label: 'Status', render: (v: string) => <span className="capitalize">{v.replace(/_/g, ' ')}</span> },
  { key: 'obra' as const, label: 'Obra' },
  { key: 'data' as const, label: 'Data' },
  { key: 'valor' as const, label: 'Valor', render: (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
];
export default function PedidosPage() {
  const [showSLA, setShowSLA] = useState(false);
  const [showResp, setShowResp] = useState(false);
  const [showDispensados, setShowDispensados] = useState(false);
  const { activeMacroFilter, activeAnalistas, activeObras, activeTipos, setMacroFilter, clearMacroFilter } = useFilterStore();
  const macroStatus = activeMacroFilter?.page === PAGE ? activeMacroFilter.statusKey : null;
  const { analistas: dbAnalistas, obras: dbObras, tipos: dbTipos } = useFilterOptions();
  const { nomesVisiveis, isRestricted, obrasHabilitadas } = useAnalystFilter();
  const scope = { nomesVisiveis, obrasHabilitadas };
  const { user } = useAuthStore();
  void user;

  const { activePeriod, setPeriod } = useFilterStore();
  useEffect(() => { setPeriod(null); }, [setPeriod]);
  const periodoStr: [string, string] | null = activePeriod
    ? [activePeriod[0].toISOString(), activePeriod[1].toISOString()]
    : null;
  const filters: GlobalFilters = { analista: activeAnalistas, obra: activeObras, tipo: [], periodo: periodoStr };

  const { data: supaData, loading, refetch: refetchPedidos } = usePedidos({ ...filters, statusMacro: showDispensados ? null : macroStatus, modoResp: showResp, modoDispensados: showDispensados }, 0, scope);

  const { data: kpis, refetch: refetchKpis } = usePedidoKpis({ ...filters, modoResp: showResp }, scope);
  const { flags, flagsFormalizado, toggle, toggleFormalizado } = usePedidosFlag(() => {
    refetchKpis();
    if (macroStatus === 'ped_em_validacao' || macroStatus === 'a_formalizar') refetchPedidos();
  });


  const supaColumns = useMemo(() => {
    const base = buildBaseColumns(showSLA) as any[];
    if (showResp) {
      const respCol = {
        key: 'responsaveis_resolvidos' as const,
        label: 'Responsável(is)',
        dbField: 'vw_pedidos_pendencia_responsavel.responsaveis_resolvidos',
        render: (val: string[] | null, row: any) => {
          const lista = (val ?? []) as string[];
          const temInvalido = !!row.tem_responsavel_invalido;
          if (lista.length === 0) {
            return (
              <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-xs">
                <AlertTriangle size={12} />
                Sem responsável
              </span>
            );
          }
          return (
            <div
              className="flex flex-wrap gap-1"
              title={temInvalido ? 'Atenção: este pedido tem responsável(is) inativo(s) na planilha que foram excluídos' : undefined}
            >
              {lista.map(nome => (
                <span key={nome} className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-xs">
                  {nome}
                </span>
              ))}
              {temInvalido && <AlertTriangle size={14} className="text-amber-500" />}
            </div>
          );
        },
      };
      const idx = base.findIndex(c => c.key === 'quoting_negotiator_name');
      base.splice(idx + 1, 0, respCol);
    }
    return [
      ...base,
    ...(showSLA ? [
      {
        key: 'sla_aprovacao' as const,
        label: 'Aprovação',
        dbField: 'pedidos.releasing_date',
        render: (_: unknown, row: any) => <SlaCell dias={diffDias(row.negotiator_issue_date, row.releasing_date)} />,
      },
      {
        key: 'sla_formalizacao' as const,
        label: 'Formalização',
        dbField: 'pedidos.email_sent_date',
        render: (_: unknown, row: any) => <SlaCell dias={diffDias(row.releasing_date, row.email_sent_date)} />,
      },
      {
        key: 'sla_total' as const,
        label: 'SLA Total',
        dbField: '(calculado)',
        render: (_: unknown, row: any) => <SlaCell bold dias={diffDias(row.negotiator_issue_date, row.email_sent_date)} />,
      },
    ] : []),
    {
      key: 'minuta_flag' as const,
      label: 'Minuta',
      dbField: 'pedidos_flag_manual.dispensado',
      render: (_: unknown, row: any) => {
        const key = row.key;
        const dispensado = flags[key] ?? false;
        const precisaMinuta = !!row.precisa_minuta;

        const icone = dispensado ? (
          <XCircle size={20} className="text-red-500" />
        ) : precisaMinuta ? (
          <CheckCircle2 size={20} className="text-green-500" />
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        );

        if (!dispensado && !precisaMinuta) {
          return (
            <div className="flex items-center justify-center w-full">
              {icone}
            </div>
          );
        }

        return (
          <button
            onClick={() => toggle(key, !dispensado)}
            title={
              dispensado
                ? 'Dispensado manualmente — clique para reverter'
                : 'Precisa de minuta — clique para dispensar'
            }
            className="flex items-center justify-center w-full transition-transform hover:scale-110"
          >
            {icone}
          </button>
        );
      },
    },
    {
      key: 'formalizado_flag' as const,
      label: 'Formalizado',
      dbField: 'pedidos_flag_manual.formalizado',
      render: (_: unknown, row: any) => {
        const key = row.key;
        const formalizado = flagsFormalizado[key] ?? false;
        const icone = formalizado ? (
          <CheckCircle2 size={20} className="text-green-500" />
        ) : (
          <XCircle size={20} className="text-red-500" />
        );
        return (
          <button
            onClick={() => toggleFormalizado(key, !formalizado)}
            title={
              formalizado
                ? 'Marcado como formalizado — clique para reverter'
                : 'Clique para marcar como formalizado (baixa manual)'
            }
            className="flex items-center justify-center w-full transition-transform hover:scale-110"
          >
            {icone}
          </button>
        );
      },
    },
    ];
  }, [showSLA, showResp, flags, flagsFormalizado, toggle, toggleFormalizado]);

  const globalFiltered = useMemo(() => {
    if (!useMocksFlag) return [];
    let data = mockPedidos;
    if (activeAnalistas.length) data = data.filter(d => activeAnalistas.includes(d.analista));
    if (activeObras.length) data = data.filter(d => activeObras.includes(d.obra));
    return data;
  }, [activeAnalistas, activeObras]);

  const mockTableData = useMemo(() => {
    if (!macroStatus) return globalFiltered;
    return globalFiltered.filter(d => d.status === macroStatus);
  }, [globalFiltered, macroStatus]);

  const handleKpiClick = (statusKey: string | null, label: string) => {
    if (statusKey === null) clearMacroFilter();
    else if (macroStatus === statusKey) clearMacroFilter();
    else setMacroFilter(PAGE, statusKey, label);
  };

  const kpiValues = useMocksFlag
    ? {
        ped_em_aprovacao: globalFiltered.filter(d => d.status === 'ped_em_aprovacao').length,
        a_formalizar: globalFiltered.filter(d => d.status === 'a_formalizar').length,
        ped_em_validacao: globalFiltered.filter(d => d.status === 'ped_em_validacao').length,
        total: globalFiltered.length,
      }
    : {
        ped_em_aprovacao: kpis?.emAprovacao ?? 0,
        a_formalizar: kpis?.aFormalizar ?? 0,
        ped_em_validacao: kpis?.emValidacao ?? 0,
        total: kpis?.total ?? 0,
      };

  return (
    <div className="page-container">
      <PageHeader title="PEDIDOS" icon={<ShoppingCart className="h-5 w-5 text-primary-foreground" />} />
      <div className="flex items-center gap-3">
        <FilterBar analistas={isRestricted ? undefined : (useMocksFlag ? pedidoAnalistas : dbAnalistas)} obras={useMocksFlag ? pedidoObras : dbObras} />
        <button
          onClick={() => setShowSLA(p => !p)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${showSLA ? 'bg-accent text-accent-foreground border-accent' : 'border-border text-muted-foreground'}`}
        >
          📊 SLA
        </button>
        <button
          onClick={() => setShowResp(p => !p)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${showResp ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]' : 'border-border text-muted-foreground hover:bg-muted'}`}
        >
          <ClipboardList size={16} />
          Responsáveis
        </button>
        <button
          onClick={() => setShowDispensados(p => !p)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${showDispensados ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]' : 'border-border text-muted-foreground hover:bg-muted'}`}
        >
          <FolderArchive size={16} />
          Dispensados
        </button>

      </div>
      <div>
        <div className="flex-1">
          <div className="grid grid-cols-4 gap-3 mb-6">
            {kpiConfigs.map(kpi => {
              const fs = buildFilterStrings({
                dataInicio: activePeriod?.[0]?.toISOString().slice(0, 10),
                dataFim: activePeriod?.[1]?.toISOString().slice(0, 10),
                obras: activeObras,
                analistas: activeAnalistas,
              });
              const info = kpi.statusKey === 'ped_em_validacao'
                ? {
                    source: showResp ? 'vw_pedidos_pendencia_responsavel' : 'vw_pedidos_com_minuta_flag',
                    aggregation: 'COUNT',
                    filters: showResp
                      ? [
                          'MODO RESPONSÁVEIS ATIVO',
                          'purchase_order_type ≠ Cotação',
                          "status LIKE '%aprovado%'",
                          'flag_email_sent_boolean = true',
                          'flag_has_contract = false',
                          'precisa_minuta = true (cruzamento com excel_sla_familias)',
                          'Responsável: cruzamento de material_group com excel_responsaveis_contratacao',
                          'Obras excluídas: Indiretos, Acordo de Preço, Projetos, Pré Obra',
                          ...fs,
                        ]
                      : [
                          'purchase_order_type = Cotação',
                          "status LIKE '%aprovado%'",
                          'flag_email_sent_boolean = true',
                          'flag_has_contract = false',
                          'precisa_minuta = true',
                          'Obras excluídas: Indiretos, Acordo de Preço, Projetos, Pré Obra',
                          ...fs,
                        ],
                  }
                : kpi.debug(fs);
              return (
                <DebugTooltip key={kpi.label} info={info}>
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
          {loading && !useMocksFlag ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : !useMocksFlag && (supaData?.length ?? 0) === 0 && obrasHabilitadas !== null && obrasHabilitadas.length === 0 ? (
            <div className="border border-border rounded-lg p-12 text-center space-y-2">
              <p className="text-foreground font-medium">Nenhuma obra habilitada</p>
              <p className="text-sm text-muted-foreground">Contate o administrador para liberar o acesso às obras.</p>
            </div>
          ) : !useMocksFlag && (supaData?.length ?? 0) === 0 ? (
            <div className="border border-border rounded-lg p-12 text-center space-y-2">
              <p className="text-foreground font-medium">Nenhum registro encontrado</p>
              <p className="text-sm text-muted-foreground">Tente ajustar os filtros aplicados.</p>
            </div>
          ) : (
            <DebugTooltip info={{
              source: 'vw_pedidos_com_minuta_flag',
              aggregation: 'Lista filtrada',
              filters: [
                'Filtro macro: ' + (macroStatus ?? 'NENHUM — soma dos 3 cards'),
                ...buildFilterStrings({
                  dataInicio: activePeriod?.[0]?.toISOString().slice(0, 10),
                  dataFim: activePeriod?.[1]?.toISOString().slice(0, 10),
                  obras: activeObras,
                  analistas: activeAnalistas,
                }),
              ],
            }}>
              <DataTable
                columns={(useMocksFlag ? mockColumns : supaColumns) as any}
                data={(useMocksFlag ? mockTableData : (supaData ?? [])) as any}
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

