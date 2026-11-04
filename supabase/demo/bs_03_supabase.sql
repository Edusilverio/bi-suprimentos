-- Peças do Supabase da demo (schema bs): Storage, permissões e proteções do projeto compartilhado.

-- disparos de sincronização com o ERP não existem na demo: ninguém de fora executa
revoke execute on function bs.trigger_sync_prisma(), bs.trigger_sync_indicadores(), bs.trigger_pedidos_reconcile()
  from public, anon, authenticated;

-- ninguém exclui a própria conta pela tela de acessos (evita trancar o admin da demo)
drop policy if exists demo_nao_exclui_a_si_mesmo on bs.usuarios;
create policy demo_nao_exclui_a_si_mesmo on bs.usuarios as restrictive for delete to authenticated using (id <> auth.uid());

-- Storage: leitura pública (buckets públicos), escrita só para usuários ativos do app
create or replace function bs.eh_usuario_ativo() returns boolean
language sql stable security definer set search_path = bs as $$
  select exists (select 1 from bs.usuarios where id = auth.uid() and ativo)
$$;
grant execute on function bs.eh_usuario_ativo() to authenticated;

drop policy if exists "bs le arquivos" on storage.objects;
drop policy if exists "bs envia arquivos" on storage.objects;
drop policy if exists "bs altera arquivos" on storage.objects;
drop policy if exists "bs remove arquivos" on storage.objects;
create policy "bs le arquivos" on storage.objects for select
  using (bucket_id in ('bs-fotos-obras', 'bs-anexos-sustentabilidade'));
create policy "bs envia arquivos" on storage.objects for insert to authenticated
  with check (bucket_id in ('bs-fotos-obras', 'bs-anexos-sustentabilidade') and bs.eh_usuario_ativo());
create policy "bs altera arquivos" on storage.objects for update to authenticated
  using (bucket_id in ('bs-fotos-obras', 'bs-anexos-sustentabilidade') and bs.eh_usuario_ativo());
create policy "bs remove arquivos" on storage.objects for delete to authenticated
  using (bucket_id in ('bs-fotos-obras', 'bs-anexos-sustentabilidade') and bs.eh_usuario_ativo());

notify pgrst, 'reload schema';

-- o app só funciona logado: visitante anônimo (chave pública) não lê views nem chama funções
-- (as views rodam com o dono e ignorariam o RLS das tabelas)
revoke all on all tables in schema bs from anon;
revoke all on all sequences in schema bs from anon;
revoke execute on all functions in schema bs from anon, public;
alter default privileges in schema bs revoke all on tables from anon;
alter default privileges in schema bs revoke all on sequences from anon;
alter default privileges in schema bs revoke execute on functions from anon, public;
grant execute on all functions in schema bs to authenticated, service_role;
revoke execute on function bs.trigger_sync_prisma(), bs.trigger_sync_indicadores(), bs.trigger_pedidos_reconcile() from authenticated;
notify pgrst, 'reload schema';
