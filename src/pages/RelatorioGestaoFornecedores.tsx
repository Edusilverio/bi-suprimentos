import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  ComposedChart, Line, LabelList,
} from 'recharts';
import { Building2, User, Calendar } from 'lucide-react';
import atlasLogo from '@/assets/atlas-logo.png';
import { useAvaliacaoMensal, useFornecedoresAvaliacao } from '@/hooks/useFornecedoresAvaliacao';
import { useParceriasFornecedores } from '@/hooks/useParcerias';
import { RATING_MAP, formatarMesAbbr, classificarRating } from '@/lib/avaliacao';
import { getObraInfo, type ObraInfo } from '@/services/onepageService';

const PINK = '#FB2B67';
const PLACEHOLDER_FOTO = '/placeholder.svg';

const CLASSIF_TO_RATING: Record<string, number> = {
  Otimo: 40, Bom: 30, Regular: 20, Ruim: 10,
};

const fmt = (v: number) =>
  v != null ? `R$ ${Math.abs(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` : '-';

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR');
}

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

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 h-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[12px] font-bold uppercase text-black">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Empty({ label = 'Sem dados' }: { label?: string }) {
  return <div className="py-6 text-center text-xs text-gray-400">{label}</div>;
}

// TickTruncado — nomes longos com reticências no eixo X.
const TickTruncado = (props: any) => {
  const { x, y, payload } = props;
  const raw = String(payload?.value ?? '');
  const label = raw.length > 16 ? raw.slice(0, 15) + '…' : raw;
  return (
    <g transform={`translate(${x},${y})`}>
      <text transform="rotate(-45)" textAnchor="end" dy={4} dx={-4} fontSize={8} fill="#374151">
        {label}
      </text>
    </g>
  );
};

// Divide array em chunks de tamanho n (para paginação).
function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

