import { useEffect, useMemo, useState } from 'react';
import { FileText, CheckCircle, Send, PenTool, ListChecks, Loader2, CheckCircle2, XCircle, FolderArchive, ClipboardCheck, Layers } from 'lucide-react';
import { useContratosFlag } from '@/hooks/useContratosFlag';
import { useFilterStore } from '@/stores/useFilterStore';
import { mockContratos, contratoAnalistas, contratoTipos, contratoObras } from '@/mocks/contratos';
import { useContratos, useContratoKpis } from '@/hooks/useContratos';
import { useFilterOptions } from '@/hooks/useFilterOptions';
import { useAnalystFilter } from '@/hooks/useAnalystFilter';
import { KpiCard } from '@/components/KpiCard';
import { DataTable } from '@/components/DataTable';
import { FilterBar } from '@/components/FilterBar';
import { PageHeader } from '@/components/PageHeader';
import SlaCell from '@/components/SlaCell';
import VigenciaFarol from '@/components/VigenciaFarol';
import { config } from '@/config/env';
import { formatDate } from '@/lib/formatters';
import { diffDias } from '@/lib/sla';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { DebugTooltip } from '@/components/DebugTooltip';
import { buildFilterStrings } from '@/lib/debugFilters';
import type { GlobalFilters } from '@/types/domain';

const useMocksFlag = config.useMocks;
const PAGE = 'contratos';
const kpiConfigs: { label: string; statusKey: string | null; icon: JSX.Element; iconColor: 'pinkAtlas'|'navyDeep'|'caramel'|'sageGreen'|'blueSlate'; debug: (fs: string[]) => { source: string; aggregation?: string; filters: string[] } }[] = [
  { label: 'Em Edição', statusKey: 'em_edicao', icon: <ClipboardCheck className="h-5 w-5" />, iconColor: 'caramel', debug: (fs) => ({ source: 'contratos.purchase_order_contract_status', aggregation: 'COUNT', filters: ["status IN ('Em edição', 'Reprovado')", 'Exclui contratos baixados manualmente', ...fs] }) },
  { label: 'Em Aprovação', statusKey: 'em_aprovacao', icon: <ClipboardCheck className="h-5 w-5" />, iconColor: 'navyDeep', debug: (fs) => ({ source: 'contratos.purchase_order_contract_status', aggregation: 'COUNT', filters: ["status LIKE '%aguardando aprovação%'", 'Exclui contratos baixados manualmente', ...fs] }) },
  { label: 'Enviar D4Sign', statusKey: 'enviar_d4sign', icon: <Send className="h-5 w-5" />, iconColor: 'navyDeep', debug: (fs) => ({ source: 'contratos.purchase_order_contract_status', aggregation: 'COUNT', filters: ["status = 'Aprovado' (exato)", 'Exclui contratos baixados manualmente', ...fs] }) },
  { label: 'Em Assinatura', statusKey: 'em_assinatura', icon: <PenTool className="h-5 w-5" />, iconColor: 'caramel', debug: (fs) => ({ source: 'contratos.purchase_order_contract_status', aggregation: 'COUNT', filters: ["status IN ('Enviado para assinatura digital', 'Enviado para plataforma digital (Aguardando Signatários)')", 'Exclui contratos baixados manualmente', ...fs] }) },
  { label: 'Total', statusKey: null as string | null, icon: <Layers className="h-5 w-5" />, iconColor: 'blueSlate', debug: (fs) => ({ source: 'contratos', aggregation: 'COUNT total', filters: ['Exclui contratos baixados manualmente', ...fs] }) },
];


