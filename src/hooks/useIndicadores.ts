import { useCallback, useEffect, useState } from 'react';
import {
  fetchIndicadoresDef,
  fetchIndicadoresValores,
  type IndicadorDef,
  type IndicadorValor,
} from '@/services/indicadoresService';

export function useIndicadores() {
  const [def, setDef] = useState<IndicadorDef[]>([]);
  const [valores, setValores] = useState<IndicadorValor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, v] = await Promise.all([
        fetchIndicadoresDef(),
        fetchIndicadoresValores(),
      ]);
      setDef(d);
      setValores(v);
      setError(null);
    } catch (e: any) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { def, valores, loading, error, reload: load };
}
