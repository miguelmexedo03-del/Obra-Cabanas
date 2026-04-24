-- ============================================================
-- Obra Cabanas — Schema inicial
-- ============================================================
-- Este ficheiro cria todo o schema da app.
-- Correr via `supabase db reset` (desenvolvimento) ou
-- `supabase migration up` (produção).
-- ============================================================

-- ------------------------------------------------------------
-- EXTENSIONS
-- ------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- para pesquisa full-text fuzzy

-- ------------------------------------------------------------
-- ENUMS
-- ------------------------------------------------------------
create type user_role as enum ('admin', 'encarregado', 'operario');
create type tarefa_status as enum ('por_fazer', 'em_curso', 'bloqueado', 'concluido');
create type audit_action as enum ('insert', 'update', 'delete');

-- ------------------------------------------------------------
-- TABLE: profiles
-- Extende auth.users do Supabase
-- ------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nome text not null,
  role user_role not null default 'operario',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger: auto-criar profile quando um user se regista
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, nome, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    'operario'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- TABLE: fases
-- ------------------------------------------------------------
create table fases (
  id smallint primary key,
  nome text not null unique,
  ordem smallint not null unique,
  cor_hex text not null,
  duracao_dias_default smallint not null default 10
);

insert into fases (id, nome, ordem, cor_hex, duracao_dias_default) values
  (1, 'Tetos', 1, '#4F81BD', 10),
  (2, 'Paredes', 2, '#E7A33B', 12),
  (3, 'Carpintaria', 3, '#9BBB59', 8),
  (4, 'Chão e Rodapé', 4, '#C0504D', 6),
  (5, 'WC Equipamentos', 5, '#8064A2', 4);

-- ------------------------------------------------------------
-- TABLE: apartamentos
-- ------------------------------------------------------------
create table apartamentos (
  id smallint primary key,
  codigo text not null unique,  -- 'AP1', 'AP2', ...
  descricao text,
  created_at timestamptz not null default now()
);

-- Seed de 24 apartamentos
insert into apartamentos (id, codigo, descricao)
select n, 'AP' || n, 'Apartamento ' || n
from generate_series(1, 24) as n;

