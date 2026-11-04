-- Base de DEMONSTRAÇÃO (estrutura) — schema bs. Dados 100% fictícios.
-- Gerado a partir da estrutura do app original, com nomes anonimizados.
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
create schema if not exists bs;
grant usage on schema bs to anon, authenticated, service_role;
set check_function_bodies = false;
set search_path = bs, public, extensions;


create type bs.obra_status_enum as enum ('ATIVA', 'FINALIZADA', 'PRE_OBRA', 'NAO_E_OBRA');

create table avaliacao_fornecedores (id bigint generated always as identity not null, month_and_year_formatted text, supplier_corporate_name text, general_rating numeric, general_rate_sum numeric, quality_supply_type text, observation text, cost_collector text, created_by_name text, purchase_order_number_formatted text, purchase_order_number_with_review_formatted text, purchase_order_review_formatted text, issue_date text, key text not null, synced_at timestamp with time zone default now(), is_active boolean default true not null);

create table contrato_vigencia_ok (contrato_id bigint not null, ok boolean default false not null, updated_at timestamp with time zone default now(), updated_by uuid);

create table contratos (id bigint generated always as identity not null, purchase_order_number_formatted text, uix text, cost_collector text, material_groups text, sup_corporate_name text, purchase_order_contract_status text, start_date_contract text, finish_date_contract text, value numeric, balance numeric, created_when timestamp with time zone, sent_to_approval_date timestamp with time zone, released_date timestamp with time zone, email_date timestamp with time zone, key text not null, synced_at timestamp with time zone default now(), created_by_name text, purchase_order_number_with_review_fmt text, is_active boolean default true not null);

create table contratos_flag_manual (id bigint generated always as identity not null, contrato_key text not null, baixado boolean default true not null, baixado_por uuid, baixado_em timestamp with time zone default now(), observacao text, updated_at timestamp with time zone default now());

create table cotacoes (id bigint generated always as identity not null, cost_collector text, negotiator_name text, quoting_number_formatted text, material_group text, data_quoting_formatted text, quoting_finish_date_formatted text, quoting_approval_level01_date timestamp with time zone, quoting_approval_level02_date timestamp with time zone, key text not null, synced_at timestamp with time zone default now());

create table creq_comentarios (id bigint generated always as identity not null, obra text not null, servico text not null, texto text not null, autor_id uuid, autor_nome text, created_at timestamp with time zone default now() not null);

create table creq_criterios_contratacao (id bigint generated always as identity not null, servico text not null, prazo_aquisicao integer, grau_dificuldade integer, qtde_contratacoes_ano integer, meses_pacote integer[] default '{}'::integer[] not null, updated_at timestamp with time zone default now() not null, prazo_mobilizacao integer default 60 not null, prazo_aprovacao_cliente integer default 15 not null);

create table creq_familias (id bigint generated always as identity not null, servico text not null, familia text, responsavel text, gerente text);

create table creq_itens (id bigint generated always as identity not null, obra text not null, servico text not null, status text, fornecedor text, observacao text, envio_manual date, contratacao_manual date, farol_manual integer, updated_at timestamp with time zone default now() not null, updated_by uuid, inicio_servico_manual date, envio_concorrencia_manual date, valor_contratacao numeric, verba_corrigida numeric);

create table creq_obra_marcos (id bigint generated always as identity not null, obra text not null, inicio_obra date, inicio_estrutura date, termino_estrutura date, termino_emboco date, termino_obra date, tipo text, padrao_creq text default 'Atlas'::text not null, personalizada boolean default false not null, updated_at timestamp with time zone default now() not null, updated_by uuid, cost_collector text);

create table creq_premissas (id bigint generated always as identity not null, padrao text default 'Atlas'::text not null, servico text not null, matriz text, vinculo text, criterio integer, resp_requisicao text, resp_negociacao text, updated_at timestamp with time zone default now() not null);

create table cron_config (key text not null, value text not null);

create table excel_custo_obra (id bigint generated always as identity not null, cost_collector text, custo_atual numeric, porcentagem numeric(5,2), created_at timestamp with time zone default now(), cliente text, foto_url text, status_obra obra_status_enum default 'ATIVA'::obra_status_enum not null, email_obra text, area_construida_m2 numeric, meta_agua numeric, meta_energia numeric, meta_residuos numeric);

create table excel_familias (id bigint generated always as identity not null, familia text, tipo text, responsavel text, comprador_responsavel text, aux_creq integer, check_creq_principal text, envio_concor integer, receb_prop integer, equaliz integer, negoc integer, aprovacao integer, formaliz integer, assinat_minuta integer, tot integer, concorrencia integer, mobilizacao integer, sla_contratacao_final integer, grau_dificuldade integer, updated_at timestamp with time zone default now());

create table excel_familias_prisma (id bigint generated always as identity not null, familia_prisma text, updated_at timestamp with time zone default now());

create table excel_indicadores_sustentabilidade (id bigint generated by default as identity not null, cost_collector text not null, email_obra text, mes_referencia date not null, energia_kwh numeric default 0 not null, agua_concessionaria_m3 numeric default 0 not null, agua_pipa_m3 numeric default 0 not null, diesel_gerador1_l numeric default 0 not null, diesel_gerador2_l numeric default 0 not null, diesel_gerador3_l numeric default 0 not null, entulho_limpo_cacamba numeric default 0 not null, madeira_cacamba numeric default 0 not null, gesso_cacamba numeric default 0 not null, classe_c_cacamba numeric default 0 not null, reciclaveis_bag numeric default 0 not null, misto_cacamba numeric default 0 not null, perigoso_cacamba numeric default 0 not null, sucata_cacamba numeric default 0 not null, solo_terra_m3 numeric default 0 not null, etapa_obra text, num_colaboradores integer, status text default 'pendente'::text not null, validado_por text, validado_em timestamp with time zone, observacao_validacao text, enviado_em timestamp with time zone default now() not null, origem text default 'formulario'::text not null, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null, area_construida_m2 numeric, aprovado_por uuid, aprovado_em timestamp with time zone, motivo_reprovacao text, anexo_agua_url text, anexo_energia_url text, anexo_coletas_url text);

create table excel_indicadores_sustentabilidade_historico (id bigint generated by default as identity not null, lancamento_id bigint, cost_collector text, mes_referencia date, dados jsonb not null, substituido_em timestamp with time zone default now() not null);

create table excel_insumos_prisma (id bigint generated always as identity not null, codigo text, material text, unidade text, status text, tipo text, mat_grp text, updated_at timestamp with time zone default now());

create table excel_responsaveis_contratacao (id bigint generated always as identity not null, familia text, tipo text, area_responsavel text, responsavel text, updated_at timestamp with time zone default now(), responsaveis_padronizado text);

create table excel_sla_familias (id bigint generated always as identity not null, grupo_material text, envio_concor integer, receb_prop integer, equaliz integer, negoc integer, sla_1_subtotal integer, aprovacao_cliente integer, aprovacao_interna integer, formaliz integer, assinat_minuta integer, sla_total integer, concorrencia integer, mobilizacao integer, sla_contratacao_final integer, grau_dificuldade integer, check_planilhas text, havera_minuta text, updated_at timestamp with time zone default now());

create table indicadores_def (indicador text not null, label text not null, unidade text, cor text not null, base boolean default false not null, link text, ordem integer default 100 not null);

create table indicadores_valores (id bigint generated always as identity not null, indicador text not null, data_ref date not null, valor numeric not null);

create table logs_ingestao (id bigint generated always as identity not null, created_at timestamp with time zone default now() not null, usuario_id uuid, usuario_nome text, acao text not null, entidade text, referencia text, resultado text default 'ok'::text not null, detalhe jsonb);

create table pedidos (id bigint generated always as identity not null, cost_collector text, cli_trade_name text, flag_email_sent_boolean boolean, flag_has_contract boolean, purchase_order_status text, purchase_order_number_with_review text, quoting_negotiator_name text, quoting_number_formatted text, purchase_order_type text, negotiator_issue_date text, releasing_date text, email_sent_date text, key text not null, synced_at timestamp with time zone default now(), material_group text, sup_corporate_name text, value numeric, balance numeric, number_of_contracts integer, is_active boolean default true not null, purchase_order_id bigint);

create table pedidos_flag_manual (id bigint generated always as identity not null, pedido_key text not null, dispensado boolean default true not null, dispensado_por uuid, dispensado_em timestamp with time zone default now(), observacao text, updated_at timestamp with time zone default now(), formalizado boolean default false not null, formalizado_por uuid, formalizado_em timestamp with time zone);

create table requests (id bigint generated always as identity not null, negotiator_name text, number_formatted text, request_status text, quoting_number_with_status_concat text, purchase_order_number_with_rev text, cost_collector text, issue_date_formatted text, transmission_date_formatted text, release_date_level01 timestamp with time zone, release_date_level02 timestamp with time zone, changed_when timestamp with time zone, emission_date_first_po timestamp with time zone, key text not null, synced_at timestamp with time zone default now(), material_group text, purchase_order_number_concat text, supplier_corporate_name text, purchase_order_number_cur_rev_formatted text, purchase_order_review_cur_rev text, is_active boolean default true not null);

create table sustentabilidade_fatores_obra (cost_collector text not null, tipo text not null, fator numeric);

create table sustentabilidade_parametros (chave text not null, rotulo text not null, grupo text not null, valor numeric not null, unidade text, descricao text, updated_at timestamp with time zone default now() not null);

create table sync_state (fonte text not null, last_id bigint default 0 not null, janela_data date default '2020-01-01'::date not null, carga_inicial_concluida boolean default false not null, ultima_execucao timestamp with time zone, ultimo_resultado text);

create table usuario_ferias_substitutos (id bigint generated always as identity not null, usuario_ferias uuid, substituto_id uuid, ativo boolean default true not null, created_at timestamp with time zone default now());

create table usuario_obras (id bigint generated always as identity not null, usuario_id uuid, obra text not null, habilitada boolean default false not null, updated_at timestamp with time zone default now());

create table usuario_paginas (id bigint generated always as identity not null, usuario_id uuid, pagina text not null, habilitada boolean default false not null, updated_at timestamp with time zone default now());

create table usuarios (id uuid not null, name text not null, cargo text not null, nivel integer not null, ativo boolean default true, created_at timestamp with time zone default now(), must_change_password boolean default false not null, modo_ferias boolean default false not null);

alter table avaliacao_fornecedores add constraint avaliacao_fornecedores_key_key UNIQUE (key);

alter table avaliacao_fornecedores add constraint avaliacao_fornecedores_pkey PRIMARY KEY (id);

alter table contrato_vigencia_ok add constraint contrato_vigencia_ok_pkey PRIMARY KEY (contrato_id);

alter table contratos add constraint contratos_pkey PRIMARY KEY (id);

alter table contratos add constraint contratos_key_key UNIQUE (key);

alter table contratos_flag_manual add constraint contratos_flag_manual_contrato_key_key UNIQUE (contrato_key);

alter table contratos_flag_manual add constraint contratos_flag_manual_pkey PRIMARY KEY (id);

alter table cotacoes add constraint cotacoes_pkey PRIMARY KEY (id);

alter table cotacoes add constraint cotacoes_key_key UNIQUE (key);

alter table creq_comentarios add constraint creq_comentarios_pkey PRIMARY KEY (id);

alter table creq_criterios_contratacao add constraint creq_criterios_contratacao_servico_key UNIQUE (servico);

alter table creq_criterios_contratacao add constraint creq_criterios_contratacao_pkey PRIMARY KEY (id);

alter table creq_familias add constraint creq_familias_pkey PRIMARY KEY (id);

alter table creq_familias add constraint creq_familias_servico_key UNIQUE (servico);

alter table creq_itens add constraint creq_itens_pkey PRIMARY KEY (id);

alter table creq_itens add constraint creq_itens_obra_servico_key UNIQUE (obra, servico);

alter table creq_obra_marcos add constraint creq_obra_marcos_pkey PRIMARY KEY (id);

alter table creq_obra_marcos add constraint creq_obra_marcos_obra_key UNIQUE (obra);

alter table creq_premissas add constraint creq_premissas_padrao_servico_key UNIQUE (padrao, servico);

alter table creq_premissas add constraint creq_premissas_pkey PRIMARY KEY (id);

alter table cron_config add constraint cron_config_pkey PRIMARY KEY (key);

alter table excel_custo_obra add constraint excel_custo_obra_cost_collector_unique UNIQUE (cost_collector);

alter table excel_custo_obra add constraint excel_custo_obra_pkey PRIMARY KEY (id);

alter table excel_familias add constraint excel_familias_pkey PRIMARY KEY (id);

alter table excel_familias_prisma add constraint excel_familias_prisma_pkey PRIMARY KEY (id);

alter table excel_indicadores_sustentabilidade add constraint chk_status_sustentabilidade CHECK ((status = ANY (ARRAY['pendente'::text, 'aprovado'::text, 'reprovado'::text])));

alter table excel_indicadores_sustentabilidade add constraint chk_mes_referencia_dia1 CHECK (((date_trunc('month'::text, (mes_referencia)::timestamp with time zone))::date = mes_referencia));

alter table excel_indicadores_sustentabilidade add constraint excel_indicadores_sustentabilidade_pkey PRIMARY KEY (id);

alter table excel_indicadores_sustentabilidade_historico add constraint excel_indicadores_sustentabilidade_historico_pkey PRIMARY KEY (id);

alter table excel_insumos_prisma add constraint excel_insumos_prisma_pkey PRIMARY KEY (id);

alter table excel_responsaveis_contratacao add constraint excel_responsaveis_contratacao_pkey PRIMARY KEY (id);

alter table excel_sla_familias add constraint excel_sla_familias_pkey PRIMARY KEY (id);

alter table indicadores_def add constraint indicadores_def_pkey PRIMARY KEY (indicador);

alter table indicadores_valores add constraint indicadores_valores_pkey PRIMARY KEY (id);

alter table indicadores_valores add constraint indicadores_valores_indicador_data_ref_key UNIQUE (indicador, data_ref);

alter table logs_ingestao add constraint logs_ingestao_pkey PRIMARY KEY (id);

alter table pedidos add constraint pedidos_pkey PRIMARY KEY (id);

alter table pedidos add constraint pedidos_key_key UNIQUE (key);

alter table pedidos_flag_manual add constraint pedidos_flag_manual_pedido_key_key UNIQUE (pedido_key);

alter table pedidos_flag_manual add constraint pedidos_flag_manual_pkey PRIMARY KEY (id);

alter table requests add constraint requests_key_key UNIQUE (key);

alter table requests add constraint requests_pkey PRIMARY KEY (id);

alter table sustentabilidade_fatores_obra add constraint sustentabilidade_fatores_obra_pkey PRIMARY KEY (cost_collector, tipo);

alter table sustentabilidade_parametros add constraint sustentabilidade_parametros_pkey PRIMARY KEY (chave);

alter table sync_state add constraint sync_state_pkey PRIMARY KEY (fonte);

alter table usuario_ferias_substitutos add constraint usuario_ferias_substitutos_usuario_ferias_substituto_id_key UNIQUE (usuario_ferias, substituto_id);

alter table usuario_ferias_substitutos add constraint usuario_ferias_substitutos_pkey PRIMARY KEY (id);

alter table usuario_obras add constraint usuario_obras_pkey PRIMARY KEY (id);

alter table usuario_obras add constraint usuario_obras_usuario_id_obra_key UNIQUE (usuario_id, obra);

alter table usuario_paginas add constraint usuario_paginas_pkey PRIMARY KEY (id);

alter table usuario_paginas add constraint usuario_paginas_usuario_id_pagina_key UNIQUE (usuario_id, pagina);

alter table usuarios add constraint usuarios_nivel_check CHECK (((nivel >= 0) AND (nivel <= 4)));

alter table usuarios add constraint usuarios_cargo_check CHECK ((cargo = ANY (ARRAY['root'::text, 'admin'::text, 'gestor'::text, 'analista'::text, 'viewer'::text, 'aprovador'::text])));

alter table usuarios add constraint usuarios_pkey PRIMARY KEY (id);

alter table contrato_vigencia_ok add constraint contrato_vigencia_ok_contrato_id_fkey FOREIGN KEY (contrato_id) REFERENCES contratos(id) ON DELETE CASCADE;

alter table contrato_vigencia_ok add constraint contrato_vigencia_ok_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);

