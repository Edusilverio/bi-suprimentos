import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  getFlagsDispensa,
  toggleDispensa,
  getFlagsFormalizado,
  toggleFormalizado,
} from '@/services/pedidosFlagService'

export const usePedidosFlag = (onChange?: () => void) => {
  const [flags, setFlags] = useState<Record<string, boolean>>({})
  const [flagsFormalizado, setFlagsFormalizado] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getFlagsDispensa(), getFlagsFormalizado()])
      .then(([d, f]) => {
        setFlags(d)
        setFlagsFormalizado(f)
      })
      .finally(() => setLoading(false))
  }, [])

  const toggle = async (pedidoKey: string, dispensado: boolean) => {
    setFlags(prev => ({ ...prev, [pedidoKey]: dispensado }))

    const { error } = await toggleDispensa(pedidoKey, dispensado)

    if (error) {
      setFlags(prev => ({ ...prev, [pedidoKey]: !dispensado }))
      toast.error('Erro ao salvar flag: ' + error)
      return
    }

    onChange?.()
  }

  const toggleFormalizadoFn = async (pedidoKey: string, formalizado: boolean) => {
    setFlagsFormalizado(prev => ({ ...prev, [pedidoKey]: formalizado }))

    const { error } = await toggleFormalizado(pedidoKey, formalizado)

    if (error) {
      setFlagsFormalizado(prev => ({ ...prev, [pedidoKey]: !formalizado }))
      toast.error('Erro ao salvar flag: ' + error)
      return
    }

    onChange?.()
  }

  return { flags, flagsFormalizado, loading, toggle, toggleFormalizado: toggleFormalizadoFn }
}
