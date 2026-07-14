-- ============================================================
-- 0011_security_hardening.sql
-- Corrige 3 achados críticos da auditoria de segurança:
--   1. Escalada de privilégio: user consegue promover-se a admin
--      via UPDATE direto do proprio profile (role sem WITH CHECK).
--   2. Tabela `fases` sem RLS -> escrita anonima via PostgREST.
--   3. Views expostas com privilegios do dono (contornam RLS)
--      -> leitura de dados/nomes sem login.
-- Extra: default de role passa a 'user' (0006 nao o corrigiu).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Bloquear escalada de role
-- WITH CHECK numa policy nao consegue comparar old.role vs new.role,
-- por isso usamos um trigger BEFORE UPDATE. auth.role() = 'service_role'
-- garante que a criacao de contas pelo admin (admin client / service key,
-- onde auth.uid() e' null) continua a funcionar.
-- ------------------------------------------------------------
create or replace function prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and coalesce(current_user_role()::text, '') <> 'admin'
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Apenas administradores podem alterar o role de um perfil';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_role_escalation on profiles;
create trigger trg_prevent_role_escalation
  before update on profiles
  for each row execute function prevent_role_escalation();

-- ------------------------------------------------------------
-- 2. RLS na tabela `fases` (estava exposta a anon)
-- ------------------------------------------------------------
alter table fases enable row level security;

drop policy if exists "authenticated can read fases" on fases;
create policy "authenticated can read fases" on fases
  for select using (auth.uid() is not null);

drop policy if exists "admin can write fases" on fases;
create policy "admin can write fases" on fases
  for all
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

-- ------------------------------------------------------------
-- 3. Views passam a correr com privilegios do caller (security_invoker),
-- pelo que a RLS das tabelas base volta a aplicar-se e o anon deixa de ler.
-- ------------------------------------------------------------
alter view progresso_por_fase set (security_invoker = on);
alter view progresso_por_apartamento set (security_invoker = on);
alter view kanban_cards set (security_invoker = on);

-- ------------------------------------------------------------
-- Extra: novos registos ficavam com role legacy 'operario'
-- (bloqueado nas escritas mas com leitura total). Passa a 'user'.
-- O default da coluna nao chega: handle_new_user() insere o role
-- explicitamente, por isso reescreve-se tambem a funcao.
-- ------------------------------------------------------------
alter table profiles alter column role set default 'user';

create or replace function handle_new_user()
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
    'user'
  );
  return new;
end;
$$;
