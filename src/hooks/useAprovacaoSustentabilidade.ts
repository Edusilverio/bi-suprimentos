import { useCallback, useEffect, useState } from 'react';
import {
  fetchLancamentosSustentabilidade,
  type LancamentoSustentabilidadeRow,
} from '@/services/aprovacaoSustentabilidadeService';

export function useAprovacaoSustentabilidade() {
  const [rows, setRows] = useState<LancamentoSustentabilidadeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchLancamentosSustentabilidade();
      setRows(data);
      setError(null);
    } catch (e: any) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { rows, loading, error, reload: load };
}
