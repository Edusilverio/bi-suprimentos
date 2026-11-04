import { useCallback, useEffect, useState } from 'react';
import {
  fetchIndicadoresSustentabilidade,
  type IndicadorSustentabilidadeRow,
} from '@/services/indicadoresSustentabilidadeService';

export function useIndicadoresSustentabilidade() {
  const [rows, setRows] = useState<IndicadorSustentabilidadeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchIndicadoresSustentabilidade();
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
