-- Instruções avançadas do relatório executivo (single-row).
-- O texto aqui SOMA-SE às regras default do código (src/lib/relatorio/prompt.ts).
create table relatorio_config (
  id smallint primary key default 1 check (id = 1),
  instrucoes_extra text not null default '',
  updated_at timestamptz not null default now()
);

insert into relatorio_config (id) values (1) on conflict do nothing;

-- Reutiliza o trigger já existente
create trigger set_updated_at_relatorio_config
  before update on relatorio_config
  for each row execute function set_updated_at();

alter table relatorio_config enable row level security;

create policy "authenticated can read relatorio_config" on relatorio_config
  for select using (auth.uid() is not null);

create policy "admin can update relatorio_config" on relatorio_config
  for update using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');
