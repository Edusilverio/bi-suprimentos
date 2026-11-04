export const RATING_MAP: Record<number, { label: string; cor: string }> = {
  40: { label: 'Ótimo', cor: '#10B981' },
  30: { label: 'Bom', cor: '#3B82F6' },
  20: { label: 'Regular', cor: '#F59E0B' },
  10: { label: 'Ruim', cor: '#EF4444' },
}

export const classificarRating = (v: number) =>
  RATING_MAP[v] ?? { label: '—', cor: '#9CA3AF' }

export const RATING_VALUES = [40, 30, 20, 10] as const

export function gerarMeses(ini: Date, fim: Date): string[] {
  const meses: string[] = []
  const d = new Date(ini.getFullYear(), ini.getMonth(), 1)
  const end = new Date(fim.getFullYear(), fim.getMonth(), 1)
  while (d <= end) {
    meses.push(`${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`)
    d.setMonth(d.getMonth() + 1)
  }
  return meses
}

export function ultimosNMeses(n: number): string[] {
  const hoje = new Date()
  const meses: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    meses.push(`${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`)
  }
  return meses
}

const MESES_ABBR = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export function formatarMesAbbr(mmYYYY: string): string {
  const [mm, yyyy] = mmYYYY.split('-')
  const idx = parseInt(mm, 10) - 1
  const yy = yyyy.slice(-2)
  return `${MESES_ABBR[idx] ?? mm}/${yy}`
}
