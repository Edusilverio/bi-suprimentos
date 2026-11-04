export const formatDate = (value: string | null): string => {
  if (!value) return '—'

  try {
    const d = new Date(value)

    if (isNaN(d.getTime())) return value

    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return value
  }
}