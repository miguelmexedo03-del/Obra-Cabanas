-- Reestruturação de fases:
-- Teto (1) → Teto + Remendos Teto (9) + Pintura Teto (10)
-- Paredes (2) → Paredes + Remendo Paredes (11) + Pintura Paredes (12)
-- Bancas (7) → dissolve em Móveis (6)

begin;

-- 1. Renomear "Tetos" → "Teto"
update fases set nome = 'Teto' where id = 1;

-- 2. Shift ordens actuais para 100+ para evitar conflitos UNIQUE durante reordering
update fases set ordem = ordem + 100;

-- 3. Inserir novas fases com ordens provisórias (200+)
insert into fases (id, nome, ordem, cor_hex, duracao_dias_default) values
  (9,  'Remendos Teto',    200, '#7FA6D0', 5),
  (10, 'Pintura Teto',     201, '#B3CEEC', 4),
  (11, 'Remendo Paredes',  202, '#D48B2A', 5),
  (12, 'Pintura Paredes',  203, '#F2C773', 4);

-- 4. Reclassificar elementos do grupo Teto (fase_id=1)
--    Prioridade: pinturas primeiro, depois remendos, o resto fica em Teto

-- Pintura Teto: demão, extracoat, primário
update elementos
set fase_id = 10
where fase_id = 1
  and sub_elemento is not null
  and (
    lower(sub_elemento) like '%dem%'
    or lower(sub_elemento) like '%extracoat%'
    or lower(sub_elemento) like '%prim%'
  );

-- Remendos Teto: tudo o que ficou em fase_id=1 com sub_elemento não-nulo e não é tratamento
update elementos
set fase_id = 9
where fase_id = 1
  and sub_elemento is not null
  and lower(sub_elemento) not like '%tratamento%';

-- 5. Reclassificar elementos do grupo Paredes (fase_id=2)

-- Pintura Paredes: demão, extracoat, primário
update elementos
set fase_id = 12
where fase_id = 2
  and sub_elemento is not null
  and (
    lower(sub_elemento) like '%dem%'
    or lower(sub_elemento) like '%extracoat%'
    or lower(sub_elemento) like '%prim%'
  );

-- Remendo Paredes: tomadas, interruptor, mecanismos
update elementos
set fase_id = 11
where fase_id = 2
  and sub_elemento is not null
  and (
    lower(sub_elemento) like '%tomad%'
    or lower(sub_elemento) like '%interruptor%'
    or lower(sub_elemento) like '%mecanismo%'
  );

-- 6. Merge Bancas → Móveis
update elementos set fase_id = 6 where fase_id = 7;

-- 7. Remover tarefas_gantt de Bancas antes de apagar a fase
delete from tarefas_gantt where fase_id = 7 and nivel = 2;

-- 8. Apagar fase Bancas
delete from fases where id = 7;

-- 9. Adicionar tarefas_gantt nivel=2 para novas fases (9, 10, 11, 12)
do $$
declare
  ap_row record;
  new_fases int[] := array[9, 10, 11, 12];
  new_names text[] := array['Remendos Teto', 'Pintura Teto', 'Remendo Paredes', 'Pintura Paredes'];
  i int;
  parent_row_id bigint;
begin
  for ap_row in select id from apartamentos order by id loop
    select id into parent_row_id
    from tarefas_gantt
    where apartamento_id = ap_row.id and nivel = 1;

    for i in 1..array_length(new_fases, 1) loop
      insert into tarefas_gantt (parent_id, apartamento_id, fase_id, nivel, nome, status)
      values (parent_row_id, ap_row.id, new_fases[i], 2, new_names[i], 'por_fazer');
    end loop;
  end loop;
end;
$$;

-- Actualizar nome das tarefas de Teto (era "Tetos")
update tarefas_gantt set nome = 'Teto' where fase_id = 1 and nivel = 2;

-- 10. Definir ordens finais (1-11)
update fases set ordem = 1  where id = 1;
update fases set ordem = 2  where id = 9;
update fases set ordem = 3  where id = 10;
update fases set ordem = 4  where id = 2;
update fases set ordem = 5  where id = 11;
update fases set ordem = 6  where id = 12;
update fases set ordem = 7  where id = 3;
update fases set ordem = 8  where id = 6;
update fases set ordem = 9  where id = 8;
update fases set ordem = 10 where id = 4;
update fases set ordem = 11 where id = 5;

commit;
