import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  ComposedChart, Line, LabelList,
} from 'recharts';
import { Building2, User, Calendar, DollarSign, FileText, Activity, CheckCircle, FileCheck, PenTool, CheckCheck } from 'lucide-react';
import atlasLogo from '@/assets/atlas-logo.png';
import { useOneKpis } from '@/hooks/useOneKpis';
import {
  useRequisicoesPorMes,
  useSpendMensalChart,
  useTopFornecedoresChart,
  useRankingObrasPorTipo,
} from '@/hooks/useOneCharts';
import { useUltimasContratacoes, useContratosTabela } from '@/hooks/useOneTables';
import { getObraInfo, type ObraInfo } from '@/services/onepageService';
import { usePercentualContratado } from '@/hooks/usePercentualContratado';

const PINK = '#FB2B67';
const PLACEHOLDER_FOTO = '/placeholder.svg';

const fmt = (v: number) =>
  v != null ? `R$ ${Math.abs(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` : '-';

const fmtEixo = (v: number): string => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v}`;
};

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR');
}

const statusCurto = (s?: string | null): string => {
  const v = (s ?? '').toLowerCase();
  if (v.includes('assinado')) return 'Assinado';
  if (v.includes('enviado')) return 'Em assinatura';
  if (v.includes('aprovado')) return 'Aprovado';
  if (v.includes('reprovado')) return 'Reprovado';
  if (v.includes('edição') || v.includes('edicao')) return 'Em edição';
  return s ?? '-';
};

const nomeObraCurto = (s?: string | null): string => {
  const v = String(s ?? '');
  return v.length > 26 ? v.slice(0, 24) + '…' : v;
};

async function toDataURL(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function HeaderKpi({
  label, value, icon, color, bg,
}: {
  label: string; value: React.ReactNode; icon: React.ReactNode; color: string; bg: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col min-h-[88px]">
      <div className="flex items-start justify-between">
        <span
          className="inline-flex items-center justify-center h-9 w-9 rounded-lg"
          style={{ backgroundColor: bg, color }}
        >
          {icon}
        </span>
        <span className="text-[10px] font-bold uppercase text-black text-right leading-tight pt-1">
          {label}
        </span>
      </div>
      <div className="mt-2 text-xl font-bold text-black tabular-nums">{value}</div>
    </div>
  );
}

function Panel({ title, children, headerRight }: { title: string; children: React.ReactNode; headerRight?: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 h-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[12px] font-bold uppercase text-black">{title}</h3>
        {headerRight}
      </div>
      {children}
    </div>
  );
}

function Empty({ label = 'Sem dados' }: { label?: string }) {
  return <div className="py-6 text-center text-xs text-gray-400">{label}</div>;
}

export default function RelatorioGestaoSuprimentos() {
  const [params] = useSearchParams();
  const obraParam = params.get('obra');
  const dataInicio = params.get('dataInicio') || undefined;
  const dataFim = params.get('dataFim') || undefined;
  const modo = params.get('modo') || 'preview';

  const obras = useMemo(
    () => (obraParam && obraParam !== 'TODAS_AS_OBRAS' ? [obraParam] : undefined),
    [obraParam]
  );

  const isUnica = !!obras && obras.length === 1;
  const obraLabel = isUnica ? obras![0] : 'TODAS AS OBRAS';

  const [info, setInfo] = useState<ObraInfo>({ cliente: 'Atlas Engenharia', foto_url: null });
  useEffect(() => {
    getObraInfo(isUnica ? obras![0] : null).then((r) => r.data && setInfo(r.data));
  }, [isUnica, obras]);

  const cliente = isUnica ? (info.cliente ?? '—') : 'Atlas Engenharia';

  // Logo em data URL (evita CORS no html2canvas)
  const [logoData, setLogoData] = useState<string | null>(null);
  useEffect(() => {
    toDataURL(atlasLogo).then(setLogoData);
  }, []);

  const chartFilters = { obras, analistas: undefined, dataInicio, dataFim, obrasHabilitadas: null };

  const { data: kpis } = useOneKpis({ obras, analistas: undefined, dataInicio, dataFim, obrasHabilitadas: null });
  const { data: reqMes } = useRequisicoesPorMes(chartFilters);
  const { data: spendMes } = useSpendMensalChart(chartFilters);
  const { data: top15 } = useTopFornecedoresChart(chartFilters);
  const { data: ranking } = useRankingObrasPorTipo(chartFilters);
  const { data: ultimas } = useUltimasContratacoes({ obras, dataInicio, dataFim, obrasHabilitadas: null });
  const { data: contratos } = useContratosTabela({ obras, dataInicio, dataFim, obrasHabilitadas: null });
  const { data: percentual } = usePercentualContratado({ obras });

  useEffect(() => {
    if (kpis && reqMes && spendMes && top15 && logoData !== null) {
      document.documentElement.dataset.relatorioReady = '1';
    }
  }, [kpis, reqMes, spendMes, top15, logoData]);

  const ult = (ultimas ?? []).slice(0, 10);
  const ctr = (contratos ?? []).slice(0, 10);
  const top15Slim = (top15 ?? []).slice(0, 15).map((f) => ({
    fornecedor: f.fornecedor,
    contratado: Math.round((f.contratado ?? 0) / 1000),
    executado: Math.round((f.executado ?? 0) / 1000),
    saldo: Math.round((f.saldo ?? 0) / 1000),
  }));

  const rankingData = (ranking ?? []).slice(0, 8).map((r: any) => ({
    ...r,
    total: (r.sup ?? 0) + (r.pd ?? 0) + (r.ap ?? 0),
  }));

  const percentualTop = (percentual ?? [])
    .slice()
    .sort((a, b) => (b.porcentagem ?? 0) - (a.porcentagem ?? 0))
    .slice(0, 13);

  const periodoLabel = dataInicio || dataFim
    ? `${fmtDate(dataInicio)} — ${fmtDate(dataFim)}`
    : 'Todo período';

  return (
    <div
      className={`relatorio-wrapper ${modo === 'export' ? 'modo-export' : ''}`}
      style={{ background: '#F3F4F6', minHeight: '100vh', padding: '12px' }}
    >
      <style>{`
        .relatorio-page { position: relative; width: 794px; margin: 0 auto; background: white; box-shadow: 0 0 8px rgba(0,0,0,0.1); padding: 0; display: flex; flex-direction: column; gap: 12px; overflow: hidden; }
        .modo-export .relatorio-page { box-shadow: none; }
        .relatorio-page * { font-family: 'Inter', system-ui, sans-serif; }
        .relatorio-bloco { page-break-inside: avoid; break-inside: avoid; }
        .relatorio-page > .relatorio-bloco:not(.relatorio-cabecalho) { margin-left: 24px; margin-right: 24px; }
        .relatorio-page > .relatorio-bloco:last-child { margin-bottom: 24px; }

        .relatorio-cabecalho { position: relative; display: flex; justify-content: space-between; align-items: flex-start; padding: 20px 24px 16px 24px; min-height: 230px; overflow: hidden; border-bottom: 1px solid #E5E7EB; }
        .ribbon-rosa { position: absolute; top: 0; right: 0; width: 220px; height: 90px; background: linear-gradient(225deg, ${PINK} 0%, ${PINK} 55%, transparent 55%); z-index: 0; pointer-events: none; }
        .cabecalho-esquerda { flex: 1; z-index: 1; max-width: 60%; }
        .logo-atlas { height: 48px; margin-bottom: 12px; }
        .titulo-relatorio { font-family: 'Times New Roman', Times, serif; font-weight: 700; font-size: 32px; line-height: 1.1; color: #000000; margin: 0 0 28px 0; letter-spacing: -0.5px; }
        .titulo-relatorio .rosa { color: ${PINK}; }
        .info-row { display: flex; gap: 40px; align-items: flex-start; }
        .info-item { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
        .icone-circulo { width: 58px; height: 58px; border: 2px solid ${PINK}; border-radius: 50%; background: transparent !important; display: flex; align-items: center; justify-content: center; }
        .icone-circulo svg { width: 28px; height: 28px; color: ${PINK}; stroke: ${PINK}; stroke-width: 1.8; fill: none; }
        .info-label { font-size: 11px; font-weight: 700; color: #000000; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 4px; }
        .info-valor { font-size: 13px; font-weight: 600; color: #1F2937; max-width: 170px; line-height: 1.25; }
        .cabecalho-foto { z-index: 1; position: relative; }
        .foto-obra { width: 270px; height: 210px; border-radius: 20px; object-fit: cover; display: block; }
        .foto-ph-box { width: 270px; height: 210px; border-radius: 20px; background: #F3F4F6; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .foto-ph-img { width: 150px; height: auto; display: block; }

        table.mini { width: 100%; font-size: 9px; border-collapse: collapse; table-layout: fixed; }
        table.mini th { text-align: left; font-size: 8px; text-transform: uppercase; color: #6B7280; padding: 3px 4px; border-bottom: 1px solid #E5E7EB; }
        table.mini td { padding: 7px 8px; border-bottom: 1px solid #F3F4F6; color: #111; max-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        table.mini tr:nth-child(even) td { background: #FAFAFA; }

        .perc-list { display: flex; flex-direction: column; gap: 6px; }
        .perc-row { display: grid; grid-template-columns: 170px 1fr 42px; align-items: center; gap: 8px; }
        .perc-nome { white-space: nowrap; color: #111; font-weight: 500; font-size: 9px; line-height: 12px; }
        .perc-bar-wrap { background: #F3F4F6; height: 8px; border-radius: 4px; overflow: hidden; }
        .perc-bar { height: 100%; background: #6B7280; }
        .perc-val { text-align: right; color: #111; font-weight: 600; font-size: 9px; line-height: 12px; font-variant-numeric: tabular-nums; }
      `}</style>

      <div className="relatorio-page">
        {/* ===== CABEÇALHO ===== */}
        <div className="relatorio-bloco relatorio-cabecalho">
          <div className="ribbon-rosa" />
          <div className="cabecalho-esquerda">
            {logoData ? (
              <img src={logoData} alt="Atlas" className="logo-atlas" />
            ) : (
              <img src={atlasLogo} alt="Atlas" className="logo-atlas" />
            )}
            <h1 className="titulo-relatorio">
              GESTÃO DE <span className="rosa">SUPRIMENTOS</span>
            </h1>
            <div className="info-row">
              <div className="info-item">
                <div className="icone-circulo"><Building2 /></div>
                <div className="info-label">Obra</div>
                <div className="info-valor">{obraLabel}</div>
              </div>
              <div className="info-item">
                <div className="icone-circulo"><User /></div>
                <div className="info-label">Cliente</div>
                <div className="info-valor">{cliente}</div>
              </div>
              <div className="info-item">
                <div className="icone-circulo"><Calendar /></div>
                <div className="info-label">Período</div>
                <div className="info-valor">{periodoLabel}</div>
              </div>
            </div>
          </div>
          <div className="cabecalho-foto">
            {info.foto_url ? (
              <img src={info.foto_url} alt="Obra" className="foto-obra" crossOrigin="anonymous" />
            ) : (
              <div className="foto-ph-box">
                <img src={PLACEHOLDER_FOTO} alt="Obra" className="foto-ph-img" crossOrigin="anonymous" />
              </div>
            )}
          </div>
        </div>

        {/* ===== KPI CARDS ===== */}
        <div className="relatorio-bloco relatorio-kpis grid grid-cols-5 gap-2">
          <HeaderKpi
            label="Contratado"
            value={`R$ ${((kpis?.contratado ?? 0) / 1e6).toFixed(1)}M`}
            icon={<DollarSign size={18} />}
            color="#FB2B67"
            bg="#FB2B671A"
          />
          <HeaderKpi
            label="Requisições"
            value={kpis?.requisicoes ?? 0}
            icon={<FileText size={18} />}
            color="#1E3A5F"
            bg="#1E3A5F1A"
          />
          <HeaderKpi
            label="Em Andamento"
            value={kpis?.emAndamento ?? 0}
            icon={<Activity size={18} />}
            color="#B88746"
            bg="#B887461A"
          />
          <HeaderKpi
            label="Concluídos"
            value={kpis?.processosConcluidos ?? 0}
            icon={<CheckCircle size={18} />}
            color="#7A9E7E"
            bg="#7A9E7E1A"
          />
          <div className="bg-white border border-gray-200 rounded-lg p-2 flex flex-col">
            <div className="flex items-start justify-between">
              <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg" style={{ backgroundColor: '#5D7A9A1A', color: '#5D7A9A' }}>
                <FileCheck size={14} />
              </span>
              <span className="text-[9px] font-bold uppercase text-black text-right">Contratos</span>
            </div>
            <div className="grid grid-cols-2 gap-1 mt-1">
              <div>
                <div className="flex items-center gap-1 text-gray-500">
                  <PenTool size={9} /><span className="text-[7px] uppercase">Assinatura</span>
                </div>
                <p className="text-base font-bold tabular-nums">{kpis?.emAssinatura ?? 0}</p>
              </div>
              <div>
                <div className="flex items-center gap-1 text-gray-500">
                  <CheckCheck size={9} /><span className="text-[7px] uppercase">Assinados</span>
                </div>
                <p className="text-base font-bold tabular-nums">{kpis?.assinados ?? 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ===== LINHA 1: Requisições por Mês + Spend ===== */}
        <div className="relatorio-bloco relatorio-linha-1 space-y-4">
          <Panel title="Requisições por Mês">
            {!reqMes || reqMes.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={reqMes} margin={{ top: 16, right: 8, left: 48, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Bar dataKey="quantidade" fill="#000000" isAnimationActive={false}>
                    <LabelList
                      dataKey="quantidade"
                      position="top"
                      formatter={(v: number) => (v > 0 ? v : '')}
                      style={{ fontSize: 9, fill: '#111' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Panel>
          <Panel title="Spend Mensal x Processos">
            {!spendMes || spendMes.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={spendMes} margin={{ top: 16, right: 8, left: 48, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" tick={{ fontSize: 9 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 9 }} tickFormatter={fmtEixo} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} />
                  <Bar yAxisId="left" dataKey="spend" fill="#9CA3AF" isAnimationActive={false} />
                  <Line yAxisId="right" dataKey="processos" stroke={PINK} strokeWidth={2} isAnimationActive={false} dot={{ r: 2 }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </Panel>
        </div>

        {/* ===== LINHA 2: Últimas Contratações + Contratos ===== */}
        <div className="relatorio-bloco relatorio-linha-2 space-y-4">
          <Panel title="Últimas Contratações">
            {ult.length === 0 ? <Empty /> : (
              <table className="mini">
                <thead>
                  <tr>
                    <th style={{ width: '34%' }}>Fornecedor</th>
                    <th style={{ width: '26%' }}>Grupo</th>
                    <th style={{ width: '22%' }}>Obra</th>
                    <th style={{ width: '18%', textAlign: 'right' }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {ult.map((r, i) => (
                    <tr key={i}>
                      <td>{r.fornecedor ?? '-'}</td>
                      <td>{r.grupo ?? '—'}</td>
                      <td>{r.obra ?? '-'}</td>
                      <td style={{ textAlign: 'right' }}>{fmt(r.valor ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
          <Panel title="Contratos">
            {ctr.length === 0 ? <Empty /> : (
              <table className="mini">
                <thead>
                  <tr>
                    <th style={{ width: '28%' }}>Fornecedor</th>
                    <th style={{ width: '22%' }}>Grupo</th>
                    <th style={{ width: '18%' }}>Obra</th>
                    <th style={{ width: '15%' }}>Status</th>
                    <th style={{ width: '17%', textAlign: 'right' }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {ctr.map((r, i) => (
                    <tr key={i}>
                      <td>{r.fornecedor ?? '-'}</td>
                      <td>{r.grupo ?? '—'}</td>
                      <td>{r.obra ?? '-'}</td>
                      <td>{statusCurto(r.status)}</td>
                      <td style={{ textAlign: 'right' }}>{fmt(r.valor ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </div>

        {/* ===== LINHA 3: TOP 15 (full width) ===== */}
        <div className="relatorio-bloco relatorio-linha-3">
          <Panel title="TOP 15 Fornecedores (R$ mil)">
            {top15Slim.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={top15Slim} margin={{ top: 10, right: 8, left: 48, bottom: 70 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="fornecedor"
                    tick={{ fontSize: 9 }}
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                    height={70}
                    tickFormatter={(v: string) => (v && v.length > 18 ? v.slice(0, 16) + '…' : v)}
                  />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={(v: number) => `R$ ${v}k`} />
                  <Bar dataKey="executado" stackId="b" fill="#9CA3AF" isAnimationActive={false} />
                  <Bar dataKey="saldo" stackId="b" fill="#FECDD3" isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Panel>
        </div>

        {/* ===== LINHA 4: Ranking (full width) — oculto se obra única ===== */}
        {!isUnica && (
          <div className="relatorio-bloco relatorio-linha-4">
            <Panel title="Ranking de Obras por Tipo">
              {rankingData.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={rankingData} margin={{ top: 20, right: 8, left: 48, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="obra"
                      tick={{ fontSize: 9 }}
                      interval={0}
                      angle={-30}
                      textAnchor="end"
                      height={60}
                      tickFormatter={(v: string) => (v && v.length > 14 ? v.slice(0, 12) + '…' : v)}
                    />
                    <YAxis tick={{ fontSize: 9 }} tickFormatter={(v: number) => `R$ ${(v / 1_000_000).toFixed(1)}M`} />
                    <Bar dataKey="sup" stackId="a" fill="#1E3A5F" isAnimationActive={false} />
                    <Bar dataKey="pd" stackId="a" fill="#5D7A9A" isAnimationActive={false} />
                    <Bar dataKey="ap" stackId="a" fill="#A8B5C4" isAnimationActive={false}>
                      <LabelList
                        dataKey="total"
                        position="top"
                        formatter={(v: number) =>
                          v > 0 ? `R$ ${(v / 1_000_000).toFixed(1)}M` : ''
                        }
                        style={{ fontSize: 8, fill: '#111' }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Panel>
          </div>
        )}

        {/* ===== LINHA 5: Percentual Contratado ===== */}
        <div className="relatorio-bloco relatorio-linha-5">
          <Panel title="Percentual Contratado">
            {percentualTop.length === 0 ? <Empty /> : (
              <div className="perc-list">
                {percentualTop.map((r, i) => {
                  const pct = Math.max(0, Math.min(100, r.porcentagem ?? 0));
                  return (
                    <div className="perc-row" key={i}>
                      <div className="perc-nome" title={r.obra}>{nomeObraCurto(r.obra)}</div>
                      <div className="perc-bar-wrap">
                        <div className="perc-bar" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="perc-val">{pct.toFixed(1)}%</div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
