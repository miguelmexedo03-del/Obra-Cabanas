-- ============================================================
-- Migration 0015 — Zonas Comuns, Zona Técnica, Eletrodomésticos por nome
-- ============================================================
-- Incremental: só INSERT/ALTER, nunca apaga/regenera o checklist existente.
-- Ver docs/superpowers/specs/2026-07-29-checklist-zonas-comuns-design.md

begin;

-- ------------------------------------------------------------
-- PARTE A: schema — unidades "zona_comum" + fase_id nullable
-- ------------------------------------------------------------
create type apartamento_tipo as enum ('apartamento', 'zona_comum');

alter table apartamentos add column tipo apartamento_tipo not null default 'apartamento';

alter table elementos alter column fase_id drop not null;

insert into apartamentos (id, codigo, descricao, tipo) values
  (25, 'LOTE1', 'Lote 1 — Zonas Comuns (Rua Fernando Pessoa 17)', 'zona_comum'),
  (26, 'LOTE2', 'Lote 2 — Zonas Comuns (Rua Manoel Pedro de Mello 3)', 'zona_comum'),
  (27, 'EDIFICIO', 'Edifício — Zonas Comuns', 'zona_comum');

-- Divisões: Lote 1 e Lote 2 (idênticas) + Edifício
insert into divisoes (apartamento_id, nome, ordem) values
  (25, 'Átrio de entrada (piso 0)', 1),
  (25, 'Circulação — piso 0', 2),
  (25, 'Circulação — piso 1', 3),
  (25, 'Circulação — piso 2', 4),
  (25, 'Escada', 5),
  (25, 'Elevador', 6),
  (26, 'Átrio de entrada (piso 0)', 1),
  (26, 'Circulação — piso 0', 2),
  (26, 'Circulação — piso 1', 3),
  (26, 'Circulação — piso 2', 4),
  (26, 'Escada', 5),
  (26, 'Elevador', 6),
  (27, 'Garagem / cave (piso -1)', 1),
  (27, 'Zonas técnicas (cave)', 2),
  (27, 'Cobertura comum/técnica', 3);

-- Átrio de entrada (bloco geral + itens próprios) — Lote 1 e Lote 2
insert into elementos (apartamento_id, divisao_id, fase_id, elemento, concluido)
select d.apartamento_id, d.id, v.fase_id, v.elemento, false
from divisoes d
join (values
  (4::smallint, 'Pavimento'),
  (4::smallint, 'Rodapé'),
  (2::smallint, 'Paredes'),
  (1::smallint, 'Teto'),
  (3::smallint, 'Portas e aros'),
  (null::smallint, 'Iluminação'),
  (null::smallint, 'Pontos à vista (tomadas/botoneiras/quadros)'),
  (null::smallint, 'Sinalização e segurança'),
  (null::smallint, 'Limpeza/pronto'),
  (3::smallint, 'Porta de entrada'),
  (null::smallint, 'Caixas de correio'),
  (null::smallint, 'Videoporteiro/campainhas')
) as v(fase_id, elemento) on true
where d.nome = 'Átrio de entrada (piso 0)' and d.apartamento_id in (25, 26);

-- Circulação (só bloco geral) — pisos 0/1/2, Lote 1 e Lote 2
insert into elementos (apartamento_id, divisao_id, fase_id, elemento, concluido)
select d.apartamento_id, d.id, v.fase_id, v.elemento, false
from divisoes d
join (values
  (4::smallint, 'Pavimento'),
  (4::smallint, 'Rodapé'),
  (2::smallint, 'Paredes'),
  (1::smallint, 'Teto'),
  (3::smallint, 'Portas e aros'),
  (null::smallint, 'Iluminação'),
  (null::smallint, 'Pontos à vista (tomadas/botoneiras/quadros)'),
  (null::smallint, 'Sinalização e segurança'),
  (null::smallint, 'Limpeza/pronto')
) as v(fase_id, elemento) on true
where d.nome in ('Circulação — piso 0', 'Circulação — piso 1', 'Circulação — piso 2')
  and d.apartamento_id in (25, 26);

