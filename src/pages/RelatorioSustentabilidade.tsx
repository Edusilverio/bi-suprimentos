import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { Building2, User, Calendar, Droplets, Zap, Trash2, Fuel } from 'lucide-react';
import atlasLogo from '@/assets/atlas-logo.png';
import { getObraInfo, type ObraInfo } from '@/services/onepageService';
import { useIndicadoresSustentabilidade } from '@/hooks/useIndicadoresSustentabilidade';
import type { IndicadorSustentabilidadeRow } from '@/services/indicadoresSustentabilidadeService';

const PINK = '#FB2B67';
const PLACEHOLDER_FOTO = '/placeholder.svg';

const COR = {
  agua: '#2563EB',
  energia: '#D97706',
  residuos: '#059669',
  diesel: '#EA580C',
  texto: '#111827',
  textoSuave: '#6B7280',
  borda: '#E5E7EB',
};

const MES_LABELS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const RESIDUO_TIPOS: { key: keyof IndicadorSustentabilidadeRow; label: string; color: string }[] = [
  { key: 'residuo_entulho_m3', label: 'Entulho', color: '#B88746' },
  { key: 'residuo_madeira_m3', label: 'Madeira', color: '#7A5230' },
  { key: 'residuo_gesso_m3', label: 'Gesso', color: '#D9CBB0' },
  { key: 'residuo_classe_c_m3', label: 'Classe C', color: '#5D7A9A' },
  { key: 'residuo_reciclavel_m3', label: 'Recicláveis', color: '#059669' },
  { key: 'residuo_misto_m3', label: 'Misto', color: '#8A8A8A' },
  { key: 'residuo_sucata_m3', label: 'Sucata', color: '#1E3A5F' },
  { key: 'residuo_perigoso_m3', label: 'Perigoso', color: '#DC2626' },
];

function fmtNum(v: number | null | undefined, dec = 1): string {
  if (v == null || !isFinite(Number(v))) return '—';
  return Number(v).toLocaleString('pt-BR', { maximumFractionDigits: dec, minimumFractionDigits: dec });
}

function fmtPct(v: number | null | undefined, dec = 1): string {
  if (v == null || !isFinite(Number(v))) return '—';
  return `${Number(v).toFixed(dec).replace('.', ',')}%`;
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso.slice(0, 10) + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR');
}

function fmtMesAnoCurto(ym: string): string {
  const [y, m] = ym.slice(0, 7).split('-').map(Number);
  return `${MES_LABELS[(m ?? 1) - 1]}/${String(y).slice(2)}`;
}

function soma(rows: IndicadorSustentabilidadeRow[], key: keyof IndicadorSustentabilidadeRow): number | null {
  const arr = rows.map(r => r[key]).filter((x): x is number => typeof x === 'number' && isFinite(x));
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0);
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

function HeaderKpi({ label, value, unidade, icon, color, bg }: {
  label: string; value: string; unidade: string; icon: React.ReactNode; color: string; bg: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col min-h-[88px]">
      <div className="flex items-start justify-between">
        <span className="inline-flex items-center justify-center h-9 w-9 rounded-lg" style={{ backgroundColor: bg, color }}>
          {icon}
        </span>
        <span className="text-[10px] font-bold uppercase text-black text-right leading-tight pt-1">{label}</span>
      </div>
      <div className="mt-2 text-xl font-bold text-black tabular-nums whitespace-nowrap">{value}</div>
      <div className="text-[10px] text-gray-500">{unidade}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 h-full">
      <h3 className="text-[12px] font-bold uppercase text-black mb-2">{title}</h3>
      {children}
    </div>
  );
}

function Empty({ label = 'Sem dados' }: { label?: string }) {
  return <div className="py-6 text-center text-xs text-gray-400">{label}</div>;
}

