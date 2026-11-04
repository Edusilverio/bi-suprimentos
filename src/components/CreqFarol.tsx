import type { CreqFarol as CreqFarolValue } from '@/services/creqService'

const MAP: Record<string, { cls: string; label: string }> = {
  '1':  { cls: 'bg-emerald-500', label: 'Contratado' },
  '0':  { cls: 'bg-amber-400',   label: 'Vence em até 30 dias' },
  '-1': { cls: 'bg-red-500',     label: 'Atrasado' },
  '-2': { cls: 'bg-neutral-800 dark:bg-neutral-200', label: 'Prazo futuro' },
}

export function CreqFarol({ value }: { value: CreqFarolValue }) {
  if (value === null || value === undefined) {
    return <span className="inline-block h-2.5 w-2.5 rounded-full bg-muted-foreground/30" title="N/A" />
  }
  const m = MAP[String(value)] ?? MAP['-2']
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${m.cls}`} title={m.label} />
}

export const CREQ_FAROL_LEGENDA = [
  { value: 1 as const,  label: 'Contratado' },
  { value: 0 as const,  label: '≤ 30 dias' },
  { value: -1 as const, label: 'Atrasado' },
  { value: -2 as const, label: 'Futuro' },
]
