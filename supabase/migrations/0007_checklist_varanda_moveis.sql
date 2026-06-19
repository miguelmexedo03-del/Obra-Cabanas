-- Migration 0007: Adicionar itens em falta na Varanda + Móveis em Cozinha e WC
--
-- Varanda: adicionar Paredes base + subitems pintura Teto + subitems pintura Paredes
--          + Pedra do peitoril + Pedra da fachada
-- Cozinha: adicionar Móveis (fase 6) onde não existe
-- WC:      adicionar Móveis (fase 6) onde não existe (proteção NOT EXISTS para WCs que já têm)

-- ─── 1. VARANDA — Paredes base (fase 2, sub_elemento null) ───────────────────
INSERT INTO elementos (apartamento_id, divisao_id, fase_id, elemento, sub_elemento, concluido)
SELECT d.apartamento_id, d.id, 2, 'Paredes', null, false
FROM divisoes d
WHERE LOWER(d.nome) = 'varanda'
AND NOT EXISTS (
  SELECT 1 FROM elementos e
  WHERE e.divisao_id = d.id
  AND e.elemento = 'Paredes'
  AND e.sub_elemento IS NULL
);

-- ─── 2. VARANDA — subitems de pintura Teto + Paredes + Pedras ────────────────
INSERT INTO elementos (apartamento_id, divisao_id, fase_id, elemento, sub_elemento, concluido)
SELECT d.apartamento_id, d.id, v.fase_id, v.elemento, v.sub_elemento, false
FROM divisoes d
CROSS JOIN (VALUES
  (10, 'Teto',    'Primário'),
  (10, 'Teto',    'Extracoat'),
  (10, 'Teto',    '1ª demão'),
  (10, 'Teto',    '2ª demão'),
  (12, 'Paredes', 'Primário'),
  (12, 'Paredes', 'Extracoat'),
  (12, 'Paredes', '1ª demão'),
  (12, 'Paredes', '2ª demão'),
  (2,  'Paredes', 'Pedra do peitoril'),
  (2,  'Paredes', 'Pedra da fachada')
) AS v(fase_id, elemento, sub_elemento)
WHERE LOWER(d.nome) = 'varanda'
AND NOT EXISTS (
  SELECT 1 FROM elementos e
  WHERE e.divisao_id = d.id
  AND e.elemento = v.elemento
  AND e.sub_elemento = v.sub_elemento
);

-- ─── 3. COZINHA — Móveis (fase 6) onde não existe ────────────────────────────
INSERT INTO elementos (apartamento_id, divisao_id, fase_id, elemento, sub_elemento, concluido)
SELECT d.apartamento_id, d.id, 6, 'Móveis', null, false
FROM divisoes d
WHERE LOWER(d.nome) = 'cozinha'
AND NOT EXISTS (
  SELECT 1 FROM elementos e
  WHERE e.divisao_id = d.id
  AND e.elemento = 'Móveis'
  AND e.sub_elemento IS NULL
);

-- ─── 4. WC — Móveis (fase 6) onde não existe ─────────────────────────────────
INSERT INTO elementos (apartamento_id, divisao_id, fase_id, elemento, sub_elemento, concluido)
SELECT d.apartamento_id, d.id, 6, 'Móveis', null, false
FROM divisoes d
WHERE LOWER(d.nome) LIKE 'wc%'
AND NOT EXISTS (
  SELECT 1 FROM elementos e
  WHERE e.divisao_id = d.id
  AND e.elemento = 'Móveis'
  AND e.sub_elemento IS NULL
);
