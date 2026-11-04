import { useMemo, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Leaf, Droplets, Zap, Trash2, Fuel, ArrowDown, ArrowUp, Target, Cloud, FileDown, Loader2, ChevronDown,
} from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { exportarRelatorio } from '@/lib/exportRelatorio';
import { useIndicadoresSustentabilidade } from '@/hooks/useIndicadoresSustentabilidade';
import type { IndicadorSustentabilidadeRow } from '@/services/indicadoresSustentabilidadeService';

// CO₂ entra no próximo ano — virar para true e definir o fator emissao_energia em sustentabilidade_parametros
const CO2_HABILITADO = false;

const MES_LABELS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// Guia de identidade visual
const COR = {
  agua: '#2563EB',
  energia: '#D97706',
  residuos: '#059669',
  diesel: '#EA580C',
  co2: '#6B7280',
  positivo: '#16A34A',
  negativo: '#DC2626',
  fundo: '#F8FAFC',
  card: '#FFFFFF',
  texto: '#111827',
  textoSuave: '#6B7280',
  borda: '#E5E7EB',
};

const CARD_STYLE: React.CSSProperties = {
  backgroundColor: COR.card,
  borderRadius: 16,
  border: `1px solid ${COR.borda}`,
  boxShadow: '0 2px 8px rgba(15,23,42,.06)',
};

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

function fmtMesAno(ym: string | null): string {
  if (!ym) return '—';
  const [y, m] = ym.slice(0, 7).split('-').map(Number);
  return `${MES_LABELS[(m ?? 1) - 1]}/${y}`;
}

function fmtMesAnoCurto(ym: string | null): string {
  if (!ym) return '—';
  const [y, m] = ym.slice(0, 7).split('-').map(Number);
  return `${MES_LABELS[(m ?? 1) - 1]}/${String(y).slice(2)}`;
}

function fmtNum(v: number | null | undefined, dec = 1): string {
  if (v == null || !isFinite(Number(v))) return '—';
  return Number(v).toLocaleString('pt-BR', { maximumFractionDigits: dec, minimumFractionDigits: dec });
}

function fmtPct(v: number | null | undefined, dec = 1): string {
  if (v == null || !isFinite(Number(v))) return '—';
  return `${Number(v).toFixed(dec).replace('.', ',')}%`;
}

function soma(rows: IndicadorSustentabilidadeRow[], key: keyof IndicadorSustentabilidadeRow): number | null {
  const arr = rows
    .map(r => r[key])
    .filter((x): x is number => typeof x === 'number' && isFinite(x));
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0);
}

function mesKey(iso: string | null): string {
  return iso ? iso.slice(0, 7) : '';
}

