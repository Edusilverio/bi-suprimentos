import { useFilterStore } from '@/stores/useFilterStore';
import { X, User, FileText, Package, Calendar, RefreshCw, Layers } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  analistas?: string[];
  tipos?: string[];
  obras: string[];
  grupos?: string[];
  /** Whether to show date period filter. Defaults to true */
  showPeriod?: boolean;
}

function MultiSelect({ label, options, selected, onChange, icon }: { label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void; icon: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (val: string) => {
    onChange(selected.includes(val) ? selected.filter(s => s !== val) : [...selected, val]);
  };

  const singleName = selected.length === 1 ? selected[0] : null;
  const showSearch = options.length > 10;
  const filtered = showSearch && search.trim()
    ? options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground min-w-[140px] max-w-[280px] hover:opacity-90 transition-opacity"
        title={singleName ?? label}
      >
        {icon}
        <span className="truncate">
          {singleName ? singleName : label}
        </span>
        {selected.length > 1 && (
          <span className="ml-auto bg-primary-foreground/20 text-primary-foreground text-xs rounded-full px-1.5 py-0.5 font-medium shrink-0">{selected.length}</span>
        )}
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg min-w-[220px] max-h-64 overflow-auto">
          {showSearch && (
            <div className="sticky top-0 bg-card p-2 border-b border-border">
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-full px-2 py-1 text-sm border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum resultado</div>
          ) : filtered.map(opt => (
            <label key={opt} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer text-sm">
              <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} className="rounded accent-primary" />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}


const applyDateMask = (value: string): string => {
  const nums = value.replace(/\D/g, '').slice(0, 8);
  if (nums.length > 4) return `${nums.slice(0, 2)}/${nums.slice(2, 4)}/${nums.slice(4)}`;
  if (nums.length > 2) return `${nums.slice(0, 2)}/${nums.slice(2)}`;
  return nums;
};

const parseDateBR = (text: string): Date | null => {
  const parts = text.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y || y < 1900 || m > 12 || d > 31) return null;
  const date = new Date(y, m - 1, d);
  if (date.getDate() !== d || date.getMonth() !== m - 1 || date.getFullYear() !== y) return null;
  return date;
};

function DateField({
  value,
  onChange,
  placeholder,
  disabledFn,
}: {
  value: Date | undefined;
  onChange: (d: Date) => void;
  placeholder: string;
  disabledFn?: (d: Date) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value ? format(value, 'dd/MM/yyyy') : '');
  const [error, setError] = useState(false);

  useEffect(() => {
    setText(value ? format(value, 'dd/MM/yyyy') : '');
    setError(false);
  }, [value]);

  const handleType = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = applyDateMask(e.target.value);
    setText(masked);
    if (masked.length === 0) {
      setError(false);
      return;
    }
    if (masked.length === 10) {
      const d = parseDateBR(masked);
      if (d && (!disabledFn || !disabledFn(d))) {
        setError(false);
        onChange(d);
      } else {
        setError(true);
      }
    }
  };

  const handlePick = (d: Date | undefined) => {
    if (!d) return;
    setText(format(d, 'dd/MM/yyyy'));
    setError(false);
    onChange(d);
    setOpen(false);
  };

  return (
    <div className="flex flex-col">
      <div className="relative">
        <input
          type="text"
          value={text}
          onChange={handleType}
          placeholder={placeholder}
          maxLength={10}
          inputMode="numeric"
          className={cn(
            'w-[140px] pl-3 pr-8 py-2 text-xs border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary',
            error ? 'border-destructive' : 'border-border'
          )}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-primary/80"
              aria-label="Abrir calendário"
            >
              <Calendar className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={value}
              onSelect={handlePick}
              disabled={disabledFn}
              initialFocus
              className={cn('p-3 pointer-events-auto')}
            />
          </PopoverContent>
        </Popover>
      </div>
      {error && <span className="text-[10px] text-destructive mt-0.5">Data inválida</span>}
    </div>
  );
}

function DateRangePicker() {
  const { activePeriod, setPeriod } = useFilterStore();

  const startDate = activePeriod?.[0] ?? undefined;
  const endDate = activePeriod?.[1] ?? undefined;

  const handleStart = (date: Date) => setPeriod([date, endDate ?? date]);
  const handleEnd = (date: Date) => setPeriod([startDate ?? date, date]);
  const clearPeriod = () => setPeriod(null);

  return (
    <div className="flex items-start gap-1">
      <DateField value={startDate} onChange={handleStart} placeholder="DD/MM/AAAA" />
      <DateField
        value={endDate}
        onChange={handleEnd}
        placeholder="DD/MM/AAAA"
        disabledFn={(d) => (startDate ? d < startDate : false)}
      />
      {activePeriod && (
        <button onClick={clearPeriod} className="p-1.5 mt-1.5 text-muted-foreground hover:text-destructive transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function FilterBar({ analistas, tipos, obras, grupos, showPeriod = true }: FilterBarProps) {
  const { activeAnalistas, activeTipos, activeObras, activePeriod, activeGruposMaterial, clearAllFilters } = useFilterStore();
  const { setFilter } = useFilterStore();

  const hasFilters = activeAnalistas.length > 0 || activeTipos.length > 0 || activeObras.length > 0 || activeGruposMaterial.length > 0 || !!activePeriod;

  return (
    <div className="filter-bar">
      <div className="flex items-center gap-3 flex-wrap flex-1">
        {analistas && <MultiSelect label="Analista" options={analistas} selected={activeAnalistas} onChange={v => setFilter('activeAnalistas', v)} icon={<User className="h-3.5 w-3.5" />} />}
        {tipos && <MultiSelect label="Tipo" options={tipos} selected={activeTipos} onChange={v => setFilter('activeTipos', v)} icon={<FileText className="h-3.5 w-3.5" />} />}
        <MultiSelect label="Obra" options={obras} selected={activeObras} onChange={v => setFilter('activeObras', v)} icon={<Package className="h-3.5 w-3.5" />} />
        {grupos && <MultiSelect label="Grupo de Material" options={grupos} selected={activeGruposMaterial} onChange={v => setFilter('activeGruposMaterial', v)} icon={<Layers className="h-3.5 w-3.5" />} />}
      </div>
      {showPeriod && <DateRangePicker />}
      <button
        onClick={() => window.location.reload()}
        title="Atualizar dados"
        className="flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
      >
        <RefreshCw className="h-3.5 w-3.5" /> Atualizar
      </button>
      {hasFilters && (
        <button onClick={clearAllFilters} className="flex items-center gap-1 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
          <X className="h-3.5 w-3.5" /> Limpar
        </button>
      )}
    </div>
  );
}
