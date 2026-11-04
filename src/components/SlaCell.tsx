const SlaCell = ({
  dias,
  bold = false,
}: {
  dias: number | null
  bold?: boolean
}) => {
  if (dias === null) {
    return <span className="text-muted-foreground">—</span>
  }

  const color =
    dias < 0 ? 'text-red-500' :
    dias === 0 ? 'text-yellow-500' :
    'text-green-500'

  return (
    <span className={`${color} ${bold ? 'font-bold' : ''} text-sm`}>
      {dias}d
    </span>
  )
}

export default SlaCell