-- Create "Geral" divisão for each AP that has orphan elementos (divisao_id IS NULL).
-- These orphans came from rows in the Excel checklist where the room column was blank.
-- We preserve the data by assigning it to a synthetic "Geral" room rather than deleting.

begin;

insert into divisoes (apartamento_id, nome, ordem)
select distinct apartamento_id, 'Geral', 999
from elementos
where divisao_id is null;

update elementos e
set divisao_id = d.id
from divisoes d
where e.divisao_id is null
  and d.apartamento_id = e.apartamento_id
  and d.nome = 'Geral';

commit;
