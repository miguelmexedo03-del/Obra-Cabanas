-- BACKUP / RESTORE — divisão "WC de Serviço" do AP8 (apartamento_id = 8, divisao_id = 73)
--
-- Contexto: o Miguel confirmou que esta divisão não existe fisicamente no AP8 e pediu
-- para a remover do checklist (2026-07-06). O ficheiro Excel de origem
-- (Cabanas_Checklist.xlsx, sheet AP8) TEM esta divisão listada — a divergência é entre
-- o planeamento original e a obra construída, não um erro da app.
--
-- Nota importante: 15 dos 20 itens abaixo estavam marcados como concluídos no dia
-- 2026-07-06 às ~08:02 por um utilizador da equipa (concluido_por preenchido) — ou
-- seja, havia atividade recente nesta divisão. O Miguel confirmou explicitamente que
-- queria apagar mesmo assim. Este ficheiro permite reverter a decisão (recriar a
-- divisão e os 20 itens exatamente como estavam, incluindo quem/quando marcou cada um).
--
-- Para reverter: corre o bloco "RESTORE" abaixo (mcp__supabase__execute_sql ou
-- supabase SQL editor). Os ids não são colunas identity — o INSERT com id explícito
-- funciona sem OVERRIDING SYSTEM VALUE.

-- ============================================================
-- RESTORE (recriar divisão + 20 itens)
-- ============================================================

INSERT INTO divisoes (id, apartamento_id, nome, ordem) VALUES
  (73, 8, 'WC de Serviço', 5);

INSERT INTO elementos (id, apartamento_id, divisao_id, fase_id, elemento, sub_elemento, concluido, notas, concluido_por, concluido_em) VALUES
  (668, 8, 73, 4,  'Chão',   NULL,                  true, NULL, NULL,                                    NULL),
  (669, 8, 73, 3,  'Aro',    NULL,                  true, NULL, '0a7e385f-2a35-470a-8572-c7442bcf9bab', '2026-07-06 08:02:52.918784+00'),
  (670, 8, 73, 3,  'Porta',  NULL,                  true, NULL, '0a7e385f-2a35-470a-8572-c7442bcf9bab', '2026-07-06 08:02:52.444599+00'),
  (671, 8, 73, 1,  'Teto',   NULL,                  true, NULL, NULL,                                    NULL),
  (672, 8, 73, 1,  'Teto',   'Tratamento de Junta', true, NULL, '0a7e385f-2a35-470a-8572-c7442bcf9bab', '2026-07-06 08:02:42.044461+00'),
  (673, 8, 73, 9,  'Teto',   'Parafuso',            true, NULL, NULL,                                    NULL),
  (674, 8, 73, 9,  'Teto',   'Remendo foco',        true, NULL, '0a7e385f-2a35-470a-8572-c7442bcf9bab', '2026-07-06 08:02:42.787766+00'),
  (675, 8, 73, 10, 'Teto',   'Primário',            true, NULL, '0a7e385f-2a35-470a-8572-c7442bcf9bab', '2026-07-06 08:02:43.542148+00'),
  (676, 8, 73, 10, 'Teto',   'Extracoat',           true, NULL, '0a7e385f-2a35-470a-8572-c7442bcf9bab', '2026-07-06 08:02:44.059477+00'),
  (677, 8, 73, 10, 'Teto',   '1ª demão',            true, NULL, '0a7e385f-2a35-470a-8572-c7442bcf9bab', '2026-07-06 08:02:44.562802+00'),
  (678, 8, 73, 10, 'Teto',   '2ª demão',            true, NULL, '0a7e385f-2a35-470a-8572-c7442bcf9bab', '2026-07-06 08:02:45.478721+00'),
  (679, 8, 73, 2,  'Paredes', NULL,                 true, NULL, NULL,                                    NULL),
  (680, 8, 73, 11, 'Paredes', 'Mecanismos',         true, NULL, '0a7e385f-2a35-470a-8572-c7442bcf9bab', '2026-07-06 08:02:46.503793+00'),
  (681, 8, 73, 12, 'Paredes', 'Primário',           true, NULL, '0a7e385f-2a35-470a-8572-c7442bcf9bab', '2026-07-06 08:02:47.015115+00'),
  (682, 8, 73, 12, 'Paredes', 'Extracoat',          true, NULL, '0a7e385f-2a35-470a-8572-c7442bcf9bab', '2026-07-06 08:02:49.135832+00'),
  (683, 8, 73, 12, 'Paredes', '1ª demão',           true, NULL, '0a7e385f-2a35-470a-8572-c7442bcf9bab', '2026-07-06 08:02:49.618225+00'),
  (684, 8, 73, 12, 'Paredes', '2ª demão',           true, NULL, '0a7e385f-2a35-470a-8572-c7442bcf9bab', '2026-07-06 08:02:50.145054+00'),
  (685, 8, 73, 6,  'Móveis',  NULL,                 true, NULL, '0a7e385f-2a35-470a-8572-c7442bcf9bab', '2026-07-06 08:02:54.880964+00'),
  (686, 8, 73, 5,  'Lavatório', NULL,               true, NULL, '0a7e385f-2a35-470a-8572-c7442bcf9bab', '2026-07-06 08:02:54.228846+00'),
  (687, 8, 73, 5,  'Sanita',  NULL,                 true, NULL, '0a7e385f-2a35-470a-8572-c7442bcf9bab', '2026-07-06 08:02:55.408193+00');

-- ============================================================
-- DELETE (o que foi executado em 2026-07-06 — mantido aqui só para referência)
-- ============================================================
-- delete from elementos where divisao_id = 73;
-- delete from divisoes where id = 73;