alter table contratos_flag_manual add constraint contratos_flag_manual_baixado_por_fkey FOREIGN KEY (baixado_por) REFERENCES auth.users(id);

alter table indicadores_valores add constraint indicadores_valores_indicador_fkey FOREIGN KEY (indicador) REFERENCES indicadores_def(indicador) ON DELETE CASCADE;

alter table pedidos_flag_manual add constraint pedidos_flag_manual_dispensado_por_fkey FOREIGN KEY (dispensado_por) REFERENCES auth.users(id);

alter table usuario_ferias_substitutos add constraint usuario_ferias_substitutos_substituto_id_fkey FOREIGN KEY (substituto_id) REFERENCES usuarios(id) ON DELETE CASCADE;

alter table usuario_ferias_substitutos add constraint usuario_ferias_substitutos_usuario_ferias_fkey FOREIGN KEY (usuario_ferias) REFERENCES usuarios(id) ON DELETE CASCADE;

alter table usuario_obras add constraint usuario_obras_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;

alter table usuario_paginas add constraint usuario_paginas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;

alter table usuarios add constraint usuarios_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id);

CREATE OR REPLACE FUNCTION bs.creq_itens_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'bs', 'public', 'extensions'
AS $function$
begin
  if tg_op = 'UPDATE' then
    if (new.envio_manual is distinct from old.envio_manual
        or new.contratacao_manual is distinct from old.contratacao_manual
        or new.farol_manual is distinct from old.farol_manual
        or new.inicio_servico_manual is distinct from old.inicio_servico_manual
        or new.envio_concorrencia_manual is distinct from old.envio_concorrencia_manual)
       and coalesce(get_my_nivel(), 99) > 2 then
      raise exception 'Edição manual de datas/farol é restrita a gestores ou acima.';
    end if;
  elsif tg_op = 'INSERT' then
    if (new.envio_manual is not null or new.contratacao_manual is not null or new.farol_manual is not null
        or new.inicio_servico_manual is not null or new.envio_concorrencia_manual is not null)
       and coalesce(get_my_nivel(), 99) > 2 then
      raise exception 'Edição manual de datas/farol é restrita a gestores ou acima.';
    end if;
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION bs.creq_snap_mes(prev date, meses integer[])
 RETURNS date
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'bs', 'public', 'extensions'
AS $function$
declare o int; p int; mn int; mx int; m int;
begin
  if prev is null or meses is null or array_length(meses,1) is null then return null; end if;
  o := extract(month from prev)::int;
  p := extract(year from prev)::int;
  select min(x), max(x) into mn, mx from unnest(meses) x;
  if o = 1 or o < mn then
    return make_date(p-1, mx, 1);
  else
    select max(x) into m from unnest(meses) x where x <= o;
    return make_date(p, coalesce(m, mx), 1);
  end if;
end $function$
;

CREATE OR REPLACE FUNCTION bs.fn_backfill_usuario_obras()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'bs', 'public', 'extensions'
AS $function$
declare
  v_inseridos integer;
begin
  insert into usuario_obras (usuario_id, obra, habilitada, updated_at)
  select u.usuario_id, o.nome, true, now()
  from vw_obras o
  cross join (select distinct usuario_id from usuario_obras) u
  left join usuario_obras uo
    on uo.obra = o.nome and uo.usuario_id = u.usuario_id
  where uo.id is null;

  get diagnostics v_inseridos = row_count;
  return v_inseridos;
end
$function$
;

