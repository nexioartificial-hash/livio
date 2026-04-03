CREATE TABLE inventario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinic(id) ON DELETE CASCADE,
  producto VARCHAR NOT NULL,
  categoria VARCHAR NOT NULL,
  stock_actual INT NOT NULL DEFAULT 0,
  stock_min INT NOT NULL DEFAULT 0,
  precio_unit DECIMAL NOT NULL DEFAULT 0.00,
  vencimiento DATE,
  ubicacion VARCHAR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE inventario ENABLE ROW LEVEL SECURITY;

-- Políticas para inventario ligadas a clinic_id
CREATE POLICY "Users can view su clinic inventario"
ON inventario FOR SELECT
TO authenticated
USING (clinic_id IN (
  SELECT professional.clinic_id
  FROM professional
  WHERE professional.id = auth.uid()
));

CREATE POLICY "Users can insert su clinic inventario"
ON inventario FOR INSERT
TO authenticated
WITH CHECK (clinic_id IN (
  SELECT professional.clinic_id
  FROM professional
  WHERE professional.id = auth.uid()
));

CREATE POLICY "Users can update su clinic inventario"
ON inventario FOR UPDATE
TO authenticated
USING (clinic_id IN (
  SELECT professional.clinic_id
  FROM professional
  WHERE professional.id = auth.uid()
));

CREATE POLICY "Users can delete su clinic inventario"
ON inventario FOR DELETE
TO authenticated
USING (clinic_id IN (
  SELECT professional.clinic_id
  FROM professional
  WHERE professional.id = auth.uid()
));

