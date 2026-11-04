import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { Upload, FileSpreadsheet, Loader2, AlertTriangle } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { importarCreq, type CreqImportPayload } from '@/services/creqService'

function toISO(v: any): string | null {
  if (v === null || v === undefined || v === '') return null
  if (v instanceof Date) {
    const y = v.getFullYear(), m = String(v.getMonth() + 1).padStart(2, '0'), d = String(v.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  if (typeof v === 'number') {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000))
    const y = d.getUTCFullYear(), m = String(d.getUTCMonth() + 1).padStart(2, '0'), dd = String(d.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${dd}`
  }
  return String(v).trim() || null
}

const clean = (v: any): string | null => {
  const s = v == null ? '' : String(v).trim()
  if (!s || s === '-') return null
  return s
}

// Extrai payload das abas "Datas Marco x Obras" (marcos) e "CREQ" (itens).
function parseWorkbook(wb: XLSX.WorkBook): CreqImportPayload {
  const findSheet = (needle: string) =>
    wb.SheetNames.find(n => n.toLowerCase().includes(needle)) ?? ''

  // ---- Marcos ----
  const marcosSheet = wb.Sheets[findSheet('marco')]
  let obra = '', tipo: string | null = null
  const marcos = {
    inicio_obra: null as string | null, inicio_estrutura: null as string | null,
    termino_estrutura: null as string | null, termino_emboco: null as string | null,
    termino_obra: null as string | null,
  }
  if (marcosSheet) {
    const rows = XLSX.utils.sheet_to_json<any[]>(marcosSheet, { header: 1, blankrows: false })
    // Cabeçalho = linha cuja coluna C (índice 2) é exatamente "Obras" (evita o título "OBRAS" em B2).
    const hIdx = rows.findIndex(r => String(r?.[2] ?? '').trim().toLowerCase() === 'obras')
    const data = hIdx >= 0 ? rows.slice(hIdx + 1).find(r => clean(r?.[2])) : undefined
    if (data) {
      obra = clean(data[2]) ?? ''
      marcos.inicio_obra = toISO(data[3])
      marcos.inicio_estrutura = toISO(data[4])
      marcos.termino_estrutura = toISO(data[5])
      marcos.termino_emboco = toISO(data[6])
      marcos.termino_obra = toISO(data[7])
      tipo = clean(data[8])
    }
  }

  // ---- Itens (aba CREQ) ----
  const creqSheet = wb.Sheets[wb.SheetNames.find(n => n.toUpperCase() === 'CREQ') ?? '']
  const itens: CreqImportPayload['itens'] = []
  if (creqSheet) {
    const rows = XLSX.utils.sheet_to_json<any[]>(creqSheet, { header: 1, blankrows: false })
    // Cabeçalho = linha cuja coluna D (índice 3) é exatamente "Serviço".
    const hIdx = rows.findIndex(r => String(r?.[3] ?? '').trim().toLowerCase() === 'serviço')
    for (const r of hIdx >= 0 ? rows.slice(hIdx + 1) : []) {
      const o = clean(r?.[2]) // C Obras
      const servico = clean(r?.[3]) // D Serviço
      if (!servico) continue
      if (!obra && o) obra = o
      itens.push({ servico, status: clean(r?.[8]), fornecedor: clean(r?.[9]) }) // I Status, J Fornecedor
    }
  }

  return { obra, tipo, marcos, itens }
}

export function CreqImportDialog({
  open, onClose, onImported,
}: { open: boolean; onClose: () => void; onImported: () => void }) {
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [payload, setPayload] = useState<CreqImportPayload | null>(null)
  const [fileName, setFileName] = useState('')
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setParsing(true)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: true })
      const p = parseWorkbook(wb)
      if (!p.obra || p.itens.length === 0) {
        toast({ title: 'Arquivo não reconhecido', description: 'Confira se é uma planilha CREQ (abas "Datas Marco x Obras" e "CREQ").', variant: 'destructive' })
        setPayload(null)
      } else {
        setPayload(p)
      }
    } catch (err: any) {
      toast({ title: 'Erro ao ler arquivo', description: err.message, variant: 'destructive' })
    } finally {
      setParsing(false)
    }
  }

  async function confirmar() {
    if (!payload) return
    setSaving(true)
    const r = await importarCreq(payload)
    setSaving(false)
    if (!r.ok) { toast({ title: 'Falha na importação', description: r.erro, variant: 'destructive' }); return }
    toast({ title: 'CREQ importado', description: `${payload.obra}: ${r.itens} serviços${r.removidos ? `, ${r.removidos} removidos` : ''}.` })
    setPayload(null); setFileName('')
    onImported()
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) { setPayload(null); setFileName(''); onClose() } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Importar CREQ</DialogTitle>
          <DialogDescription className="text-xs">
            Envie a planilha CREQ da obra. O sistema espelha os serviços, status e fornecedores;
            as datas são recalculadas pelo motor a partir dos marcos e premissas.
          </DialogDescription>
        </DialogHeader>

        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onFile} />

        {!payload && (
          <button
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-10 text-muted-foreground hover:bg-muted/40 transition-colors"
          >
            {parsing ? <Loader2 className="h-8 w-8 animate-spin" /> : <Upload className="h-8 w-8" />}
            <span className="text-sm">{parsing ? 'Lendo arquivo…' : 'Clique para selecionar a planilha (.xlsx)'}</span>
          </button>
        )}

        {payload && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <FileSpreadsheet className="h-4 w-4 text-primary" /> {fileName}
            </div>
            <div className="rounded-md bg-muted/40 p-3 text-xs space-y-1">
              <div><span className="text-muted-foreground">Obra:</span> <strong>{payload.obra}</strong> {payload.tipo ? `· ${payload.tipo}` : ''}</div>
              <div><span className="text-muted-foreground">Serviços:</span> {payload.itens.length}</div>
              <div><span className="text-muted-foreground">Marcos:</span> {[
                payload.marcos.inicio_obra && 'Início',
                payload.marcos.inicio_estrutura && 'Início estrut.',
                payload.marcos.termino_estrutura && 'Térm. estrut.',
                payload.marcos.termino_emboco && 'Térm. emboço',
                payload.marcos.termino_obra && 'Térm. obra',
              ].filter(Boolean).join(', ') || '—'}</div>
            </div>
            {!payload.marcos.inicio_obra && (
              <div className="flex items-start gap-2 text-xs text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5" />
                Marcos da obra não encontrados — as datas podem não ser calculadas. Confira a aba "Datas Marco x Obras".
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Serviços da obra que não estiverem na planilha serão removidos do CREQ (espelho).
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => { setPayload(null); setFileName(''); onClose() }}>Cancelar</Button>
          {payload && (
            <Button onClick={confirmar} disabled={saving}>
              {saving ? 'Importando…' : `Importar ${payload.itens.length} serviços`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
