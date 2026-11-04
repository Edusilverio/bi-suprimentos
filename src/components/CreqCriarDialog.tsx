import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { criarCreq, getObrasBase, type CreqMarcosInput } from '@/services/creqService'

export function CreqCriarDialog({
  open, onClose, onCreated,
}: { open: boolean; onClose: () => void; onCreated: (obra: string) => void }) {
  const { toast } = useToast()
  const [obra, setObra] = useState('')
  const [tipo, setTipo] = useState('')
  const [marcos, setMarcos] = useState<CreqMarcosInput>({})
  const [obrasBase, setObrasBase] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) getObrasBase().then(setObrasBase) }, [open])

  function setM(k: keyof CreqMarcosInput, v: string) { setMarcos(m => ({ ...m, [k]: v || null })) }

  async function criar() {
    if (!obra.trim()) { toast({ title: 'Informe a obra', variant: 'destructive' }); return }
    setSaving(true)
    const r = await criarCreq(obra.trim(), tipo || null, marcos)
    setSaving(false)
    if (!r.ok) { toast({ title: 'Falha ao criar', description: r.erro, variant: 'destructive' }); return }
    toast({ title: 'CREQ criado', description: `${obra}: ${r.itens_novos} serviços gerados${r.cost_collector ? ` · ${r.cost_collector}` : ''}.` })
    setObra(''); setTipo(''); setMarcos({})
    onCreated(obra.trim())
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Criar CREQ</DialogTitle>
          <DialogDescription className="text-xs">
            Cria o CREQ de uma obra direto no sistema (gera os serviços a partir das premissas padrão).
            Informe os marcos para o cálculo das datas — podem ser preenchidos depois.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Obra</Label>
            <Input list="creq-obras-base" value={obra} onChange={e => setObra(e.target.value)}
              placeholder="Ex.: Jacarandá (escolha da base ou digite)" />
            <datalist id="creq-obras-base">{obrasBase.map(o => <option key={o} value={o} />)}</datalist>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tipo (opcional)</Label>
            <Input value={tipo} onChange={e => setTipo(e.target.value)} placeholder="Ex.: EP" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Início da Obra</Label>
              <Input type="date" onChange={e => setM('inicio_obra', e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Início da Estrutura</Label>
              <Input type="date" onChange={e => setM('inicio_estrutura', e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Término da Estrutura</Label>
              <Input type="date" onChange={e => setM('termino_estrutura', e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Término do Emboço</Label>
              <Input type="date" onChange={e => setM('termino_emboco', e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Término da Obra</Label>
              <Input type="date" onChange={e => setM('termino_obra', e.target.value)} /></div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={criar} disabled={saving} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> {saving ? 'Criando…' : 'Criar CREQ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
