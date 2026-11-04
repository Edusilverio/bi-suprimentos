import { useState } from 'react'
import { FileSpreadsheet, Download, X } from 'lucide-react'
import * as XLSX from 'xlsx'

interface Coluna {
  key: string
  label: string
  render?: (valor: any, linha: any) => React.ReactNode
  /** Largura aplicada apenas no preview (ex: '35%'). */
  width?: string
  /** Se true, a coluna aparece apenas ao expandir (modal e export), não no preview. */
  onlyModal?: boolean
}

interface TabelaExpansivelProps {
  titulo: string
  colunas: Coluna[]
  dados: any[]
  limitePreview?: number
  nomeArquivo: string
  rowClassName?: (linha: any) => string | undefined
}

export const TabelaExpansivel = ({
  titulo,
  colunas,
  dados,
  limitePreview = 30,
  nomeArquivo,
  rowClassName,
}: TabelaExpansivelProps) => {
  const [modalAberto, setModalAberto] = useState(false)
  const colunasPreview = colunas.filter(c => !c.onlyModal)
  const dadosPreview = dados.slice(0, limitePreview)

  const exportarExcel = () => {
    const linhas = dados.map(linha => {
      const obj: Record<string, any> = {}
      colunas.forEach(col => {
        obj[col.label] = linha[col.key] ?? ''
      })
      return obj
    })
    const ws = XLSX.utils.json_to_sheet(linhas)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Dados')
    const data = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(wb, `${nomeArquivo}_${data}.xlsx`)
  }

  const renderPreview = (linhas: any[]) => (
    <div className="max-h-[320px] overflow-y-auto overflow-x-hidden">
      <table className="w-full text-[11px]" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          {colunasPreview.map(col => (
            <col key={col.key} style={col.width ? { width: col.width } : undefined} />
          ))}
        </colgroup>
        <thead className="sticky top-0 bg-card z-10">
          <tr className="border-b border-border">
            {colunasPreview.map(col => (
              <th
                key={col.key}
                className="text-left py-1.5 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha, i) => (
            <tr key={i} className={`border-b border-border/50 ${rowClassName?.(linha) ?? ''}`}>

              {colunasPreview.map(col => {
                const raw = linha[col.key]
                const conteudo = col.render ? col.render(raw, linha) : (raw ?? '—')
                return (
                  <td key={col.key} className="py-1.5 px-2 align-top whitespace-normal break-words">
                    {conteudo}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const renderModal = (linhas: any[]) => (
    <div className="max-h-[60vh] overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-card z-10">
          <tr className="border-b border-border">
            {colunas.map(col => (
              <th
                key={col.key}
                className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha, i) => (
            <tr key={i} className={`border-b border-border/50 ${rowClassName?.(linha) ?? ''}`}>
              {colunas.map(col => (
                <td key={col.key} className="py-2 px-3">
                  {col.render ? col.render(linha[col.key], linha) : (linha[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="title-style text-base">{titulo}</h3>
        <button
          onClick={() => setModalAberto(true)}
          title="Expandir tabela"
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <FileSpreadsheet size={18} />
        </button>
      </div>

      {dados.length === 0 ? (
        <p className="text-center text-muted-foreground py-6">Sem dados</p>
      ) : (
        renderPreview(dadosPreview)
      )}

      {dados.length > limitePreview && (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Exibindo {limitePreview} de {dados.length} — clique no ícone para ver todos
        </p>
      )}

      {modalAberto && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6"
          onClick={() => setModalAberto(false)}
        >
          <div
            className="bg-card rounded-lg shadow-xl w-full max-w-5xl max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="title-style text-lg">
                {titulo} — {dados.length} registros
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportarExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1B2A4A] text-white rounded-md text-sm font-medium hover:opacity-90"
                >
                  <Download size={15} />
                  Baixar Excel
                </button>
                <button
                  onClick={() => setModalAberto(false)}
                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-hidden">{renderModal(dados)}</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TabelaExpansivel
