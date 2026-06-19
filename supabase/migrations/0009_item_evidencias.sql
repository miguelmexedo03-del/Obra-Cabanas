-- Tabela de evidências (texto + metadados)
CREATE TABLE item_evidencias (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  elemento_id  integer NOT NULL REFERENCES elementos(id) ON DELETE CASCADE,
  texto        text,
  criado_por   uuid REFERENCES auth.users(id),
  criado_em    timestamptz NOT NULL DEFAULT now()
);

-- Tabela de fotos associadas a uma evidência
CREATE TABLE evidencia_fotos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidencia_id  uuid NOT NULL REFERENCES item_evidencias(id) ON DELETE CASCADE,
  storage_path  text NOT NULL,
  url_publica   text NOT NULL,
  criado_em     timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE item_evidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidencia_fotos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticados podem ver evidencias" ON item_evidencias
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "autenticados podem criar evidencias" ON item_evidencias
  FOR INSERT WITH CHECK (auth.uid() = criado_por);

CREATE POLICY "autenticados podem ver fotos" ON evidencia_fotos
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "autenticados podem criar fotos" ON evidencia_fotos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Storage bucket para fotos de evidências
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidencias', 'evidencias', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "publico pode ler evidencias storage" ON storage.objects
  FOR SELECT USING (bucket_id = 'evidencias');

CREATE POLICY "autenticados podem fazer upload evidencias" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'evidencias' AND auth.role() = 'authenticated');