-- Escada (bloco geral + itens próprios)
insert into elementos (apartamento_id, divisao_id, fase_id, elemento, concluido)
select d.apartamento_id, d.id, v.fase_id, v.elemento, false
from divisoes d
join (values
  (4::smallint, 'Pavimento'),
  (4::smallint, 'Rodapé'),
  (2::smallint, 'Paredes'),
  (1::smallint, 'Teto'),
  (3::smallint, 'Portas e aros'),
  (null::smallint, 'Iluminação'),
  (null::smallint, 'Pontos à vista (tomadas/botoneiras/quadros)'),
  (null::smallint, 'Sinalização e segurança'),
  (null::smallint, 'Limpeza/pronto'),
  (null::smallint, 'Degraus'),
  (null::smallint, 'Patamares'),
  (null::smallint, 'Corrimão'),
  (null::smallint, 'Guarda-corpos')
) as v(fase_id, elemento) on true
where d.nome = 'Escada' and d.apartamento_id in (25, 26);

-- Elevador (SEM bloco geral) — "Portas de patamar" com sub_elemento por piso
insert into elementos (apartamento_id, divisao_id, fase_id, elemento, sub_elemento, concluido)
select d.apartamento_id, d.id, v.fase_id, v.elemento, v.sub_elemento, false
from divisoes d
join (values
  (null::smallint, 'Cabina', null::text),
  (null::smallint, 'Nivelamento à soleira', null::text),
  (3::smallint, 'Portas de patamar', 'Piso 0'),
  (3::smallint, 'Portas de patamar', 'Piso 1'),
  (3::smallint, 'Portas de patamar', 'Piso 2'),
  (null::smallint, 'Botoneira', null::text),
  (null::smallint, 'Certificação', null::text)
) as v(fase_id, elemento, sub_elemento) on true
where d.nome = 'Elevador' and d.apartamento_id in (25, 26);

-- Garagem / cave (piso -1) — só Edifício
insert into elementos (apartamento_id, divisao_id, fase_id, elemento, concluido)
select d.apartamento_id, d.id, v.fase_id, v.elemento, false
from divisoes d
join (values
  (4::smallint, 'Pavimento'),
  (4::smallint, 'Rodapé'),
  (2::smallint, 'Paredes'),
  (1::smallint, 'Teto'),
  (3::smallint, 'Portas e aros'),
  (null::smallint, 'Iluminação'),
  (null::smallint, 'Pontos à vista (tomadas/botoneiras/quadros)'),
  (null::smallint, 'Sinalização e segurança'),
  (null::smallint, 'Limpeza/pronto'),
  (null::smallint, 'Portão automático'),
  (null::smallint, 'Lugares marcados'),
  (null::smallint, 'Ventilação'),
  (null::smallint, 'Deteção de CO')
) as v(fase_id, elemento) on true
where d.nome = 'Garagem / cave (piso -1)' and d.apartamento_id = 27;

-- Zonas técnicas (cave) — só Edifício
insert into elementos (apartamento_id, divisao_id, fase_id, elemento, concluido)
select d.apartamento_id, d.id, v.fase_id, v.elemento, false
from divisoes d
join (values
  (4::smallint, 'Pavimento'),
  (4::smallint, 'Rodapé'),
  (2::smallint, 'Paredes'),
  (1::smallint, 'Teto'),
  (3::smallint, 'Portas e aros'),
  (null::smallint, 'Iluminação'),
  (null::smallint, 'Pontos à vista (tomadas/botoneiras/quadros)'),
  (null::smallint, 'Sinalização e segurança'),
  (null::smallint, 'Limpeza/pronto'),
  (null::smallint, 'Quadros'),
  (null::smallint, 'Equipamentos fixos e identificados'),
  (null::smallint, 'Ventilação'),
  (null::smallint, 'Drenagem')
) as v(fase_id, elemento) on true
where d.nome = 'Zonas técnicas (cave)' and d.apartamento_id = 27;

-- Cobertura comum/técnica (SEM bloco geral) — só Edifício
insert into elementos (apartamento_id, divisao_id, fase_id, elemento, concluido)
select d.apartamento_id, d.id, v.fase_id, v.elemento, false
from divisoes d
join (values
  (null::smallint, 'Estanqueidade/infiltrações'),
  (null::smallint, 'Escoamento (ralos e caleiras)'),
  (null::smallint, 'Remates e rufos'),
  (null::smallint, 'Platibanda/guarda-corpos'),
  (null::smallint, 'Equipamentos fixos e identificados'),
  (null::smallint, 'Acesso')
) as v(fase_id, elemento) on true
where d.nome = 'Cobertura comum/técnica' and d.apartamento_id = 27;