CREATE OR REPLACE FUNCTION bs.fn_creq_criar_obra(p_obra text, p_tipo text DEFAULT NULL::text, p_marcos jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'bs', 'public', 'extensions'
AS $function$
declare
  v_nivel int := coalesce(get_my_nivel(), 99);
  v_cc text; v_novos int;
begin
  if v_nivel > 1 then
    return jsonb_build_object('ok', false, 'erro', 'Criação restrita a admin/root.');
  end if;
  if p_obra is null or btrim(p_obra) = '' then
    return jsonb_build_object('ok', false, 'erro', 'Informe o nome da obra.');
  end if;

  insert into creq_obra_marcos (obra, inicio_obra, inicio_estrutura, termino_estrutura,
    termino_emboco, termino_obra, tipo, padrao_creq, updated_at, updated_by)
  values (btrim(p_obra),
    nullif(p_marcos->>'inicio_obra','')::date, nullif(p_marcos->>'inicio_estrutura','')::date,
    nullif(p_marcos->>'termino_estrutura','')::date, nullif(p_marcos->>'termino_emboco','')::date,
    nullif(p_marcos->>'termino_obra','')::date, p_tipo, 'Atlas', now(), auth.uid())
  on conflict (obra) do update set
    inicio_obra=coalesce(excluded.inicio_obra, creq_obra_marcos.inicio_obra),
    inicio_estrutura=coalesce(excluded.inicio_estrutura, creq_obra_marcos.inicio_estrutura),
    termino_estrutura=coalesce(excluded.termino_estrutura, creq_obra_marcos.termino_estrutura),
    termino_emboco=coalesce(excluded.termino_emboco, creq_obra_marcos.termino_emboco),
    termino_obra=coalesce(excluded.termino_obra, creq_obra_marcos.termino_obra),
    tipo=coalesce(excluded.tipo, creq_obra_marcos.tipo), updated_at=now(), updated_by=auth.uid();

  select r.cost_collector into v_cc from requests r
   where r.cost_collector ilike '%'||btrim(p_obra)||'%'
   group by r.cost_collector order by count(*) desc limit 1;
  update creq_obra_marcos set cost_collector = v_cc
   where obra = btrim(p_obra) and cost_collector is null and v_cc is not null;

  insert into creq_itens (obra, servico, updated_at, updated_by)
  select btrim(p_obra), pr.servico, now(), auth.uid()
  from creq_premissas pr
  where pr.padrao = 'Atlas'
    and not exists (select 1 from creq_itens i where i.obra=btrim(p_obra) and i.servico=pr.servico);
  get diagnostics v_novos = row_count;

  begin refresh materialized view bs.mv_creq_sistema; exception when others then null; end;
  begin perform fn_registrar_log('criar_creq','creq_itens', btrim(p_obra), 'ok',
    jsonb_build_object('itens_novos', v_novos, 'cost_collector', v_cc)); exception when others then null; end;

  return jsonb_build_object('ok', true, 'obra', btrim(p_obra), 'cost_collector', v_cc, 'itens_novos', v_novos);
end $function$
;

CREATE OR REPLACE FUNCTION bs.fn_creq_importar_obra(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'bs', 'public', 'extensions'
AS $function$
declare
  v_obra  text := p_payload->>'obra';
  v_nivel int  := coalesce(get_my_nivel(), 99);
  v_itens jsonb := coalesce(p_payload->'itens', '[]'::jsonb);
  v_up int := 0; v_del int := 0; r jsonb; v_cc text;
begin
  if v_nivel > 1 then
    return jsonb_build_object('ok', false, 'erro', 'Importação restrita a admin/root.');
  end if;
  if v_obra is null or btrim(v_obra) = '' then
    return jsonb_build_object('ok', false, 'erro', 'Obra ausente no arquivo.');
  end if;

  insert into creq_obra_marcos (obra, inicio_obra, inicio_estrutura, termino_estrutura,
    termino_emboco, termino_obra, tipo, padrao_creq, updated_at, updated_by)
  values (v_obra,
    (p_payload#>>'{marcos,inicio_obra}')::date, (p_payload#>>'{marcos,inicio_estrutura}')::date,
    (p_payload#>>'{marcos,termino_estrutura}')::date, (p_payload#>>'{marcos,termino_emboco}')::date,
    (p_payload#>>'{marcos,termino_obra}')::date, p_payload->>'tipo', 'Atlas', now(), auth.uid())
  on conflict (obra) do update set
    inicio_obra=excluded.inicio_obra, inicio_estrutura=excluded.inicio_estrutura,
    termino_estrutura=excluded.termino_estrutura, termino_emboco=excluded.termino_emboco,
    termino_obra=excluded.termino_obra, tipo=coalesce(excluded.tipo, creq_obra_marcos.tipo),
    updated_at=now(), updated_by=auth.uid();

  select r2.cost_collector into v_cc from requests r2
   where r2.cost_collector ilike '%'||v_obra||'%'
   group by r2.cost_collector order by count(*) desc limit 1;
  update creq_obra_marcos set cost_collector = v_cc
   where obra = v_obra and cost_collector is null and v_cc is not null;

  for r in select * from jsonb_array_elements(v_itens) loop
    if coalesce(btrim(r->>'servico'),'') = '' then continue; end if;
    insert into creq_itens (obra, servico, status, fornecedor, updated_at, updated_by)
    values (v_obra, r->>'servico', nullif(r->>'status',''), nullif(r->>'fornecedor',''), now(), auth.uid())
    on conflict (obra, servico) do update set
      status=excluded.status, fornecedor=excluded.fornecedor, updated_at=now(), updated_by=auth.uid();
    v_up := v_up + 1;
  end loop;

  delete from creq_itens i
   where i.obra = v_obra
     and not exists (select 1 from jsonb_array_elements(v_itens) e where e->>'servico' = i.servico);
  get diagnostics v_del = row_count;

  begin refresh materialized view bs.mv_creq_sistema; exception when others then null; end;
  begin perform fn_registrar_log('import_creq','creq_itens', v_obra, 'ok',
    jsonb_build_object('itens', v_up, 'removidos', v_del, 'cost_collector', v_cc)); exception when others then null; end;

  return jsonb_build_object('ok', true, 'obra', v_obra, 'cost_collector', v_cc, 'itens', v_up, 'removidos', v_del);
end $function$
;

CREATE OR REPLACE FUNCTION bs.fn_creq_refresh_sistema()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'bs', 'public', 'extensions'
AS $function$
begin
  refresh materialized view concurrently bs.mv_creq_sistema;
end $function$
;

CREATE OR REPLACE FUNCTION bs.fn_decidir_lancamento(p_ids bigint[], p_decisao text, p_motivo text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'bs', 'public', 'extensions'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_cargo text;
  v_afetados int := 0;
  v_rec record;
  v_motivo text := nullif(btrim(coalesce(p_motivo,'')),'');
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'erro', 'Sessão não autenticada.');
  end if;
  select cargo into v_cargo from bs.usuarios where id = v_uid;
  if coalesce(v_cargo,'') not in ('aprovador','admin','root') then
    return jsonb_build_object('ok', false, 'erro', 'Você não tem permissão para aprovar lançamentos.');
  end if;
  if p_decisao not in ('aprovado','reprovado') then
    return jsonb_build_object('ok', false, 'erro', 'Decisão inválida.');
  end if;
  if p_ids is null or array_length(p_ids,1) is null then
    return jsonb_build_object('ok', false, 'erro', 'Nenhum lançamento selecionado.');
  end if;

  for v_rec in
    update bs.excel_indicadores_sustentabilidade t
       set status            = p_decisao,
           aprovado_por      = v_uid,
           aprovado_em       = now(),
           motivo_reprovacao = case when p_decisao='reprovado' then v_motivo else null end
     where t.id = any(p_ids) and t.status = 'pendente'
     returning t.id, t.cost_collector, t.mes_referencia
  loop
    v_afetados := v_afetados + 1;
    perform bs.fn_registrar_log(
      'decisao_sustentabilidade', 'excel_indicadores_sustentabilidade',
      v_rec.cost_collector || ' | ' || v_rec.mes_referencia::text, p_decisao,
      jsonb_build_object('id', v_rec.id, 'decisao', p_decisao, 'motivo', v_motivo));
  end loop;

  return jsonb_build_object('ok', true, 'afetados', v_afetados, 'decisao', p_decisao);
end;
$function$
;

CREATE OR REPLACE FUNCTION bs.fn_fornecedores_por_grupo(p_grupos text[])
 RETURNS TABLE(fornecedor text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'bs', 'public', 'extensions'
AS $function$
  select p.sup_corporate_name
  from vw_parcerias_empresa p
  where p.sup_corporate_name is not null
    and p.material_group is not null
    and exists (
      select 1
      from unnest(string_to_array(p.material_group, ';')) seg
      join unnest(p_grupos) g on upper(btrim(seg)) = upper(btrim(g))
    )
  group by p.sup_corporate_name
  having count(distinct p.cost_collector) >= 2;
$function$
;

CREATE OR REPLACE FUNCTION bs.fn_is_admin_root()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'bs', 'public', 'extensions'
AS $function$
  select exists (
    select 1 from bs.usuarios
    where id = auth.uid() and cargo in ('admin','root')
  );
$function$
;

CREATE OR REPLACE FUNCTION bs.fn_material_groups_por_familia(p_grupos text[])
 RETURNS TABLE(material_group text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'bs', 'public', 'extensions'
AS $function$
  select distinct r.material_group
  from bs.requests r
  where r.material_group is not null
    and (p_grupos is null or r.material_group ilike any (array(select '%'||btrim(x)||'%' from unnest(p_grupos) x)));
$function$
;

CREATE OR REPLACE FUNCTION bs.fn_parcerias_pedidos_empresa()
 RETURNS TABLE(sup_corporate_name text, cost_collector text, value numeric, material_group text, negotiator_issue_date text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'bs', 'public', 'extensions'
AS $function$
  WITH ranked AS (
    SELECT p.sup_corporate_name, p.cost_collector, p.value, p.negotiator_issue_date,
      p.quoting_number_formatted,
      split_part(p.purchase_order_number_with_review,'-',2) AS po_rev,
      MAX(split_part(p.purchase_order_number_with_review,'-',2)) OVER (
        PARTITION BY split_part(p.purchase_order_number_with_review,'-',1), p.cost_collector
      ) AS po_rev_max
    FROM bs.pedidos p
    WHERE p.is_active = true
      AND p.sup_corporate_name IS NOT NULL
      AND p.sup_corporate_name NOT ILIKE '%Atlas%'
      AND p.cost_collector IS NOT NULL
      AND p.cost_collector NOT ILIKE '%escritório atlas%'  AND p.cost_collector NOT ILIKE '%escritorio atlas%'
      AND p.cost_collector NOT ILIKE '%acordo de preço%'   AND p.cost_collector NOT ILIKE '%acordo de preco%'
      AND p.cost_collector NOT ILIKE '%custos indiretos%'   AND p.cost_collector NOT ILIKE '%indiretos custo atlas%'
      AND p.cost_collector NOT ILIKE '%indiretos obras atlas%' AND p.cost_collector NOT ILIKE '%projetos%'
      AND p.cost_collector NOT ILIKE '%pré obra%' AND p.cost_collector NOT ILIKE '%pre obra%'
      AND p.cost_collector NOT ILIKE '%pré-obra%' AND p.cost_collector NOT ILIKE '%pre-obra%'
  )
  SELECT r.sup_corporate_name, r.cost_collector, r.value,
         c.material_group,
         r.negotiator_issue_date
  FROM ranked r
  LEFT JOIN bs.cotacoes c
    ON c.cost_collector = r.cost_collector
   AND c.quoting_number_formatted = r.quoting_number_formatted
  WHERE r.po_rev = r.po_rev_max;
$function$
;

CREATE OR REPLACE FUNCTION bs.fn_reconciliar_pedidos(p_ids bigint[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'bs', 'public', 'extensions'
AS $function$
DECLARE
  v_validos     bigint;
  v_ativos_antes bigint;
  v_inativados  bigint := 0;
  v_reativados  bigint := 0;
  v_com_id      bigint;
BEGIN
  v_validos := coalesce(array_length(p_ids, 1), 0);
  SELECT COUNT(*) INTO v_ativos_antes FROM bs.pedidos WHERE is_active;
  SELECT COUNT(*) INTO v_com_id       FROM bs.pedidos WHERE purchase_order_id IS NOT NULL;

  IF v_validos = 0 OR v_validos < v_ativos_antes * 0.5 THEN
    RETURN jsonb_build_object('ok', false, 'skipped', true,
      'motivo', format('Safeguard: lista de válidos (%s) < 50%% dos ativos (%s)', v_validos, v_ativos_antes));
  END IF;

  UPDATE bs.pedidos
  SET is_active = false
  WHERE is_active
    AND purchase_order_id IS NOT NULL
    AND NOT (purchase_order_id = ANY(p_ids));
  GET DIAGNOSTICS v_inativados = ROW_COUNT;

  UPDATE bs.pedidos
  SET is_active = true
  WHERE NOT is_active
    AND purchase_order_id IS NOT NULL
    AND purchase_order_id = ANY(p_ids);
  GET DIAGNOSTICS v_reativados = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', true, 'skipped', false,
    'validos_prisma', v_validos,
    'ativos_antes',   v_ativos_antes,
    'com_purchase_order_id', v_com_id,
    'inativados',     v_inativados,
    'reativados',     v_reativados
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION bs.fn_registrar_log(p_acao text, p_entidade text, p_referencia text, p_resultado text, p_detalhe jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'bs', 'public', 'extensions'
AS $function$
declare v_nome text;
begin
  select name into v_nome from bs.usuarios where id = auth.uid();
  insert into bs.logs_ingestao (usuario_id, usuario_nome, acao, entidade, referencia, resultado, detalhe)
  values (auth.uid(), v_nome, p_acao, p_entidade, p_referencia, coalesce(p_resultado,'ok'), p_detalhe);
end;
$function$
;

CREATE OR REPLACE FUNCTION bs.fn_replace_planilha(p_tabela text, p_dados jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'bs', 'public', 'extensions'
AS $function$
DECLARE
  v_allowed text[] := ARRAY[
    'excel_sla_familias','excel_familias','excel_insumos_prisma',
    'excel_familias_prisma','excel_responsaveis_contratacao','excel_custo_obra'
  ];
  v_cols   text;
  v_antes  bigint;
  v_depois bigint;
  v_ins    bigint := 0;
  v_upd    bigint := 0;
BEGIN

  IF coalesce(bs.get_my_nivel(), 99) > 1 THEN
    RAISE EXCEPTION 'Acesso negado: apenas Admin/Root podem importar planilhas.';
  END IF;

  IF NOT (p_tabela = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Tabela não permitida: %', p_tabela;
  END IF;

  IF p_dados IS NULL OR jsonb_typeof(p_dados) <> 'array' OR jsonb_array_length(p_dados) = 0 THEN
    RAISE EXCEPTION 'Dados vazios ou inválidos — import cancelado.';
  END IF;

  EXECUTE format('SELECT count(*) FROM public.%I', p_tabela) INTO v_antes;

  IF p_tabela = 'excel_custo_obra' THEN
    WITH incoming AS (
      SELECT cost_collector, custo_atual, porcentagem
      FROM jsonb_populate_recordset(NULL::bs.excel_custo_obra, p_dados)
      WHERE cost_collector IS NOT NULL AND btrim(cost_collector) <> ''
    ),
    ins AS (
      INSERT INTO bs.excel_custo_obra (cost_collector, custo_atual, porcentagem)
      SELECT cost_collector, custo_atual, porcentagem FROM incoming
      ON CONFLICT (cost_collector) DO UPDATE
        SET custo_atual = EXCLUDED.custo_atual,
            porcentagem = EXCLUDED.porcentagem
      RETURNING (xmax = 0) AS inserted
    )
    SELECT count(*) FILTER (WHERE inserted),
           count(*) FILTER (WHERE NOT inserted)
    INTO v_ins, v_upd
    FROM ins;

    EXECUTE format('SELECT count(*) FROM public.%I', p_tabela) INTO v_depois;
    RETURN jsonb_build_object(
      'modo','seletivo', 'qtd_antes', v_antes, 'qtd_depois', v_depois,
      'inseridas', v_ins, 'atualizadas', v_upd, 'preservadas', v_antes - v_upd
    );
  END IF;

  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
  INTO v_cols
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = p_tabela
    AND column_name NOT IN ('id','created_at','updated_at');

  EXECUTE format('DELETE FROM public.%I', p_tabela);
  EXECUTE format(
    'INSERT INTO public.%I (%s) SELECT %s FROM jsonb_populate_recordset(NULL::public.%I, $1)',
    p_tabela, v_cols, v_cols, p_tabela
  ) USING p_dados;

  EXECUTE format('SELECT count(*) FROM public.%I', p_tabela) INTO v_depois;
  RETURN jsonb_build_object('modo','full', 'qtd_antes', v_antes, 'qtd_depois', v_depois);
END;
$function$
;

CREATE OR REPLACE FUNCTION bs.fn_submeter_lancamento_sustentabilidade(p_cost_collector text, p_mes_referencia date, p_dados jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'bs', 'public', 'extensions'
AS $function$
declare
  v_uid    uuid := auth.uid();
  v_nome   text;
  v_cargo  text;
  v_email  text;
  v_obra   text;
  v_mes    date;
  v_id     bigint;
  v_existe boolean;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'erro', 'Sessão não autenticada. Faça login para lançar.');
  end if;

  select name, cargo into v_nome, v_cargo from bs.usuarios where id = v_uid;

  if p_cost_collector is null or btrim(p_cost_collector) = '' then
    return jsonb_build_object('ok', false, 'erro', 'Obra não selecionada.');
  end if;
  v_obra := btrim(p_cost_collector);

  if not exists (select 1 from bs.vw_obras where nome = v_obra) then
    return jsonb_build_object('ok', false, 'erro', 'Obra inválida.');
  end if;

  if coalesce(v_cargo,'') not in ('admin','root') then
    if not exists (
      select 1 from bs.usuario_obras
      where usuario_id = v_uid and obra = v_obra and habilitada
    ) then
      perform bs.fn_registrar_log(
        'lancamento_sustentabilidade','excel_indicadores_sustentabilidade',
        v_obra || ' | ' || coalesce(p_mes_referencia::text,'?'), 'erro',
        jsonb_build_object('erro','sem_permissao_obra'));
      return jsonb_build_object('ok', false, 'erro', 'Você não tem permissão para lançar nesta obra.');
    end if;
  end if;

  if p_mes_referencia is null then
    return jsonb_build_object('ok', false, 'erro', 'Mês de referência não informado.');
  end if;
  v_mes := date_trunc('month', p_mes_referencia)::date;
  if v_mes > date_trunc('month', now())::date then
    return jsonb_build_object('ok', false, 'erro', 'Mês de referência não pode ser futuro.');
  end if;

  select email into v_email from auth.users where id = v_uid;

  select true into v_existe
  from bs.excel_indicadores_sustentabilidade
  where cost_collector = v_obra and mes_referencia = v_mes;

  insert into bs.excel_indicadores_sustentabilidade as t (
    cost_collector, email_obra, mes_referencia,
    energia_kwh, agua_concessionaria_m3, agua_pipa_m3,
    diesel_gerador1_l, diesel_gerador2_l, diesel_gerador3_l,
    entulho_limpo_cacamba, madeira_cacamba, gesso_cacamba, classe_c_cacamba,
    reciclaveis_bag, misto_cacamba, perigoso_cacamba, sucata_cacamba, solo_terra_m3,
    etapa_obra, num_colaboradores,
    anexo_agua_url, anexo_energia_url, anexo_coletas_url,
    status, origem
  )
  values (
    v_obra, v_email, v_mes,
    coalesce((p_dados->>'energia_kwh')::numeric, 0),
    coalesce((p_dados->>'agua_concessionaria_m3')::numeric, 0),
    coalesce((p_dados->>'agua_pipa_m3')::numeric, 0),
    coalesce((p_dados->>'diesel_gerador1_l')::numeric, 0),
    coalesce((p_dados->>'diesel_gerador2_l')::numeric, 0),
    coalesce((p_dados->>'diesel_gerador3_l')::numeric, 0),
    coalesce((p_dados->>'entulho_limpo_cacamba')::numeric, 0),
    coalesce((p_dados->>'madeira_cacamba')::numeric, 0),
    coalesce((p_dados->>'gesso_cacamba')::numeric, 0),
    coalesce((p_dados->>'classe_c_cacamba')::numeric, 0),
    coalesce((p_dados->>'reciclaveis_bag')::numeric, 0),
    coalesce((p_dados->>'misto_cacamba')::numeric, 0),
    coalesce((p_dados->>'perigoso_cacamba')::numeric, 0),
    coalesce((p_dados->>'sucata_cacamba')::numeric, 0),
    coalesce((p_dados->>'solo_terra_m3')::numeric, 0),
    nullif(btrim(coalesce(p_dados->>'etapa_obra','')), ''),
    nullif(p_dados->>'num_colaboradores','')::integer,
    nullif(btrim(coalesce(p_dados->>'anexo_agua_url','')), ''),
    nullif(btrim(coalesce(p_dados->>'anexo_energia_url','')), ''),
    nullif(btrim(coalesce(p_dados->>'anexo_coletas_url','')), ''),
    'pendente', 'formulario'
  )
  on conflict (cost_collector, mes_referencia) do update set
    email_obra             = excluded.email_obra,
    energia_kwh            = excluded.energia_kwh,
    agua_concessionaria_m3 = excluded.agua_concessionaria_m3,
    agua_pipa_m3           = excluded.agua_pipa_m3,
    diesel_gerador1_l      = excluded.diesel_gerador1_l,
    diesel_gerador2_l      = excluded.diesel_gerador2_l,
    diesel_gerador3_l      = excluded.diesel_gerador3_l,
    entulho_limpo_cacamba  = excluded.entulho_limpo_cacamba,
    madeira_cacamba        = excluded.madeira_cacamba,
    gesso_cacamba          = excluded.gesso_cacamba,
    classe_c_cacamba       = excluded.classe_c_cacamba,
    reciclaveis_bag        = excluded.reciclaveis_bag,
    misto_cacamba          = excluded.misto_cacamba,
    perigoso_cacamba       = excluded.perigoso_cacamba,
    sucata_cacamba         = excluded.sucata_cacamba,
    solo_terra_m3          = excluded.solo_terra_m3,
    etapa_obra             = excluded.etapa_obra,
    num_colaboradores      = excluded.num_colaboradores,
    anexo_agua_url         = coalesce(excluded.anexo_agua_url,    t.anexo_agua_url),
    anexo_energia_url      = coalesce(excluded.anexo_energia_url, t.anexo_energia_url),
    anexo_coletas_url      = coalesce(excluded.anexo_coletas_url, t.anexo_coletas_url),
    status                 = 'pendente'
  returning t.id into v_id;

  perform bs.fn_registrar_log(
    'lancamento_sustentabilidade','excel_indicadores_sustentabilidade',
    v_obra || ' | ' || v_mes::text, 'ok',
    jsonb_build_object('id', v_id, 'substituiu_anterior', coalesce(v_existe,false), 'dados', p_dados)
  );

  return jsonb_build_object(
    'ok', true, 'id', v_id, 'obra', v_obra, 'mes_referencia', v_mes,
    'substituiu_anterior', coalesce(v_existe, false),
    'mensagem', case when coalesce(v_existe,false)
                     then 'Lançamento atualizado e reenviado para aprovação.'
                     else 'Lançamento enviado para aprovação.' end
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION bs.fn_sustentabilidade_versionar()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'bs', 'public', 'extensions'
AS $function$
BEGIN

  IF (to_jsonb(OLD) - 'status' - 'aprovado_por' - 'aprovado_em' - 'motivo_reprovacao'
      - 'validado_por' - 'validado_em' - 'observacao_validacao'
      - 'updated_at' - 'enviado_em')
     IS DISTINCT FROM
     (to_jsonb(NEW) - 'status' - 'aprovado_por' - 'aprovado_em' - 'motivo_reprovacao'
      - 'validado_por' - 'validado_em' - 'observacao_validacao'
      - 'updated_at' - 'enviado_em')
  THEN
    INSERT INTO bs.excel_indicadores_sustentabilidade_historico
      (lancamento_id, cost_collector, mes_referencia, dados)
    VALUES (OLD.id, OLD.cost_collector, OLD.mes_referencia, to_jsonb(OLD));

    NEW.status               := 'pendente';
    NEW.aprovado_por         := NULL;
    NEW.aprovado_em          := NULL;
    NEW.motivo_reprovacao    := NULL;
    NEW.validado_por         := NULL;
    NEW.validado_em          := NULL;
    NEW.observacao_validacao := NULL;
    NEW.enviado_em           := now();
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION bs.get_my_name()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'bs', 'public', 'extensions'
AS $function$
  SELECT name
  FROM bs.usuarios
  WHERE id = auth.uid()
    AND ativo = true;
$function$
;

CREATE OR REPLACE FUNCTION bs.get_my_nivel()
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'bs', 'public', 'extensions'
AS $function$
  SELECT nivel
  FROM bs.usuarios
  WHERE id = auth.uid()
    AND ativo = true;
$function$
;

CREATE OR REPLACE FUNCTION bs.get_my_substituidos()
 RETURNS text[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'bs', 'public', 'extensions'
AS $function$
  SELECT COALESCE(array_agg(u2.name), ARRAY[]::text[])
  FROM bs.usuario_ferias_substitutos ufs
  JOIN bs.usuarios u2 ON u2.id = ufs.usuario_ferias
  WHERE ufs.substituto_id = auth.uid()
    AND ufs.ativo = true
    AND u2.modo_ferias = true;
$function$
;

CREATE OR REPLACE FUNCTION bs.rpc_concorrencias_kpis(p_obras text[] DEFAULT NULL::text[], p_analistas text[] DEFAULT NULL::text[], p_data_inicio timestamp with time zone DEFAULT NULL::timestamp with time zone, p_data_fim timestamp with time zone DEFAULT NULL::timestamp with time zone, p_grupos text[] DEFAULT NULL::text[])
 RETURNS TABLE(a_delegar bigint, a_iniciar bigint, em_cotacao bigint, em_aprovacao bigint, criar_pedido bigint, total bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'bs', 'public', 'extensions'
AS $function$
  WITH
  a_delegar_count AS (
    SELECT COUNT(*) AS qtd
    FROM bs.requests
    WHERE is_active = true
      AND request_status = 'Aguardando Distribuição (Depto de Suprimentos)'
  ),
  base AS (
    SELECT *
    FROM bs.requests
    WHERE is_active = true
      AND request_status NOT ILIKE '%cancelada%'
      AND request_status NOT ILIKE '%deletad%'
      AND (p_obras IS NULL OR cost_collector = ANY(p_obras))
      AND (p_analistas IS NULL OR negotiator_name = ANY(p_analistas))
      AND (p_grupos IS NULL OR material_group ILIKE ANY (ARRAY(SELECT '%'||btrim(x)||'%' FROM unnest(p_grupos) x)))
      AND (p_data_inicio IS NULL OR release_date_level02 >= p_data_inicio)
      AND (p_data_fim    IS NULL OR release_date_level02 <= p_data_fim)
  )
  SELECT
    (SELECT qtd FROM a_delegar_count),
    COUNT(*) FILTER (
      WHERE request_status = 'Pronta para Comprar'
        AND (quoting_number_with_status_concat IS NULL
             OR quoting_number_with_status_concat = ''
             OR LOWER(quoting_number_with_status_concat) LIKE '%agrupado%')
    ),
    COUNT(*) FILTER (
      WHERE request_status = 'Pronta para Comprar'
        AND (LOWER(quoting_number_with_status_concat) LIKE '%cotação%'
             OR LOWER(quoting_number_with_status_concat) LIKE '%reaberto%'
             OR LOWER(quoting_number_with_status_concat) LIKE '%devolvido%'
             OR LOWER(quoting_number_with_status_concat) LIKE '%reprovado%')
    ),
    COUNT(*) FILTER (
      WHERE request_status = 'Pronta para Comprar'
        AND LOWER(quoting_number_with_status_concat) LIKE '%aguardando%'
    ),
    COUNT(*) FILTER (
      WHERE request_status NOT ILIKE '%devolvida%'
        AND LOWER(quoting_number_with_status_concat) LIKE '%mapa liberado%'
        AND LOWER(quoting_number_with_status_concat) NOT LIKE '%pedido%criado%'
        AND (purchase_order_number_with_rev IS NULL OR purchase_order_number_with_rev = '')
    ),
    COUNT(*) FILTER (
      WHERE (request_status = 'Pronta para Comprar' AND (
              quoting_number_with_status_concat IS NULL
              OR quoting_number_with_status_concat = ''
              OR LOWER(quoting_number_with_status_concat) LIKE '%agrupado%'
              OR LOWER(quoting_number_with_status_concat) LIKE '%cotação%'
              OR LOWER(quoting_number_with_status_concat) LIKE '%reaberto%'
              OR LOWER(quoting_number_with_status_concat) LIKE '%devolvido%'
              OR LOWER(quoting_number_with_status_concat) LIKE '%reprovado%'
              OR LOWER(quoting_number_with_status_concat) LIKE '%aguardando%'))
         OR (request_status NOT ILIKE '%devolvida%'
             AND LOWER(quoting_number_with_status_concat) LIKE '%mapa liberado%'
             AND LOWER(quoting_number_with_status_concat) NOT LIKE '%pedido%criado%'
             AND (purchase_order_number_with_rev IS NULL OR purchase_order_number_with_rev = ''))
    )
  FROM base;
$function$
;

CREATE OR REPLACE FUNCTION bs.rpc_contratos_kpis(p_obras text[] DEFAULT NULL::text[], p_analistas text[] DEFAULT NULL::text[], p_data_inicio timestamp with time zone DEFAULT NULL::timestamp with time zone, p_data_fim timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(em_edicao bigint, em_aprovacao bigint, enviar_d4sign bigint, em_assinatura bigint, total bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'bs', 'public', 'extensions'
AS $function$
  WITH baixados AS (
    SELECT contrato_key FROM bs.contratos_flag_manual WHERE baixado = true
  ),
  base AS (
    SELECT *
    FROM bs.contratos
    WHERE is_active = true
      AND key NOT IN (SELECT contrato_key FROM baixados)
      AND (p_obras       IS NULL OR cost_collector  = ANY(p_obras))
      AND (p_analistas   IS NULL OR created_by_name = ANY(p_analistas))
      AND (p_data_inicio IS NULL OR created_when   >= p_data_inicio)
      AND (p_data_fim    IS NULL OR created_when   <= p_data_fim)
  )
  SELECT
    COUNT(*) FILTER (WHERE purchase_order_contract_status IN ('Em edição', 'Reprovado')),
    COUNT(*) FILTER (WHERE LOWER(purchase_order_contract_status) LIKE '%aguardando aprovação%'),

    COUNT(*) FILTER (
      WHERE purchase_order_contract_status = 'Aprovado'
        AND (created_by_name IS NULL OR created_by_name <> ALL (ARRAY['Marcos Teixeira Lima','Patrícia Moura']))
    ),
    COUNT(*) FILTER (WHERE LOWER(purchase_order_contract_status) LIKE 'enviado para%'),
    COUNT(*) FILTER (
      WHERE purchase_order_contract_status IN ('Em edição', 'Reprovado')
         OR LOWER(purchase_order_contract_status) LIKE 'enviado para%'
         OR LOWER(purchase_order_contract_status) LIKE '%aguardando aprovação%'
         OR (purchase_order_contract_status = 'Aprovado'
             AND (created_by_name IS NULL OR created_by_name <> ALL (ARRAY['Marcos Teixeira Lima','Patrícia Moura'])))
    )
  FROM base;
$function$
;

CREATE OR REPLACE FUNCTION bs.rpc_get_my_substituidos()
 RETURNS text[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'bs', 'public', 'extensions'
AS $function$
  SELECT get_my_substituidos();
$function$
;

CREATE OR REPLACE FUNCTION bs.rpc_pedidos_kpis(p_obras text[] DEFAULT NULL::text[], p_analistas text[] DEFAULT NULL::text[], p_data_inicio timestamp with time zone DEFAULT NULL::timestamp with time zone, p_data_fim timestamp with time zone DEFAULT NULL::timestamp with time zone, p_modo_resp boolean DEFAULT false)
 RETURNS TABLE(ped_em_aprovacao bigint, a_formalizar bigint, ped_em_validacao bigint, total bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'bs', 'public', 'extensions'
AS $function$
  WITH dispensados AS (
    SELECT pedido_key FROM bs.pedidos_flag_manual WHERE dispensado = true
  ),
  formalizados AS (
    SELECT pedido_key FROM bs.pedidos_flag_manual WHERE formalizado = true
  ),
  base AS (
    SELECT v.*
    FROM bs.vw_pedidos_com_minuta_flag v
    WHERE (p_obras IS NULL OR v.cost_collector = ANY(p_obras))
      AND (p_analistas IS NULL OR v.quoting_negotiator_name = ANY(p_analistas))
      AND (p_data_inicio IS NULL OR v.negotiator_issue_date::timestamptz >= p_data_inicio)
      AND (p_data_fim    IS NULL OR v.negotiator_issue_date::timestamptz <= p_data_fim)
  )
  SELECT
    COUNT(*) FILTER (
      WHERE purchase_order_type = 'Cotação'
        AND LOWER(purchase_order_status) LIKE '%aguardando%'
        AND purchase_order_number_with_review LIKE '%-00'
    ) AS ped_em_aprovacao,

    COUNT(*) FILTER (
      WHERE purchase_order_type = 'Cotação'
        AND LOWER(purchase_order_status) LIKE '%aprovado%'
        AND flag_email_sent_boolean = false
        AND flag_has_contract = false
        AND cost_collector NOT ILIKE '%custos indiretos%'
        AND cost_collector NOT ILIKE '%indiretos custo atlas%'
        AND cost_collector NOT ILIKE '%acordo de preço%'
        AND cost_collector NOT ILIKE '%projetos%'
        AND cost_collector NOT ILIKE '%pré obra%'
        AND key NOT IN (SELECT pedido_key FROM formalizados)
        AND (quoting_negotiator_name IS NULL OR quoting_negotiator_name <> ALL (ARRAY['Marcos Teixeira Lima','Patrícia Moura']))
    ) AS a_formalizar,

    COUNT(*) FILTER (
      WHERE LOWER(purchase_order_status) LIKE '%aprovado%'
        AND flag_has_contract = false
        AND precisa_minuta = true
        AND cost_collector NOT ILIKE '%custos indiretos%'
        AND cost_collector NOT ILIKE '%indiretos custo atlas%'
        AND cost_collector NOT ILIKE '%acordo de preço%'
        AND cost_collector NOT ILIKE '%projetos%'
        AND cost_collector NOT ILIKE '%pré obra%'
        AND key NOT IN (SELECT pedido_key FROM dispensados)
        AND (quoting_negotiator_name IS NULL OR quoting_negotiator_name <> ALL (ARRAY['Marcos Teixeira Lima','Patrícia Moura']))
        AND (
          (NOT p_modo_resp AND purchase_order_type = 'Cotação' AND flag_email_sent_boolean = true)
          OR (p_modo_resp AND purchase_order_type <> 'Cotação')
        )
    ) AS ped_em_validacao,

    COUNT(*) FILTER (
      WHERE (purchase_order_type = 'Cotação'
             AND LOWER(purchase_order_status) LIKE '%aguardando%'
             AND purchase_order_number_with_review LIKE '%-00')
         OR (purchase_order_type = 'Cotação'
             AND LOWER(purchase_order_status) LIKE '%aprovado%'
             AND flag_email_sent_boolean = false
             AND flag_has_contract = false
             AND cost_collector NOT ILIKE '%custos indiretos%'
             AND cost_collector NOT ILIKE '%indiretos custo atlas%'
             AND cost_collector NOT ILIKE '%acordo de preço%'
             AND cost_collector NOT ILIKE '%projetos%'
             AND cost_collector NOT ILIKE '%pré obra%'
             AND key NOT IN (SELECT pedido_key FROM formalizados)
             AND (quoting_negotiator_name IS NULL OR quoting_negotiator_name <> ALL (ARRAY['Marcos Teixeira Lima','Patrícia Moura'])))
         OR (LOWER(purchase_order_status) LIKE '%aprovado%'
             AND flag_has_contract = false
             AND precisa_minuta = true
             AND cost_collector NOT ILIKE '%custos indiretos%'
             AND cost_collector NOT ILIKE '%indiretos custo atlas%'
             AND cost_collector NOT ILIKE '%acordo de preço%'
             AND cost_collector NOT ILIKE '%projetos%'
             AND cost_collector NOT ILIKE '%pré obra%'
             AND key NOT IN (SELECT pedido_key FROM dispensados)
             AND (quoting_negotiator_name IS NULL OR quoting_negotiator_name <> ALL (ARRAY['Marcos Teixeira Lima','Patrícia Moura']))
             AND (
               (NOT p_modo_resp AND purchase_order_type = 'Cotação' AND flag_email_sent_boolean = true)
               OR (p_modo_resp AND purchase_order_type <> 'Cotação')
             ))
    ) AS total
  FROM base;
$function$
;

CREATE OR REPLACE FUNCTION bs.trigger_pedidos_reconcile()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'bs', 'public', 'extensions'
AS $function$
DECLARE
  v_url        text;
  v_key        text;
  v_request_id bigint;
BEGIN
  SELECT value INTO v_url FROM bs.cron_config WHERE cron_config.key = 'supabase_url';
  SELECT value INTO v_key FROM bs.cron_config WHERE cron_config.key = 'service_role_key';

  SELECT net.http_post(
    url     := v_url || '/functions/v1/sync-prisma?only=pedidos_reconcile',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 120000
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION bs.trigger_sync_indicadores()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'bs', 'public', 'extensions'
AS $function$
DECLARE v_url text; v_key text; v_id bigint;
BEGIN
  SELECT value INTO v_url FROM bs.cron_config WHERE cron_config.key = 'supabase_url';
  SELECT value INTO v_key FROM bs.cron_config WHERE cron_config.key = 'service_role_key';
  SELECT net.http_post(
    url     := v_url || '/functions/v1/sync-indicadores',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || v_key),
    body    := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) INTO v_id;
  RETURN v_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION bs.trigger_sync_prisma()
 RETURNS bigint
 LANGUAGE plpgsql
 SET search_path TO 'bs', 'public', 'extensions'
AS $function$
DECLARE
  v_url        text;
  v_key        text;
  v_request_id bigint;
BEGIN
  SELECT value INTO v_url
    FROM bs.cron_config WHERE cron_config.key = 'supabase_url';

  SELECT value INTO v_key
    FROM bs.cron_config WHERE cron_config.key = 'service_role_key';

  SELECT net.http_post(
    url     := v_url || '/functions/v1/sync-prisma',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body    := '{}'::jsonb
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION bs.update_excel_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'bs', 'public', 'extensions'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION bs.update_synced_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'bs', 'public', 'extensions'
AS $function$
begin
  new.synced_at = now();
  return new;
end;
$function$
;

create or replace view vw_spend_mensal as  SELECT (EXTRACT(year FROM created_when))::integer AS ano,
    (EXTRACT(month FROM created_when))::integer AS mes,
    sum(value) AS spend,
    count(*) AS processos
   FROM contratos
  WHERE ((is_active = true) AND (created_when IS NOT NULL) AND (cost_collector !~~* '%escritório atlas%'::text) AND (cost_collector !~~* '%escritorio atlas%'::text) AND (cost_collector !~~* '%acordo de preço%'::text) AND (cost_collector !~~* '%acordo de preco%'::text) AND (cost_collector !~~* '%custos indiretos%'::text) AND (cost_collector !~~* '%indiretos custo atlas%'::text) AND (cost_collector !~~* '%indiretos obras atlas%'::text) AND (cost_collector !~~* '%projetos%'::text) AND (cost_collector !~~* '%pré obra%'::text) AND (cost_collector !~~* '%pre obra%'::text) AND (cost_collector !~~* '%pré-obra%'::text) AND (cost_collector !~~* '%pre-obra%'::text))
  GROUP BY ((EXTRACT(year FROM created_when))::integer), ((EXTRACT(month FROM created_when))::integer)
  ORDER BY ((EXTRACT(year FROM created_when))::integer), ((EXTRACT(month FROM created_when))::integer);

create or replace view vw_top_fornecedores as  SELECT sup_corporate_name AS fornecedor,
    sum(value) AS total_contratado,
    count(*) AS quantidade_contratos
   FROM contratos
  WHERE ((is_active = true) AND (sup_corporate_name IS NOT NULL) AND (sup_corporate_name !~~* '%Atlas%'::text) AND (cost_collector !~~* '%escritório atlas%'::text) AND (cost_collector !~~* '%escritorio atlas%'::text) AND (cost_collector !~~* '%acordo de preço%'::text) AND (cost_collector !~~* '%acordo de preco%'::text) AND (cost_collector !~~* '%custos indiretos%'::text) AND (cost_collector !~~* '%indiretos custo atlas%'::text) AND (cost_collector !~~* '%indiretos obras atlas%'::text) AND (cost_collector !~~* '%projetos%'::text) AND (cost_collector !~~* '%pré obra%'::text) AND (cost_collector !~~* '%pre obra%'::text) AND (cost_collector !~~* '%pré-obra%'::text) AND (cost_collector !~~* '%pre-obra%'::text))
  GROUP BY sup_corporate_name
  ORDER BY (sum(value)) DESC;

create or replace view vw_analistas as  SELECT DISTINCT TRIM(BOTH FROM nome) AS nome
   FROM ( SELECT requests.negotiator_name AS nome
           FROM requests
          WHERE (requests.negotiator_name IS NOT NULL)
        UNION
         SELECT pedidos.quoting_negotiator_name
           FROM pedidos
          WHERE (pedidos.quoting_negotiator_name IS NOT NULL)) todos
  WHERE (TRIM(BOTH FROM nome) <> ALL (ARRAY['Marcos Teixeira Lima'::text, 'Patrícia Moura'::text]))
  ORDER BY (TRIM(BOTH FROM nome));

create or replace view vw_obras as  SELECT DISTINCT requests.cost_collector AS nome
   FROM requests
  WHERE (requests.cost_collector IS NOT NULL)
UNION
 SELECT DISTINCT pedidos.cost_collector AS nome
   FROM pedidos
  WHERE (pedidos.cost_collector IS NOT NULL)
UNION
 SELECT DISTINCT contratos.cost_collector AS nome
   FROM contratos
  WHERE (contratos.cost_collector IS NOT NULL)
  ORDER BY 1;

create or replace view vw_tipos as  SELECT DISTINCT pedidos.purchase_order_type AS nome
   FROM pedidos
  WHERE (pedidos.purchase_order_type IS NOT NULL)
UNION
 SELECT DISTINCT contratos.material_groups AS nome
   FROM contratos
  WHERE (contratos.material_groups IS NOT NULL)
UNION
 SELECT DISTINCT cotacoes.material_group AS nome
   FROM cotacoes
  WHERE (cotacoes.material_group IS NOT NULL)
UNION
 SELECT DISTINCT pedidos.material_group AS nome
   FROM pedidos
  WHERE (pedidos.material_group IS NOT NULL)
UNION
 SELECT DISTINCT requests.material_group AS nome
   FROM requests
  WHERE (requests.material_group IS NOT NULL)
  ORDER BY 1;

create or replace view vw_top_fornecedores_avaliados as  SELECT supplier_corporate_name AS fornecedor,
    count(*) AS quantidade_avaliacoes,
    round(avg(general_rating), 2) AS avaliacao_media,
    sum(general_rate_sum) AS rate_total
   FROM avaliacao_fornecedores
  WHERE ((is_active = true) AND (supplier_corporate_name IS NOT NULL) AND (supplier_corporate_name !~~* '%Atlas%'::text) AND (general_rating IS NOT NULL))
  GROUP BY supplier_corporate_name
  ORDER BY (round(avg(general_rating), 2)) DESC;

create or replace view vw_pedidos_com_minuta_flag as  SELECT p.id,
    p.cost_collector,
    p.cli_trade_name,
    p.flag_email_sent_boolean,
    p.flag_has_contract,
    p.purchase_order_status,
    p.purchase_order_number_with_review,
    p.quoting_negotiator_name,
    p.quoting_number_formatted,
    p.purchase_order_type,
    p.negotiator_issue_date,
    p.releasing_date,
    p.email_sent_date,
    p.key,
    p.synced_at,
    COALESCE(NULLIF(p.material_group, ''::text), c.material_group) AS material_group,
    p.sup_corporate_name,
    p.value,
    p.balance,
    p.number_of_contracts,
    (EXISTS ( SELECT 1
           FROM (unnest(string_to_array(COALESCE(NULLIF(p.material_group, ''::text), c.material_group), ';'::text)) grupo(grupo)
             JOIN excel_sla_familias s ON ((upper(btrim(s.grupo_material)) = upper(btrim(grupo.grupo)))))
          WHERE (upper(btrim(s.havera_minuta)) = 'SIM'::text))) AS precisa_minuta
   FROM (pedidos p
     LEFT JOIN cotacoes c ON (((c.cost_collector = p.cost_collector) AND (c.quoting_number_formatted = p.quoting_number_formatted))))
  WHERE (p.is_active = true);

create or replace view vw_parcerias_empresa as  SELECT sup_corporate_name,
    cost_collector,
    value,
    material_group,
    negotiator_issue_date
   FROM fn_parcerias_pedidos_empresa() fn_parcerias_pedidos_empresa(sup_corporate_name, cost_collector, value, material_group, negotiator_issue_date);

create or replace view vw_global_requests as  SELECT id,
    negotiator_name,
    number_formatted,
    request_status,
    quoting_number_with_status_concat,
    purchase_order_number_with_rev,
    cost_collector,
    issue_date_formatted,
    transmission_date_formatted,
    release_date_level01,
    release_date_level02,
    changed_when,
    emission_date_first_po,
    key,
    synced_at,
    material_group,
    purchase_order_number_concat,
    supplier_corporate_name,
    purchase_order_number_cur_rev_formatted,
    purchase_order_review_cur_rev,
    is_active,
    (request_status ~~* '%devolvida%'::text) AS is_devolvida
   FROM requests
  WHERE ((is_active = true) AND (request_status !~~* '%cancelada%'::text) AND (request_status !~~* '%deletad%'::text));

create or replace view vw_global_pedidos as  SELECT id,
    cost_collector,
    cli_trade_name,
    flag_email_sent_boolean,
    flag_has_contract,
    purchase_order_status,
    purchase_order_number_with_review,
    quoting_negotiator_name,
    quoting_number_formatted,
    purchase_order_type,
    negotiator_issue_date,
    releasing_date,
    email_sent_date,
    key,
    synced_at,
    material_group,
    sup_corporate_name,
    value,
    balance,
    number_of_contracts,
    is_active
   FROM pedidos
  WHERE (is_active = true);

create or replace view vw_global_contratos as  SELECT id,
    purchase_order_number_formatted,
    uix,
    cost_collector,
    material_groups,
    sup_corporate_name,
    purchase_order_contract_status,
    start_date_contract,
    finish_date_contract,
    value,
    balance,
    created_when,
    sent_to_approval_date,
    released_date,
    email_date,
    key,
    synced_at,
    created_by_name,
    purchase_order_number_with_review_fmt,
    is_active
   FROM contratos
  WHERE (is_active = true);

create or replace view vw_global_avaliacao_fornecedores as  SELECT id,
    month_and_year_formatted,
    supplier_corporate_name,
    general_rating,
    general_rate_sum,
    quality_supply_type,
    observation,
    cost_collector,
    created_by_name,
    purchase_order_number_formatted,
    purchase_order_number_with_review_formatted,
    purchase_order_review_formatted,
    issue_date,
    key,
    synced_at,
    is_active
   FROM avaliacao_fornecedores
  WHERE (is_active = true);

create or replace view vw_pedidos_ultima_revisao as  WITH ranked AS (
         SELECT p.id,
            p.cost_collector,
            p.cli_trade_name,
            p.flag_email_sent_boolean,
            p.flag_has_contract,
            p.purchase_order_status,
            p.purchase_order_number_with_review,
            p.quoting_negotiator_name,
            p.quoting_number_formatted,
            p.purchase_order_type,
            p.negotiator_issue_date,
            p.releasing_date,
            p.email_sent_date,
            p.key,
            p.synced_at,
            p.material_group,
            p.sup_corporate_name,
            p.value,
            p.balance,
            p.number_of_contracts,
            p.is_active,
            p.purchase_order_id,
            split_part(p.purchase_order_number_with_review, '-'::text, 1) AS po_base,
            split_part(p.purchase_order_number_with_review, '-'::text, 2) AS po_rev,
            max(split_part(p.purchase_order_number_with_review, '-'::text, 2)) OVER (PARTITION BY (split_part(p.purchase_order_number_with_review, '-'::text, 1)), p.cost_collector) AS po_rev_max
           FROM pedidos p
          WHERE (p.is_active = true)
        )
 SELECT id,
    cost_collector,
    cli_trade_name,
    flag_email_sent_boolean,
    flag_has_contract,
    purchase_order_status,
    purchase_order_number_with_review,
    quoting_negotiator_name,
    quoting_number_formatted,
    purchase_order_type,
    negotiator_issue_date,
    releasing_date,
    email_sent_date,
    key,
    synced_at,
    material_group,
    sup_corporate_name,
    value,
    balance,
    number_of_contracts,
    is_active,
    purchase_order_id,
    po_base,
    po_rev,
    po_rev_max
   FROM ranked
  WHERE (po_rev = po_rev_max);

create or replace view vw_lancamentos_sustentabilidade as  SELECT s.id,
    s.cost_collector,
    s.email_obra,
    s.mes_referencia,
    s.energia_kwh,
    s.agua_concessionaria_m3,
    s.agua_pipa_m3,
    s.diesel_gerador1_l,
    s.diesel_gerador2_l,
    s.diesel_gerador3_l,
    s.entulho_limpo_cacamba,
    s.madeira_cacamba,
    s.gesso_cacamba,
    s.classe_c_cacamba,
    s.reciclaveis_bag,
    s.misto_cacamba,
    s.perigoso_cacamba,
    s.sucata_cacamba,
    s.solo_terra_m3,
    s.etapa_obra,
    s.num_colaboradores,
    s.status,
    s.validado_por,
    s.validado_em,
    s.observacao_validacao,
    s.enviado_em,
    s.origem,
    s.created_at,
    s.updated_at,
    s.area_construida_m2,
    s.aprovado_por,
    s.aprovado_em,
    s.motivo_reprovacao,
    (COALESCE(s.agua_concessionaria_m3, (0)::numeric) + COALESCE(s.agua_pipa_m3, (0)::numeric)) AS agua_m3,
    u.name AS aprovado_por_nome,
    s.anexo_agua_url,
    s.anexo_energia_url,
    s.anexo_coletas_url
   FROM (excel_indicadores_sustentabilidade s
     LEFT JOIN usuarios u ON ((u.id = s.aprovado_por)));

create or replace view vw_indicadores_sustentabilidade as  WITH p AS (
         SELECT COALESCE(( SELECT sustentabilidade_parametros.valor
                   FROM sustentabilidade_parametros
                  WHERE (sustentabilidade_parametros.chave = 'diesel_kwh_por_litro'::text)), 5.2) AS diesel_fac,
            COALESCE(( SELECT sustentabilidade_parametros.valor
                   FROM sustentabilidade_parametros
                  WHERE (sustentabilidade_parametros.chave = 'emissao_diesel'::text)), (0)::numeric) AS co2_diesel,
            COALESCE(( SELECT sustentabilidade_parametros.valor
                   FROM sustentabilidade_parametros
                  WHERE (sustentabilidade_parametros.chave = 'emissao_energia'::text)), (0)::numeric) AS co2_energia
        ), fat AS (
         SELECT sustentabilidade_fatores_obra.cost_collector,
            max(sustentabilidade_fatores_obra.fator) FILTER (WHERE (sustentabilidade_fatores_obra.tipo = 'entulho'::text)) AS f_entulho,
            max(sustentabilidade_fatores_obra.fator) FILTER (WHERE (sustentabilidade_fatores_obra.tipo = 'madeira'::text)) AS f_madeira,
            max(sustentabilidade_fatores_obra.fator) FILTER (WHERE (sustentabilidade_fatores_obra.tipo = 'gesso'::text)) AS f_gesso,
            max(sustentabilidade_fatores_obra.fator) FILTER (WHERE (sustentabilidade_fatores_obra.tipo = 'classe_c'::text)) AS f_classe_c,
            max(sustentabilidade_fatores_obra.fator) FILTER (WHERE (sustentabilidade_fatores_obra.tipo = 'reciclaveis'::text)) AS f_recic,
            max(sustentabilidade_fatores_obra.fator) FILTER (WHERE (sustentabilidade_fatores_obra.tipo = 'misto'::text)) AS f_misto,
            max(sustentabilidade_fatores_obra.fator) FILTER (WHERE (sustentabilidade_fatores_obra.tipo = 'sucata'::text)) AS f_sucata
           FROM sustentabilidade_fatores_obra
          GROUP BY sustentabilidade_fatores_obra.cost_collector
        ), base AS (
         SELECT s.id,
            s.cost_collector,
            s.email_obra,
            s.mes_referencia,
            s.energia_kwh,
            s.agua_concessionaria_m3,
            s.agua_pipa_m3,
            s.diesel_gerador1_l,
            s.diesel_gerador2_l,
            s.diesel_gerador3_l,
            s.entulho_limpo_cacamba,
            s.madeira_cacamba,
            s.gesso_cacamba,
            s.classe_c_cacamba,
            s.reciclaveis_bag,
            s.misto_cacamba,
            s.perigoso_cacamba,
            s.sucata_cacamba,
            s.solo_terra_m3,
            s.etapa_obra,
            s.num_colaboradores,
            s.status,
            s.validado_por,
            s.validado_em,
            s.observacao_validacao,
            s.enviado_em,
            s.origem,
            s.created_at,
            s.updated_at,
            s.area_construida_m2,
            s.aprovado_por,
            s.aprovado_em,
            s.motivo_reprovacao,
            COALESCE(s.area_construida_m2, o.area_construida_m2) AS area_efetiva,
            o.area_construida_m2 AS v_area_obra,
            o.meta_agua AS v_meta_agua,
            o.meta_energia AS v_meta_energia,
            o.meta_residuos AS v_meta_residuos,
            p.diesel_fac,
            p.co2_diesel,
            p.co2_energia,
            COALESCE(f.f_entulho, (5)::numeric) AS fe,
            COALESCE(f.f_madeira, (5)::numeric) AS fm,
            COALESCE(f.f_gesso, (5)::numeric) AS fgs,
            COALESCE(f.f_classe_c, (5)::numeric) AS fcc,
            COALESCE(f.f_recic, (5)::numeric) AS fr,
            COALESCE(f.f_misto, (5)::numeric) AS fx,
            COALESCE(f.f_sucata, (5)::numeric) AS fsu
           FROM (((excel_indicadores_sustentabilidade s
             CROSS JOIN p)
             LEFT JOIN excel_custo_obra o ON ((o.cost_collector = s.cost_collector)))
             LEFT JOIN fat f ON ((f.cost_collector = s.cost_collector)))
          WHERE (s.status = 'aprovado'::text)
        ), calc AS (
         SELECT b.id,
            b.cost_collector,
            b.email_obra,
            b.mes_referencia,
            b.energia_kwh,
            b.agua_concessionaria_m3,
            b.agua_pipa_m3,
            b.diesel_gerador1_l,
            b.diesel_gerador2_l,
            b.diesel_gerador3_l,
            b.entulho_limpo_cacamba,
            b.madeira_cacamba,
            b.gesso_cacamba,
            b.classe_c_cacamba,
            b.reciclaveis_bag,
            b.misto_cacamba,
            b.perigoso_cacamba,
            b.sucata_cacamba,
            b.solo_terra_m3,
            b.etapa_obra,
            b.num_colaboradores,
            b.status,
            b.validado_por,
            b.validado_em,
            b.observacao_validacao,
            b.enviado_em,
            b.origem,
            b.created_at,
            b.updated_at,
            b.area_construida_m2,
            b.aprovado_por,
            b.aprovado_em,
            b.motivo_reprovacao,
            b.area_efetiva,
            b.v_area_obra,
            b.v_meta_agua,
            b.v_meta_energia,
            b.v_meta_residuos,
            b.diesel_fac,
            b.co2_diesel,
            b.co2_energia,
            b.fe,
            b.fm,
            b.fgs,
            b.fcc,
            b.fr,
            b.fx,
            b.fsu,
            (COALESCE(b.agua_concessionaria_m3, (0)::numeric) + COALESCE(b.agua_pipa_m3, (0)::numeric)) AS v_agua,
            ((COALESCE(b.diesel_gerador1_l, (0)::numeric) + COALESCE(b.diesel_gerador2_l, (0)::numeric)) + COALESCE(b.diesel_gerador3_l, (0)::numeric)) AS v_diesel_l,
            (COALESCE(b.entulho_limpo_cacamba, (0)::numeric) * b.fe) AS r_entulho,
            (COALESCE(b.madeira_cacamba, (0)::numeric) * b.fm) AS r_madeira,
            (COALESCE(b.gesso_cacamba, (0)::numeric) * b.fgs) AS r_gesso,
            (COALESCE(b.classe_c_cacamba, (0)::numeric) * b.fcc) AS r_classe_c,
            (COALESCE(b.reciclaveis_bag, (0)::numeric) * b.fr) AS r_recic,
            (COALESCE(b.misto_cacamba, (0)::numeric) * b.fx) AS r_misto,
            (COALESCE(b.sucata_cacamba, (0)::numeric) * b.fsu) AS r_sucata,
            COALESCE(b.perigoso_cacamba, (0)::numeric) AS r_perig,
            COALESCE(b.solo_terra_m3, (0)::numeric) AS r_solo,
            ((((((COALESCE(b.entulho_limpo_cacamba, (0)::numeric) + COALESCE(b.madeira_cacamba, (0)::numeric)) + COALESCE(b.gesso_cacamba, (0)::numeric)) + COALESCE(b.classe_c_cacamba, (0)::numeric)) + COALESCE(b.reciclaveis_bag, (0)::numeric)) + COALESCE(b.misto_cacamba, (0)::numeric)) + COALESCE(b.sucata_cacamba, (0)::numeric)) AS n_cacambas
           FROM base b
        ), calc2 AS (
         SELECT c.id,
            c.cost_collector,
            c.email_obra,
            c.mes_referencia,
            c.energia_kwh,
            c.agua_concessionaria_m3,
            c.agua_pipa_m3,
            c.diesel_gerador1_l,
            c.diesel_gerador2_l,
            c.diesel_gerador3_l,
            c.entulho_limpo_cacamba,
            c.madeira_cacamba,
            c.gesso_cacamba,
            c.classe_c_cacamba,
            c.reciclaveis_bag,
            c.misto_cacamba,
            c.perigoso_cacamba,
            c.sucata_cacamba,
            c.solo_terra_m3,
            c.etapa_obra,
            c.num_colaboradores,
            c.status,
            c.validado_por,
            c.validado_em,
            c.observacao_validacao,
            c.enviado_em,
            c.origem,
            c.created_at,
            c.updated_at,
            c.area_construida_m2,
            c.aprovado_por,
            c.aprovado_em,
            c.motivo_reprovacao,
            c.area_efetiva,
            c.v_area_obra,
            c.v_meta_agua,
            c.v_meta_energia,
            c.v_meta_residuos,
            c.diesel_fac,
            c.co2_diesel,
            c.co2_energia,
            c.fe,
            c.fm,
            c.fgs,
            c.fcc,
            c.fr,
            c.fx,
            c.fsu,
            c.v_agua,
            c.v_diesel_l,
            c.r_entulho,
            c.r_madeira,
            c.r_gesso,
            c.r_classe_c,
            c.r_recic,
            c.r_misto,
            c.r_sucata,
            c.r_perig,
            c.r_solo,
            c.n_cacambas,
            (c.v_diesel_l * c.diesel_fac) AS energia_gerador,
            (COALESCE(c.energia_kwh, (0)::numeric) + (c.v_diesel_l * c.diesel_fac)) AS energia_total,
            (((((((c.r_entulho + c.r_madeira) + c.r_gesso) + c.r_classe_c) + c.r_recic) + c.r_misto) + c.r_sucata) + c.r_perig) AS resid_total,
            ((c.v_diesel_l * c.co2_diesel) + (COALESCE(c.energia_kwh, (0)::numeric) * c.co2_energia)) AS co2_val
           FROM calc c
        )
 SELECT id,
    cost_collector,
    mes_referencia,
    status,
    etapa_obra,
    num_colaboradores,
    area_efetiva AS area_construida_m2,
    v_area_obra AS area_obra_m2,
    v_meta_agua AS meta_agua,
    v_meta_energia AS meta_energia,
    v_meta_residuos AS meta_residuos,
    v_agua AS agua_m3,
    agua_concessionaria_m3,
    agua_pipa_m3,
    COALESCE(energia_kwh, (0)::numeric) AS energia_eletrica_kwh,
    energia_gerador AS energia_gerador_kwh,
    energia_total AS energia_kwh,
    v_diesel_l AS diesel_l,
    r_entulho AS residuo_entulho_m3,
    r_madeira AS residuo_madeira_m3,
    r_gesso AS residuo_gesso_m3,
    r_classe_c AS residuo_classe_c_m3,
    r_misto AS residuo_misto_m3,
    r_perig AS residuo_perigoso_m3,
    r_sucata AS residuo_sucata_m3,
    r_recic AS residuo_reciclavel_m3,
    r_solo AS residuo_solo_m3,
    resid_total AS residuo_total_m3,
        CASE
            WHEN (n_cacambas > (0)::numeric) THEN ((COALESCE(misto_cacamba, (0)::numeric) / n_cacambas) * (100)::numeric)
            ELSE NULL::numeric
        END AS perc_cacamba_mista,
    co2_val AS co2_kg,
        CASE
            WHEN (area_efetiva > (0)::numeric) THEN (v_agua / area_efetiva)
            ELSE NULL::numeric
        END AS ind_agua,
        CASE
            WHEN (area_efetiva > (0)::numeric) THEN (energia_total / area_efetiva)
            ELSE NULL::numeric
        END AS ind_energia,
        CASE
            WHEN (area_efetiva > (0)::numeric) THEN (resid_total / area_efetiva)
            ELSE NULL::numeric
        END AS ind_residuos,
        CASE
            WHEN (area_efetiva > (0)::numeric) THEN (sum(v_agua) OVER w / area_efetiva)
            ELSE NULL::numeric
        END AS ind_agua_acum,
        CASE
            WHEN (area_efetiva > (0)::numeric) THEN (sum(energia_total) OVER w / area_efetiva)
            ELSE NULL::numeric
        END AS ind_energia_acum,
        CASE
            WHEN (area_efetiva > (0)::numeric) THEN (sum(resid_total) OVER w / area_efetiva)
            ELSE NULL::numeric
        END AS ind_residuos_acum,
    sum(co2_val) OVER w AS co2_kg_acum
   FROM calc2
  WINDOW w AS (PARTITION BY cost_collector ORDER BY mes_referencia ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW);

create or replace view vw_grupos_material as  SELECT DISTINCT btrim(g.g) AS nome
   FROM (requests r
     CROSS JOIN LATERAL unnest(string_to_array(r.material_group, ';'::text)) g(g))
  WHERE ((r.material_group IS NOT NULL) AND (btrim(g.g) <> ''::text));

create or replace view vw_creq_sistema as  WITH itens AS (
         SELECT i.id,
            i.obra,
            i.servico,
            regexp_replace(upper(btrim(i.servico)), '\s+'::text, ' '::text, 'g'::text) AS serv_key,
            m.cost_collector
           FROM (creq_itens i
             JOIN creq_obra_marcos m ON ((m.obra = i.obra)))
          WHERE (m.cost_collector IS NOT NULL)
        ), d AS (
         SELECT it.id,
            it.obra,
            it.servico,
            it.cost_collector,
            (EXISTS ( SELECT 1
                   FROM contratos c,
                    LATERAL unnest(string_to_array(c.material_groups, ';'::text)) seg(seg)
                  WHERE ((c.cost_collector = it.cost_collector) AND COALESCE(c.is_active, true) AND (regexp_replace(upper(btrim(seg.seg)), '\s+'::text, ' '::text, 'g'::text) = it.serv_key)))) AS tem_contrato,
            (EXISTS ( SELECT 1
                   FROM pedidos p,
                    LATERAL unnest(string_to_array(p.material_group, ';'::text)) seg(seg)
                  WHERE ((p.cost_collector = it.cost_collector) AND COALESCE(p.is_active, true) AND (regexp_replace(upper(btrim(seg.seg)), '\s+'::text, ' '::text, 'g'::text) = it.serv_key)))) AS tem_pedido,
            (EXISTS ( SELECT 1
                   FROM requests r,
                    LATERAL unnest(string_to_array(r.material_group, ';'::text)) seg(seg)
                  WHERE ((r.cost_collector = it.cost_collector) AND COALESCE(r.is_active, true) AND (r.request_status !~~* '%cancelada%'::text) AND (r.request_status !~~* '%deletad%'::text) AND (regexp_replace(upper(btrim(seg.seg)), '\s+'::text, ' '::text, 'g'::text) = it.serv_key)))) AS tem_requisicao,
            ( SELECT c.sup_corporate_name
                   FROM contratos c,
                    LATERAL unnest(string_to_array(c.material_groups, ';'::text)) seg(seg)
                  WHERE ((c.cost_collector = it.cost_collector) AND COALESCE(c.is_active, true) AND (regexp_replace(upper(btrim(seg.seg)), '\s+'::text, ' '::text, 'g'::text) = it.serv_key))
                  ORDER BY c.released_date DESC NULLS LAST
                 LIMIT 1) AS contrato_forn,
            ( SELECT (min(c.released_date))::date AS min
                   FROM contratos c,
                    LATERAL unnest(string_to_array(c.material_groups, ';'::text)) seg(seg)
                  WHERE ((c.cost_collector = it.cost_collector) AND COALESCE(c.is_active, true) AND (regexp_replace(upper(btrim(seg.seg)), '\s+'::text, ' '::text, 'g'::text) = it.serv_key))) AS contrato_data,
            ( SELECT p.sup_corporate_name
                   FROM pedidos p,
                    LATERAL unnest(string_to_array(p.material_group, ';'::text)) seg(seg)
                  WHERE ((p.cost_collector = it.cost_collector) AND COALESCE(p.is_active, true) AND (regexp_replace(upper(btrim(seg.seg)), '\s+'::text, ' '::text, 'g'::text) = it.serv_key))
                  ORDER BY p.releasing_date DESC NULLS LAST
                 LIMIT 1) AS pedido_forn,
            ( SELECT (min(p.releasing_date))::date AS min
                   FROM pedidos p,
                    LATERAL unnest(string_to_array(p.material_group, ';'::text)) seg(seg)
                  WHERE ((p.cost_collector = it.cost_collector) AND COALESCE(p.is_active, true) AND (regexp_replace(upper(btrim(seg.seg)), '\s+'::text, ' '::text, 'g'::text) = it.serv_key))) AS pedido_data,
            ( SELECT (min(COALESCE(r.release_date_level02, r.changed_when)))::date AS min
                   FROM requests r,
                    LATERAL unnest(string_to_array(r.material_group, ';'::text)) seg(seg)
                  WHERE ((r.cost_collector = it.cost_collector) AND COALESCE(r.is_active, true) AND (r.request_status !~~* '%cancelada%'::text) AND (r.request_status !~~* '%deletad%'::text) AND (regexp_replace(upper(btrim(seg.seg)), '\s+'::text, ' '::text, 'g'::text) = it.serv_key))) AS requisicao_data
           FROM itens it
        )
 SELECT id,
    obra,
    servico,
    cost_collector,
        CASE
            WHEN (tem_contrato OR tem_pedido) THEN 'Contratado'::text
            WHEN tem_requisicao THEN 'Em concorrência'::text
            ELSE NULL::text
        END AS sistema_status,
    COALESCE(contrato_forn, pedido_forn) AS sistema_fornecedor,
    requisicao_data AS sistema_envio_real,
    COALESCE(contrato_data, pedido_data) AS sistema_contratacao_real,
    tem_contrato,
    tem_pedido,
    tem_requisicao
   FROM d;

create materialized view mv_creq_sistema as  WITH itens AS (
         SELECT i.id,
            i.obra,
            i.servico,
            regexp_replace(upper(btrim(i.servico)), '\s+'::text, ' '::text, 'g'::text) AS serv_key,
            m.cost_collector
           FROM (creq_itens i
             JOIN creq_obra_marcos m ON ((m.obra = i.obra)))
          WHERE (m.cost_collector IS NOT NULL)
        ), d AS (
         SELECT it.id,
            it.obra,
            it.servico,
            it.cost_collector,
            (EXISTS ( SELECT 1
                   FROM contratos c,
                    LATERAL unnest(string_to_array(c.material_groups, ';'::text)) seg(seg)
                  WHERE ((c.cost_collector = it.cost_collector) AND COALESCE(c.is_active, true) AND (regexp_replace(upper(btrim(seg.seg)), '\s+'::text, ' '::text, 'g'::text) = it.serv_key)))) AS tem_contrato,
            (EXISTS ( SELECT 1
                   FROM pedidos p,
                    LATERAL unnest(string_to_array(p.material_group, ';'::text)) seg(seg)
                  WHERE ((p.cost_collector = it.cost_collector) AND COALESCE(p.is_active, true) AND (regexp_replace(upper(btrim(seg.seg)), '\s+'::text, ' '::text, 'g'::text) = it.serv_key)))) AS tem_pedido,
            (EXISTS ( SELECT 1
                   FROM requests r,
                    LATERAL unnest(string_to_array(r.material_group, ';'::text)) seg(seg)
                  WHERE ((r.cost_collector = it.cost_collector) AND COALESCE(r.is_active, true) AND (r.request_status !~~* '%cancelada%'::text) AND (r.request_status !~~* '%deletad%'::text) AND (regexp_replace(upper(btrim(seg.seg)), '\s+'::text, ' '::text, 'g'::text) = it.serv_key)))) AS tem_requisicao,
            ( SELECT c.sup_corporate_name
                   FROM contratos c,
                    LATERAL unnest(string_to_array(c.material_groups, ';'::text)) seg(seg)
                  WHERE ((c.cost_collector = it.cost_collector) AND COALESCE(c.is_active, true) AND (regexp_replace(upper(btrim(seg.seg)), '\s+'::text, ' '::text, 'g'::text) = it.serv_key))
                  ORDER BY c.released_date DESC NULLS LAST
                 LIMIT 1) AS contrato_forn,
            ( SELECT (min(c.released_date))::date AS min
                   FROM contratos c,
                    LATERAL unnest(string_to_array(c.material_groups, ';'::text)) seg(seg)
                  WHERE ((c.cost_collector = it.cost_collector) AND COALESCE(c.is_active, true) AND (regexp_replace(upper(btrim(seg.seg)), '\s+'::text, ' '::text, 'g'::text) = it.serv_key))) AS contrato_data,
            ( SELECT p.sup_corporate_name
                   FROM pedidos p,
                    LATERAL unnest(string_to_array(p.material_group, ';'::text)) seg(seg)
                  WHERE ((p.cost_collector = it.cost_collector) AND COALESCE(p.is_active, true) AND (regexp_replace(upper(btrim(seg.seg)), '\s+'::text, ' '::text, 'g'::text) = it.serv_key))
                  ORDER BY p.releasing_date DESC NULLS LAST
                 LIMIT 1) AS pedido_forn,
            ( SELECT (min(p.releasing_date))::date AS min
                   FROM pedidos p,
                    LATERAL unnest(string_to_array(p.material_group, ';'::text)) seg(seg)
                  WHERE ((p.cost_collector = it.cost_collector) AND COALESCE(p.is_active, true) AND (regexp_replace(upper(btrim(seg.seg)), '\s+'::text, ' '::text, 'g'::text) = it.serv_key))) AS pedido_data,
            ( SELECT (min(COALESCE(r.release_date_level02, r.changed_when)))::date AS min
                   FROM requests r,
                    LATERAL unnest(string_to_array(r.material_group, ';'::text)) seg(seg)
                  WHERE ((r.cost_collector = it.cost_collector) AND COALESCE(r.is_active, true) AND (r.request_status !~~* '%cancelada%'::text) AND (r.request_status !~~* '%deletad%'::text) AND (regexp_replace(upper(btrim(seg.seg)), '\s+'::text, ' '::text, 'g'::text) = it.serv_key))) AS requisicao_data
           FROM itens it
        )
 SELECT id,
    obra,
    servico,
    cost_collector,
        CASE
            WHEN (tem_contrato OR tem_pedido) THEN 'Contratado'::text
            WHEN tem_requisicao THEN 'Em concorrência'::text
            ELSE NULL::text
        END AS sistema_status,
    COALESCE(contrato_forn, pedido_forn) AS sistema_fornecedor,
    requisicao_data AS sistema_envio_real,
    COALESCE(contrato_data, pedido_data) AS sistema_contratacao_real,
    tem_contrato,
    tem_pedido,
    tem_requisicao
   FROM d;

create or replace view vw_gestao_obras as  SELECT excel_custo_obra.cost_collector,
    excel_custo_obra.cliente,
    excel_custo_obra.foto_url,
    excel_custo_obra.custo_atual,
    excel_custo_obra.porcentagem,
    excel_custo_obra.status_obra,
    excel_custo_obra.area_construida_m2,
    excel_custo_obra.meta_agua,
    excel_custo_obra.meta_energia,
    excel_custo_obra.meta_residuos
   FROM excel_custo_obra
UNION ALL
 SELECT o.cost_collector,
    NULL::text AS cliente,
    NULL::text AS foto_url,
    NULL::numeric AS custo_atual,
    NULL::numeric AS porcentagem,
    'ATIVA'::obra_status_enum AS status_obra,
    NULL::numeric AS area_construida_m2,
    NULL::numeric AS meta_agua,
    NULL::numeric AS meta_energia,
    NULL::numeric AS meta_residuos
   FROM ( SELECT DISTINCT requests.cost_collector
           FROM requests
          WHERE (requests.cost_collector ~~* 'OBRA %'::text)
        UNION
         SELECT DISTINCT pedidos.cost_collector
           FROM pedidos
          WHERE (pedidos.cost_collector ~~* 'OBRA %'::text)) o
  WHERE (NOT (EXISTS ( SELECT 1
           FROM excel_custo_obra e
          WHERE (e.cost_collector = o.cost_collector))));

create or replace view vw_pedidos_pendencia_responsavel as  SELECT id,
    cost_collector,
    cli_trade_name,
    flag_email_sent_boolean,
    flag_has_contract,
    purchase_order_status,
    purchase_order_number_with_review,
    quoting_negotiator_name,
    quoting_number_formatted,
    purchase_order_type,
    negotiator_issue_date,
    releasing_date,
    email_sent_date,
    key,
    synced_at,
    material_group,
    sup_corporate_name,
    value,
    balance,
    number_of_contracts,
    precisa_minuta,
    COALESCE(( SELECT array_agg(DISTINCT u.name ORDER BY u.name) AS array_agg
           FROM (((unnest(string_to_array(v.material_group, ';'::text)) grupo(grupo)
             JOIN excel_responsaveis_contratacao r ON ((upper(TRIM(BOTH FROM r.familia)) = upper(TRIM(BOTH FROM grupo.grupo)))))
             CROSS JOIN LATERAL unnest(string_to_array(COALESCE(r.responsaveis_padronizado, ''::text), ';'::text)) rn(nome))
             JOIN usuarios u ON (((upper(TRIM(BOTH FROM u.name)) = upper(TRIM(BOTH FROM rn.nome))) AND (u.ativo = true))))), ARRAY[]::text[]) AS responsaveis_resolvidos,
    (EXISTS ( SELECT 1
           FROM (((unnest(string_to_array(v.material_group, ';'::text)) grupo(grupo)
             JOIN excel_responsaveis_contratacao r ON ((upper(TRIM(BOTH FROM r.familia)) = upper(TRIM(BOTH FROM grupo.grupo)))))
             CROSS JOIN LATERAL unnest(string_to_array(COALESCE(r.responsaveis_padronizado, ''::text), ';'::text)) rn(nome))
             LEFT JOIN usuarios u ON (((upper(TRIM(BOTH FROM u.name)) = upper(TRIM(BOTH FROM rn.nome))) AND (u.ativo = true))))
          WHERE ((TRIM(BOTH FROM rn.nome) <> ''::text) AND (u.id IS NULL)))) AS tem_responsavel_invalido
   FROM vw_pedidos_com_minuta_flag v;

create or replace view vw_ranking_obras_tipo as  SELECT cost_collector AS obra,
    round(sum(
        CASE
            WHEN (purchase_order_type = 'Cotação'::text) THEN value
            ELSE (0)::numeric
        END), 2) AS sup,
    round(sum(
        CASE
            WHEN (purchase_order_type = 'Pedido Consumo'::text) THEN value
            ELSE (0)::numeric
        END), 2) AS pd,
    round(sum(
        CASE
            WHEN (purchase_order_type ~~* '%Consumo%Corp%'::text) THEN value
            ELSE (0)::numeric
        END), 2) AS ap,
    round(sum(
        CASE
            WHEN ((purchase_order_type = ANY (ARRAY['Cotação'::text, 'Pedido Consumo'::text])) OR (purchase_order_type ~~* '%Consumo%Corp%'::text)) THEN value
            ELSE (0)::numeric
        END), 2) AS total_3tipos
   FROM vw_pedidos_ultima_revisao
  WHERE ((cost_collector IS NOT NULL) AND ((purchase_order_status ~~ 'Aprovado%'::text) OR (purchase_order_status ~~* '%Aguardando%'::text)) AND (cost_collector !~~* '%escritório atlas%'::text) AND (cost_collector !~~* '%escritorio atlas%'::text) AND (cost_collector !~~* '%acordo de preço%'::text) AND (cost_collector !~~* '%acordo de preco%'::text) AND (cost_collector !~~* '%custos indiretos%'::text) AND (cost_collector !~~* '%indiretos custo atlas%'::text) AND (cost_collector !~~* '%indiretos obras atlas%'::text) AND (cost_collector !~~* '%projetos%'::text) AND (cost_collector !~~* '%pré obra%'::text) AND (cost_collector !~~* '%pre obra%'::text) AND (cost_collector !~~* '%pré-obra%'::text) AND (cost_collector !~~* '%pre-obra%'::text))
  GROUP BY cost_collector
 HAVING (sum(
        CASE
            WHEN ((purchase_order_type = ANY (ARRAY['Cotação'::text, 'Pedido Consumo'::text])) OR (purchase_order_type ~~* '%Consumo%Corp%'::text)) THEN value
            ELSE (0)::numeric
        END) > (0)::numeric)
  ORDER BY (round(sum(
        CASE
            WHEN ((purchase_order_type = ANY (ARRAY['Cotação'::text, 'Pedido Consumo'::text])) OR (purchase_order_type ~~* '%Consumo%Corp%'::text)) THEN value
            ELSE (0)::numeric
        END), 2)) DESC;

create or replace view vw_percentual_contratado as  SELECT eco.cost_collector,
    eco.custo_atual,
    COALESCE(sum(p.value), (0)::numeric) AS total_contratado,
    LEAST((100)::numeric, round(((COALESCE(sum(p.value), (0)::numeric) / NULLIF(eco.custo_atual, (0)::numeric)) * (100)::numeric), 2)) AS percentual_contratado
   FROM (excel_custo_obra eco
     LEFT JOIN vw_pedidos_ultima_revisao p ON (((upper(btrim(p.cost_collector)) = upper(btrim(eco.cost_collector))) AND ((p.purchase_order_status ~~ 'Aprovado%'::text) OR (p.purchase_order_status ~~* '%Aguardando%'::text)) AND (p.cost_collector !~~* '%escritório atlas%'::text) AND (p.cost_collector !~~* '%escritorio atlas%'::text) AND (p.cost_collector !~~* '%acordo de preço%'::text) AND (p.cost_collector !~~* '%acordo de preco%'::text) AND (p.cost_collector !~~* '%custos indiretos%'::text) AND (p.cost_collector !~~* '%indiretos custo atlas%'::text) AND (p.cost_collector !~~* '%indiretos obras atlas%'::text) AND (p.cost_collector !~~* '%projetos%'::text) AND (p.cost_collector !~~* '%pré obra%'::text) AND (p.cost_collector !~~* '%pre obra%'::text) AND (p.cost_collector !~~* '%pré-obra%'::text) AND (p.cost_collector !~~* '%pre-obra%'::text))))
  WHERE ((eco.custo_atual IS NOT NULL) AND (eco.status_obra = 'ATIVA'::obra_status_enum))
  GROUP BY eco.cost_collector, eco.custo_atual;

create or replace view vw_global_pedidos_ultima_revisao as  WITH ranked AS (
         SELECT g.id,
            g.cost_collector,
            g.cli_trade_name,
            g.flag_email_sent_boolean,
            g.flag_has_contract,
            g.purchase_order_status,
            g.purchase_order_number_with_review,
            g.quoting_negotiator_name,
            g.quoting_number_formatted,
            g.purchase_order_type,
            g.negotiator_issue_date,
            g.releasing_date,
            g.email_sent_date,
            g.key,
            g.synced_at,
            g.material_group,
            g.sup_corporate_name,
            g.value,
            g.balance,
            g.number_of_contracts,
            g.is_active,
            split_part(g.purchase_order_number_with_review, '-'::text, 1) AS po_base,
            split_part(g.purchase_order_number_with_review, '-'::text, 2) AS po_rev,
            max(split_part(g.purchase_order_number_with_review, '-'::text, 2)) OVER (PARTITION BY (split_part(g.purchase_order_number_with_review, '-'::text, 1)), g.cost_collector) AS po_rev_max
           FROM vw_global_pedidos g
          WHERE (g.is_active = true)
        )
 SELECT id,
    cost_collector,
    cli_trade_name,
    flag_email_sent_boolean,
    flag_has_contract,
    purchase_order_status,
    purchase_order_number_with_review,
    quoting_negotiator_name,
    quoting_number_formatted,
    purchase_order_type,
    negotiator_issue_date,
    releasing_date,
    email_sent_date,
    key,
    synced_at,
    material_group,
    sup_corporate_name,
    value,
    balance,
    number_of_contracts,
    is_active,
    po_base,
    po_rev,
    po_rev_max
   FROM ranked
  WHERE (po_rev = po_rev_max);

create or replace view vw_avaliacao_grupo as  SELECT a.id,
    a.month_and_year_formatted,
    a.supplier_corporate_name,
    a.general_rating,
    a.general_rate_sum,
    a.quality_supply_type,
    a.observation,
    a.cost_collector,
    a.created_by_name,
    a.purchase_order_number_formatted,
    a.purchase_order_number_with_review_formatted,
    a.purchase_order_review_formatted,
    a.issue_date,
    a.key,
    a.synced_at,
    a.is_active,
    p.material_group
   FROM (vw_global_avaliacao_fornecedores a
     LEFT JOIN vw_global_pedidos p ON (((p.purchase_order_number_with_review = a.purchase_order_number_with_review_formatted) AND (p.cost_collector = a.cost_collector))));

create or replace view vw_creq as  SELECT i.id,
    i.obra,
    i.servico,
    f.familia,
    f.responsavel,
    f.gerente,
    pr.matriz,
    pr.vinculo,
    pr.criterio,
    cc.prazo_aquisicao,
    cc.meses_pacote,
    cc.grau_dificuldade,
    cc.qtde_contratacoes_ano,
    m.tipo AS obra_tipo,
    COALESCE(m.personalizada, false) AS personalizada,
    v1.marco_data,
    v2.data_prev,
    v3.envio AS envio_solicitacao,
    v4.contratacao AS mes_contratacao,
        CASE
            WHEN (i.farol_manual IS NOT NULL) THEN i.farol_manual
            WHEN (i.status ~~* '%não se aplica%'::text) THEN NULL::integer
            WHEN (i.status ~~* 'contratado%'::text) THEN 1
            WHEN (v3.envio IS NULL) THEN NULL::integer
            WHEN (v3.envio > (CURRENT_DATE + 30)) THEN '-2'::integer
            WHEN (v3.envio < CURRENT_DATE) THEN '-1'::integer
            ELSE 0
        END AS farol_envio,
        CASE
            WHEN (i.farol_manual IS NOT NULL) THEN i.farol_manual
            WHEN (i.status ~~* '%não se aplica%'::text) THEN NULL::integer
            WHEN (i.status ~~* 'contratado%'::text) THEN 1
            WHEN (v4.contratacao IS NULL) THEN NULL::integer
            WHEN (v4.contratacao > (CURRENT_DATE + 30)) THEN '-2'::integer
            WHEN (v4.contratacao < CURRENT_DATE) THEN '-1'::integer
            ELSE 0
        END AS farol_contratacao,
    i.status,
    i.fornecedor,
    i.observacao,
    i.envio_manual,
    i.contratacao_manual,
    i.farol_manual,
    i.updated_at,
    i.updated_by,
        CASE
            WHEN ((NULLIF(btrim(COALESCE(i.status, ''::text)), '-'::text) IS NOT NULL) AND (btrim(COALESCE(i.status, ''::text)) <> ''::text)) THEN i.status
            ELSE s.sistema_status
        END AS status_efetivo,
        CASE
            WHEN ((NULLIF(btrim(COALESCE(i.status, ''::text)), '-'::text) IS NOT NULL) AND (btrim(COALESCE(i.status, ''::text)) <> ''::text)) THEN 'manual'::text
            WHEN (s.sistema_status IS NOT NULL) THEN 'sistema'::text
            ELSE NULL::text
        END AS status_origem,
    NULLIF(btrim(COALESCE(i.fornecedor, ''::text)), '-'::text) AS fornecedor_efetivo,
        CASE
            WHEN ((NULLIF(btrim(COALESCE(i.fornecedor, ''::text)), '-'::text) IS NOT NULL) AND (btrim(COALESCE(i.fornecedor, ''::text)) <> ''::text)) THEN 'manual'::text
            ELSE NULL::text
        END AS fornecedor_origem,
    s.sistema_status,
    s.sistema_fornecedor,
    s.sistema_envio_real,
    s.sistema_contratacao_real,
        CASE
            WHEN ((s.sistema_envio_real IS NULL) OR (v3.envio IS NULL)) THEN NULL::integer
            WHEN (s.sistema_envio_real <= v3.envio) THEN 1
            ELSE '-1'::integer
        END AS aderencia_envio,
        CASE
            WHEN ((s.sistema_contratacao_real IS NULL) OR (v4.contratacao IS NULL)) THEN NULL::integer
            WHEN (s.sistema_contratacao_real <= v4.contratacao) THEN 1
            ELSE '-1'::integer
        END AS aderencia_contratacao,
    i.inicio_servico_manual AS inicio_servico,
    COALESCE(i.envio_concorrencia_manual, v6.envio_concorrencia_auto) AS envio_concorrencia,
    i.valor_contratacao,
    i.verba_corrigida,
    i.inicio_servico_manual,
    i.envio_concorrencia_manual,
    s.cost_collector AS sistema_cost_collector,
    COALESCE(s.tem_contrato, false) AS sistema_tem_contrato,
    COALESCE(s.tem_pedido, false) AS sistema_tem_pedido,
    COALESCE(s.tem_requisicao, false) AS sistema_tem_requisicao,
    eco.cliente,
    ( SELECT count(*) AS count
           FROM creq_comentarios cm
          WHERE ((cm.obra = i.obra) AND (cm.servico = i.servico))) AS n_comentarios
   FROM ((((((((((((creq_itens i
     LEFT JOIN creq_obra_marcos m ON ((m.obra = i.obra)))
     LEFT JOIN excel_custo_obra eco ON ((eco.cost_collector = m.cost_collector)))
     LEFT JOIN creq_premissas pr ON (((pr.servico = i.servico) AND (pr.padrao = COALESCE(m.padrao_creq, 'Atlas'::text)))))
     LEFT JOIN creq_criterios_contratacao cc ON ((cc.servico = i.servico)))
     LEFT JOIN creq_familias f ON ((f.servico = i.servico)))
     LEFT JOIN mv_creq_sistema s ON ((s.id = i.id)))
     CROSS JOIN LATERAL ( SELECT
                CASE pr.vinculo
                    WHEN 'Início da obra'::text THEN m.inicio_obra
                    WHEN 'Início da estrutura'::text THEN m.inicio_estrutura
                    WHEN 'Término da estrutura'::text THEN m.termino_estrutura
                    WHEN 'Término do emboço'::text THEN m.termino_emboco
                    WHEN 'Término da obra'::text THEN m.termino_obra
                    ELSE NULL::date
                END AS marco_data) v1)
     CROSS JOIN LATERAL ( SELECT
                CASE
                    WHEN ((pr.criterio IS NULL) OR (v1.marco_data IS NULL)) THEN NULL::date
                    ELSE ((v1.marco_data + ((pr.criterio || ' days'::text))::interval))::date
                END AS data_prev) v2)
     CROSS JOIN LATERAL ( SELECT COALESCE(i.envio_manual, creq_snap_mes(v2.data_prev, cc.meses_pacote)) AS envio) v3)
     CROSS JOIN LATERAL ( SELECT COALESCE(i.contratacao_manual,
                CASE
                    WHEN (v3.envio IS NULL) THEN NULL::date
                    ELSE ((v3.envio + ((COALESCE(cc.prazo_aquisicao, 0) || ' days'::text))::interval))::date
                END) AS contratacao) v4)
     CROSS JOIN LATERAL ( SELECT
                CASE
                    WHEN (COALESCE(cc.prazo_mobilizacao, 60) < 60) THEN (60 + COALESCE(cc.prazo_aprovacao_cliente, 15))
                    ELSE (COALESCE(cc.prazo_mobilizacao, 60) + COALESCE(cc.prazo_aprovacao_cliente, 15))
                END AS antecipacao) v5)
     CROSS JOIN LATERAL ( SELECT
                CASE
                    WHEN (i.inicio_servico_manual IS NULL) THEN NULL::date
                    ELSE ((i.inicio_servico_manual - ((v5.antecipacao || ' days'::text))::interval))::date
                END AS envio_concorrencia_auto) v6);

CREATE INDEX idx_avaliacao_active ON bs.avaliacao_fornecedores USING btree (is_active) WHERE (is_active = true);

CREATE INDEX idx_avaliacao_cost_collector ON bs.avaliacao_fornecedores USING btree (cost_collector);

CREATE INDEX idx_avaliacao_is_active ON bs.avaliacao_fornecedores USING btree (is_active);

CREATE INDEX idx_avaliacao_month ON bs.avaliacao_fornecedores USING btree (month_and_year_formatted);

CREATE INDEX idx_avaliacao_rating ON bs.avaliacao_fornecedores USING btree (general_rating);

CREATE INDEX idx_avaliacao_supplier ON bs.avaliacao_fornecedores USING btree (supplier_corporate_name);

CREATE INDEX idx_contratos_active ON bs.contratos USING btree (is_active) WHERE (is_active = true);

CREATE INDEX idx_contratos_cost_collector ON bs.contratos USING btree (cost_collector);

CREATE INDEX idx_contratos_created_by ON bs.contratos USING btree (created_by_name);

CREATE INDEX idx_contratos_is_active ON bs.contratos USING btree (is_active);

CREATE INDEX idx_contratos_key ON bs.contratos USING btree (key);

CREATE INDEX idx_contratos_status ON bs.contratos USING btree (purchase_order_contract_status);

CREATE INDEX idx_creq_coment_item ON bs.creq_comentarios USING btree (obra, servico, created_at DESC);

CREATE INDEX idx_creq_itens_obra ON bs.creq_itens USING btree (obra);

CREATE INDEX idx_excel_familias_familia ON bs.excel_familias USING btree (familia);

CREATE INDEX idx_excel_familias_prisma_nome ON bs.excel_familias_prisma USING btree (familia_prisma);

CREATE INDEX idx_excel_familias_responsavel ON bs.excel_familias USING btree (comprador_responsavel);

CREATE INDEX idx_excel_insumos_codigo ON bs.excel_insumos_prisma USING btree (codigo);

CREATE INDEX idx_excel_insumos_mat_grp ON bs.excel_insumos_prisma USING btree (mat_grp);

CREATE INDEX idx_excel_insumos_status ON bs.excel_insumos_prisma USING btree (status);

CREATE INDEX idx_excel_responsaveis_familia ON bs.excel_responsaveis_contratacao USING btree (familia);

CREATE INDEX idx_excel_responsaveis_responsavel ON bs.excel_responsaveis_contratacao USING btree (responsavel);

CREATE INDEX idx_excel_sla_familias_grupo ON bs.excel_sla_familias USING btree (grupo_material);

CREATE INDEX idx_ferias_substituto ON bs.usuario_ferias_substitutos USING btree (substituto_id);

CREATE INDEX idx_ferias_usuario ON bs.usuario_ferias_substitutos USING btree (usuario_ferias);

CREATE INDEX idx_ind_valores_data ON bs.indicadores_valores USING btree (data_ref);

CREATE INDEX idx_logs_ingestao_acao ON bs.logs_ingestao USING btree (acao);

CREATE INDEX idx_pedidos_active ON bs.pedidos USING btree (is_active) WHERE (is_active = true);

CREATE INDEX idx_pedidos_cost_collector ON bs.pedidos USING btree (cost_collector);

CREATE INDEX idx_pedidos_flag_formalizado ON bs.pedidos_flag_manual USING btree (formalizado) WHERE (formalizado = true);

CREATE INDEX idx_pedidos_is_active ON bs.pedidos USING btree (is_active);

CREATE INDEX idx_pedidos_key ON bs.pedidos USING btree (key);

CREATE INDEX idx_pedidos_material_group ON bs.pedidos USING btree (material_group);

CREATE INDEX idx_pedidos_negotiator ON bs.pedidos USING btree (quoting_negotiator_name);

CREATE INDEX idx_pedidos_purchase_order_id ON bs.pedidos USING btree (purchase_order_id);

CREATE INDEX idx_pedidos_status ON bs.pedidos USING btree (purchase_order_status);

CREATE INDEX idx_pedidos_supplier ON bs.pedidos USING btree (sup_corporate_name);

CREATE INDEX idx_requests_active ON bs.requests USING btree (is_active) WHERE (is_active = true);

CREATE INDEX idx_requests_changed ON bs.requests USING btree (changed_when);

CREATE INDEX idx_requests_cost_collector ON bs.requests USING btree (cost_collector);

CREATE INDEX idx_requests_is_active ON bs.requests USING btree (is_active);

CREATE INDEX idx_requests_key ON bs.requests USING btree (key);

CREATE INDEX idx_requests_material_group ON bs.requests USING btree (material_group);

CREATE INDEX idx_requests_negotiator ON bs.requests USING btree (negotiator_name);

CREATE INDEX idx_requests_status ON bs.requests USING btree (request_status);

CREATE INDEX idx_usuario_obras_usuario ON bs.usuario_obras USING btree (usuario_id);

CREATE INDEX idx_usuario_paginas_usuario ON bs.usuario_paginas USING btree (usuario_id);

CREATE INDEX ix_sustentabilidade_mes ON bs.excel_indicadores_sustentabilidade USING btree (mes_referencia);

CREATE INDEX ix_sustentabilidade_status ON bs.excel_indicadores_sustentabilidade USING btree (status);

CREATE UNIQUE INDEX mv_creq_sistema_id ON bs.mv_creq_sistema USING btree (id);

CREATE UNIQUE INDEX ux_excel_custo_obra_email ON bs.excel_custo_obra USING btree (lower(email_obra)) WHERE (email_obra IS NOT NULL);

CREATE UNIQUE INDEX ux_sustentabilidade_obra_mes ON bs.excel_indicadores_sustentabilidade USING btree (cost_collector, mes_referencia);

CREATE TRIGGER trg_avaliacao_fornecedores_synced_at BEFORE INSERT OR UPDATE ON bs.avaliacao_fornecedores FOR EACH ROW EXECUTE FUNCTION update_synced_at();

CREATE TRIGGER trg_contratos_synced_at BEFORE INSERT OR UPDATE ON bs.contratos FOR EACH ROW EXECUTE FUNCTION update_synced_at();

CREATE TRIGGER trg_cotacoes_synced_at BEFORE INSERT OR UPDATE ON bs.cotacoes FOR EACH ROW EXECUTE FUNCTION update_synced_at();

CREATE TRIGGER trg_creq_itens_guard BEFORE INSERT OR UPDATE ON bs.creq_itens FOR EACH ROW EXECUTE FUNCTION creq_itens_guard();

CREATE TRIGGER trg_excel_familias_updated_at BEFORE INSERT OR UPDATE ON bs.excel_familias FOR EACH ROW EXECUTE FUNCTION update_excel_updated_at();

CREATE TRIGGER trg_excel_familias_prisma_updated_at BEFORE INSERT OR UPDATE ON bs.excel_familias_prisma FOR EACH ROW EXECUTE FUNCTION update_excel_updated_at();

CREATE TRIGGER trg_sustentabilidade_versionar BEFORE UPDATE ON bs.excel_indicadores_sustentabilidade FOR EACH ROW EXECUTE FUNCTION fn_sustentabilidade_versionar();

CREATE TRIGGER trg_excel_insumos_prisma_updated_at BEFORE INSERT OR UPDATE ON bs.excel_insumos_prisma FOR EACH ROW EXECUTE FUNCTION update_excel_updated_at();

CREATE TRIGGER trg_excel_responsaveis_updated_at BEFORE INSERT OR UPDATE ON bs.excel_responsaveis_contratacao FOR EACH ROW EXECUTE FUNCTION update_excel_updated_at();

CREATE TRIGGER trg_excel_sla_familias_updated_at BEFORE INSERT OR UPDATE ON bs.excel_sla_familias FOR EACH ROW EXECUTE FUNCTION update_excel_updated_at();

CREATE TRIGGER trg_pedidos_synced_at BEFORE INSERT OR UPDATE ON bs.pedidos FOR EACH ROW EXECUTE FUNCTION update_synced_at();

CREATE TRIGGER trg_requests_synced_at BEFORE INSERT OR UPDATE ON bs.requests FOR EACH ROW EXECUTE FUNCTION update_synced_at();

alter table avaliacao_fornecedores enable row level security;

alter table contrato_vigencia_ok enable row level security;

alter table contratos enable row level security;

alter table contratos_flag_manual enable row level security;

alter table cotacoes enable row level security;

alter table creq_comentarios enable row level security;

alter table creq_criterios_contratacao enable row level security;

alter table creq_familias enable row level security;

alter table creq_itens enable row level security;

alter table creq_obra_marcos enable row level security;

alter table creq_premissas enable row level security;

alter table cron_config enable row level security;

alter table excel_custo_obra enable row level security;

alter table excel_familias enable row level security;

alter table excel_familias_prisma enable row level security;

alter table excel_indicadores_sustentabilidade enable row level security;

alter table excel_indicadores_sustentabilidade_historico enable row level security;

alter table excel_insumos_prisma enable row level security;

alter table excel_responsaveis_contratacao enable row level security;

alter table excel_sla_familias enable row level security;

alter table indicadores_def enable row level security;

alter table indicadores_valores enable row level security;

alter table logs_ingestao enable row level security;

alter table pedidos enable row level security;

alter table pedidos_flag_manual enable row level security;

alter table requests enable row level security;

alter table sustentabilidade_fatores_obra enable row level security;

alter table sustentabilidade_parametros enable row level security;

alter table sync_state enable row level security;

alter table usuario_ferias_substitutos enable row level security;

alter table usuario_obras enable row level security;

alter table usuario_paginas enable row level security;

alter table usuarios enable row level security;

create policy rls_avaliacao_fornecedores_por_nivel on bs.avaliacao_fornecedores as PERMISSIVE for SELECT to public using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.ativo = true) AND (u.nivel <= 4)))));

create policy rls_bloquear_escritorio_avaliacao on bs.avaliacao_fornecedores as RESTRICTIVE for SELECT to public using (((get_my_nivel() <= 1) OR (cost_collector !~~* '%ESCRITÓRIO Atlas%'::text) OR (cost_collector IS NULL)));

create policy vigencia_autenticados on bs.contrato_vigencia_ok as PERMISSIVE for ALL to public using ((auth.role() = 'authenticated'::text));

create policy rls_contratos_por_nivel on bs.contratos as PERMISSIVE for SELECT to public using (((get_my_nivel() <= 2) OR (get_my_nivel() = 4) OR ((get_my_nivel() = 3) AND ((created_by_name = get_my_name()) OR (created_by_name = ANY (get_my_substituidos()))))));

create policy rls_bloquear_escritorio_contratos on bs.contratos as RESTRICTIVE for SELECT to public using (((get_my_nivel() <= 1) OR (cost_collector !~~* '%ESCRITÓRIO Atlas%'::text) OR (cost_collector IS NULL)));

create policy contratos_flag_manual_select on bs.contratos_flag_manual as PERMISSIVE for SELECT to public using ((auth.uid() IS NOT NULL));

create policy contratos_flag_manual_admin_gestor on bs.contratos_flag_manual as PERMISSIVE for ALL to public using ((get_my_nivel() <= 2)) with check ((get_my_nivel() <= 2));

create policy rls_cotacoes_por_nivel on bs.cotacoes as PERMISSIVE for SELECT to public using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.ativo = true) AND (u.nivel <= 4)))));

create policy creq_coment_del on bs.creq_comentarios as PERMISSIVE for DELETE to authenticated using ((get_my_nivel() <= 2));

create policy creq_coment_ins on bs.creq_comentarios as PERMISSIVE for INSERT to authenticated with check (true);

create policy creq_coment_sel on bs.creq_comentarios as PERMISSIVE for SELECT to authenticated using (true);

create policy creq_crit_sel on bs.creq_criterios_contratacao as PERMISSIVE for SELECT to authenticated using (true);

create policy creq_crit_wr on bs.creq_criterios_contratacao as PERMISSIVE for ALL to authenticated using ((get_my_nivel() <= 1)) with check ((get_my_nivel() <= 1));

create policy creq_fam_wr on bs.creq_familias as PERMISSIVE for ALL to authenticated using ((get_my_nivel() <= 1)) with check ((get_my_nivel() <= 1));

create policy creq_fam_sel on bs.creq_familias as PERMISSIVE for SELECT to authenticated using (true);

create policy creq_itens_wr on bs.creq_itens as PERMISSIVE for ALL to authenticated using (true) with check (true);

create policy creq_itens_sel on bs.creq_itens as PERMISSIVE for SELECT to authenticated using (true);

create policy creq_marcos_wr on bs.creq_obra_marcos as PERMISSIVE for ALL to authenticated using ((get_my_nivel() <= 2)) with check ((get_my_nivel() <= 2));

create policy creq_marcos_sel on bs.creq_obra_marcos as PERMISSIVE for SELECT to authenticated using (true);

create policy creq_prem_sel on bs.creq_premissas as PERMISSIVE for SELECT to authenticated using (true);

create policy creq_prem_wr on bs.creq_premissas as PERMISSIVE for ALL to authenticated using ((get_my_nivel() <= 1)) with check ((get_my_nivel() <= 1));

create policy excel_custo_obra_admin_gestor on bs.excel_custo_obra as PERMISSIVE for ALL to public using ((get_my_nivel() <= 2)) with check ((get_my_nivel() <= 2));

create policy excel_custo_obra_leitura on bs.excel_custo_obra as PERMISSIVE for SELECT to public using ((auth.uid() IS NOT NULL));

create policy excel_familias_admin_gestor on bs.excel_familias as PERMISSIVE for ALL to public using ((get_my_nivel() <= 2));

create policy excel_familias_prisma_admin_gestor on bs.excel_familias_prisma as PERMISSIVE for ALL to public using ((get_my_nivel() <= 2));

create policy leitura_autenticados on bs.excel_indicadores_sustentabilidade as PERMISSIVE for SELECT to authenticated using (true);

create policy leitura_autenticados_hist on bs.excel_indicadores_sustentabilidade_historico as PERMISSIVE for SELECT to authenticated using (true);

create policy excel_insumos_prisma_admin_gestor on bs.excel_insumos_prisma as PERMISSIVE for ALL to public using ((get_my_nivel() <= 2));

create policy excel_responsaveis_contratacao_admin on bs.excel_responsaveis_contratacao as PERMISSIVE for ALL to public using ((get_my_nivel() <= 1)) with check ((get_my_nivel() <= 1));

create policy excel_sla_familias_admin_gestor on bs.excel_sla_familias as PERMISSIVE for ALL to public using ((get_my_nivel() <= 2));

create policy ind_def_select on bs.indicadores_def as PERMISSIVE for SELECT to authenticated using (true);

create policy ind_def_write on bs.indicadores_def as PERMISSIVE for ALL to authenticated using ((get_my_nivel() <= 1)) with check ((get_my_nivel() <= 1));

create policy ind_val_select on bs.indicadores_valores as PERMISSIVE for SELECT to authenticated using (true);

create policy ind_val_write on bs.indicadores_valores as PERMISSIVE for ALL to authenticated using ((get_my_nivel() <= 1)) with check ((get_my_nivel() <= 1));

create policy logs_ingestao_select_admin_root on bs.logs_ingestao as PERMISSIVE for SELECT to public using (fn_is_admin_root());

create policy rls_bloquear_escritorio_pedidos on bs.pedidos as RESTRICTIVE for SELECT to public using (((get_my_nivel() <= 1) OR (cost_collector !~~* '%ESCRITÓRIO Atlas%'::text) OR (cost_collector IS NULL)));

create policy rls_pedidos_por_nivel on bs.pedidos as PERMISSIVE for SELECT to public using (((get_my_nivel() <= 2) OR ((get_my_nivel() = 3) AND ((quoting_negotiator_name = get_my_name()) OR (quoting_negotiator_name = ANY (get_my_substituidos()))))));

create policy pedidos_flag_manual_write_autenticado on bs.pedidos_flag_manual as PERMISSIVE for ALL to authenticated using ((auth.uid() IS NOT NULL)) with check ((auth.uid() IS NOT NULL));

create policy pedidos_flag_manual_select on bs.pedidos_flag_manual as PERMISSIVE for SELECT to public using ((auth.uid() IS NOT NULL));

create policy rls_bloquear_escritorio_requests on bs.requests as RESTRICTIVE for SELECT to public using (((get_my_nivel() <= 1) OR (cost_collector !~~* '%ESCRITÓRIO Atlas%'::text) OR (cost_collector IS NULL)));

create policy rls_requests_por_nivel on bs.requests as PERMISSIVE for SELECT to public using (((get_my_nivel() <= 2) OR (get_my_nivel() = 4) OR ((get_my_nivel() = 3) AND ((negotiator_name IS NULL) OR (negotiator_name = ''::text) OR (negotiator_name = get_my_name()) OR (negotiator_name = ANY (get_my_substituidos()))))));

create policy sfo_autenticado_all on bs.sustentabilidade_fatores_obra as PERMISSIVE for ALL to authenticated using (true) with check (true);

create policy leitura_autenticados on bs.sustentabilidade_parametros as PERMISSIVE for SELECT to authenticated using (true);

create policy sync_state_read_admin on bs.sync_state as PERMISSIVE for SELECT to authenticated using ((get_my_nivel() <= 1));

create policy ferias_root_admin_gerencia on bs.usuario_ferias_substitutos as PERMISSIVE for ALL to public using ((get_my_nivel() <= 1));

create policy ferias_substituto_le_proprios on bs.usuario_ferias_substitutos as PERMISSIVE for SELECT to public using ((substituto_id = auth.uid()));

create policy obras_usuario_le_proprias on bs.usuario_obras as PERMISSIVE for SELECT to public using ((usuario_id = auth.uid()));

create policy obras_root_admin_gerencia on bs.usuario_obras as PERMISSIVE for ALL to public using ((get_my_nivel() <= 1));

create policy paginas_usuario_le_proprias on bs.usuario_paginas as PERMISSIVE for SELECT to public using ((usuario_id = auth.uid()));

create policy paginas_root_admin_gerencia on bs.usuario_paginas as PERMISSIVE for ALL to public using ((get_my_nivel() <= 1));

create policy rls_usuarios_admin_escreve on bs.usuarios as PERMISSIVE for ALL to public using (((get_my_nivel() = 1) AND (nivel > 0)));

create policy rls_usuarios_gestor_le_todos on bs.usuarios as PERMISSIVE for SELECT to public using ((get_my_nivel() = 2));

create policy rls_usuarios_root_admin_le_todos on bs.usuarios as PERMISSIVE for SELECT to public using ((get_my_nivel() <= 1));

create policy rls_usuarios_root_escreve on bs.usuarios as PERMISSIVE for ALL to public using ((get_my_nivel() = 0));

create policy rls_usuarios_atualiza_proprio_must_change on bs.usuarios as PERMISSIVE for UPDATE to public using ((auth.uid() = id)) with check ((auth.uid() = id));

create policy rls_usuarios_le_proprio on bs.usuarios as PERMISSIVE for SELECT to public using (((get_my_nivel() >= 3) AND (auth.uid() = id)));


-- ===================== peças do Supabase
grant select, insert, update, delete on all tables in schema bs to anon, authenticated, service_role;
grant usage, select on all sequences in schema bs to anon, authenticated, service_role;
grant execute on all functions in schema bs to anon, authenticated, service_role;
alter default privileges in schema bs grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema bs grant usage, select on sequences to anon, authenticated, service_role;
alter default privileges in schema bs grant execute on functions to anon, authenticated, service_role;


insert into storage.buckets (id, name, public) values ('bs-fotos-obras', 'bs-fotos-obras', true) on conflict (id) do nothing;

insert into storage.buckets (id, name, public) values ('bs-anexos-sustentabilidade', 'bs-anexos-sustentabilidade', true) on conflict (id) do nothing;
