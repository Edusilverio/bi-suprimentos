import { useEffect, useMemo, useState } from 'react';
import { ClipboardEdit, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/useAuthStore';
import { listarObras, type ObraRow } from '@/services/gestaoObrasService';
import {
  submeterLancamento, uploadAnexoSustentabilidade, type LancamentoDados,
} from '@/services/lancamentoSustentabilidadeService';

// ----------------------------------------------------------
// Utilidades numéricas (pt-BR)
// ----------------------------------------------------------
function parseNumeroBR(s: string): number | null {
  const t = s.trim();
  if (t === '') return null;
  const normalized = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  const n = Number(normalized);
  return isFinite(n) ? n : NaN as unknown as number;
}

// ----------------------------------------------------------
// Campos numéricos do formulário
// ----------------------------------------------------------
type CampoNumericoKey =
  | 'agua_concessionaria_m3' | 'agua_pipa_m3'
  | 'energia_kwh'
  | 'diesel_gerador1_l' | 'diesel_gerador2_l' | 'diesel_gerador3_l'
  | 'entulho_limpo_cacamba' | 'madeira_cacamba' | 'gesso_cacamba'
  | 'classe_c_cacamba' | 'misto_cacamba' | 'perigoso_cacamba'
  | 'sucata_cacamba' | 'reciclaveis_bag' | 'solo_terra_m3';

const CAMPOS_AGUA: { key: CampoNumericoKey; label: string }[] = [
  { key: 'agua_concessionaria_m3', label: 'Concessionária (m³)' },
  { key: 'agua_pipa_m3',           label: 'Caminhão-pipa (m³)' },
];
const CAMPOS_ENERGIA: { key: CampoNumericoKey; label: string }[] = [
  { key: 'energia_kwh', label: 'Energia elétrica (kWh)' },
];
const CAMPOS_DIESEL: { key: CampoNumericoKey; label: string }[] = [
  { key: 'diesel_gerador1_l', label: 'Gerador 1 (L)' },
  { key: 'diesel_gerador2_l', label: 'Gerador 2 (L)' },
  { key: 'diesel_gerador3_l', label: 'Gerador 3 (L)' },
];
const CAMPOS_RESIDUOS: { key: CampoNumericoKey; label: string }[] = [
  { key: 'entulho_limpo_cacamba', label: 'Entulho limpo (caçamba)' },
  { key: 'madeira_cacamba',       label: 'Madeira (caçamba)' },
  { key: 'gesso_cacamba',         label: 'Gesso (caçamba)' },
  { key: 'classe_c_cacamba',      label: 'Classe C — capacetes, colchões, etc. (caçamba)' },
  { key: 'misto_cacamba',         label: 'Misto (caçamba)' },
  { key: 'perigoso_cacamba',      label: 'Perigosos — tintas, solventes, etc. (caçamba)' },
  { key: 'sucata_cacamba',        label: 'Sucata (caçamba)' },
  { key: 'reciclaveis_bag',       label: 'Recicláveis — papel, papelão, plástico (bag/caçamba)' },
  { key: 'solo_terra_m3',         label: 'Solo/terra (m³)' },
];

// Etapas da obra (lista oficial enviada pelo Lucas — imagem "Etapas de Obra").
// value = código curto (bom para tooltip nos indicadores); label = descrição completa.
const ETAPAS_OBRA: { value: string; label: string }[] = [
  { value: 'Etapa 1',            label: 'Etapa 1 — Mobilização do canteiro, terraplenagem e fundação' },
  { value: 'Etapa 2',            label: 'Etapa 2 — Superestrutura (estrutura, alvenaria e instalações)' },
  { value: 'Etapa 2 e Etapa 3',  label: 'Etapa 2 e 3 — Superestrutura e Acabamentos' },
  { value: 'Etapa 3',            label: 'Etapa 3 — Acabamentos (gesso, cerâmica, fachada, contrapiso)' },
  { value: 'Etapa 3 e Etapa 4',  label: 'Etapa 3 e 4 — Acabamentos e Pintura/Limpeza' },
  { value: 'Etapa 4',            label: 'Etapa 4 — Pintura e Limpeza Final de Obra' },
];

function emptyValores(): Record<CampoNumericoKey, string> {
  return {
    agua_concessionaria_m3: '', agua_pipa_m3: '',
    energia_kwh: '',
    diesel_gerador1_l: '', diesel_gerador2_l: '', diesel_gerador3_l: '',
    entulho_limpo_cacamba: '', madeira_cacamba: '', gesso_cacamba: '',
    classe_c_cacamba: '', misto_cacamba: '', perigoso_cacamba: '',
    sucata_cacamba: '', reciclaveis_bag: '', solo_terra_m3: '',
  };
}

// ----------------------------------------------------------
// Mês/ano helpers
// ----------------------------------------------------------
function mesAtualYYYYMM(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function mesFuturo(mesYYYYMM: string): boolean {
  const [y, m] = mesYYYYMM.split('-').map(Number);
  const d = new Date();
  const yy = d.getFullYear(), mm = d.getMonth() + 1;
  return y > yy || (y === yy && m > mm);
}

// ----------------------------------------------------------
// Página
// ----------------------------------------------------------
export default function LancamentoSustentabilidadePage() {
  const { toast } = useToast();
  const user = useAuthStore(s => s.user);
  const isAdmin = !!user && user.nivel <= 1;

  const [obras, setObras] = useState<ObraRow[]>([]);
  const [loadingObras, setLoadingObras] = useState(true);

  const [obraSelecionada, setObraSelecionada] = useState<string>('');
  const [mes, setMes] = useState<string>(mesAtualYYYYMM());
  const [valores, setValores] = useState<Record<CampoNumericoKey, string>>(emptyValores());
  const [etapa, setEtapa] = useState('');
  const [numColab, setNumColab] = useState<string>('');
  const [anexos, setAnexos] = useState<{ agua: File | null; energia: File | null; coletas: File | null }>({ agua: null, energia: null, coletas: null });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingObras(true);
      const { data, error } = await listarObras({});
      if (!alive) return;
      if (error) {
        toast({ title: 'Erro ao carregar obras', description: error.message, variant: 'destructive' });
      }
      setObras(data);
      setLoadingObras(false);
    })();
    return () => { alive = false; };
  }, [toast]);

  const obrasVisiveis = useMemo(() => {
    if (!user) return [];
    if (isAdmin) return obras;
    const set = new Set(user.obras_habilitadas);
    return obras.filter(o => set.has(o.cost_collector));
  }, [obras, user, isAdmin]);

  const resetFormulario = () => {
    setValores(emptyValores());
    setEtapa('');
    setNumColab('');
    setAnexos({ agua: null, energia: null, coletas: null });
  };

  const validarNumerico = (label: string, s: string): { erro: string | null; value: number | null } => {
    const n = parseNumeroBR(s);
    if (n === null) return { erro: null, value: null };
    if (Number.isNaN(n)) return { erro: `${label}: valor inválido`, value: null };
    if (n < 0) return { erro: `${label}: não pode ser negativo`, value: null };
    return { erro: null, value: n };
  };

  const handleEnviar = async () => {
    if (!obraSelecionada) {
      toast({ title: 'Selecione a obra', variant: 'destructive' });
      return;
    }
    if (!mes) {
      toast({ title: 'Selecione o mês de referência', variant: 'destructive' });
      return;
    }
    if (mesFuturo(mes)) {
      toast({ title: 'Mês inválido', description: 'Não é permitido lançar em mês futuro.', variant: 'destructive' });
      return;
    }

    const dados: LancamentoDados = {};
    const todosCampos = [...CAMPOS_AGUA, ...CAMPOS_ENERGIA, ...CAMPOS_DIESEL, ...CAMPOS_RESIDUOS];
    for (const c of todosCampos) {
      const r = validarNumerico(c.label, valores[c.key]);
      if (r.erro) { toast({ title: 'Valor inválido', description: r.erro, variant: 'destructive' }); return; }
      if (r.value !== null) (dados as any)[c.key] = r.value;
    }

    if (etapa.trim()) dados.etapa_obra = etapa.trim();
    if (numColab.trim()) {
      const nc = parseNumeroBR(numColab);
      if (nc === null || Number.isNaN(nc) || nc < 0 || !Number.isInteger(nc)) {
        toast({ title: 'Nº de colaboradores inválido', description: 'Informe um inteiro não negativo.', variant: 'destructive' });
        return;
      }
      dados.num_colaboradores = nc;
    }

    const mesRef = `${mes}-01`;
    setSalvando(true);
    try {
      // Upload dos anexos (se houver) antes de submeter o lançamento
      if (anexos.agua)    dados.anexo_agua_url    = await uploadAnexoSustentabilidade(anexos.agua, obraSelecionada, mesRef, 'agua');
      if (anexos.energia) dados.anexo_energia_url = await uploadAnexoSustentabilidade(anexos.energia, obraSelecionada, mesRef, 'energia');
      if (anexos.coletas) dados.anexo_coletas_url = await uploadAnexoSustentabilidade(anexos.coletas, obraSelecionada, mesRef, 'coletas');

      const res = await submeterLancamento(obraSelecionada, mesRef, dados);
      if (!res.ok) {
        toast({ title: 'Falha no envio', description: res.erro || 'Erro desconhecido', variant: 'destructive' });
      } else {
        toast({ title: 'Lançamento enviado', description: res.mensagem });
        resetFormulario();
      }
    } catch (e: any) {
      toast({ title: 'Erro inesperado', description: e?.message ?? String(e), variant: 'destructive' });
    } finally {
      setSalvando(false);
    }
  };

  const setValor = (k: CampoNumericoKey, v: string) => setValores(prev => ({ ...prev, [k]: v }));

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="LANÇAMENTO DE SUSTENTABILIDADE" icon={<ClipboardEdit className="h-5 w-5 text-primary-foreground" />} />
      <p className="text-sm text-muted-foreground -mt-4">Registro mensal de consumos e resíduos por obra</p>

      {/* Cabeçalho: obra + mês */}
      <div className="bg-card border border-border rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Obra *</label>
          <Select value={obraSelecionada} onValueChange={setObraSelecionada} disabled={loadingObras}>
            <SelectTrigger>
              <SelectValue placeholder={loadingObras ? 'Carregando…' : 'Selecione a obra'} />
            </SelectTrigger>
            <SelectContent>
              {obrasVisiveis.length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground">Nenhuma obra disponível</div>
              )}
              {obrasVisiveis.map(o => (
                <SelectItem key={o.cost_collector} value={o.cost_collector}>
                  {o.cost_collector}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Mês de referência *</label>
          <Input
            type="month"
            value={mes}
            max={mesAtualYYYYMM()}
            onChange={e => setMes(e.target.value)}
          />
        </div>
      </div>

      {/* Água */}
      <SecaoFormulario titulo="Água (m³)">
        <GridCampos>
          {CAMPOS_AGUA.map(c => (
            <CampoNumerico key={c.key} label={c.label} value={valores[c.key]} onChange={v => setValor(c.key, v)} />
          ))}
        </GridCampos>
      </SecaoFormulario>

      {/* Energia */}
      <SecaoFormulario titulo="Energia (kWh)">
        <GridCampos>
          {CAMPOS_ENERGIA.map(c => (
            <CampoNumerico key={c.key} label={c.label} value={valores[c.key]} onChange={v => setValor(c.key, v)} />
          ))}
        </GridCampos>
      </SecaoFormulario>

      {/* Diesel */}
      <SecaoFormulario titulo="Combustível — diesel geradores (L)">
        <GridCampos>
          {CAMPOS_DIESEL.map(c => (
            <CampoNumerico key={c.key} label={c.label} value={valores[c.key]} onChange={v => setValor(c.key, v)} />
          ))}
        </GridCampos>
      </SecaoFormulario>

      {/* Resíduos */}
      <SecaoFormulario titulo="Resíduos (m³/caçamba)">
        <GridCampos>
          {CAMPOS_RESIDUOS.map(c => (
            <CampoNumerico key={c.key} label={c.label} value={valores[c.key]} onChange={v => setValor(c.key, v)} />
          ))}
        </GridCampos>
      </SecaoFormulario>

      {/* Info da obra */}
      <SecaoFormulario titulo="Informações da obra">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Etapa da obra</label>
            <Select value={etapa} onValueChange={setEtapa}>
              <SelectTrigger><SelectValue placeholder="Selecione a etapa…" /></SelectTrigger>
              <SelectContent>
                {ETAPAS_OBRA.map(e => (
                  <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nº de colaboradores</label>
            <Input value={numColab} onChange={e => setNumColab(e.target.value)} inputMode="numeric" placeholder="Ex: 42" />
          </div>
        </div>
      </SecaoFormulario>

      {/* Anexos — conta de água, conta de energia, relatório de coletas */}
      <SecaoFormulario titulo="Anexos (para validação)">
        <p className="text-[11px] text-muted-foreground -mt-1">
          Anexe conta de água, conta de energia e o relatório de coletas (resíduos) do mês. Ajuda a Jennifer a validar o lançamento.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <CampoAnexo label="Conta de água" file={anexos.agua} onChange={f => setAnexos(a => ({ ...a, agua: f }))} />
          <CampoAnexo label="Conta de energia" file={anexos.energia} onChange={f => setAnexos(a => ({ ...a, energia: f }))} />
          <CampoAnexo label="Relatório de coletas" file={anexos.coletas} onChange={f => setAnexos(a => ({ ...a, coletas: f }))} />
        </div>
      </SecaoFormulario>

      <div className="flex justify-end">
        <Button onClick={handleEnviar} disabled={salvando}>
          {salvando ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
          Enviar lançamento
        </Button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------
// Subcomponentes
// ----------------------------------------------------------
function SecaoFormulario({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-lg p-3 space-y-3 bg-card">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">{titulo}</h4>
        <span className="text-[10px] text-muted-foreground">Campos opcionais</span>
      </div>
      {children}
    </div>
  );
}

function GridCampos({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">{children}</div>;
}

function CampoAnexo({ label, file, onChange }: { label: string; file: File | null; onChange: (f: File | null) => void }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        onChange={e => onChange(e.target.files?.[0] ?? null)}
        className="text-xs file:mr-2 file:text-xs"
      />
      {file && <p className="text-[10px] text-muted-foreground mt-1 truncate">{file.name}</p>}
    </div>
  );
}

function CampoNumerico({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input value={value} onChange={e => onChange(e.target.value)} inputMode="decimal" placeholder="0" />
    </div>
  );
}
