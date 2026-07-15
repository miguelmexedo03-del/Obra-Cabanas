-- Categorias de material (adicionaveis na app)
create table categorias_material (
  id smallint generated always as identity primary key,
  nome text not null unique,
  ordem smallint not null default 0,
  created_at timestamptz not null default now()
);

-- Uma linha por (apartamento x categoria), criada on-demand por upsert
create table materiais (
  id bigint generated always as identity primary key,
  apartamento_id smallint not null references apartamentos(id) on delete cascade,
  categoria_id smallint not null references categorias_material(id) on delete cascade,
  estado text not null default 'por_encomendar'
    check (estado in ('por_encomendar', 'encomendado', 'em_stock')),
  localizacao text,
  data_prevista_encomenda date,
  data_prevista_aplicacao date,
  updated_at timestamptz not null default now(),
  unique (apartamento_id, categoria_id)
);

create index idx_materiais_apartamento on materiais(apartamento_id);
create index idx_materiais_categoria on materiais(categoria_id);

-- Dependencias como relacao (mesmo AP, validado na app)
create table material_dependencias (
  material_id bigint not null references materiais(id) on delete cascade,
  depende_de_material_id bigint not null references materiais(id) on delete cascade,
  primary key (material_id, depende_de_material_id),
  check (material_id <> depende_de_material_id)
);

-- Trigger updated_at reutilizado
create trigger set_updated_at_materiais
  before update on materiais
  for each row execute function set_updated_at();

-- View de estado computado: bloqueado se alguma dependencia nao esta em_stock
create view materiais_com_estado
with (security_invoker = on) as
select
  m.*,
  coalesce(bool_or(dep.estado <> 'em_stock'), false) as bloqueado,
  array_remove(array_agg(
    case when dep.estado <> 'em_stock' then cat_dep.nome end
  ), null) as dependencias_pendentes
from materiais m
left join material_dependencias md on md.material_id = m.id
left join materiais dep on dep.id = md.depende_de_material_id
left join categorias_material cat_dep on cat_dep.id = dep.categoria_id
group by m.id;

-- RLS
alter table categorias_material enable row level security;
alter table materiais enable row level security;
alter table material_dependencias enable row level security;

create policy "authenticated can read categorias_material" on categorias_material
  for select using (auth.uid() is not null);
create policy "admin/user can write categorias_material" on categorias_material
  for all using (current_user_role() in ('admin','user'));

create policy "authenticated can read materiais" on materiais
  for select using (auth.uid() is not null);
create policy "admin/user can write materiais" on materiais
  for all using (current_user_role() in ('admin','user'));

create policy "authenticated can read material_dependencias" on material_dependencias
  for select using (auth.uid() is not null);
create policy "admin/user can write material_dependencias" on material_dependencias
  for all using (current_user_role() in ('admin','user'));

-- Seed inicial de categorias (editavel na app)
insert into categorias_material (nome, ordem) values
  ('Pinturas', 1), ('Pladur e pedra', 2), ('Portas', 3), ('Aros', 4),
  ('Moveis de cozinha', 5), ('Moveis de quarto', 6), ('Eletrodomesticos', 7),
  ('Ar condicionado', 8), ('Bomba de calor', 9), ('Lavatorio', 10), ('Sanita', 11)
on conflict (nome) do nothing;