function addMeses(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Lista de meses (YYYY-MM) entre de e ate, inclusivo. */
function rangeMeses(de: string, ate: string): string[] {
  if (!de || !ate || de > ate) return [];
  const out: string[] = [];
  let cur = de;
  while (cur <= ate && out.length < 240) {
    out.push(cur);
    cur = addMeses(cur, 1);
  }
  return out;
}

function EmptyState({ msg, hint }: { msg: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <Leaf className="h-8 w-8 mb-2" style={{ color: '#CBD5E1' }} />
      <p style={{ fontSize: 14, color: COR.textoSuave }}>{msg}</p>
      {hint && <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>{hint}</p>}
    </div>
  );
}

function Card({ title, subtitle, children, className, style }: {
  title?: string; subtitle?: string; children: React.ReactNode; className?: string; style?: React.CSSProperties;
}) {
  return (
    <div className={`p-5 ${className ?? ''}`} style={{ ...CARD_STYLE, ...style }}>
      {title && (
        <div className="mb-3">
          <h3 style={{ fontSize: 16, fontWeight: 600, color: COR.texto }}>{title}</h3>
          {subtitle && <p style={{ fontSize: 13, fontWeight: 500, color: COR.textoSuave }}>{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

function Delta({ atual, anterior, legenda }: { atual: number | null; anterior: number | null; legenda: string }) {
  if (atual == null || anterior == null || anterior === 0) return null;
  const pct = ((atual - anterior) / Math.abs(anterior)) * 100;
  const reduziu = pct <= 0;
  const Icon = reduziu ? ArrowDown : ArrowUp;
  return (
    <div className="flex items-center gap-1 mt-2 flex-wrap" style={{ fontSize: 15, fontWeight: 600, color: reduziu ? COR.positivo : COR.negativo }}>
      <Icon className="h-4 w-4" />
      <span>{fmtPct(Math.abs(pct))}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: COR.textoSuave }}>{legenda}</span>
    </div>
  );
}

/** Fonte adaptativa do big number: encolhe conforme o comprimento do texto formatado. */
function tamanhoBigNumber(texto: string): number {
  const n = texto.length;
  if (n <= 5) return 44;
  if (n <= 7) return 36;
  if (n <= 9) return 30;
  return 24;
}

function MetricCard({ label, unidade, valor, anterior, color, icon, legendaDelta }: {
  label: string; unidade: string; valor: number | null; anterior: number | null; color: string; icon: React.ReactNode; legendaDelta: string;
}) {
  const texto = fmtNum(valor);
  return (
    <div className="p-5" style={CARD_STYLE}>
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex items-center justify-center h-11 w-11 shrink-0" style={{ backgroundColor: `${color}1f`, color, borderRadius: 12 }}>
          {icon}
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, color: COR.textoSuave, textAlign: 'right', paddingTop: 4 }}>{label}</span>
      </div>
      <div
        className="mt-3 tabular-nums"
        style={{ fontSize: tamanhoBigNumber(texto), fontWeight: 700, lineHeight: 1.05, color: COR.texto, whiteSpace: 'nowrap' }}
      >
        {texto}
      </div>
      <div style={{ fontSize: 14, fontWeight: 500, color: COR.textoSuave }}>{unidade}</div>
      <Delta atual={valor} anterior={anterior} legenda={legendaDelta} />
    </div>
  );
}

function Gauge({ label, realizado, meta, unidade, color }: {
  label: string; realizado: number | null; meta: number | null; unidade: string; color: string;
}) {
  const temMeta = meta != null && meta > 0;
  const pct = temMeta && realizado != null ? (realizado / meta) * 100 : null;
  const clamped = Math.min(Math.max(pct ?? 0, 0), 150);
  const R = 60;
  const cx = 80, cy = 70;
  const arc = (from: number, to: number) => {
    const p = (deg: number) => {
      const rad = (Math.PI * (180 - deg)) / 180;
      return [cx + R * Math.cos(rad), cy - R * Math.sin(rad)];
    };
    const [x1, y1] = p(from);
    const [x2, y2] = p(to);
    return `M ${x1} ${y1} A ${R} ${R} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
  };
  const ok = pct != null && pct <= 100;

  return (
    <div className="p-5 flex flex-col items-center" style={CARD_STYLE}>
      <h4 style={{ fontSize: 16, fontWeight: 600, color: COR.texto, marginBottom: 4 }}>{label}</h4>
      {!temMeta ? (
        <EmptyState msg="Meta não definida" hint="Cadastre em Gestão de Obras" />
      ) : (
        <>
          <svg viewBox="0 0 160 82" className="w-full max-w-[200px]">
            <path d={arc(0, 180)} fill="none" stroke="#E5E7EB" strokeWidth={12} strokeLinecap="round" />
            <path
              d={arc(0, Math.max((clamped / 150) * 180, 0.1))}
              fill="none"
              stroke={ok ? COR.positivo : COR.negativo}
              strokeWidth={12}
              strokeLinecap="round"
            />
          </svg>
          <div className="tabular-nums" style={{ fontSize: 28, fontWeight: 700, color: ok ? COR.positivo : COR.negativo }}>{fmtPct(pct)}</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: COR.textoSuave, textAlign: 'center', marginTop: 4 }}>
            {fmtNum(realizado)} de {fmtNum(meta)} {unidade}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4, color }}>
            {ok ? 'Dentro da meta' : 'Acima da meta'}
          </div>
        </>
      )}
    </div>
  );
}

function ObrasMultiSelect({ obras, selecionadas, onChange }: {
  obras: string[]; selecionadas: string[]; onChange: (v: string[]) => void;
}) {
  const todas = selecionadas.length === 0;
  const label = todas
    ? 'Todas as obras'
    : selecionadas.length === 1
      ? selecionadas[0]
      : `${selecionadas.length} obras`;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" style={{ borderRadius: 12 }} className="min-w-[220px] justify-between font-normal">
          <span className="truncate">{label}</span>
          <ChevronDown className="h-4 w-4 opacity-60 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[280px] p-2 max-h-72 overflow-auto bg-popover">
        <label className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-sm">
          <Checkbox checked={todas} onCheckedChange={() => onChange([])} />
          Todas as obras
        </label>
        <div className="h-px bg-border my-1" />
        {obras.map(o => (
          <label key={o} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-sm">
            <Checkbox
              checked={selecionadas.includes(o)}
              onCheckedChange={() =>
                onChange(selecionadas.includes(o) ? selecionadas.filter(x => x !== o) : [...selecionadas, o])
              }
            />
            <span className="truncate">{o}</span>
          </label>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export default function IndicadoresSustentabilidadePage() {
  const { rows, loading } = useIndicadoresSustentabilidade();
  const [params] = useSearchParams();
  const modoExport = params.get('modo') === 'export';
  const scrollEvolucao = useRef<HTMLDivElement>(null);
  const [exportando, setExportando] = useState(false);

  const obras = useMemo(
    () => Array.from(new Set(rows.map(r => r.cost_collector).filter((o): o is string => !!o))).sort(),
    [rows],
  );

  const mesesDisponiveis = useMemo(
    () => Array.from(new Set(rows.map(r => mesKey(r.mes_referencia)).filter(Boolean))).sort(),
    [rows],
  );

  const ultimoMes = mesesDisponiveis.length ? mesesDisponiveis[mesesDisponiveis.length - 1] : null;

  const [de, setDe] = useState<string>('');
  const [ate, setAte] = useState<string>('');
  const [obrasSel, setObrasSel] = useState<string[]>([]);
  const [iniciado, setIniciado] = useState(false);

  // Default: últimos 12 meses disponíveis (ou o que vier na URL, no modo export)
  useEffect(() => {
    if (iniciado || !mesesDisponiveis.length) return;
    const qDe = params.get('de');
    const qAte = params.get('ate');
    const qObras = params.get('obras');
    const fim = qAte || mesesDisponiveis[mesesDisponiveis.length - 1];
    const inicio = qDe || mesesDisponiveis[Math.max(0, mesesDisponiveis.length - 12)];
    setDe(inicio);
    setAte(fim);
    if (qObras) setObrasSel(qObras.split('|').filter(Boolean));
    setIniciado(true);
  }, [mesesDisponiveis, iniciado, params]);

  const escopo = useMemo(
    () => (obrasSel.length === 0 ? rows : rows.filter(r => r.cost_collector && obrasSel.includes(r.cost_collector))),
    [rows, obrasSel],
  );

  const meses = useMemo(() => rangeMeses(de, ate), [de, ate]);
  const nMeses = meses.length;

  const janelaAnterior = useMemo(() => {
    if (!nMeses || !de) return null;
    const antAte = addMeses(de, -1);
    const antDe = addMeses(antAte, -(nMeses - 1));
    return { de: antDe, ate: antAte };
  }, [de, nMeses]);

  const rowsPeriodo = useMemo(
    () => escopo.filter(r => { const k = mesKey(r.mes_referencia); return !!k && k >= de && k <= ate; }),
    [escopo, de, ate],
  );

  const rowsAnterior = useMemo(() => {
    if (!janelaAnterior) return [];
    return escopo.filter(r => {
      const k = mesKey(r.mes_referencia);
      return !!k && k >= janelaAnterior.de && k <= janelaAnterior.ate;
    });
  }, [escopo, janelaAnterior]);

  const calcTotais = (rs: IndicadorSustentabilidadeRow[]) => ({
    agua: soma(rs, 'agua_m3'),
    energia: soma(rs, 'energia_kwh'),
    residuos: soma(rs, 'residuo_total_m3'),
    diesel: soma(rs, 'diesel_l'),
    co2: soma(rs, 'co2_kg'),
  });

  const kpis = useMemo(
    () => ({ atual: calcTotais(rowsPeriodo), anterior: calcTotais(rowsAnterior) }),
    [rowsPeriodo, rowsAnterior],
  );

  const legendaDelta = nMeses === 1
    ? 'vs mês anterior'
    : janelaAnterior
      ? `vs período anterior (${fmtMesAnoCurto(janelaAnterior.de)}–${fmtMesAnoCurto(janelaAnterior.ate)})`
      : '';

  // Série do intervalo (mais recente à direita)
  const serie = useMemo(() => meses.map(ym => {
    const rs = escopo.filter(r => mesKey(r.mes_referencia) === ym);
    return {
      ym,
      mes: fmtMesAnoCurto(ym),
      temDado: rs.length > 0,
      agua: soma(rs, 'agua_m3'),
      energia: soma(rs, 'energia_kwh'),
      residuos: soma(rs, 'residuo_total_m3'),
      diesel: soma(rs, 'diesel_l'),
    };
  }), [meses, escopo]);

  const serieComDado = useMemo(() => serie.filter(d => d.temDado), [serie]);
  const evolucaoScroll = serie.length > 12;
  const larguraEvolucao = evolucaoScroll ? serie.length * 72 : undefined;

  useEffect(() => {
    if (evolucaoScroll && scrollEvolucao.current) {
      scrollEvolucao.current.scrollLeft = scrollEvolucao.current.scrollWidth;
    }
  }, [evolucaoScroll, serie.length]);

  // Metas totais do escopo: Σ(meta por m² × área construída), uma vez por obra
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

  const residuosPeriodo = useMemo(() => RESIDUO_TIPOS.map(t => ({
    name: t.label,
    color: t.color,
    value: soma(rowsPeriodo, t.key) ?? 0,
  })).filter(d => d.value > 0), [rowsPeriodo]);

  const totalResiduos = residuosPeriodo.reduce((a, b) => a + b.value, 0);

  const percCacambaMista = useMemo(() => {
    const arr = rowsPeriodo.map(r => r.perc_cacamba_mista).filter((x): x is number => x != null && isFinite(x));
    if (!arr.length) return null;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }, [rowsPeriodo]);

  const destaques = useMemo(() => {
    const defs: { key: 'agua' | 'energia' | 'residuos' | 'diesel' | 'co2'; color: string; icon: React.ReactNode; termo: string }[] = [
      { key: 'agua', color: COR.agua, icon: <Droplets className="h-4 w-4" />, termo: 'no consumo de água' },
      { key: 'energia', color: COR.energia, icon: <Zap className="h-4 w-4" />, termo: 'no consumo de energia' },
      { key: 'residuos', color: COR.residuos, icon: <Trash2 className="h-4 w-4" />, termo: 'na geração de resíduos' },
      { key: 'diesel', color: COR.diesel, icon: <Fuel className="h-4 w-4" />, termo: 'no consumo de diesel' },
      ...(CO2_HABILITADO
        ? [{ key: 'co2' as const, color: COR.co2, icon: <Cloud className="h-4 w-4" />, termo: 'nas emissões de CO₂' }]
        : []),
    ];
    const ref = nMeses === 1 ? 'em relação ao mês anterior' : 'em relação ao período anterior';
    return defs.flatMap(d => {
      const a = kpis.atual[d.key];
      const b = kpis.anterior[d.key];
      if (a == null || b == null || b === 0) return [];
      const pct = ((a - b) / Math.abs(b)) * 100;
      const reduziu = pct <= 0;
      return [{ ...d, texto: `${reduziu ? 'Redução' : 'Aumento'} de ${fmtPct(Math.abs(pct))} ${d.termo} ${ref}`, reduziu }];
    });
  }, [kpis, nMeses]);

  const obrasLabel = obrasSel.length === 0 ? 'Todas as obras' : obrasSel.join(', ');
  const periodoLabel = de && ate ? `${fmtMesAno(de)} a ${fmtMesAno(ate)}` : '—';

  const handleExport = async () => {
    setExportando(true);
    try {
      const obraParam = obrasSel.length === 1 ? obrasSel[0] : 'TODAS_AS_OBRAS';
      const dataInicio = de ? `${de}-01` : undefined;
      const dataFim = ate
        ? (() => {
            const [y, m] = ate.split('-').map(Number);
            const d = new Date(y, m, 0);
            return `${y}-${String(m).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          })()
        : undefined;
      await exportarRelatorio({
        rota: '/relatorio/sustentabilidade',
        queryParams: { obra: obraParam, dataInicio, dataFim, modo: 'export' },
        filename: `Indicadores_Sustentabilidade_${obraParam}_${de}_${ate}.pdf`,
        blocos: [
          '.relatorio-cabecalho',
          '.relatorio-kpis',
          '.relatorio-evolucao',
          '.relatorio-residuos',
          '.relatorio-totais',
        ],
      });
    } finally {
      setExportando(false);
    }
  };

  // Sinaliza prontidão para o exportador (iframe)
  useEffect(() => {
    if (!modoExport) return;
    if (!loading && iniciado) {
      const t = setTimeout(() => { document.documentElement.dataset.relatorioReady = '1'; }, 1200);
      return () => clearTimeout(t);
    }
  }, [modoExport, loading, iniciado]);

  const tooltipStyle: React.CSSProperties = {
    backgroundColor: COR.card, border: `1px solid ${COR.borda}`, borderRadius: 12, fontSize: 13, color: COR.texto,
  };
  const axisTick = { fontSize: 13, fill: COR.textoSuave };

  if (loading) {
    return (
      <div className="p-6 space-y-4" style={{ backgroundColor: COR.fundo }}>
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const semDados = rows.length === 0;

  return (
    <div
      className="p-6 space-y-6 min-h-full"
      style={{ backgroundColor: COR.fundo, color: COR.texto, fontFamily: "'Inter', sans-serif" }}
    >
      {/* Cabeçalho */}
      <div className="relatorio-cabecalho flex flex-wrap items-start justify-between gap-4" style={{ backgroundColor: COR.fundo }}>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center h-11 w-11" style={{ backgroundColor: `${COR.residuos}1f`, color: COR.residuos, borderRadius: 12 }}>
            <Leaf className="h-6 w-6" />
          </span>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: COR.texto, lineHeight: 1.2 }}>INDICADORES DE SUSTENTABILIDADE</h1>
            <p style={{ fontSize: 14, color: COR.textoSuave }}>
              Construindo um futuro melhor · Atlas Engenharia
            </p>
            <p style={{ fontSize: 14, fontWeight: 500, color: COR.textoSuave, marginTop: 2 }}>
              {periodoLabel} · {obrasLabel}
            </p>
          </div>
        </div>

        {!modoExport && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 13, fontWeight: 500, color: COR.textoSuave }}>De</span>
              <Select value={de} onValueChange={setDe}>
                <SelectTrigger className="w-[130px]" style={{ borderRadius: 12 }}>
                  <SelectValue placeholder="De" />
                </SelectTrigger>
                <SelectContent>
                  {mesesDisponiveis.map(m => <SelectItem key={m} value={m}>{fmtMesAno(m)}</SelectItem>)}
                </SelectContent>
              </Select>
              <span style={{ fontSize: 13, fontWeight: 500, color: COR.textoSuave }}>Até</span>
              <Select value={ate} onValueChange={setAte}>
                <SelectTrigger className="w-[130px]" style={{ borderRadius: 12 }}>
                  <SelectValue placeholder="Até" />
                </SelectTrigger>
                <SelectContent>
                  {mesesDisponiveis.filter(m => !de || m >= de).map(m => <SelectItem key={m} value={m}>{fmtMesAno(m)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <ObrasMultiSelect obras={obras} selecionadas={obrasSel} onChange={setObrasSel} />
            <Button onClick={handleExport} disabled={exportando || semDados} style={{ borderRadius: 12 }}>
              {exportando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
              Exportar relatório
            </Button>
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5"
              style={{ borderRadius: 12, fontSize: 13, fontWeight: 500, backgroundColor: `${COR.residuos}14`, color: COR.residuos, border: `1px solid ${COR.residuos}33` }}
            >
              <Leaf className="h-3.5 w-3.5" />
              Atualizado em {ultimoMes ? fmtMesAno(ultimoMes) : '—'}
            </span>
          </div>
        )}
      </div>

      {semDados ? (
        <Card className="relatorio-bloco">
          <EmptyState msg="Sem dados de sustentabilidade ainda" hint="Nenhum lançamento aprovado registrado" />
        </Card>
      ) : (
        <>
          {/* 1 — KPIs do período */}
          <div className={`relatorio-bloco grid grid-cols-1 sm:grid-cols-2 ${CO2_HABILITADO ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}>
            <MetricCard label="Consumo de Água" unidade="m³" valor={kpis.atual.agua} anterior={kpis.anterior.agua} color={COR.agua} icon={<Droplets className="h-5 w-5" />} legendaDelta={legendaDelta} />
            <MetricCard label="Consumo de Energia" unidade="kWh" valor={kpis.atual.energia} anterior={kpis.anterior.energia} color={COR.energia} icon={<Zap className="h-5 w-5" />} legendaDelta={legendaDelta} />
            <MetricCard label="Resíduos" unidade="m³" valor={kpis.atual.residuos} anterior={kpis.anterior.residuos} color={COR.residuos} icon={<Trash2 className="h-5 w-5" />} legendaDelta={legendaDelta} />
            <MetricCard label="Diesel" unidade="L" valor={kpis.atual.diesel} anterior={kpis.anterior.diesel} color={COR.diesel} icon={<Fuel className="h-5 w-5" />} legendaDelta={legendaDelta} />
            {CO2_HABILITADO && (
              <MetricCard label="Emissões CO₂" unidade="kg" valor={kpis.atual.co2} anterior={kpis.anterior.co2} color={COR.co2} icon={<Cloud className="h-5 w-5" />} legendaDelta={legendaDelta} />
            )}
          </div>

          {/* 2 — Evolução */}
          <Card title="Evolução dos Indicadores" subtitle={`${periodoLabel} · ${obrasLabel}`} className="relatorio-bloco">
            {serieComDado.length === 0 ? (
              <EmptyState msg="Nenhum lançamento no período selecionado" />
            ) : (
              <div ref={scrollEvolucao} style={{ overflowX: evolucaoScroll ? 'auto' : 'visible' }}>
                <div style={{ minWidth: larguraEvolucao, height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={serie}>
                      <CartesianGrid strokeDasharray="3 3" stroke={COR.borda} />
                      <XAxis dataKey="mes" tick={axisTick} />
                      <YAxis yAxisId="left" tick={axisTick} label={{ value: 'kWh / L', angle: -90, position: 'insideLeft', fontSize: 13, fill: COR.textoSuave }} />
                      <YAxis yAxisId="right" orientation="right" tick={axisTick} label={{ value: 'm³', angle: 90, position: 'insideRight', fontSize: 13, fill: COR.textoSuave }} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => fmtNum(Number(v))} />
                      <Legend wrapperStyle={{ fontSize: 13 }} />
                      <Bar yAxisId="left" dataKey="energia" name="Energia (kWh)" fill={COR.energia} radius={[6, 6, 0, 0]} />
                      <Bar yAxisId="left" dataKey="diesel" name="Diesel (L)" fill={COR.diesel} radius={[6, 6, 0, 0]} />
                      <Line yAxisId="right" dataKey="agua" name="Água (m³)" stroke={COR.agua} strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line yAxisId="right" dataKey="residuos" name="Resíduos (m³)" stroke={COR.residuos} strokeWidth={2.5} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </Card>

          {/* 3 + 4 */}
          <div className="relatorio-bloco grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card title="Distribuição de Resíduos" subtitle={periodoLabel} className="lg:col-span-2">
              {residuosPeriodo.length === 0 ? (
                <EmptyState msg="Sem resíduos registrados no período" />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div className="relative">
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={residuosPeriodo} dataKey="value" nameKey="name" innerRadius={70} outerRadius={100} paddingAngle={2}>
                          {residuosPeriodo.map(d => <Cell key={d.name} fill={d.color} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => `${fmtNum(Number(v))} m³`} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="tabular-nums" style={{ fontSize: 28, fontWeight: 700 }}>{fmtNum(totalResiduos)}</span>
                      <span style={{ fontSize: 13, color: COR.textoSuave }}>m³ no total</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {residuosPeriodo.map(d => (
                      <div key={d.name} className="flex items-center gap-2" style={{ fontSize: 13, fontWeight: 500 }}>
                        <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="flex-1 truncate">{d.name}</span>
                        <span className="tabular-nums" style={{ color: COR.textoSuave }}>{fmtNum(d.value)} m³</span>
                        <span className="tabular-nums w-14 text-right" style={{ fontWeight: 600 }}>{fmtPct((d.value / totalResiduos) * 100)}</span>
                      </div>
                    ))}
                    {percCacambaMista != null && (
                      <p style={{ fontSize: 13, color: COR.textoSuave, paddingTop: 8, marginTop: 8, borderTop: `1px solid ${COR.borda}` }}>
                        % caçamba mista no período: <strong style={{ color: COR.texto }}>{fmtPct(percCacambaMista)}</strong>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </Card>

            <Card title="Destaques do período">
              {destaques.length === 0 ? (
                <EmptyState msg="Sem período anterior para comparação" />
              ) : (
                <ul className="space-y-3">
                  {destaques.map(d => (
                    <li key={d.key} className="flex items-start gap-3">
                      <span className="inline-flex items-center justify-center h-9 w-9 shrink-0" style={{ backgroundColor: `${d.color}1f`, color: d.color, borderRadius: 12 }}>
                        {d.icon}
                      </span>
                      <p style={{ fontSize: 14, lineHeight: 1.4 }}>{d.texto}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* 5 + 6 */}
          <div className="relatorio-bloco grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card title="Consumo de Água (m³)" subtitle={periodoLabel}>
              {serieComDado.length === 0 ? <EmptyState msg="Nenhum lançamento no período" /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={serie} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COR.borda} />
                    <XAxis dataKey="mes" tick={axisTick} />
                    <YAxis tick={axisTick} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => `${fmtNum(Number(v))} m³`} />
                    <Area dataKey="agua" name="Água" stroke={COR.agua} fill={COR.agua} fillOpacity={0.18} strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
              {serieComDado.length > 0 && (
                <p style={{ fontSize: 13, color: COR.textoSuave, marginTop: 8 }}>
                  Último mês ({serieComDado[serieComDado.length - 1].mes}): <strong style={{ color: COR.texto }}>{fmtNum(serieComDado[serieComDado.length - 1].agua)} m³</strong>
                </p>
              )}
            </Card>

            <Card title="Consumo de Energia (kWh)" subtitle={periodoLabel}>
              {serieComDado.length === 0 ? <EmptyState msg="Nenhum lançamento no período" /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={serie} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COR.borda} />
                    <XAxis dataKey="mes" tick={axisTick} />
                    <YAxis tick={axisTick} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => `${fmtNum(Number(v))} kWh`} />
                    <Area dataKey="energia" name="Energia" stroke={COR.energia} fill={COR.energia} fillOpacity={0.2} strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
              {serieComDado.length > 0 && (
                <p style={{ fontSize: 13, color: COR.textoSuave, marginTop: 8 }}>
                  Último mês ({serieComDado[serieComDado.length - 1].mes}): <strong style={{ color: COR.texto }}>{fmtNum(serieComDado[serieComDado.length - 1].energia)} kWh</strong>
                </p>
              )}
            </Card>

            <Card title="Nossos compromissos">
              <ul className="space-y-3">
                {[
                  'Promover a sustentabilidade, com respeito ao meio ambiente e uso consciente dos recursos',
                  'Reduzir o consumo de água e energia em nossas obras',
                  'Minimizar a geração de resíduos e promover a destinação correta',
                ].map(t => (
                  <li key={t} className="flex items-start gap-3">
                    <span className="inline-flex items-center justify-center h-9 w-9 shrink-0" style={{ backgroundColor: `${COR.residuos}1f`, color: COR.residuos, borderRadius: 12 }}>
                      <Leaf className="h-4 w-4" />
                    </span>
                    <p style={{ fontSize: 14, lineHeight: 1.4 }}>{t}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* 7 — Total do período */}
          <Card title="Total do período" subtitle={periodoLabel} className="relatorio-bloco">
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${CO2_HABILITADO ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}>
              {[
                { label: 'Água', v: kpis.atual.agua, u: 'm³', color: COR.agua, icon: <Droplets className="h-5 w-5" /> },
                { label: 'Energia', v: kpis.atual.energia, u: 'kWh', color: COR.energia, icon: <Zap className="h-5 w-5" /> },
                { label: 'Resíduos', v: kpis.atual.residuos, u: 'm³', color: COR.residuos, icon: <Trash2 className="h-5 w-5" /> },
                { label: 'Diesel', v: kpis.atual.diesel, u: 'L', color: COR.diesel, icon: <Fuel className="h-5 w-5" /> },
                ...(CO2_HABILITADO
                  ? [{ label: 'CO₂', v: kpis.atual.co2, u: 'kg', color: COR.co2, icon: <Cloud className="h-5 w-5" /> }]
                  : []),
              ].map(t => (
                <div key={t.label} className="flex items-center gap-3 p-3" style={{ border: `1px solid ${COR.borda}`, borderRadius: 12 }}>
                  <span className="inline-flex items-center justify-center h-10 w-10 shrink-0" style={{ backgroundColor: `${t.color}1f`, color: t.color, borderRadius: 12 }}>
                    {t.icon}
                  </span>
                  <div>
                    <div className="tabular-nums" style={{ fontSize: 22, fontWeight: 700 }}>{fmtNum(t.v)}</div>
                    <div style={{ fontSize: 13, color: COR.textoSuave }}>{t.label} ({t.u})</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 8 — Desempenho vs meta */}
          <div className="relatorio-bloco">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-5 w-5" style={{ color: COR.textoSuave }} />
              <h3 style={{ fontSize: 20, fontWeight: 700, color: COR.texto }}>Desempenho vs Meta</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Gauge label="Água" realizado={kpis.atual.agua} meta={metas.agua} unidade="m³" color={COR.agua} />
              <Gauge label="Energia" realizado={kpis.atual.energia} meta={metas.energia} unidade="kWh" color={COR.energia} />
              <Gauge label="Resíduos" realizado={kpis.atual.residuos} meta={metas.residuos} unidade="m³" color={COR.residuos} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
