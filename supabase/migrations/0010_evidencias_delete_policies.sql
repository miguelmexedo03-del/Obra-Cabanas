-- Corrige bug: apagar evidências/fotos falhava silenciosamente porque a migration
-- 0009 só criou políticas de SELECT e INSERT. Sem política de DELETE, o Postgres
-- nega a operação silenciosamente (0 linhas afetadas, sem erro) — por isso o botão
-- "Apagar registo" na mobile parecia funcionar mas o registo reaparecia.
CREATE POLICY "autenticados podem apagar evidencias" ON item_evidencias
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "autenticados podem apagar fotos" ON evidencia_fotos
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "autenticados podem apagar evidencias storage" ON storage.objects
  FOR DELETE USING (bucket_id = 'evidencias' AND auth.role() = 'authenticated');
