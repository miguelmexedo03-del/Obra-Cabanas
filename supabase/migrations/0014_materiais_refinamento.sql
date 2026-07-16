-- Refinamento da tabela de materiais (iteracao 2, 2026-07-16)

-- 1. Deixa de haver logica de bloqueio: a view e removida (e depende da coluna abaixo).
drop view materiais_com_estado;

-- 2. Remover a data de encomenda (fica so a de aplicacao)
alter table materiais drop column data_prevista_encomenda;

-- 3. Sitio fisico do material (so relevante quando em stock)
alter table materiais add column sitio text
  check (sitio in ('em_armazem', 'em_obra'));

-- 4. Notas livres, uma por linha na UI
alter table materiais add column notas text[] not null default '{}';