export default function RelatorioGestaoFornecedores() {
  const [params] = useSearchParams();

  // ===== Filtros lidos da URL =====
  const obraParam = params.get('obra');
  const obrasParam = params.get('obras'); // "OBRA A|OBRA B"
  const dataInicio = params.get('dataInicio') || undefined;
  const dataFim = params.get('dataFim') || undefined;
  const modo = params.get('modo') || 'preview';
  const secao = (params.get('secao') as 'avaliacao' | 'parcerias' | null) ?? null;

  const fornecedorParam = params.get('fornecedor') || '';
  const classifParam = params.get('classificacoes') || ''; // "Otimo,Bom"
  const gruposParam = params.get('grupos') || ''; // "GRUPO A|GRUPO B"
  const mesParam = params.get('mes') || null;

  const obras = useMemo(() => {
    if (obrasParam) return obrasParam.split('|').map(s => s.trim()).filter(Boolean);
    if (obraParam && obraParam !== 'TODAS_AS_OBRAS') return [obraParam];
    return undefined;
  }, [obrasParam, obraParam]);

  const grupos = useMemo(
    () => (gruposParam ? gruposParam.split('|').map(s => s.trim()).filter(Boolean) : []),
    [gruposParam]
  );

  const ratings = useMemo(() => {
    if (!classifParam) return null;
    return classifParam
      .split(',')
      .map(s => CLASSIF_TO_RATING[s.trim()])
      .filter((v): v is number => typeof v === 'number');
  }, [classifParam]);

  const isUnica = !!obras && obras.length === 1;
  const obraLabel = obras?.length
    ? obras.length === 1 ? obras[0] : `${obras.length} OBRAS`
    : 'TODAS AS OBRAS';

  // ===== Logo em base64 (evita CORS no html2canvas) =====
  const [logoData, setLogoData] = useState<string | null>(null);
  useEffect(() => { toDataURL(atlasLogo).then(setLogoData); }, []);

  // ===== Info da obra =====
  const [info, setInfo] = useState<ObraInfo>({ cliente: 'Atlas Engenharia', foto_url: null });
  useEffect(() => {
    getObraInfo(isUnica ? obras![0] : null).then((r) => r.data && setInfo(r.data));
  }, [isUnica, obras]);
  const cliente = isUnica ? (info.cliente ?? '—') : 'Atlas Engenharia';

  const baseFilters = { obras, dataInicio, dataFim, fornecedor: fornecedorParam || undefined };

  // ===== Dados =====
  const { data: avaliacaoMensal } = useAvaliacaoMensal(baseFilters);
  const { data: avaliacaoRows } = useFornecedoresAvaliacao({
    ...baseFilters,
    mes: mesParam,
    ratings: ratings && ratings.length ? ratings : null,
  });
  const { data: parcerias } = useParceriasFornecedores({
    obras, dataInicio, dataFim, grupos,
    fornecedor: fornecedorParam || undefined,
  });

  useEffect(() => {
    if (avaliacaoMensal && avaliacaoRows && parcerias && logoData !== null) {
      document.documentElement.dataset.relatorioReady = '1';
    }
  }, [avaliacaoMensal, avaliacaoRows, parcerias, logoData]);

  // ===== Preparação de dados =====
  const chartAval = (avaliacaoMensal ?? []).map(r => ({
    ...r,
    mesLabel: formatarMesAbbr(r.mes),
    total: (r.otimo ?? 0) + (r.bom ?? 0) + (r.regular ?? 0) + (r.ruim ?? 0),
  }));

  const parceriasChart = (parcerias ?? [])
    .slice(0, 20)
    .map(p => ({
      nome: p.fornecedor,
      valor: Math.round((p.valor ?? 0) / 1000),
      obras: p.qtdObras,
    }));

  // Para manter o PDF utilizável (evita relatórios de centenas de páginas):
  // ordena a avaliação pelas PIORES primeiro (Ruim → Regular → Bom → Ótimo)
  // e limita a quantidade de linhas das duas tabelas nominais.
  const AVAL_MAX = 60;
  const PARC_MAX = 60;
  const avalAll = [...(avaliacaoRows ?? [])]
    .sort((a, b) => (a.general_rating ?? 999) - (b.general_rating ?? 999))
    .slice(0, AVAL_MAX);
  const avalChunks = chunk(avalAll, 20);
  const parcAll = (parcerias ?? []).slice(0, PARC_MAX);
  const parcChunks = chunk(parcAll, 20);

  const periodoLabel = dataInicio || dataFim
    ? `${fmtDate(dataInicio)} — ${fmtDate(dataFim)}`
    : 'Todo período';

  const filtrosLabel = useMemo(() => {
    const parts: string[] = [];
    if (fornecedorParam) parts.push(`Fornecedor: ${fornecedorParam}`);
    if (classifParam) parts.push(`Classificação: ${classifParam.replace(/,/g, ', ')}`);
    if (grupos.length) parts.push(`Grupos: ${grupos.join(', ')}`);
    if (mesParam) parts.push(`Mês: ${mesParam}`);
    return parts.length ? parts.join(' · ') : null;
  }, [fornecedorParam, classifParam, grupos, mesParam]);

  const mostrarAval = secao === null || secao === 'avaliacao';
  const mostrarParc = secao === null || secao === 'parcerias';

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

        .relatorio-cabecalho { position: relative; display: flex; justify-content: space-between; align-items: flex-start; padding: 20px 24px 16px 24px; min-height: 260px; overflow: hidden; border-bottom: 1px solid #E5E7EB; }
        .ribbon-rosa { position: absolute; top: 0; right: 0; width: 220px; height: 90px; background: linear-gradient(225deg, ${PINK} 0%, ${PINK} 55%, transparent 55%); z-index: 0; pointer-events: none; }
        .cabecalho-esquerda { flex: 1; z-index: 1; max-width: 60%; }
        .logo-atlas { height: 48px; margin-bottom: 12px; }
        .titulo-relatorio { font-family: 'Times New Roman', Times, serif; font-weight: 700; font-size: 34px; line-height: 1.1; color: #000000; margin: 0 0 20px 0; letter-spacing: -0.5px; }
        .titulo-relatorio .rosa { color: ${PINK}; }
        .info-row { display: flex; gap: 44px; align-items: flex-start; }
        .info-item { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
        .icone-circulo { width: 54px; height: 54px; border: 2px solid ${PINK}; border-radius: 50%; background: transparent !important; display: flex; align-items: center; justify-content: center; }
        .icone-circulo svg { width: 26px; height: 26px; color: ${PINK}; stroke: ${PINK}; stroke-width: 1.8; fill: none; }
        .info-label { font-size: 11px; font-weight: 700; color: #000000; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 4px; }
        .info-valor { font-size: 12px; font-weight: 600; color: #1F2937; max-width: 170px; line-height: 1.25; }
        .cabecalho-foto { z-index: 1; position: relative; }
        .foto-obra { width: 290px; height: 240px; border-radius: 20px; object-fit: cover; display: block; }
        .foto-ph-box { width: 290px; height: 240px; border-radius: 20px; background: #F3F4F6; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .foto-ph-img { width: 160px; height: auto; display: block; }
        .filtros-ativos { margin-top: 12px; padding: 6px 10px; background: #F3F4F6; border-left: 3px solid ${PINK}; border-radius: 4px; font-size: 10px; color: #374151; }

        table.mini { width: 100%; font-size: 9px; border-collapse: collapse; table-layout: fixed; }
        table.mini th { text-align: left; font-size: 8px; text-transform: uppercase; color: #6B7280; padding: 3px 4px; border-bottom: 1px solid #E5E7EB; }
        table.mini td { padding: 3px 4px; border-bottom: 1px solid #F3F4F6; color: #111; vertical-align: top; word-wrap: break-word; overflow-wrap: anywhere; }
        table.mini tr:nth-child(even) td { background: #FAFAFA; }
        .pill { display: inline-block; padding: 1px 6px; border-radius: 999px; font-size: 8px; font-weight: 600; white-space: nowrap; }
      `}</style>

      <div className="relatorio-page">
        {/* ===== CABEÇALHO ===== */}
        <div className="relatorio-bloco relatorio-cabecalho">
          <div className="ribbon-rosa" />
          <div className="cabecalho-esquerda">
            {logoData ? (
              <img src={logoData} alt="Atlas" className="logo-atlas" />
            ) : (
              <img src={atlasLogo} alt="Atlas" className="logo-atlas" crossOrigin="anonymous" />
            )}
            <h1 className="titulo-relatorio">
              GESTÃO DE <span className="rosa">FORNECEDORES</span>
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
            {filtrosLabel && <div className="filtros-ativos">Filtros: {filtrosLabel}</div>}
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

        {/* ===== AVALIAÇÃO ===== */}
        {mostrarAval && (
          <>
            <div className="relatorio-bloco relatorio-aval-grafico">
              <Panel title="Avaliação Mensal por Classificação">
                {chartAval.length === 0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={chartAval} margin={{ top: 20, right: 10, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mesLabel" tick={{ fontSize: 9 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 9 }} />
                      <Bar dataKey="otimo" name="Ótimo" stackId="a" fill={RATING_MAP[40].cor} isAnimationActive={false} />
                      <Bar dataKey="bom" name="Bom" stackId="a" fill={RATING_MAP[30].cor} isAnimationActive={false} />
                      <Bar dataKey="regular" name="Regular" stackId="a" fill={RATING_MAP[20].cor} isAnimationActive={false} />
                      <Bar dataKey="ruim" name="Ruim" stackId="a" fill={RATING_MAP[10].cor} isAnimationActive={false}>
                        <LabelList dataKey="total" position="top" style={{ fontSize: 9, fill: '#374151' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
                <div className="flex flex-wrap gap-3 justify-center mt-2 text-[9px] text-gray-600">
                  {[40, 30, 20, 10].map(v => (
                    <span key={v} className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: RATING_MAP[v as 40].cor }} />
                      {RATING_MAP[v as 40].label}
                    </span>
                  ))}
                </div>
              </Panel>
            </div>

            {/* Tabela em chunks de 20 linhas — cada chunk é um bloco paginável */}
            {avalChunks.length === 0 ? (
              <div className="relatorio-bloco relatorio-aval-chunk">
                <Panel title="Fornecedores — Avaliação"><Empty /></Panel>
              </div>
            ) : (
              avalChunks.map((linhas, idx) => (
                <div key={`aval-${idx}`} className="relatorio-bloco relatorio-aval-chunk">
                  <Panel title={`Fornecedores — Avaliação${avalChunks.length > 1 ? ` (${idx + 1}/${avalChunks.length})` : ''}`}>
                    <table className="mini">
                      <colgroup>
                        <col style={{ width: '24%' }} />
                        <col style={{ width: '12%' }} />
                        <col style={{ width: '14%' }} />
                        <col style={{ width: '8%' }} />
                        <col style={{ width: '10%' }} />
                        <col style={{ width: '32%' }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th>Fornecedor</th>
                          <th>Tipo</th>
                          <th>Obra</th>
                          <th>Mês</th>
                          <th>Avaliação</th>
                          <th>Observação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {linhas.map((r, i) => {
                          const c = classificarRating(r.general_rating ?? -1);
                          return (
                            <tr key={i}>
                              <td>{r.supplier_corporate_name ?? '-'}</td>
                              <td>{r.quality_supply_type ?? '—'}</td>
                              <td>{r.cost_collector ?? '-'}</td>
                              <td>{r.month_and_year_formatted ?? '—'}</td>
                              <td>
                                <span className="pill" style={{ background: `${c.cor}22`, color: c.cor, border: `1px solid ${c.cor}55` }}>
                                  {c.label}
                                </span>
                              </td>
                              <td>{(r.observation && String(r.observation).trim()) || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </Panel>
                </div>
              ))
            )}
          </>
        )}

        {/* ===== PARCERIAS ===== */}
        {mostrarParc && (
          <>
            <div className="relatorio-bloco relatorio-parc-grafico">
              <Panel title="Fornecedores — Parcerias (Custo x Nº de Obras)">
                {parceriasChart.length === 0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart data={parceriasChart} margin={{ top: 24, right: 20, left: 0, bottom: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="nome" tick={<TickTruncado />} interval={0} height={110} />
                      <YAxis yAxisId="left" tick={{ fontSize: 8 }} tickFormatter={(v) => `R$ ${v}k`} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 8 }} allowDecimals={false} />
                      <Bar yAxisId="left" dataKey="valor" fill="#6B7280" isAnimationActive={false}>
                        <LabelList
                          dataKey="valor"
                          position="top"
                          style={{ fontSize: 8, fill: '#374151' }}
                          formatter={(v: any) => `R$ ${Number(v).toLocaleString('pt-BR')}k`}
                        />
                      </Bar>
                      <Line yAxisId="right" dataKey="obras" stroke={PINK} strokeWidth={2} dot={{ r: 2, fill: PINK }} isAnimationActive={false}>
                        <LabelList dataKey="obras" position="top" style={{ fontSize: 9, fill: PINK, fontWeight: 600 }} />
                      </Line>
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
                <p className="text-[9px] text-gray-500 italic mt-1 px-1">
                  Critério de parceria: fornecedores presentes em 2 ou mais obras da empresa (o valor exibido respeita os filtros aplicados).
                </p>
              </Panel>
            </div>

            {parcChunks.length === 0 ? (
              <div className="relatorio-bloco relatorio-parc-chunk">
                <Panel title="Fornecedores — Parcerias"><Empty /></Panel>
              </div>
            ) : (
              parcChunks.map((linhas, idx) => (
                <div key={`parc-${idx}`} className="relatorio-bloco relatorio-parc-chunk">
                  <Panel title={`Fornecedores — Parcerias${parcChunks.length > 1 ? ` (${idx + 1}/${parcChunks.length})` : ''}`}>
                    <table className="mini">
                      <colgroup>
                        <col style={{ width: '60%' }} />
                        <col style={{ width: '18%' }} />
                        <col style={{ width: '22%' }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th>Fornecedor</th>
                          <th style={{ textAlign: 'center' }}>Nº Obras</th>
                          <th style={{ textAlign: 'right' }}>Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {linhas.map((r, i) => (
                          <tr key={i}>
                            <td>{r.fornecedor ?? '-'}</td>
                            <td style={{ textAlign: 'center' }}>{r.qtdObras}</td>
                            <td style={{ textAlign: 'right' }}>{fmt(r.valor ?? 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Panel>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
