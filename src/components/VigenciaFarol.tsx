import { Check } from 'lucide-react'
import { farolVigencia } from '@/lib/sla'

type VigenciaFarolProps = {
  finishDate: string | null
  balance: number | null
  checked: boolean
  onCheck: (id: number, checked: boolean) => void
  rowId: number
}

const colorClass = {
  green: 'bg-[hsl(var(--badge-success-text))]',
  yellow: 'bg-accent',
  red: 'bg-destructive',
}

export default function VigenciaFarol({
  finishDate,
  balance,
  checked,
  onCheck,
  rowId,
}: VigenciaFarolProps) {
  const color = farolVigencia(finishDate, balance)

  return (
    <button
      type="button"
      onClick={() => onCheck(rowId, !checked)}
      className="inline-flex items-center gap-2 rounded-md border border-border px-2 py-1 text-xs text-foreground transition-colors hover:bg-muted"
      aria-pressed={checked}
      title="Vigência verificada"
    >
      <span className={`h-2.5 w-2.5 rounded-full ${colorClass[color]}`} />
      {checked ? <Check className="h-3.5 w-3.5 text-[hsl(var(--badge-success-text))]" /> : null}
    </button>
  )
}