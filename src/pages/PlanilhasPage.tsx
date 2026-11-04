import { useState, useCallback, useEffect, useRef } from 'react';
import { Table2, Upload, Download, Trash2, Loader2, FileSpreadsheet, Info, Plus, ChevronsDown } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { PLANILHAS_CONFIG, type PlanilhaConfig } from '@/config/planilhas';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { DialogoConfirmacaoImport } from '@/components/planilhas/DialogoConfirmacaoImport';

const PAGE_SIZE = 100;

export default function PlanilhasPage() {
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.nivel === 1;

  const [selectedId, setSelectedId] = useState(PLANILHAS_CONFIG[0]?.id ?? '');
  const config = PLANILHAS_CONFIG.find(p => p.id === selectedId);

  if (PLANILHAS_CONFIG.length === 0) {
    return (
      <div className="page-container">
        <PageHeader title="PLANILHAS" icon={<Table2 className="h-5 w-5 text-primary-foreground" />} />
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <FileSpreadsheet className="h-12 w-12" />
          <p>Nenhuma planilha disponível — contate o administrador.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader title="PLANILHAS" icon={<Table2 className="h-5 w-5 text-primary-foreground" />} />
      {config && (
        <PlanilhaView
          key={config.id}
          config={config}
          selectedId={selectedId}
          onSelectId={setSelectedId}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}

/* ───────── Main View ───────── */

function PlanilhaView({
  config,
  selectedId,
  onSelectId,
  isAdmin,
}: {
  config: PlanilhaConfig;
  selectedId: string;
  onSelectId: (id: string) => void;
  isAdmin: boolean;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [editingCell, setEditingCell] = useState<{ rowId: string; col: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [pendingImport, setPendingImport] = useState<{ rows: Record<string, any>[]; qtdAtual: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, count, error } = await supabase
      .from(config.tableName as any)
      .select('*', { count: 'exact' })
      .order('id', { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      toast.error('Erro ao carregar dados: ' + error.message);
      setRows([]);
    } else {
      setRows((data as any[]) ?? []);
      setTotalCount(count ?? 0);
    }
    setLoading(false);
  }, [config.tableName, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Import ── */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    handleImport(file);
  };

  const parseExcelFile = async (
    file: File,
    cfg: PlanilhaConfig
  ): Promise<Record<string, any>[]> => {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const allRows: any[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: null,
    });

    const dataRows = allRows.slice(1);
    const mappedCols = cfg.columns.filter(c => c.colIndex !== undefined);
    const result: Record<string, any>[] = [];

    for (const row of dataRows) {
      const obj: Record<string, any> = {};
      for (const col of mappedCols) {
        const raw = row[col.colIndex!] ?? null;
        let val: any = null;
        if (raw !== null && raw !== undefined) {
          const str = String(raw).trim();
          if (str === '') {
            val = null;
          } else if (col.type === 'integer') {
            const n = Number(str);
            val = isNaN(n) ? null : Math.round(n);
          } else if (col.type === 'number') {
            const n = Number(str);
            val = isNaN(n) ? null : n;
          } else {
            val = str;
          }
        }
        obj[col.key] = val;
      }
      const firstKey = mappedCols[0]?.key;
      if (firstKey && obj[firstKey] !== null) {
        result.push(obj);
      }
    }
    return result;
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      const isCSV = file.name.toLowerCase().endsWith('.csv');
      let rows: Record<string, any>[] = [];

      if (isCSV) {
        await new Promise<void>((resolve, reject) => {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              rows = results.data as Record<string, any>[];
              resolve();
            },
            error: reject,
          });
        });
      } else {
        rows = await parseExcelFile(file, config);
      }

      // Validações de proteção
      if (rows.length === 0) {
        toast.error('Nenhum dado válido encontrado no arquivo.');
        return;
      }
      const firstKey = config.columns.find(c => c.colIndex !== undefined)?.key;
      const todaPrimeiraColunaNula = firstKey
        ? rows.every(r => r[firstKey] === null || r[firstKey] === undefined || r[firstKey] === '')
        : false;
      if (todaPrimeiraColunaNula) {
        toast.error('A primeira coluna do arquivo está toda vazia. Verifique o cabeçalho/posição das colunas.');
        return;
      }

      // Conta linhas atuais para mostrar no diálogo
      const { count, error: countError } = await supabase
        .from(config.tableName as any)
        .select('*', { count: 'exact', head: true });

      if (countError) {
        toast.error('Erro ao consultar tabela atual: ' + countError.message);
        return;
      }

      setPendingImport({ rows, qtdAtual: count ?? 0 });
    } catch (err) {
      console.error('Erro inesperado na importação:', err);
      toast.error('Erro inesperado. Verifique o arquivo e tente novamente.');
    } finally {
      setImporting(false);
    }
  };

  const executeImport = async () => {
    if (!pendingImport) return;
    const { rows } = pendingImport;
    setPendingImport(null);
    setImporting(true);
    toast.loading('Substituindo dados...', { id: 'import-progress' });

    try {
      const { data, error } = await (supabase.rpc as any)('fn_replace_planilha', {
        p_tabela: config.tableName,
        p_dados: rows,
      });

      if (error) {
        console.error('Erro RPC fn_replace_planilha:', error);
        toast.error(
          `Erro ao importar: ${error.message}. A tabela permanece como estava antes (rollback automático).`,
          { id: 'import-progress', duration: 8000 }
        );
        return;
      }

      const result = (data ?? {}) as { qtd_antes?: number; qtd_depois?: number };
      toast.success(
        `${result.qtd_depois ?? rows.length} linhas importadas em ${config.label}. ` +
        `Substituiu ${result.qtd_antes ?? 0} linhas anteriores.`,
        { id: 'import-progress', duration: 5000 }
      );
      setPage(0);
      await fetchData();
    } catch (err: any) {
      console.error('Erro inesperado RPC:', err);
      toast.error(`Erro inesperado: ${err?.message ?? 'desconhecido'}`, { id: 'import-progress' });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /* ── Export ── */
  const handleExportExcel = async () => {
    toast.info(`Exportando ${config.label}...`);
    const { data } = await supabase
      .from(config.tableName as any)
      .select('*')
      .order('id', { ascending: true });

    const ws = XLSX.utils.json_to_sheet((data as any[]) ?? []);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, config.label);
    XLSX.writeFile(wb, `${config.label}.xlsx`);
  };

  const handleExportCSV = async () => {
    toast.info(`Exportando ${config.label}...`);
    const { data } = await supabase
      .from(config.tableName as any)
      .select('*')
      .order('id', { ascending: true });

    const csv = Papa.unparse((data as any[]) ?? []);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.label}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Inline edit ── */
  const handleCellClick = (rowId: string, col: string, value: any) => {
    setEditingCell({ rowId, col });
    setEditValue(String(value ?? ''));
  };

  const handleCellSave = async () => {
    if (!editingCell) return;
    const { rowId, col } = editingCell;
    const colConfig = config.columns.find(c => c.key === col);

    const tratarValor = (valor: any, tipo: string) => {
      if (tipo === 'number' || tipo === 'integer') {
        if (valor === '' || valor === null || valor === undefined) return null;
        const num = Number(valor);
        if (isNaN(num) || num === 0) return null;
        return num;
      }
      return valor === '' ? null : valor;
    };

    const parsedValue = tratarValor(editValue, colConfig?.type ?? '');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query = supabase.from(config.tableName as any) as any;
    const { error } = await query.update({ [col]: parsedValue }).eq('id', rowId);

    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
    } else {
      setRows(prev => prev.map(r => r.id === rowId ? { ...r, [col]: parsedValue } : r));
      toast.success('Salvo ✓', { duration: 2000 });
    }
    setEditingCell(null);
  };

  const handleCellKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      handleCellSave();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  /* ── Add row ── */
  const handleAddRow = async () => {
    const newRow: Record<string, any> = {};
    config.columns.forEach(c => {
      switch (c.type) {
        case 'integer':
        case 'number':
          newRow[c.key] = null;
          break;
        case 'boolean':
          newRow[c.key] = null;
          break;
        default:
          newRow[c.key] = null;
      }
    });
    const { error } = await supabase
      .from(config.tableName as any)
      .insert(newRow as any);

    if (error) {
      toast.error('Erro ao adicionar linha: ' + error.message);
      console.error('Erro INSERT planilha:', error);
    } else {
      toast.success('Linha adicionada');
      await fetchData();
    }
  };

  /* ── Delete row ── */
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from(config.tableName as any)
      .delete()
      .eq('id', deleteTarget.id as any);

    if (error) {
      toast.error('Erro ao excluir: ' + error.message);
    } else {
      setRows(prev => prev.filter(r => r.id !== deleteTarget.id));
      setTotalCount(c => c - 1);
      toast.success('Linha excluída.');
    }
    setDeleteTarget(null);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const rangeStart = page * PAGE_SIZE + 1;
  const rangeEnd = Math.min((page + 1) * PAGE_SIZE, totalCount);

  return (
    <div className="space-y-4">
      {/* ── Header controls ── */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedId} onValueChange={(v) => { onSelectId(v); setPage(0); }}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Selecione uma planilha" />
          </SelectTrigger>
          <SelectContent>
            {PLANILHAS_CONFIG.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
          {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Importar
        </Button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileSelect} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Download className="h-4 w-4" /> Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleExportExcel}>📊 Exportar como Excel (.xlsx)</DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportCSV}>📄 Exportar como CSV (.csv)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          onClick={() => {
            const last = Math.max(0, Math.ceil(totalCount / PAGE_SIZE) - 1);
            setPage(last);
          }}
          title="Ir para o final da planilha"
          disabled={totalCount === 0}
        >
          <ChevronsDown className="h-4 w-4" />
          Ir para o final
        </Button>
      </div>

      {/* ── Admin info ── */}
      {isAdmin && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-muted/50 text-xs text-muted-foreground">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>Para adicionar novas planilhas ao sistema, configure a tabela no Supabase e adicione a entrada em <code className="font-mono text-[11px]">PLANILHAS_CONFIG</code>.</span>
        </div>
      )}

      {/* ── Grid ── */}
      <div className="relative border border-border rounded-lg bg-card overflow-hidden" style={{ minHeight: 500 }}>
        {importing && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/70 backdrop-blur-sm gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Importando dados...</span>
          </div>
        )}

        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-[5]">
                <tr className="border-b border-border bg-muted">
                  <th className="px-3 py-3 text-center font-semibold text-muted-foreground w-14 bg-muted">#</th>
                  {config.columns.map(c => (
                    <th key={c.key} className="px-4 py-3 text-left font-semibold text-muted-foreground" style={c.width ? { minWidth: c.width, width: c.width } : undefined}>{c.label}</th>
                  ))}
                  <th className="px-3 py-3 w-10 bg-muted"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.id ?? i}
                    className="border-b border-border/50 group transition-colors"
                    style={{ backgroundColor: i % 2 === 0 ? 'hsl(var(--table-even))' : 'hsl(var(--table-odd))' }}
                  >
                    <td className="px-3 py-2.5 text-center text-xs text-muted-foreground bg-muted/50 font-mono select-none relative">
                      {rangeStart + i}
                      <button
                        onClick={() => setDeleteTarget(row)}
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                    {config.columns.map(col => {
                      const isEditing = editingCell?.rowId === row.id && editingCell?.col === col.key;
                      return (
                        <td
                          key={col.key}
                          className={`px-4 py-2.5 cursor-pointer ${isEditing ? 'p-0' : ''}`}
                          onClick={() => !isEditing && handleCellClick(row.id, col.key, row[col.key])}
                        >
                          {isEditing ? (
                            <input
                              autoFocus
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onBlur={handleCellSave}
                              onKeyDown={handleCellKeyDown}
                              className="w-full h-full px-4 py-2.5 border-2 border-accent bg-card text-foreground text-sm focus:outline-none"
                            />
                          ) : (
                            <span>{String(row[col.key] ?? '-')}</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5"></td>
                  </tr>
                ))}

                {/* Add row placeholder */}
                <tr
                  className="border-b border-border/50 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={handleAddRow}
                >
                  <td className="px-3 py-2.5 text-center bg-muted/50"></td>
                  <td colSpan={config.columns.length + 1} className="px-4 py-2.5 text-muted-foreground text-sm italic">
                    <span className="flex items-center gap-2 not-italic">
                      <Plus size={14} />
                      Clique para adicionar linha...
                    </span>
                  </td>
                </tr>

                {rows.length === 0 && (
                  <tr>
                    <td colSpan={config.columns.length + 2} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <FileSpreadsheet className="h-10 w-10" />
                        <p className="font-medium">Nenhum dado encontrado.</p>
                        <p className="text-xs">Importe um arquivo para começar.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination footer ── */}
        {!loading && totalCount > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted-foreground">
            <span>Exibindo {rangeStart}-{rangeEnd} de {totalCount} registros</span>
            {totalPages > 1 && (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Anterior</Button>
                <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próxima →</Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Delete dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir linha</DialogTitle>
            <DialogDescription>Excluir esta linha? Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Import confirmation dialog ── */}
      <DialogoConfirmacaoImport
        open={!!pendingImport}
        tabela={config.tableName}
        qtdAtual={pendingImport?.qtdAtual ?? 0}
        qtdNova={pendingImport?.rows.length ?? 0}
        onConfirmar={executeImport}
        onCancelar={() => {
          setPendingImport(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
      />
    </div>
  );
}