const baseSupaColumns = [
  { key: 'purchase_order_number_formatted' as const, label: 'Nº Contrato', dbField: 'contratos.purchase_order_number_formatted' },
  { key: 'sup_corporate_name' as const, label: 'Fornecedor', dbField: 'contratos.sup_corporate_name' },
  { key: 'created_by_name' as const, label: 'Analista', dbField: 'contratos.created_by_name', render: (v: string | null) => v ?? '—' },
  { key: 'purchase_order_contract_status' as const, label: 'Status', dbField: 'contratos.purchase_order_contract_status' },
  { key: 'cost_collector' as const, label: 'Obra', dbField: 'contratos.cost_collector' },
  { key: 'material_groups' as const, label: 'Tipo/Material', dbField: 'contratos.material_groups' },
  { key: 'start_date_contract' as const, label: 'Data Início', dbField: 'contratos.start_date_contract', render: (val: string | null) => formatDate(val) },
  { key: 'finish_date_contract' as const, label: 'Data Fim', dbField: 'contratos.finish_date_contract', render: (val: string | null) => formatDate(val) },
  { key: 'value' as const, label: 'Valor', dbField: 'contratos.value', render: (v: number) => v ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-' },
  { key: 'balance' as const, label: 'Saldo', dbField: 'contratos.balance', render: (v: number) => v ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-' },

];

const mockColumns = [
  { key: 'nContrato' as const, label: 'Nº Contrato' },
  { key: 'fornecedor' as const, label: 'Fornecedor' },
  { key: 'analista' as const, label: 'Analista' },
  { key: 'status' as const, label: 'Status', render: (v: string) => <span className="capitalize">{v.replace(/_/g, ' ')}</span> },
  { key: 'tipo' as const, label: 'Tipo' },
  { key: 'obra' as const, label: 'Obra' },
  { key: 'dataInicio' as const, label: 'Data Início' },
  { key: 'valor' as const, label: 'Valor', render: (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
];

export default function ContratosPage() {
  const [showSLA, setShowSLA] = useState(false);
  const [showBaixados, setShowBaixados] = useState(false);
  const [vigenciaOkMap, setVigenciaOkMap] = useState<Record<number, boolean>>({});
  const user = useAuthStore(state => state.user);
  const { activeMacroFilter, activeAnalistas, activeTipos, activeObras, setMacroFilter, clearMacroFilter } = useFilterStore();
  const macroStatus = activeMacroFilter?.page === PAGE ? activeMacroFilter.statusKey : null;
  const { analistas: dbAnalistas, obras: dbObras, tipos: dbTipos } = useFilterOptions();
  const { nomesVisiveis: analystName, isRestricted } = useAnalystFilter();
  const podeEditarBaixa = (user?.nivel ?? 99) <= 2;

  const { activePeriod, setPeriod } = useFilterStore();
  useEffect(() => { setPeriod(null); }, [setPeriod]);
  const periodoStr: [string, string] | null = activePeriod
    ? [activePeriod[0].toISOString(), activePeriod[1].toISOString()]
    : null;
  const filters: GlobalFilters = { analista: activeAnalistas, obra: activeObras, tipo: activeTipos, periodo: periodoStr };

  const { data: supaData, loading, refetch: refetchContratos } = useContratos({ ...filters, statusMacro: showBaixados ? null : macroStatus, modoBaixados: showBaixados }, 0, analystName);
  const { data: kpis, refetch: refetchKpis } = useContratoKpis(filters, analystName);
  const { flags, toggle } = useContratosFlag(() => {
    refetchContratos();
    refetchKpis();
  });

  useEffect(() => {
    supabase
      .from('contrato_vigencia_ok')
      .select('contrato_id, ok')
      .then(({ data }) => {
        if (data) {
          const map: Record<number, boolean> = {};
          (data as any[]).forEach(r => { map[r.contrato_id] = r.ok });
          setVigenciaOkMap(map);
        }
      });
  }, []);

  const handleVigenciaCheck = async (id: number, checked: boolean) => {
    setVigenciaOkMap(prev => ({ ...prev, [id]: checked }));
    await (supabase as any)
      .from('contrato_vigencia_ok')
      .upsert({
        contrato_id: id,
        ok: checked,
        updated_by: user?.id,
      }, { onConflict: 'contrato_id' });
  };

  const supaColumns = useMemo(() => [
    ...baseSupaColumns,
    {
      key: 'vigencia' as const,
      label: 'Vigência',
      dbField: '(calculado)',
      render: (_: unknown, row: any) => (
        <VigenciaFarol
          finishDate={row.finish_date_contract}
          balance={row.balance}
          checked={vigenciaOkMap[row.id] ?? false}
          onCheck={handleVigenciaCheck}
          rowId={row.id}
        />
      ),
    },
    ...(showSLA ? [
      {
        key: 'sla_envio_aprv' as const,
        label: 'Envio Aprv.',
        dbField: 'contratos.sent_to_approval_date',
        render: (_: unknown, row: any) => <SlaCell dias={diffDias(row.created_when, row.sent_to_approval_date)} />,
      },
      {
        key: 'sla_aprovacao' as const,
        label: 'Aprovação',
        dbField: 'contratos.released_date',
        render: (_: unknown, row: any) => <SlaCell dias={diffDias(row.sent_to_approval_date, row.released_date)} />,
      },
      {
        key: 'sla_envio_assin' as const,
        label: 'Envio Assin.',
        dbField: 'contratos.email_date',

        render: (_: unknown, row: any) => <SlaCell dias={diffDias(row.released_date, row.email_date)} />,
      },
      {
        key: 'sla_total' as const,
        label: 'SLA Total',
        dbField: '(calculado)',
        render: (_: unknown, row: any) => <SlaCell bold dias={diffDias(row.created_when, row.email_date)} />,
      },
    ] : []),
    {
      key: 'baixado' as const,
      label: 'Baixado',
      dbField: 'contratos_flag_manual.baixado',
      render: (_: unknown, row: any) => {
        const key = row.key as string;
        const baixado = flags[key] ?? false;

        const icone = baixado ? (
          <XCircle size={20} className="text-red-500" />
        ) : (
          <CheckCircle2 size={20} className="text-green-500" />
        );

        if (!podeEditarBaixa) {
          return (
            <div
              className="flex items-center justify-center w-full"
              title="Apenas Admin/Gestor podem alterar a flag de baixa"
            >
              {icone}
            </div>
          );
        }

        return (
          <button
            onClick={() => toggle(key, !baixado)}
            title={
              baixado
                ? 'Baixado manualmente — clique para reverter'
                : 'Contrato ativo — clique para baixar'
            }
            className="flex items-center justify-center w-full transition-transform hover:scale-110"
          >
            {icone}
          </button>
        );
      },
    },
  ], [showSLA, vigenciaOkMap, user?.id, flags, toggle, podeEditarBaixa]);

  const globalFiltered = useMemo(() => {
    if (!useMocksFlag) return [];
    let data = mockContratos;
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

  const kpiValues = useMocksFlag
    ? {
        em_edicao: globalFiltered.filter(d => d.status === 'pendente_aprovacao').length,
        em_aprovacao: globalFiltered.filter(d => d.status === 'em_aprovacao').length,
        enviar_d4sign: globalFiltered.filter(d => d.status === 'enviar_d4sign').length,
        em_assinatura: globalFiltered.filter(d => d.status === 'em_assinatura').length,
        total: globalFiltered.length,
      }
    : {
        em_edicao: kpis?.emEdicao ?? 0,
        em_aprovacao: kpis?.emAprovacao ?? 0,
        enviar_d4sign: kpis?.enviarD4Sign ?? 0,
        em_assinatura: kpis?.emAssinatura ?? 0,
        total: kpis?.total ?? 0,
      };

  return (
    <div className="page-container">
      <PageHeader title="CONTRATOS" icon={<FileText className="h-5 w-5 text-primary-foreground" />} />
      <div className="flex items-center gap-3">
        <FilterBar analistas={isRestricted ? undefined : (useMocksFlag ? contratoAnalistas : dbAnalistas)} tipos={useMocksFlag ? contratoTipos : dbTipos} obras={useMocksFlag ? contratoObras : dbObras} />
        <button
          onClick={() => setShowSLA(p => !p)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${showSLA ? 'bg-accent text-accent-foreground border-accent' : 'border-border text-muted-foreground'}`}
        >
          📊 SLA
        </button>
        <button
          onClick={() => setShowBaixados(p => !p)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${showBaixados ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]' : 'border-border text-muted-foreground hover:bg-muted'}`}
        >
          <FolderArchive size={16} />
          Baixados
        </button>
      </div>
      <div>
        <div className="flex-1">
          <div className="grid grid-cols-5 gap-3 mb-6">
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
          {loading && !useMocksFlag ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <DebugTooltip info={{
              source: 'contratos (filtro implícito: soma dos 3 cards)',
              aggregation: 'Lista filtrada',
              filters: [
                showBaixados
                  ? 'MODO BAIXADOS — mostrando APENAS contratos baixados manualmente'
                  : 'Exclui contratos baixados manualmente',
                'Filtro macro: ' + (showBaixados ? 'IGNORADO' : (macroStatus ?? 'NENHUM — soma dos 3 cards')),
                'Analista filtra por: created_by_name',
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