-- ------------------------------------------------------------
-- PARTE B: "Zona Técnica" nos 24 apartamentos (ordem = último+1, por AP)
-- ------------------------------------------------------------
insert into divisoes (apartamento_id, nome, ordem)
select ap.id, 'Zona Técnica',
  coalesce((select max(d.ordem) from divisoes d where d.apartamento_id = ap.id), 0) + 1
from apartamentos ap
where ap.tipo = 'apartamento';

insert into elementos (apartamento_id, divisao_id, fase_id, elemento, concluido)
select d.apartamento_id, d.id, v.fase_id, v.elemento, false
from divisoes d
join apartamentos ap on ap.id = d.apartamento_id and ap.tipo = 'apartamento'
join (values
  (null::smallint, 'Equipamento AQS / bomba de calor — fixo e identificado'),
  (null::smallint, 'Quadro elétrico'),
  (null::smallint, 'Ventilação'),
  (null::smallint, 'Dreno/escoamento'),
  (3::smallint, 'Porta e acesso'),
  (4::smallint, 'Pavimento'),
  (2::smallint, 'Paredes'),
  (1::smallint, 'Teto')
) as v(fase_id, elemento) on true
where d.nome = 'Zona Técnica';

-- ------------------------------------------------------------
-- PARTE C: Eletrodomésticos por nome
-- ------------------------------------------------------------
-- Guarda de segurança: só apaga se continuar sem estado real (ver verificação
-- pré-voo no plano de implementação). Se o WHERE não apanhar as 24 linhas,
-- para e investiga antes de reaplicar.
-- Verificação pré-voo (produção, antes de escrever esta migration): as 24 linhas
-- alvo foram confirmadas sem estado real (concluido=false, notas/responsavel nulos).
delete from elementos
where id in (3379,3708,148,256,410,601,474,727,944,1077,1249,1421,1572,1718,1857,1992,2208,2346,2517,2687,2836,2989,3116,3246)
  and concluido = false
  and notas is null
  and responsavel is null
  and elemento ilike 'Eletrodom%';

-- 23 apartamentos (todos menos AP7) — insere na Cozinha existente de cada um,
-- incluindo o AP2 que não tinha nenhuma linha "Eletrodomésticos" antes.
insert into elementos (apartamento_id, divisao_id, fase_id, elemento, concluido)
select d.apartamento_id, d.id, 8, v.elemento, false
from divisoes d
join apartamentos ap on ap.id = d.apartamento_id
join (values
  ('Placa vitrocerâmica'),
  ('Micro-ondas'),
  ('Forno'),
  ('Máquina de lavar louça'),
  ('Frigorífico combinado'),
  ('Máquina de lavar roupa'),
  ('Exaustor')
) as v(elemento) on true
where ap.tipo = 'apartamento' and ap.id <> 7 and d.nome = 'Cozinha';

-- AP7 — 6 aparelhos na Cozinha
insert into elementos (apartamento_id, divisao_id, fase_id, elemento, concluido)
select d.apartamento_id, d.id, 8, v.elemento, false
from divisoes d
join (values
  ('Frigorífico (americano)'),
  ('Forno'),
  ('Gaveta de aquecimento'),
  ('Máquina de lavar louça'),
  ('Placa de indução'),
  ('Exaustor')
) as v(elemento) on true
where d.apartamento_id = 7 and d.nome = 'Cozinha';

-- AP7 — 2 aparelhos no Closet (lavandaria), onde já estava hoje a máquina de lavar roupa
insert into elementos (apartamento_id, divisao_id, fase_id, elemento, concluido)
select d.apartamento_id, d.id, 8, v.elemento, false
from divisoes d
join (values
  ('Máquina de lavar roupa'),
  ('Máquina de secar')
) as v(elemento) on true
where d.apartamento_id = 7 and d.nome = 'Closet (lavandaria)';

commit;
