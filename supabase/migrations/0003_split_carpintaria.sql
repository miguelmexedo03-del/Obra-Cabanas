-- Split Carpintaria (fase 3) into 4 sub-phases:
-- Portas (porta+aro), Móveis, Bancas, Eletrodomésticos
--
-- Sequence after: Tetos → Paredes → Portas → Móveis → Bancas → Eletrodomésticos → Chão e Rodapé → WC Equipamentos

begin;

-- 1. Shift existing fases 4 and 5 to order 7 and 8 to make room
update fases set ordem = 7 where id = 4; -- Chão e Rodapé
update fases set ordem = 8 where id = 5; -- WC Equipamentos

-- 2. Rename fase 3 from 'Carpintaria' to 'Portas' (stays at order 3)
update fases set nome = 'Portas' where id = 3;

-- 3. Insert new sub-phases
insert into fases (id, nome, ordem, cor_hex, duracao_dias_default) values
  (6, 'Móveis',           4, '#7BC47F', 8),
  (7, 'Bancas',           5, '#4E9B5C', 5),
  (8, 'Eletrodomésticos', 6, '#2E7D6E', 4);

-- 4. Re-classify elementos that were Carpintaria (fase_id=3)
--    Priority order mirrors classify_fase in generate_seed_from_xlsx.py:
--    aro/porta → Portas (stay as 3), móvei → Móveis (6), banca → Bancas (7), eletrodomésti → Eletrodomésticos (8)

-- ASCII-safe patterns (accented chars in LIKE are encoding-sensitive)
update elementos
set fase_id = 8
where fase_id = 3
  and lower(elemento) like '%eletrodom%';

update elementos
set fase_id = 7
where fase_id = 3
  and lower(elemento) like '%banca%';

update elementos
set fase_id = 6
where fase_id = 3
  and lower(elemento) like '%vei%'; -- catches móveis/movéis

-- Elements remaining at fase_id=3 are aro/porta → Portas ✓

-- 5. Update tarefas_gantt nivel=2 name for renamed fase 3
update tarefas_gantt set nome = 'Portas' where fase_id = 3 and nivel = 2;

-- 6. Add 3 new nivel=2 rows per apartment for the new sub-phases
insert into tarefas_gantt (parent_id, apartamento_id, fase_id, nivel, nome, status)
select p.id, p.apartamento_id, 6, 2, 'Móveis', 'por_fazer'
from tarefas_gantt p where p.nivel = 1;

insert into tarefas_gantt (parent_id, apartamento_id, fase_id, nivel, nome, status)
select p.id, p.apartamento_id, 7, 2, 'Bancas', 'por_fazer'
from tarefas_gantt p where p.nivel = 1;

insert into tarefas_gantt (parent_id, apartamento_id, fase_id, nivel, nome, status)
select p.id, p.apartamento_id, 8, 2, 'Eletrodomésticos', 'por_fazer'
from tarefas_gantt p where p.nivel = 1;

commit;
