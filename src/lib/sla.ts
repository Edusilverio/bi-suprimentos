export const parseDate = (value: string | null): Date | null => {
  if (!value) return null

  try {
    if (value.includes('/')) {
      const [datePart] = value.split(' ')
      const [d, m, y] = datePart.split('/')

      return new Date(`${y}-${m}-${d}T00:00:00`)
    }

    return new Date(value)
  } catch {
    return null
  }
}

export const diffDias = (
  inicio: string | null,
  fim: string | null
): number | null => {
  const d1 = parseDate(inicio)
  const d2 = parseDate(fim)

  if (!d1 || !d2) return null

  const diff = Math.round((d2.getTime() - d1.getTime()) / 86400000)

  if (Math.abs(diff) > 1095) return null

  return diff
}

export const diffDiasVivo = (
  inicio: string | null,
  fim: string | null
): { dias: number | null; aberto: boolean } => {
  const d1 = parseDate(inicio)
  if (!d1) return { dias: null, aberto: false }

  if (!fim) {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const diff = Math.round((hoje.getTime() - d1.getTime()) / 86400000)
    if (Math.abs(diff) > 1095) return { dias: null, aberto: false }
    return { dias: diff, aberto: true }
  }

  const d2 = parseDate(fim)
  if (!d2) return { dias: null, aberto: false }

  const diff = Math.round((d2.getTime() - d1.getTime()) / 86400000)
  if (Math.abs(diff) > 1095) return { dias: null, aberto: false }
  return { dias: diff, aberto: false }
}

export const diasAteHoje = (value: string | null): number | null => {
  const d = parseDate(value)

  if (!d) return null

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  return Math.round((d.getTime() - hoje.getTime()) / 86400000)
}

export const formatSLA = (dias: number | null): string => {
  if (dias === null) return '—'

  return `${dias}d`
}

export type FarolColor = 'green' | 'yellow' | 'red'

export const farolVigencia = (
  finishDate: string | null,
  balance: number | null
): FarolColor => {
  if (balance !== null && balance <= 0) return 'red'

  const dias = diasAteHoje(finishDate)

  if (dias === null) return 'green'
  if (dias <= 0) return 'red'
  if (dias <= 30) return 'yellow'

  return 'green'
}