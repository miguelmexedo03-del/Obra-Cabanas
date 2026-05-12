-- Replace broken encarregado/operario policies with clean admin/user model.
-- After migration 0006, only 'admin' and 'user' roles exist.
-- Both roles can read and edit all operational data.
-- Only 'admin' can read audit_log.
-- SELECT on elementos uses auth.uid() is not null (avoids per-row function calls).

-- apartamento_operario
drop policy if exists "admin/encarregado can manage assignments" on apartamento_operario;
create policy "admin/user can manage assignments" on apartamento_operario
  for all using (current_user_role() in ('admin', 'user'));

-- divisoes
drop policy if exists "admin/encarregado can write divisoes" on divisoes;
create policy "admin/user can write divisoes" on divisoes
  for all using (current_user_role() in ('admin', 'user'));

-- elementos: drop all four broken policies, create three clean replacements
drop policy if exists "read elementos by role" on elementos;
drop policy if exists "encarregado/admin can update any elemento" on elementos;
drop policy if exists "operario can check elementos of own apartamento" on elementos;
drop policy if exists "admin/encarregado can insert elementos" on elementos;

create policy "authenticated can read elementos" on elementos
  for select using (auth.uid() is not null);

create policy "admin/user can update elementos" on elementos
  for update
  using (current_user_role() in ('admin', 'user'))
  with check (current_user_role() in ('admin', 'user'));

create policy "admin/user can insert elementos" on elementos
  for insert with check (current_user_role() in ('admin', 'user'));

-- tarefas_gantt
drop policy if exists "admin/encarregado can write tarefas" on tarefas_gantt;
create policy "admin/user can write tarefas" on tarefas_gantt
  for all using (current_user_role() in ('admin', 'user'));
