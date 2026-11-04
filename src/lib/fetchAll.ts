/**
 * Busca TODAS as linhas de uma query Supabase, paginando de 1.000 em 1.000.
 * Necessário porque o PostgREST corta a resposta em 1.000 linhas por padrão.
 *
 * ATENÇÃO: a query passada NÃO pode já ter sido "await"-ada. Passe o builder
 * (ex.: `fetchAllRows(query)` onde `query` é o `supabase.from(...).select(...)...`
 * sem await).
 */
export async function fetchAllRows<T = any>(
  query: any,
  pageSize = 1000,
  hardLimit = 500000,
): Promise<{ data: T[]; error: string | null }> {
  const acc: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) return { data: [], error: error.message };
    const chunk = (data as T[]) ?? [];
    acc.push(...chunk);
    if (chunk.length < pageSize) break;
    from += pageSize;
    if (from > hardLimit) break;
  }
  return { data: acc, error: null };
}
