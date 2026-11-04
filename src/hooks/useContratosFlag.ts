import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { getFlagsBaixa, toggleBaixa } from '@/services/contratosFlagService'

export const useContratosFlag = (onChange?: () => void) => {
  const [flags, setFlags] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getFlagsBaixa()
      .then(setFlags)
      .finally(() => setLoading(false))
  }, [])

  const toggle = async (contratoKey: string, baixado: boolean) => {
    setFlags(prev => ({ ...prev, [contratoKey]: baixado }))

    const { error } = await toggleBaixa(contratoKey, baixado)

    if (error) {
      setFlags(prev => ({ ...prev, [contratoKey]: !baixado }))
      toast.error('Erro ao salvar baixa: ' + error)
      return
    }

    onChange?.()
  }

  return { flags, loading, toggle }
}
