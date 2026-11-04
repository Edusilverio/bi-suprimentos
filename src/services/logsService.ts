import { supabase } from '@/lib/supabase';
import { fetchAllRows } from '@/lib/fetchAll';

export type LogIngestaoRow = {
  id?: string;
  created_at: string;
  usuario_nome: string | null;
  acao: string | null;
  entidade: string | null;
  referencia: string | null;
  resultado: string | null;
  detalhe: any;
};

export async function fetchLogsIngestao(): Promise<LogIngestaoRow[]> {
  const query = (supabase.from('logs_ingestao' as any) as any)
    .select('*')
    .order('created_at', { ascending: false });
  const { data, error } = await fetchAllRows<LogIngestaoRow>(query);
  if (error) throw new Error(error);
  return data;
}