-- ------------------------------------------------------------
-- TABLE: apartamento_operario
-- Atribuição de operários a apartamentos (many-to-many)
-- ------------------------------------------------------------
create table apartamento_operario (
  apartamento_id smallint not null references apartamentos(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  atribuido_em timestamptz not null default now(),
  primary key (apartamento_id, user_id)
);

-- ------------------------------------------------------------
-- TABLE: divisoes
-- (Entrada, Suite 1, WC Suite 1, Sala, etc.) — por apartamento
-- ------------------------------------------------------------
create table divisoes (
  id bigserial primary key,
  apartamento_id smallint not null references apartamentos(id) on delete cascade,
  nome text not null,
  ordem smallint not null default 0
);

create index idx_divisoes_apartamento on divisoes(apartamento_id);

-- ------------------------------------------------------------
-- TABLE: elementos
-- Items individuais do checklist (~3748 linhas no seed)
-- ------------------------------------------------------------
create table elementos (
  id bigserial primary key,
  apartamento_id smallint not null references apartamentos(id) on delete cascade,
  divisao_id bigint references divisoes(id) on delete set null,
  fase_id smallint not null references fases(id),
  elemento text not null,        -- 'Teto', 'Paredes', 'Aro', ...
  sub_elemento text,              -- 'Tratamento de Junta', 'Primário', ...
  concluido boolean not null default false,
  concluido_em timestamptz,
  concluido_por uuid references profiles(id) on delete set null,
  notas text,
  responsavel text,
  data_prevista date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_elementos_apartamento on elementos(apartamento_id);
create index idx_elementos_fase on elementos(fase_id);
create index idx_elementos_concluido on elementos(concluido);
create index idx_elementos_apartamento_fase on elementos(apartamento_id, fase_id);

-- Índice full-text para pesquisa (português)
create index idx_elementos_search on elementos
  using gin ((
    setweight(to_tsvector('portuguese', coalesce(elemento, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(sub_elemento, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(notas, '')), 'C')
  ));

-- ------------------------------------------------------------
-- TABLE: tarefas_gantt
-- 144 rows (24 pais + 120 filhos)
-- ------------------------------------------------------------
create table tarefas_gantt (
  id bigserial primary key,
  parent_id bigint references tarefas_gantt(id) on delete cascade,
  apartamento_id smallint not null references apartamentos(id) on delete cascade,
  fase_id smallint references fases(id),          -- null para linhas-pai (apartamento)
  nivel smallint not null default 1,              -- 1=apartamento, 2=fase
  nome text not null,
  inicio date,
  fim date,
  status tarefa_status not null default 'por_fazer',
  responsavel_user_id uuid references profiles(id) on delete set null,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (nivel = 1 and parent_id is null and fase_id is null) or
    (nivel = 2 and parent_id is not null and fase_id is not null)
  )
);

create index idx_tarefas_apartamento on tarefas_gantt(apartamento_id);
create index idx_tarefas_parent on tarefas_gantt(parent_id);
create index idx_tarefas_status on tarefas_gantt(status);

-- ------------------------------------------------------------
-- VIEW: progresso_por_fase
-- Calcula % concluído por apartamento × fase
-- ------------------------------------------------------------
create or replace view progresso_por_fase as
select
  e.apartamento_id,
  e.fase_id,
  count(*) as total,
  count(*) filter (where e.concluido) as concluidos,
  case
    when count(*) = 0 then 0
    else round(count(*) filter (where e.concluido)::numeric / count(*), 4)
  end as percentagem
from elementos e
group by e.apartamento_id, e.fase_id;

-- ------------------------------------------------------------
-- VIEW: progresso_por_apartamento
-- ------------------------------------------------------------
create or replace view progresso_por_apartamento as
select
  e.apartamento_id,
  count(*) as total,
  count(*) filter (where e.concluido) as concluidos,
  case
    when count(*) = 0 then 0
    else round(count(*) filter (where e.concluido)::numeric / count(*), 4)
  end as percentagem
from elementos e
group by e.apartamento_id;

-- ------------------------------------------------------------
-- VIEW: kanban_cards
-- Kanban = tarefas_gantt de nivel=2 (fases por apartamento)
-- ------------------------------------------------------------
create or replace view kanban_cards as
select
  t.id,
  t.apartamento_id,
  a.codigo as apartamento_codigo,
  t.fase_id,
  f.nome as fase_nome,
  f.cor_hex as fase_cor,
  t.nome,
  t.inicio,
  t.fim,
  t.status,
  t.responsavel_user_id,
  p.nome as responsavel_nome,
  coalesce(pf.percentagem, 0) as progresso
from tarefas_gantt t
join apartamentos a on a.id = t.apartamento_id
join fases f on f.id = t.fase_id
left join profiles p on p.id = t.responsavel_user_id
left join progresso_por_fase pf on pf.apartamento_id = t.apartamento_id and pf.fase_id = t.fase_id
where t.nivel = 2;

-- ------------------------------------------------------------
-- TABLE: audit_log
-- ------------------------------------------------------------
create table audit_log (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete set null,
  tabela text not null,
  registo_id text not null,
  action audit_action not null,
  valores_antigos jsonb,
  valores_novos jsonb,
  timestamp timestamptz not null default now()
);

create index idx_audit_user on audit_log(user_id);
create index idx_audit_tabela on audit_log(tabela);
create index idx_audit_timestamp on audit_log(timestamp desc);

-- Trigger genérico de audit
create or replace function audit_trigger_fn()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_action audit_action;
  v_id text;
begin
  if tg_op = 'INSERT' then
    v_action := 'insert';
    v_new := to_jsonb(new);
    v_id := new.id::text;
  elsif tg_op = 'UPDATE' then
    v_action := 'update';
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    v_id := new.id::text;
  else
    v_action := 'delete';
    v_old := to_jsonb(old);
    v_id := old.id::text;
  end if;

  insert into audit_log (user_id, tabela, registo_id, action, valores_antigos, valores_novos)
  values (auth.uid(), tg_table_name, v_id, v_action, v_old, v_new);

  return coalesce(new, old);
end;
$$;

create trigger audit_elementos
  after insert or update or delete on elementos
  for each row execute function audit_trigger_fn();

create trigger audit_tarefas_gantt
  after insert or update or delete on tarefas_gantt
  for each row execute function audit_trigger_fn();

-- ------------------------------------------------------------
-- TRIGGERS: updated_at automático
-- ------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger set_updated_at_profiles
  before update on profiles
  for each row execute function set_updated_at();

create trigger set_updated_at_elementos
  before update on elementos
  for each row execute function set_updated_at();

create trigger set_updated_at_tarefas
  before update on tarefas_gantt
  for each row execute function set_updated_at();

-- Quando um elemento é marcado como concluído, preencher concluido_em e concluido_por
create or replace function elemento_concluido_metadata()
returns trigger
language plpgsql
as $$
begin
  if new.concluido = true and (old.concluido is null or old.concluido = false) then
    new.concluido_em := now();
    new.concluido_por := auth.uid();
  elsif new.concluido = false and old.concluido = true then
    new.concluido_em := null;
    new.concluido_por := null;
  end if;
  return new;
end;
$$;

create trigger set_elemento_concluido_metadata
  before update on elementos
  for each row execute function elemento_concluido_metadata();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table apartamentos enable row level security;
alter table apartamento_operario enable row level security;
alter table divisoes enable row level security;
alter table elementos enable row level security;
alter table tarefas_gantt enable row level security;
alter table audit_log enable row level security;

-- Helper: obter role do user atual
create or replace function current_user_role()
returns user_role
language sql
security definer
stable
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

-- Helper: verificar se user é operário deste apartamento
create or replace function is_operario_of(ap_id smallint)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from apartamento_operario
    where apartamento_id = ap_id and user_id = auth.uid()
  );
$$;

-- Policies: profiles
create policy "users can read all profiles" on profiles
  for select using (auth.uid() is not null);

create policy "users can update own profile" on profiles
  for update using (id = auth.uid());

create policy "admin can manage profiles" on profiles
  for all using (current_user_role() = 'admin');

-- Policies: apartamentos
create policy "authenticated can read apartamentos" on apartamentos
  for select using (auth.uid() is not null);

create policy "admin can write apartamentos" on apartamentos
  for all using (current_user_role() = 'admin');

-- Policies: apartamento_operario
create policy "authenticated can read assignments" on apartamento_operario
  for select using (auth.uid() is not null);

create policy "admin/encarregado can manage assignments" on apartamento_operario
  for all using (current_user_role() in ('admin', 'encarregado'));

-- Policies: divisoes
create policy "authenticated can read divisoes" on divisoes
  for select using (auth.uid() is not null);

create policy "admin/encarregado can write divisoes" on divisoes
  for all using (current_user_role() in ('admin', 'encarregado'));

-- Policies: elementos
create policy "read elementos by role" on elementos
  for select using (
    current_user_role() in ('admin', 'encarregado')
    or is_operario_of(apartamento_id)
  );

create policy "encarregado/admin can update any elemento" on elementos
  for update using (current_user_role() in ('admin', 'encarregado'))
  with check (current_user_role() in ('admin', 'encarregado'));

create policy "operario can check elementos of own apartamento" on elementos
  for update using (
    is_operario_of(apartamento_id)
  ) with check (
    is_operario_of(apartamento_id)
  );

create policy "admin/encarregado can insert elementos" on elementos
  for insert with check (current_user_role() in ('admin', 'encarregado'));

create policy "admin can delete elementos" on elementos
  for delete using (current_user_role() = 'admin');

-- Policies: tarefas_gantt
create policy "authenticated can read tarefas" on tarefas_gantt
  for select using (auth.uid() is not null);

create policy "admin/encarregado can write tarefas" on tarefas_gantt
  for all using (current_user_role() in ('admin', 'encarregado'));

-- Policies: audit_log
create policy "admin can read audit" on audit_log
  for select using (current_user_role() = 'admin');

-- ============================================================
-- REALTIME
-- ============================================================
-- Ativa publicação para realtime nas tabelas-chave
alter publication supabase_realtime add table elementos;
alter publication supabase_realtime add table tarefas_gantt;
