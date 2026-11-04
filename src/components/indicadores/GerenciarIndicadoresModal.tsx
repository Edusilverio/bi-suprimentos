import { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, Plus, Loader2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import type { IndicadorDef, IndicadorValor } from '@/services/indicadoresService';

const MES_LABELS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

function fmtMesAno(iso: string) {
  const [y, m] = iso.split('-').map(Number);
  return `${MES_LABELS[(m ?? 1) - 1]}/${String(y).slice(2)}`;
}

function nextMonth(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  const d = new Date(Date.UTC(y, (m - 1) + 1, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function todayFirstOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function parseNumberBR(s: any): number | null {
  if (s == null || s === '') return null;
  if (typeof s === 'number') return isFinite(s) ? s : null;
  const str = String(s).trim().replace(/\s/g, '');
  if (!str) return null;
  // pt-BR: 1.234,56  -> 1234.56
  const hasComma = str.includes(',');
  const normalized = hasComma
    ? str.replace(/\./g, '').replace(',', '.')
    : str;
  const n = Number(normalized);
  return isFinite(n) ? n : null;
}

function fmtValorInput(v: number | null | undefined): string {
  if (v == null || !isFinite(Number(v))) return '';
  return String(v).replace('.', ',');
}

function parseHeaderToIso(raw: any): string | null {
  if (raw == null || raw === '') return null;
  // Excel serial date
  if (typeof raw === 'number' && isFinite(raw)) {
    const d = XLSX.SSF ? XLSX.SSF.parse_date_code(raw) : null;
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-01`;
  }
  const s = String(raw).trim().toLowerCase();
  // yyyy-mm or yyyy-mm-dd
  let m = s.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/);
  if (m) return `${m[1]}-${String(+m[2]).padStart(2, '0')}-01`;
  // mmm/yy or mmm/yyyy
  m = s.match(/^([a-zç]{3,})[\/\-\. ](\d{2}|\d{4})$/i);
  if (m) {
    const mesIdx = MES_LABELS.indexOf(m[1].slice(0, 3));
    if (mesIdx >= 0) {
      let y = +m[2];
      if (y < 100) y += 2000;
      return `${y}-${String(mesIdx + 1).padStart(2, '0')}-01`;
    }
  }
  // dd/mm/yyyy
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${String(+m[2]).padStart(2, '0')}-01`;
  return null;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  def: IndicadorDef[];
  valores: IndicadorValor[];
  onSaved: () => void;
}

export function GerenciarIndicadoresModal({ open, onOpenChange, def, valores, onSaved }: Props) {
  // matrix state: {indicador: {data_ref: number|null}}
  const [grid, setGrid] = useState<Record<string, Record<string, number | null>>>({});
  const [meses, setMeses] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [ano, setAno] = useState<string>('');
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Rebuild grid whenever the modal opens or upstream data changes
  useEffect(() => {
    if (!open) return;
    const g: Record<string, Record<string, number | null>> = {};
    const set = new Set<string>();
    for (const d of def) g[d.indicador] = {};
    for (const v of valores) {
      const k = v.data_ref.slice(0, 10);
      set.add(k);
      if (!g[v.indicador]) g[v.indicador] = {};
      g[v.indicador][k] = Number(v.valor);
    }
    setGrid(g);
    const sorted = Array.from(set).sort();
    setMeses(sorted);
    // set default year to most recent one present
    const anos = Array.from(new Set(sorted.map(m => m.slice(0, 4)))).sort();
    const maisRecente = anos[anos.length - 1];
    if (maisRecente && !anos.includes(ano)) setAno(maisRecente);
    if (!maisRecente) setAno('');
  }, [open, def, valores]);

  const addMes = () => {
    const last = meses[meses.length - 1] ?? todayFirstOfMonth();
    const next = meses.length ? nextMonth(last) : todayFirstOfMonth();
    if (meses.includes(next)) {
      setAno(next.slice(0, 4));
      return;
    }
    setMeses([...meses, next]);
    setAno(next.slice(0, 4));
  };

  const saveCell = async (indicador: string, data_ref: string, raw: string) => {
    const key = `${indicador}|${data_ref}`;
    const trimmed = raw.trim();
    const current = grid[indicador]?.[data_ref] ?? null;
    setSavingCell(key);
    try {
      if (trimmed === '') {
        // delete
        if (current == null) return;
        const { error } = await supabase
          .from('indicadores_valores' as any)
          .delete()
          .eq('indicador', indicador)
          .eq('data_ref', data_ref);
        if (error) throw error;
        setGrid(prev => ({ ...prev, [indicador]: { ...prev[indicador], [data_ref]: null } }));
        toast.success('Valor removido');
        onSaved();
        return;
      }
      const num = parseNumberBR(trimmed);
      if (num == null) { toast.error('Valor inválido'); return; }
      if (num === current) return;
      const { error } = await supabase
        .from('indicadores_valores' as any)
        .upsert({ indicador, data_ref, valor: num } as any, { onConflict: 'indicador,data_ref' });
      if (error) throw error;
      setGrid(prev => ({ ...prev, [indicador]: { ...prev[indicador], [data_ref]: num } }));
      toast.success('Salvo');
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao salvar');
    } finally {
      setSavingCell(null);
    }
  };

  // ---------- import ----------
  const processMatrix = async (rows: any[][]) => {
    if (!rows.length) { toast.error('Arquivo vazio'); return; }
    const header = rows[0];
    // Build column->iso map
    const colMap: Record<number, string> = {};
    for (let c = 1; c < header.length; c++) {
      const iso = parseHeaderToIso(header[c]);
      if (iso) colMap[c] = iso;
    }
    if (!Object.keys(colMap).length) { toast.error('Não foi possível identificar meses no cabeçalho'); return; }

    // Build label/indicador -> key map (case-insensitive)
    const lookup: Record<string, string> = {};
    for (const d of def) {
      lookup[d.indicador.toLowerCase()] = d.indicador;
      lookup[d.label.toLowerCase()] = d.indicador;
    }

    const upserts: { indicador: string; data_ref: string; valor: number }[] = [];
    const ignoradas: string[] = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !row.length) continue;
      const nome = row[0];
      if (nome == null || String(nome).trim() === '') continue;
      const ind = lookup[String(nome).trim().toLowerCase()];
      if (!ind) { ignoradas.push(String(nome)); continue; }
      for (const c of Object.keys(colMap)) {
        const ci = +c;
        const iso = colMap[ci];
        const num = parseNumberBR(row[ci]);
        if (num == null) continue;
        upserts.push({ indicador: ind, data_ref: iso, valor: num });
      }
    }

    if (!upserts.length) {
      toast.error('Nenhum valor válido encontrado');
      return;
    }

    setImporting(true);
    try {
      // chunk upsert
      const CHUNK = 500;
      for (let i = 0; i < upserts.length; i += CHUNK) {
        const slice = upserts.slice(i, i + CHUNK);
        const { error } = await supabase
          .from('indicadores_valores' as any)
          .upsert(slice as any, { onConflict: 'indicador,data_ref' });
        if (error) throw error;
      }
      toast.success(
        `${upserts.length} valor(es) importado(s)` +
          (ignoradas.length ? ` — ${ignoradas.length} linha(s) ignorada(s): ${[...new Set(ignoradas)].join(', ')}` : '')
      );
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao importar');
    } finally {
      setImporting(false);
    }
  };

  const onFile = async (file: File) => {
    try {
      if (file.name.toLowerCase().endsWith('.csv')) {
        Papa.parse(file, {
          complete: (res) => { processMatrix(res.data as any[][]); },
          error: () => toast.error('Erro ao ler CSV'),
        });
      } else {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, raw: true });
        await processMatrix(rows);
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao ler arquivo');
    }
  };

  const anosDisponiveis = useMemo(() => {
    const s = new Set(meses.map(m => m.slice(0, 4)));
    return Array.from(s).sort((a, b) => b.localeCompare(a));
  }, [meses]);
  const mesesFiltrados = useMemo(
    () => meses.filter(m => m.slice(0, 4) === ano),
    [meses, ano]
  );
  const mesesLabel = useMemo(
    () => mesesFiltrados.map(m => ({ iso: m, label: fmtMesAno(m) })),
    [mesesFiltrados]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1200px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" /> Gerenciar Indicadores
          </DialogTitle>
          <DialogDescription>
            Edite os valores diretamente na célula (Enter para salvar). Vazio remove o valor.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={addMes}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar mês
          </Button>
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={importing}>
            {importing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
            Importar Excel/CSV
          </Button>
          {anosDisponiveis.length > 0 && (
            <Select value={ano} onValueChange={setAno}>
              <SelectTrigger className="h-9 w-[120px]">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {anosDisponiveis.map(a => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = '';
            }}
          />
        </div>

        <div className="flex-1 overflow-auto border border-border rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground sticky left-0 bg-muted z-20 min-w-[180px]">
                  Indicador
                </th>
                {mesesLabel.map(m => (
                  <th key={m.iso} className="text-right px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {def.map(d => (
                <tr key={d.indicador} className="border-t border-border">
                  <td className="px-3 py-2 sticky left-0 bg-card z-10">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: d.cor }} />
                      <span className={d.base ? 'font-semibold' : ''}>{d.label}</span>
                    </span>
                  </td>
                  {mesesFiltrados.map(m => {
                    const key = `${d.indicador}|${m}`;
                    const val = grid[d.indicador]?.[m] ?? null;
                    return (
                      <td key={m} className="px-1 py-1 text-right">
                        <EditableCell
                          initial={fmtValorInput(val)}
                          saving={savingCell === key}
                          onCommit={(v) => saveCell(d.indicador, m, v)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditableCell({
  initial, saving, onCommit,
}: { initial: string; saving: boolean; onCommit: (v: string) => void }) {
  const [v, setV] = useState(initial);
  useEffect(() => { setV(initial); }, [initial]);
  return (
    <div className="relative">
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => { if (v !== initial) onCommit(v); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); }
          if (e.key === 'Escape') { setV(initial); (e.target as HTMLInputElement).blur(); }
        }}
        className="w-24 px-2 py-1 text-right text-xs border border-border rounded bg-card tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
        placeholder="—"
        disabled={saving}
      />
      {saving && <Loader2 className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-muted-foreground" />}
    </div>
  );
}
