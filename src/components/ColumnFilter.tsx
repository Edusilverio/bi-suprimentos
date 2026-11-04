import { useMemo, useState } from 'react'
import { Filter } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'

type Props = {
  options: string[]
  selected: Set<string>
  onChange: (next: Set<string>) => void
  labelFn?: (v: string) => string
}

/** Filtro estilo Excel: ícone no cabeçalho abre lista de valores com checkboxes. */
export function ColumnFilter({ options, selected, onChange, labelFn }: Props) {
  const [busca, setBusca] = useState('')
  const ativos = selected.size > 0
  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    const base = options.slice().sort((a, b) => a.localeCompare(b))
    return q ? base.filter(o => (labelFn ? labelFn(o) : o).toLowerCase().includes(q)) : base
  }, [options, busca, labelFn])

  function toggle(v: string) {
    const next = new Set(selected)
    next.has(v) ? next.delete(v) : next.add(v)
    onChange(next)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`ml-1 inline-flex h-4 w-4 items-center justify-center rounded transition-colors ${
            ativos ? 'text-primary' : 'text-muted-foreground/40 hover:text-muted-foreground'
          }`}
          title="Filtrar coluna"
          aria-label="Filtrar"
        >
          <Filter className="h-3 w-3" fill={ativos ? 'currentColor' : 'none'} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Filtrar…" className="h-7 mb-2 text-xs" />
        <div className="max-h-56 overflow-y-auto space-y-1">
          {filtradas.length === 0 && <p className="text-xs text-muted-foreground px-1">Sem valores.</p>}
          {filtradas.map(o => (
            <label key={o} className="flex items-center gap-2 text-xs px-1 py-0.5 rounded hover:bg-muted cursor-pointer">
              <Checkbox checked={selected.has(o)} onCheckedChange={() => toggle(o)} className="h-3.5 w-3.5" />
              <span className="truncate">{labelFn ? labelFn(o) : (o || '(vazio)')}</span>
            </label>
          ))}
        </div>
        {ativos && (
          <Button variant="ghost" size="sm" className="w-full h-6 mt-2 text-xs" onClick={() => onChange(new Set())}>
            Limpar ({selected.size})
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}