export default function RelatorioSustentabilidade() {
  const [params] = useSearchParams();
  const obraParam = params.get('obra');
  const dataInicio = params.get('dataInicio') || undefined;
  const dataFim = params.get('dataFim') || undefined;
  const modo = params.get('modo') || 'preview';

  const { rows, loading } = useIndicadoresSustentabilidade();

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

  const [logoData, setLogoData] = useState<string | null>(null);
  useEffect(() => { toDataURL(atlasLogo).then(setLogoData); }, []);

  const deYM = dataInicio ? dataInicio.slice(0, 7) : '';
  const ateYM = dataFim ? dataFim.slice(0, 7) : '';

  const escopo = useMemo(
    () => (obras ? rows.filter(r => r.cost_collector && obras.includes(r.cost_collector)) : rows),
    [rows, obras]
  );

  const rowsPeriodo = useMemo(() => escopo.filter(r => {
    const k = (r.mes_referencia ?? '').slice(0, 7);
    if (!k) return false;
    if (deYM && k < deYM) return false;
    if (ateYM && k > ateYM) return false;
    return true;
  }), [escopo, deYM, ateYM]);

  const kpis = useMemo(() => ({
    agua: soma(rowsPeriodo, 'agua_m3'),
    energia: soma(rowsPeriodo, 'energia_kwh'),
    residuos: soma(rowsPeriodo, 'residuo_total_m3'),
    diesel: soma(rowsPeriodo, 'diesel_l'),
  }), [rowsPeriodo]);

  const serie = useMemo(() => {
    const meses = Array.from(new Set(rowsPeriodo.map(r => (r.mes_referencia ?? '').slice(0, 7)).filter(Boolean))).sort();
    return meses.map(ym => {
      const rs = rowsPeriodo.filter(r => (r.mes_referencia ?? '').slice(0, 7) === ym);
      return {
        mes: fmtMesAnoCurto(ym),
        agua: soma(rs, 'agua_m3'),
        energia: soma(rs, 'energia_kwh'),
        residuos: soma(rs, 'residuo_total_m3'),
        diesel: soma(rs, 'diesel_l'),
      };
    });
  }, [rowsPeriodo]);

  const residuos = useMemo(() => RESIDUO_TIPOS.map(t => ({
    name: t.label,
    color: t.color,
    value: soma(rowsPeriodo, t.key) ?? 0,
  })).filter(d => d.value > 0), [rowsPeriodo]);

  const totalResiduos = residuos.reduce((a, b) => a + b.value, 0);

  const metas = useMemo(() => {
    const porObra = new Map<string, IndicadorSustentabilidadeRow>();
    escopo.forEach(r => {
      if (r.cost_collector && !porObra.has(r.cost_collector)) porObra.set(r.cost_collector, r);
    });
    const acc = { agua: null as number | null, energia: null as number | null, residuos: null as number | null };
    porObra.forEach(r => {
      const area = r.area_construida_m2;
      if (area == null || !isFinite(area) || area <= 0) return;
      const add = (k: 'agua' | 'energia' | 'residuos', meta: number | null) => {
        if (meta == null || !isFinite(meta)) return;
        acc[k] = (acc[k] ?? 0) + meta * area;
      };
      add('agua', r.meta_agua);
      add('energia', r.meta_energia);
      add('residuos', r.meta_residuos);
    });
    return acc;
  }, [escopo]);

  useEffect(() => {
    if (!loading && logoData !== null) {
      document.documentElement.dataset.relatorioReady = '1';
    }
  }, [loading, logoData]);

  const periodoLabel = dataInicio || dataFim
    ? `${fmtDate(dataInicio)} — ${fmtDate(dataFim)}`
    : 'Todo período';

  const metaLinhas: { label: string; realizado: number | null; meta: number | null; unidade: string; color: string }[] = [
    { label: 'Água', realizado: kpis.agua, meta: metas.agua, unidade: 'm³', color: COR.agua },
    { label: 'Energia', realizado: kpis.energia, meta: metas.energia, unidade: 'kWh', color: COR.energia },
    { label: 'Resíduos', realizado: kpis.residuos, meta: metas.residuos, unidade: 'm³', color: COR.residuos },
  ];

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
      `}</style>

      <div className="relatorio-page">
        {/* ===== CABEÇALHO ===== */}
        <div className="relatorio-bloco relatorio-cabecalho">
          <div className="ribbon-rosa" />
          <div className="cabecalho-esquerda">
            <img src={logoData ?? atlasLogo} alt="Atlas" className="logo-atlas" />
            <h1 className="titulo-relatorio">
              INDICADORES DE <span className="rosa">SUSTENTABILIDADE</span>
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

        {/* ===== KPIs ===== */}
        <div className="relatorio-bloco relatorio-kpis grid grid-cols-4 gap-2">
          <HeaderKpi label="Água" value={fmtNum(kpis.agua)} unidade="m³" icon={<Droplets size={18} />} color={COR.agua} bg={`${COR.agua}1A`} />
          <HeaderKpi label="Energia" value={fmtNum(kpis.energia)} unidade="kWh" icon={<Zap size={18} />} color={COR.energia} bg={`${COR.energia}1A`} />
          <HeaderKpi label="Resíduos" value={fmtNum(kpis.residuos)} unidade="m³" icon={<Trash2 size={18} />} color={COR.residuos} bg={`${COR.residuos}1A`} />
          <HeaderKpi label="Diesel" value={fmtNum(kpis.diesel)} unidade="L" icon={<Fuel size={18} />} color={COR.diesel} bg={`${COR.diesel}1A`} />
        </div>

        {/* ===== EVOLUÇÃO ===== */}
        <div className="relatorio-bloco relatorio-evolucao">
          <Panel title="Evolução dos Indicadores">
            {serie.length === 0 ? <Empty label="Nenhum lançamento no período" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={serie} margin={{ top: 16, right: 8, left: 8, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COR.borda} />
                  <XAxis dataKey="mes" tick={{ fontSize: 9 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 9 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar yAxisId="left" dataKey="energia" name="Energia (kWh)" fill={COR.energia} isAnimationActive={false} />
                  <Bar yAxisId="left" dataKey="diesel" name="Diesel (L)" fill={COR.diesel} isAnimationActive={false} />
                  <Line yAxisId="right" dataKey="agua" name="Água (m³)" stroke={COR.agua} strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
                  <Line yAxisId="right" dataKey="residuos" name="Resíduos (m³)" stroke={COR.residuos} strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </Panel>
        </div>

        {/* ===== RESÍDUOS ===== */}
        <div className="relatorio-bloco relatorio-residuos">
          <Panel title="Distribuição de Resíduos">
            {residuos.length === 0 ? <Empty label="Sem resíduos registrados no período" /> : (
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="relative">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={residuos} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2} isAnimationActive={false}>
                        {residuos.map(d => <Cell key={d.name} fill={d.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="tabular-nums text-lg font-bold text-black">{fmtNum(totalResiduos)}</span>
                    <span className="text-[10px] text-gray-500">m³ no total</span>
                  </div>
                </div>
                <div className="space-y-1">
                  {residuos.map(d => (
                    <div key={d.name} className="flex items-center gap-2 text-[10px]">
                      <span className="h-2 w-2 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="flex-1 truncate text-black">{d.name}</span>
                      <span className="tabular-nums text-gray-500">{fmtNum(d.value)} m³</span>
                      <span className="tabular-nums w-12 text-right font-semibold text-black">{fmtPct((d.value / totalResiduos) * 100)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>
        </div>

        {/* ===== TOTAL DO PERÍODO + METAS ===== */}
        <div className="relatorio-bloco relatorio-totais grid grid-cols-2 gap-3">
          <Panel title="Total do período">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Água', v: kpis.agua, u: 'm³', color: COR.agua, icon: <Droplets size={16} /> },
                { label: 'Energia', v: kpis.energia, u: 'kWh', color: COR.energia, icon: <Zap size={16} /> },
                { label: 'Resíduos', v: kpis.residuos, u: 'm³', color: COR.residuos, icon: <Trash2 size={16} /> },
                { label: 'Diesel', v: kpis.diesel, u: 'L', color: COR.diesel, icon: <Fuel size={16} /> },
              ].map(t => (
                <div key={t.label} className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg">
                  <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg shrink-0" style={{ backgroundColor: `${t.color}1A`, color: t.color }}>
                    {t.icon}
                  </span>
                  <div>
                    <div className="text-sm font-bold tabular-nums text-black whitespace-nowrap">{fmtNum(t.v)}</div>
                    <div className="text-[9px] text-gray-500">{t.label} ({t.u})</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Desempenho vs Meta">
            <div className="space-y-2">
              {metaLinhas.map(m => {
                const temMeta = m.meta != null && m.meta > 0;
                const pct = temMeta && m.realizado != null ? (m.realizado / m.meta!) * 100 : null;
                const ok = pct != null && pct <= 100;
                return (
                  <div key={m.label}>
                    <div className="flex items-center justify-between text-[10px] text-black">
                      <span className="font-semibold">{m.label}</span>
                      {temMeta ? (
                        <span className="tabular-nums font-semibold" style={{ color: ok ? '#16A34A' : '#DC2626' }}>{fmtPct(pct)}</span>
                      ) : (
                        <span className="text-gray-400">Meta não definida</span>
                      )}
                    </div>
                    <div className="h-2 rounded bg-gray-100 overflow-hidden mt-1">
                      <div
                        className="h-full"
                        style={{
                          width: `${Math.min(Math.max(pct ?? 0, 0), 100)}%`,
                          background: temMeta ? (ok ? '#16A34A' : '#DC2626') : 'transparent',
                        }}
                      />
                    </div>
                    <div className="text-[9px] text-gray-500 mt-0.5">
                      {temMeta
                        ? `${fmtNum(m.realizado)} de ${fmtNum(m.meta)} ${m.unidade}`
                        : 'Cadastre a meta em Gestão de Obras'}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
