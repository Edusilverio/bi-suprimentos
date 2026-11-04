import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import { Download, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getDetalheSpendMes,
  getDetalheRequisicoesMes,
  type DetalheSpendRow,
  type DetalheRequisicaoRow,
  type OneChartFilters,
} from '@/services/onepageService'

type Tipo = 'spend' | 'requisicoes'

interface DrillDownModalProps {
  tipo: Tipo
  titulo: string
  ano: number
  mes: number
  filters: OneChartFilters
  onClose: () => void
}

const fmtCurrency = (v: number) =>
  `R$ ${Number(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtData = (d: string | null) => {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('pt-BR')
}

export function DrillDownModal({ tipo, titulo, ano, mes, filters, onClose }: DrillDownModalProps) {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancel = false
    setLoading(true)
    const promise =
      tipo === 'spend'
        ? getDetalheSpendMes(ano, mes, filters)
        : getDetalheRequisicoesMes(ano, mes, filters)
    promise.then(res => {
      if (cancel) return
      setRows(res.data ?? [])
      setError(res.error)
      setLoading(false)
    })
    return () => { cancel = true }
  }, [tipo, ano, mes, JSON.stringify(filters)])

  const handleExport = () => {
    const sheetRows =
      tipo === 'spend'
        ? (rows as DetalheSpendRow[]).map(r => ({
            'Número': r.numero ?? '',
            'Fornecedor': r.fornecedor ?? '',
            'Grupo de Material': r.grupo ?? '',
            'Obra': r.obra ?? '',
            'Valor': r.valor,
            'Data': fmtData(r.data),
            'Analista': r.analista ?? '',
          }))
        : (rows as DetalheRequisicaoRow[]).map(r => ({
            'Número': r.numero ?? '',
            'Obra': r.obra ?? '',
            'Material': r.material ?? '',
            'Analista': r.analista ?? '',
            'Status': r.status ?? '',
            'Data': fmtData(r.data),
          }))
    const ws = XLSX.utils.json_to_sheet(sheetRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Detalhe')
    XLSX.writeFile(wb, `${titulo}.xlsx`)
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-6">
            <DialogTitle>{titulo}</DialogTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExport}
              disabled={loading || rows.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        </DialogHeader>

        <div className="overflow-auto flex-1 -mx-6 px-6">
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : error ? (
            <div className="text-sm text-destructive py-8 text-center">{error}</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Nenhum registro neste mês.</div>
          ) : tipo === 'spend' ? (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card z-10 border-b border-border">
                <tr className="text-left text-muted-foreground uppercase tracking-wide text-[10px]">
                  <th className="py-2 px-2">Número</th>
                  <th className="py-2 px-2">Fornecedor</th>
                  <th className="py-2 px-2">Grupo</th>
                  <th className="py-2 px-2">Obra</th>
                  <th className="py-2 px-2 text-right">Valor</th>
                  <th className="py-2 px-2">Data</th>
                  <th className="py-2 px-2">Analista</th>
                </tr>
              </thead>
              <tbody>
                {(rows as DetalheSpendRow[]).map((r, i) => (
                  <tr key={i} className="border-b border-border/40" style={{ backgroundColor: i % 2 ? 'hsl(var(--table-odd))' : 'hsl(var(--table-even))' }}>
                    <td className="py-2 px-2">{r.numero ?? '—'}</td>
                    <td className="py-2 px-2">{r.fornecedor ?? '—'}</td>
                    <td className="py-2 px-2">{r.grupo ?? '—'}</td>
                    <td className="py-2 px-2">{r.obra ?? '—'}</td>
                    <td className="py-2 px-2 text-right">{fmtCurrency(r.valor)}</td>
                    <td className="py-2 px-2">{fmtData(r.data)}</td>
                    <td className="py-2 px-2">{r.analista ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card z-10 border-b border-border">
                <tr className="text-left text-muted-foreground uppercase tracking-wide text-[10px]">
                  <th className="py-2 px-2">Número</th>
                  <th className="py-2 px-2">Obra</th>
                  <th className="py-2 px-2">Material</th>
                  <th className="py-2 px-2">Analista</th>
                  <th className="py-2 px-2">Status</th>
                  <th className="py-2 px-2">Data</th>
                </tr>
              </thead>
              <tbody>
                {(rows as DetalheRequisicaoRow[]).map((r, i) => (
                  <tr key={i} className="border-b border-border/40" style={{ backgroundColor: i % 2 ? 'hsl(var(--table-odd))' : 'hsl(var(--table-even))' }}>
                    <td className="py-2 px-2">{r.numero ?? '—'}</td>
                    <td className="py-2 px-2">{r.obra ?? '—'}</td>
                    <td className="py-2 px-2">{r.material ?? '—'}</td>
                    <td className="py-2 px-2">{r.analista ?? '—'}</td>
                    <td className="py-2 px-2">{r.status ?? '—'}</td>
                    <td className="py-2 px-2">{fmtData(r.data)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="border-t border-border pt-2 text-xs text-muted-foreground flex justify-between">
          <span>{rows.length} registro{rows.length === 1 ? '' : 's'}</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default DrillDownModal
