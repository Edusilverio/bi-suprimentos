# Base de demonstração (dados fictícios)

Construtora fictícia **Atlas Engenharia**: 8 obras, 25 fornecedores, ~290 pedidos, ~320 requisições,
~115 contratos, avaliações de fornecedores, CREQ (cronograma de contratações), indicadores de mercado e
lançamentos de sustentabilidade. Nomes, empresas, valores e datas são inventados; as datas acompanham o
dia em que o seed é gerado.

A estrutura (`bs_01_estrutura.sql`) é a mesma do sistema original — tabelas, views, RPCs de KPI, RLS por
nível de acesso — num schema próprio (`bs`), para conviver com outros apps no mesmo projeto Supabase.

## Como subir

1. No SQL Editor, rode na ordem: `bs_01_estrutura.sql`, `bs_02_seed.sql`, `bs_03_supabase.sql`.
2. Em **Project Settings → Data API → Exposed schemas**, adicione `bs`.
3. Publique a função de usuários com o prefixo do app (o nome vem da pasta):
   ```bash
   cp -r supabase/functions/admin-create-users supabase/functions/bs-admin-create-users
   supabase functions deploy bs-admin-create-users --project-ref SEU-PROJETO
   supabase secrets set BS_DB_SCHEMA=bs BS_APP_ID=bs SERVICE_ROLE_KEY=... --project-ref SEU-PROJETO
   ```
   A função só atende administradores do app (nível ≤ 1) e só mexe em contas criadas por ele.
4. Crie o primeiro usuário em **Authentication → Users** (metadata `{"app": "bs"}`) e dê acesso de admin:
   ```sql
   insert into bs.usuarios (id, name, cargo, nivel)
   select id, 'Admin Demo', 'admin', 1 from auth.users where email = 'seu-email@exemplo.com';
   ```
5. Copie `.env.example` para `.env` e preencha URL e chave anon.

Para gerar outro seed: `python geradores/bi-suprimentos/gerar_seed.py bs > bs_02_seed.sql` (no repositório
do espelhamento). A sincronização com o ERP (`sync-*`) não existe na demo.
