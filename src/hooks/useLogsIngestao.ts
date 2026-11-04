import { useCallback, useEffect, useState } from 'react';
import { fetchLogsIngestao, type LogIngestaoRow } from '@/services/logsService';

export function useLogsIngestao() {
  const [rows, setRows] = useState<LogIngestaoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchLogsIngestao();
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
