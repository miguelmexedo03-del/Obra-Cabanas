-- Popula tarefas_gantt: 24 pais (nivel=1) + 192 filhos (8 fases × 24 APs)
-- Fases em ordem construtiva: Tetos(1) Paredes(2) Portas(3) Móveis(6) Bancas(7) Eletrodomésticos(8) Chão(4) WC(5)

begin;

insert into tarefas_gantt (parent_id, apartamento_id, fase_id, nivel, nome, status)
select null, id, null, 1, codigo || ' — Obra Cabanas', 'por_fazer'
from apartamentos
order by id;

do $$
declare
  ap_row record;
  fase_ids int[] := array[1,2,3,6,7,8,4,5];
  fase_names text[] := array['Tetos','Paredes','Portas','Móveis','Bancas','Eletrodomésticos','Chão e Rodapé','WC Equipamentos'];
  i int;
  parent_row_id bigint;
begin
  for ap_row in select id from apartamentos order by id loop
    select id into parent_row_id
    from tarefas_gantt
    where apartamento_id = ap_row.id and nivel = 1;

    for i in 1..array_length(fase_ids, 1) loop
      insert into tarefas_gantt (parent_id, apartamento_id, fase_id, nivel, nome, status)
      values (parent_row_id, ap_row.id, fase_ids[i], 2, fase_names[i], 'por_fazer');
    end loop;
  end loop;
end;
$$;

commit;
