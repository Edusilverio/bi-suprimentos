import { useMemo, useState, useEffect, Fragment } from 'react'
import * as XLSX from 'xlsx'
import { CalendarRange, RefreshCw, Search, Layers, Pencil, MessageSquare, Lock, Upload, Download, Trash2, Plus, Building2, ChevronDown, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { CreqFarol, CREQ_FAROL_LEGENDA } from '@/components/CreqFarol'
import { CreqImportDialog } from '@/components/CreqImportDialog'
import { CreqCriarDialog } from '@/components/CreqCriarDialog'
import { ColumnFilter } from '@/components/ColumnFilter'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/stores/useAuthStore'
import { useObrasCreq, useCreq } from '@/hooks/useCreq'
import {
  updateCreqItem, getComentarios, addComentario, deleteComentario, CREQ_TODAS,
  type CreqItem, type CreqComentario,
} from '@/services/creqService'
import { formatDate } from '@/lib/formatters'

// Opções padrão do status (lista suspensa editável)
const STATUS_OPCOES = [
  'Contratado', 'Em concorrência', 'Aguardando envio da obra',
  'Pendente', 'Não se Aplica', 'Cancelado',
]

const farolLabel = (v: number | null) =>
  v === 1 ? 'Contratado' : v === 0 ? '≤30 dias' : v === -1 ? 'Atrasado' : v === -2 ? 'Futuro' : 'N/A'

export default function CreqPage() {
  const { toast } = useToast()
  const user = useAuthStore(s => s.user)
  const podeEditarDatas = !!user && user.nivel <= 2
  const podeImportar = !!user && user.nivel <= 1
  const [importOpen, setImportOpen] = useState(false)
  const [criarOpen, setCriarOpen] = useState(false)

  const { data: obras, loading: loadingObras } = useObrasCreq()
  const [obra, setObra] = useState<string>('')
  useEffect(() => { if (!obra && obras.length) setObra(obras[0].obra) }, [obras, obra])

  const { data: itens, loading, refetch } = useCreq(obra)
  const consolidado = obra === CREQ_TODAS

  const [busca, setBusca] = useState('')
  const [familia, setFamilia] = useState('todas')
  const [cliente, setCliente] = useState('todos')

  // Filtros por coluna (estilo Excel)
  const [colFilters, setColFilters] = useState<Record<string, Set<string>>>({})
  const setCol = (k: string, s: Set<string>) => setColFilters(p => ({ ...p, [k]: s }))
  useEffect(() => { setColFilters({}) }, [obra]) // limpa ao trocar de obra

  const familias = useMemo(
    () => Array.from(new Set(itens.map(i => i.familia).filter(Boolean) as string[])).sort(),
    [itens],
  )
  const clientes = useMemo(
    () => Array.from(new Set(itens.map(i => i.cliente).filter(Boolean) as string[])).sort(),
    [itens],
  )
  const opts = (fn: (i: CreqItem) => string) =>
    Array.from(new Set(itens.map(fn).filter(v => v !== '' && v != null)))
  const optObra = useMemo(() => opts(i => i.obra), [itens])
  const optStatus = useMemo(() => opts(i => i.status_efetivo ?? ''), [itens])
  const optForn = useMemo(() => opts(i => i.fornecedor_efetivo ?? ''), [itens])
  const optFarolE = useMemo(() => opts(i => String(i.farol_envio)), [itens])
  const optFarolC = useMemo(() => opts(i => String(i.farol_contratacao)), [itens])

  const passaCol = (key: string, val: string) => {
    const set = colFilters[key]
    return !set || set.size === 0 || set.has(val)
  }

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return itens.filter(i => {
      if (familia !== 'todas' && i.familia !== familia) return false
      if (cliente !== 'todos' && (i.cliente ?? '') !== cliente) return false
      if (!passaCol('obra', i.obra)) return false
      if (!passaCol('status', i.status_efetivo ?? '')) return false
      if (!passaCol('fornecedor', i.fornecedor_efetivo ?? '')) return false
      if (!passaCol('farolE', String(i.farol_envio))) return false
      if (!passaCol('farolC', String(i.farol_contratacao))) return false
      if (q) {
        const alvo = `${i.servico} ${i.observacao ?? ''} ${i.status_efetivo ?? ''} ${i.fornecedor ?? ''}`.toLowerCase()
        if (!alvo.includes(q)) return false
      }
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itens, busca, familia, cliente, colFilters])

  const [editing, setEditing] = useState<CreqItem | null>(null)
  const obraAtual = obras.find(o => o.obra === obra)

  // Histórico expansível por linha
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [comentCache, setComentCache] = useState<Record<number, CreqComentario[] | 'loading'>>({})
  async function toggleHistorico(i: CreqItem) {
    if (expandedId === i.id) { setExpandedId(null); return }
    setExpandedId(i.id)
    if (!comentCache[i.id]) {
      setComentCache(c => ({ ...c, [i.id]: 'loading' }))
      const r = await getComentarios(i.obra, i.servico)
      setComentCache(c => ({ ...c, [i.id]: r.data }))
    }
  }

  function exportar(tipo: 'geral' | 'cliente') {
    const nomeObra = consolidado ? 'Todas as obras' : obra
    const rows = filtrados.map(i => {
      if (tipo === 'cliente') {
        // Relatório cliente: omite datas/faróis internos (Mês da Contratação e faróis estratégicos)
        return {
          Obra: i.obra,
          Serviço: i.servico,
          'Início do Serviço': i.inicio_servico ? formatDate(i.inicio_servico) : '',
          'Mês Envio Concorrência': i.envio_concorrencia ? formatDate(i.envio_concorrencia) : '',
          Status: i.status_efetivo ?? '',
          Observação: i.observacao ?? '',
        }
      }
      // Relatório geral: tudo (uso interno Atlas)
      return {
        Obra: i.obra,
        Cliente: i.cliente ?? '',
        Serviço: i.servico,
        Família: i.familia ?? '',
        'Envio da Solicitação': i.envio_solicitacao ? formatDate(i.envio_solicitacao) : '',
        'Farol Envio': farolLabel(i.farol_envio),
        'Mês da Contratação': i.mes_contratacao ? formatDate(i.mes_contratacao) : '',
        'Farol Contratação': farolLabel(i.farol_contratacao),
        'Início do Serviço': i.inicio_servico ? formatDate(i.inicio_servico) : '',
        'Mês Envio Concorrência': i.envio_concorrencia ? formatDate(i.envio_concorrencia) : '',
        Status: i.status_efetivo ?? '',
        Fornecedor: i.fornecedor_efetivo ?? '',
        Observação: i.observacao ?? '',
        'Valor da Contratação': i.valor_contratacao ?? '',
        'Verba Corrigida': i.verba_corrigida ?? '',
      }
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'CREQ')
    const sufixo = tipo === 'cliente' ? 'Cliente' : 'Geral'
    XLSX.writeFile(wb, `CREQ ${nomeObra} - ${sufixo}.xlsx`)
  }

  const nCols = 13 + (consolidado ? 1 : 0)

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="CREQ" icon={<CalendarRange className="h-5 w-5 text-primary-foreground" />} />

      <div className="flex flex-wrap items-center gap-3">
        <Select value={obra} onValueChange={setObra}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder={loadingObras ? 'Carregando obras…' : 'Selecione a obra'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CREQ_TODAS}>Todas as obras (consolidado)</SelectItem>
            {obras.map(o => <SelectItem key={o.obra} value={o.obra}>{o.obra}</SelectItem>)}
          </SelectContent>
        </Select>

        {!consolidado && obraAtual && (
          <Badge variant="outline" className="gap-1">
            {obraAtual.tipo ?? '—'}{obraAtual.personalizada ? ' · Personalizada' : ' · Padrão'}
          </Badge>
        )}

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar serviço, status, observação…" className="pl-8 w-72" />
        </div>

        <Select value={familia} onValueChange={setFamilia}>
          <SelectTrigger className="w-52"><Layers className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as famílias</SelectItem>
            {familias.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={cliente} onValueChange={setCliente}>
          <SelectTrigger className="w-48"><Building2 className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os clientes</SelectItem>
            {clientes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1">
          <RefreshCw className="h-3.5 w-3.5" /> Atualizar
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1"><Download className="h-3.5 w-3.5" /> Exportar</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportar('geral')}>Relatório geral (interno)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportar('cliente')}>Relatório para cliente</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {podeImportar && (
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={() => setCriarOpen(true)} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> Criar CREQ
            </Button>
            <Button size="sm" onClick={() => setImportOpen(true)} className="gap-1">
              <Upload className="h-3.5 w-3.5" /> Importar CREQ
            </Button>
          </div>
        )}
      </div>

      {podeImportar && (
        <>
          <CreqImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImported={() => { setImportOpen(false); refetch() }} />
          <CreqCriarDialog open={criarOpen} onClose={() => setCriarOpen(false)} onCreated={(nova) => { setCriarOpen(false); setObra(nova); refetch() }} />
        </>
      )}

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {CREQ_FAROL_LEGENDA.map(l => (
          <span key={l.value} className="inline-flex items-center gap-1.5"><CreqFarol value={l.value} /> {l.label}</span>
        ))}
        <span className="ml-auto">{filtrados.length} de {itens.length} serviços</span>
      </div>

      <div className="rounded-lg border border-border overflow-x-auto bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr className="text-left">
              {consolidado && (
                <th className="px-3 py-2 font-medium"><span className="inline-flex items-center">Obra
                  <ColumnFilter options={optObra} selected={colFilters.obra ?? new Set()} onChange={s => setCol('obra', s)} /></span></th>
              )}
              <th className="px-3 py-2 font-medium">Serviço</th>
              <th className="px-3 py-2 font-medium">Envio da Solicitação</th>
              <th className="px-3 py-2 font-medium text-center"><span className="inline-flex items-center">Farol
                <ColumnFilter options={optFarolE} selected={colFilters.farolE ?? new Set()} onChange={s => setCol('farolE', s)} labelFn={v => farolLabel(Number(v))} /></span></th>
              <th className="px-3 py-2 font-medium">Mês da Contratação</th>
              <th className="px-3 py-2 font-medium text-center"><span className="inline-flex items-center">Farol
                <ColumnFilter options={optFarolC} selected={colFilters.farolC ?? new Set()} onChange={s => setCol('farolC', s)} labelFn={v => farolLabel(Number(v))} /></span></th>
              <th className="px-3 py-2 font-medium">Início Serviço</th>
              <th className="px-3 py-2 font-medium">Mês Envio Concorrência</th>
              <th className="px-3 py-2 font-medium"><span className="inline-flex items-center">Status
                <ColumnFilter options={optStatus} selected={colFilters.status ?? new Set()} onChange={s => setCol('status', s)} /></span></th>
              <th className="px-3 py-2 font-medium">Observação</th>
              <th className="px-3 py-2 font-medium"><span className="inline-flex items-center">Fornecedor
                <ColumnFilter options={optForn} selected={colFilters.fornecedor ?? new Set()} onChange={s => setCol('fornecedor', s)} /></span></th>
              <th className="px-3 py-2 font-medium text-center">Aderência</th>
              <th className="px-3 py-2 font-medium text-center">Hist.</th>
              <th className="px-3 py-2 font-medium text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={nCols} className="px-3 py-8 text-center text-muted-foreground">Carregando…</td></tr>}
            {!loading && filtrados.length === 0 && (
              <tr><td colSpan={nCols} className="px-3 py-8 text-center text-muted-foreground">Nenhum serviço para os filtros aplicados.</td></tr>
            )}
            {!loading && filtrados.map((i, idx) => (
              <Fragment key={i.id}>
              <tr className={`border-t border-border hover:bg-primary/5 ${idx % 2 === 1 ? 'bg-muted/40' : ''}`}>
                {consolidado && (
                  <td className="px-3 py-2 text-xs whitespace-nowrap">
                    <div>{i.obra}</div>
                    {i.cliente && <div className="text-[10px] text-muted-foreground">{i.cliente}</div>}
                  </td>
                )}
                <td className="px-3 py-2 max-w-[180px]">
                  <div className="flex items-start gap-1.5">
                    <span className="break-words leading-tight">{i.servico}</span>
                    {(i.envio_manual || i.contratacao_manual || i.farol_manual != null || i.inicio_servico_manual || i.envio_concorrencia_manual) && (
                      <Pencil className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" aria-label="Ajuste manual" />
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{formatDate(i.envio_solicitacao)}</td>
                <td className="px-3 py-2 text-center"><CreqFarol value={i.farol_envio} /></td>
                <td className="px-3 py-2 whitespace-nowrap">{formatDate(i.mes_contratacao)}</td>
                <td className="px-3 py-2 text-center"><CreqFarol value={i.farol_contratacao} /></td>
                <td className="px-3 py-2 whitespace-nowrap">{i.inicio_servico ? formatDate(i.inicio_servico) : '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap">{i.envio_concorrencia ? formatDate(i.envio_concorrencia) : '—'}</td>
                <td className="px-3 py-2 max-w-[220px]">
                  <div className="flex items-center gap-1.5 truncate" title={i.status_efetivo ?? ''}>
                    <span className="truncate">{i.status_efetivo ?? '—'}</span>
                    {i.status_origem === 'sistema' && (
                      <Badge variant="outline" className="h-4 px-1 text-[9px] shrink-0 border-sky-400 text-sky-600">sistema</Badge>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 max-w-[220px] truncate text-muted-foreground" title={i.observacao ?? ''}>
                  {i.observacao ?? '—'}
                </td>
                <td className="px-3 py-2 max-w-[180px] truncate" title={i.fornecedor_efetivo ?? ''}>
                  {i.fornecedor_efetivo ?? '—'}
                </td>
                <td className="px-3 py-2 text-center"><AderenciaCell item={i} /></td>
                <td className="px-3 py-2 text-center">
                  <button onClick={() => toggleHistorico(i)} title="Histórico de comentários"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    {expandedId === i.id ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    <MessageSquare className="h-3.5 w-3.5" />{i.n_comentarios > 0 ? i.n_comentarios : ''}
                  </button>
                </td>
                <td className="px-3 py-2 text-center">
                  <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={() => setEditing(i)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
              {expandedId === i.id && (
                <tr className="bg-muted/20">
                  <td colSpan={nCols} className="px-6 py-3">
                    <div className="text-xs font-medium mb-1 flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Histórico — {i.servico}</div>
                    {comentCache[i.id] === 'loading' && <p className="text-xs text-muted-foreground">Carregando…</p>}
                    {Array.isArray(comentCache[i.id]) && (comentCache[i.id] as CreqComentario[]).length === 0 && (
                      <p className="text-xs text-muted-foreground">Sem comentários. Use o lápis para adicionar.</p>
                    )}
                    <div className="space-y-1">
                      {Array.isArray(comentCache[i.id]) && (comentCache[i.id] as CreqComentario[]).map(c => (
                        <div key={c.id} className="text-xs border-l-2 border-border pl-2 py-0.5">
                          <div className="whitespace-pre-wrap">{c.texto}</div>
                          <div className="text-[11px] text-muted-foreground">{c.autor_nome ?? 'Usuário'} · {formatDate(c.created_at)}</div>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditDialog
          item={editing}
          podeEditarDatas={podeEditarDatas}
          podeExcluirComentario={!!user && user.nivel <= 2}
          podeVerOrigem={!!user && user.nivel <= 1}
          autorNome={user?.name ?? null}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refetch() }}
          toast={toast}
        />
      )}
    </div>
  )
}

function AderenciaCell({ item }: { item: CreqItem }) {
  const dot = (v: number | null) => v === 1 ? 'bg-emerald-500' : v === -1 ? 'bg-red-500' : 'bg-muted-foreground/25'
  if (item.sistema_envio_real == null && item.sistema_contratacao_real == null)
    return <span className="text-muted-foreground/50">—</span>
  const tip = `Sistema — envio real: ${item.sistema_envio_real ? formatDate(item.sistema_envio_real) : '—'} | contratação real: ${item.sistema_contratacao_real ? formatDate(item.sistema_contratacao_real) : '—'}`
  return (
    <span className="inline-flex items-center gap-1.5" title={tip}>
      <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">E<span className={`h-2 w-2 rounded-full ${dot(item.aderencia_envio)}`} /></span>
      <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">C<span className={`h-2 w-2 rounded-full ${dot(item.aderencia_contratacao)}`} /></span>
    </span>
  )
}

function EditDialog({
  item, podeEditarDatas, podeExcluirComentario, podeVerOrigem, autorNome, onClose, onSaved, toast,
}: {
  item: CreqItem
  podeEditarDatas: boolean
  podeExcluirComentario: boolean
  podeVerOrigem: boolean
  autorNome: string | null
  onClose: () => void
  onSaved: () => void
  toast: ReturnType<typeof useToast>['toast']
}) {
  const [status, setStatus] = useState(item.status ?? '')
  const [fornecedor, setFornecedor] = useState(item.fornecedor === '-' ? '' : (item.fornecedor ?? ''))
  const [observacao, setObservacao] = useState(item.observacao ?? '')
  const [envioManual, setEnvioManual] = useState(item.envio_manual ?? '')
  const [contratacaoManual, setContratacaoManual] = useState(item.contratacao_manual ?? '')
  const [inicioServico, setInicioServico] = useState(item.inicio_servico_manual ?? '')
  const [envioConcManual, setEnvioConcManual] = useState(item.envio_concorrencia_manual ?? '')
  const [valor, setValor] = useState(item.valor_contratacao?.toString() ?? '')
  const [verba, setVerba] = useState(item.verba_corrigida?.toString() ?? '')
  const [saving, setSaving] = useState(false)

  const [comentarios, setComentarios] = useState<CreqComentario[]>([])
  const [novoComentario, setNovoComentario] = useState('')
  const [loadingCom, setLoadingCom] = useState(true)

  useEffect(() => {
    getComentarios(item.obra, item.servico).then(r => { setComentarios(r.data); setLoadingCom(false) })
  }, [item.obra, item.servico])

  async function salvar() {
    setSaving(true)
    const patch: any = {
      status: status || null,
      fornecedor: fornecedor || null,
      observacao: observacao || null,
      valor_contratacao: valor === '' ? null : Number(valor),
      verba_corrigida: verba === '' ? null : Number(verba),
    }
    if (podeEditarDatas) {
      patch.envio_manual = envioManual || null
      patch.contratacao_manual = contratacaoManual || null
      patch.inicio_servico_manual = inicioServico || null
      patch.envio_concorrencia_manual = envioConcManual || null
    }
    const { error } = await updateCreqItem(item.id, patch)
    setSaving(false)
    if (error) { toast({ title: 'Erro ao salvar', description: error, variant: 'destructive' }); return }
    toast({ title: 'Item atualizado' })
    onSaved()
  }

  async function comentar() {
    const t = novoComentario.trim()
    if (!t) return
    const { error } = await addComentario(item.obra, item.servico, t, autorNome)
    if (error) { toast({ title: 'Erro ao comentar', description: error, variant: 'destructive' }); return }
    setNovoComentario('')
    const r = await getComentarios(item.obra, item.servico)
    setComentarios(r.data)
  }

  async function excluirComentario(id: number) {
    const { error } = await deleteComentario(id)
    if (error) { toast({ title: 'Não foi possível excluir', description: error, variant: 'destructive' }); return }
    setComentarios(cs => cs.filter(c => c.id !== id))
  }

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{item.servico}</DialogTitle>
          <p className="text-xs text-muted-foreground">{item.obra} · {item.familia ?? '—'}</p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 grid grid-cols-2 gap-3 rounded-md bg-muted/40 p-3 text-xs">
            <div><span className="text-muted-foreground">Envio calculado:</span> {formatDate(item.envio_solicitacao)}</div>
            <div><span className="text-muted-foreground">Contratação calculada:</span> {formatDate(item.mes_contratacao)}</div>
            <div><span className="text-muted-foreground">Vínculo:</span> {item.vinculo ?? '—'} ({item.criterio ?? 0}d)</div>
            <div><span className="text-muted-foreground">Prazo contratação:</span> {item.prazo_aquisicao ?? '—'}d</div>
            {(item.sistema_status || item.sistema_fornecedor) && (
              <div className="col-span-2 mt-1 pt-2 border-t border-border/60">
                <span className="text-sky-600 font-medium">Sistema:</span>{' '}
                {item.sistema_status ?? '—'}{item.sistema_fornecedor ? ` · ${item.sistema_fornecedor}` : ''}
                {item.sistema_contratacao_real ? ` · contratado em ${formatDate(item.sistema_contratacao_real)}` : ''}
              </div>
            )}
            {podeVerOrigem && (
              <div className="col-span-2 mt-1 pt-2 border-t border-border/60 space-y-0.5">
                <div className="text-amber-600 font-medium">Origem dos dados (admin)</div>
                <div><span className="text-muted-foreground">Cost collector:</span> {item.sistema_cost_collector ?? '— (obra sem vínculo)'}</div>
                <div className="flex gap-3">
                  <span>Contrato: <b>{item.sistema_tem_contrato ? 'sim' : 'não'}</b></span>
                  <span>Pedido: <b>{item.sistema_tem_pedido ? 'sim' : 'não'}</b></span>
                  <span>Requisição: <b>{item.sistema_tem_requisicao ? 'sim' : 'não'}</b></span>
                </div>
                <div className="text-muted-foreground">Casamento por serviço × grupo de material (segmento exato).</div>
              </div>
            )}
          </div>

          {/* Status — lista suspensa editável */}
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">Status</Label>
            <Input list="creq-status-opcoes" value={status} onChange={e => setStatus(e.target.value)}
              placeholder="Selecione ou digite…" />
            <datalist id="creq-status-opcoes">
              {STATUS_OPCOES.map(s => <option key={s} value={s} />)}
            </datalist>
          </div>

          <div className="col-span-2 space-y-1">
            <Label className="text-xs">Fornecedor</Label>
            <Input value={fornecedor} onChange={e => setFornecedor(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">Envio (manual) {!podeEditarDatas && <Lock className="h-3 w-3 text-muted-foreground" />}</Label>
            <Input type="date" value={envioManual ?? ''} disabled={!podeEditarDatas} onChange={e => setEnvioManual(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">Contratação (manual) {!podeEditarDatas && <Lock className="h-3 w-3 text-muted-foreground" />}</Label>
            <Input type="date" value={contratacaoManual ?? ''} disabled={!podeEditarDatas} onChange={e => setContratacaoManual(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">Início do Serviço {!podeEditarDatas && <Lock className="h-3 w-3 text-muted-foreground" />}</Label>
            <Input type="date" value={inicioServico ?? ''} disabled={!podeEditarDatas} onChange={e => setInicioServico(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">Mês Envio Concorrência {!podeEditarDatas && <Lock className="h-3 w-3 text-muted-foreground" />}</Label>
            <Input type="date" value={envioConcManual ?? ''} disabled={!podeEditarDatas} onChange={e => setEnvioConcManual(e.target.value)}
              placeholder={item.envio_concorrencia ? formatDate(item.envio_concorrencia) : ''} />
            <p className="text-[10px] text-muted-foreground">Auto: {item.envio_concorrencia ? formatDate(item.envio_concorrencia) : 'informe o Início do Serviço'}</p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Valor da Contratação (R$)</Label>
            <Input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Verba Corrigida (R$)</Label>
            <Input type="number" step="0.01" value={verba} onChange={e => setVerba(e.target.value)} />
          </div>

          {podeEditarDatas && (
            <p className="col-span-2 text-[11px] text-muted-foreground -mt-1">
              Datas manuais sobrepõem o cálculo automático. Deixe em branco para voltar ao calculado.
            </p>
          )}

          <div className="col-span-2 space-y-1">
            <Label className="text-xs">Observação</Label>
            <Textarea value={observacao} onChange={e => setObservacao(e.target.value)} rows={3}
              placeholder="Motivo de atraso, suspensão, contexto…" />
          </div>
        </div>

        <div className="border-t border-border pt-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium"><MessageSquare className="h-3.5 w-3.5" /> Histórico de comentários</div>
          <div className="flex gap-2">
            <Input value={novoComentario} onChange={e => setNovoComentario(e.target.value)}
              placeholder="Adicionar comentário…" onKeyDown={e => { if (e.key === 'Enter') comentar() }} />
            <Button variant="outline" size="sm" onClick={comentar}>Comentar</Button>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-2">
            {loadingCom && <p className="text-xs text-muted-foreground">Carregando…</p>}
            {!loadingCom && comentarios.length === 0 && <p className="text-xs text-muted-foreground">Sem comentários ainda.</p>}
            {comentarios.map(c => (
              <div key={c.id} className="text-xs border-l-2 border-border pl-2 flex items-start justify-between gap-2 group">
                <div>
                  <div className="text-foreground whitespace-pre-wrap">{c.texto}</div>
                  <div className="text-[11px] text-muted-foreground">{c.autor_nome ?? 'Usuário'} · {formatDate(c.created_at)}</div>
                </div>
                {podeExcluirComentario && (
                  <button onClick={() => excluirComentario(c.id)} title="Excluir (gestor+)"
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
