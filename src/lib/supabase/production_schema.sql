-- 1. Enum para Roles
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('superadmin', 'recepcionista', 'profesional');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Tabla de Profesionales (Base de usuarios)
CREATE TABLE IF NOT EXISTS public.professional (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    clinic_id UUID DEFAULT NULL,
    full_name TEXT,
    role user_role DEFAULT 'profesional',
    license TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar restricción de clave foránea
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'professional' AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE public.professional DROP CONSTRAINT IF EXISTS professional_id_fkey;
        ALTER TABLE public.professional ADD CONSTRAINT professional_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
EXCEPTION
    WHEN others THEN null;
END $$;

-- Habilitar RLS en Professional
ALTER TABLE public.professional ENABLE ROW LEVEL SECURITY;

-- Funciones Auxiliares
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.professional 
        WHERE id = auth.uid() AND role = 'superadmin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas Professional
DROP POLICY IF EXISTS "Users can view own profile" ON public.professional;
CREATE POLICY "Users can view own profile" ON public.professional FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "SuperAdmin full access" ON public.professional;
CREATE POLICY "SuperAdmin full access" ON public.professional FOR ALL USING (public.is_admin());

-- 3. Tabla de Pacientes
CREATE TABLE IF NOT EXISTS public.patient (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID DEFAULT NULL,
    full_name TEXT NOT NULL,
    dni TEXT UNIQUE,
    email TEXT,
    phone TEXT,
    obra_social TEXT,
    gender TEXT,
    birth_date DATE,
    tags TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'activo',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.patient ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Professionals can view all patients" ON public.patient;
CREATE POLICY "Professionals can view all patients" ON public.patient FOR SELECT USING (true);

DROP POLICY IF EXISTS "Professionals can insert patients" ON public.patient;
CREATE POLICY "Professionals can insert patients" ON public.patient FOR INSERT WITH CHECK (true);

-- 4. Tabla de Historia Clínica
CREATE TABLE IF NOT EXISTS public.clinical_record (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES public.patient(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES public.professional(id),
    type TEXT DEFAULT 'consulta', 
    notes TEXT,
    odontogram_state JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.clinical_record ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Professionals can view clinical records" ON public.clinical_record;
CREATE POLICY "Professionals can view clinical records" ON public.clinical_record FOR SELECT USING (true);

DROP POLICY IF EXISTS "Professionals can insert clinical records" ON public.clinical_record;
CREATE POLICY "Professionals can insert clinical records" ON public.clinical_record FOR ALL USING (true);

-- 5. Tabla de Turnos (La que fallaba)
CREATE TABLE IF NOT EXISTS public.turno (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID DEFAULT NULL,
    patient_id UUID REFERENCES public.patient(id) ON DELETE SET NULL,
    patient_name TEXT NOT NULL,
    professional_id UUID REFERENCES public.professional(id) ON DELETE SET NULL,
    professional_name TEXT NOT NULL,
    sucursal TEXT DEFAULT 'Sede Central',
    date DATE NOT NULL,
    time TEXT NOT NULL,
    duration INTEGER DEFAULT 30,
    reason TEXT,
    status TEXT DEFAULT 'pendiente',
    source TEXT DEFAULT 'manual',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.turno ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Professionals can view all turnos" ON public.turno;
CREATE POLICY "Professionals can view all turnos" ON public.turno FOR SELECT USING (true);

DROP POLICY IF EXISTS "Professionals can manage turnos" ON public.turno;
CREATE POLICY "Professionals can manage turnos" ON public.turno FOR ALL USING (true);

-- 6. Vista de Miembros del Equipo
CREATE OR REPLACE VIEW public.team_members WITH (security_invoker = false) AS
SELECT 
    p.id,
    p.full_name,
    p.role,
    p.clinic_id,
    p.created_at,
    u.email,
    u.last_sign_in_at,
    CASE WHEN u.last_sign_in_at IS NULL THEN 'pendiente' ELSE 'activo' END as status
FROM auth.users u
LEFT JOIN public.professional p ON u.id = p.id;

-- ================================================================
-- TABLA: obras_sociales
-- ================================================================
CREATE TABLE IF NOT EXISTS public.obras_sociales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rnas VARCHAR(20) UNIQUE,
  nombre VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('obra_social', 'prepaga', 'monotributista', 'mutual', 'otros')),
  es_monotributo BOOLEAN DEFAULT FALSE,
  slug_corto VARCHAR(100),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_obras_sociales_nombre ON public.obras_sociales(nombre);
CREATE INDEX IF NOT EXISTS idx_obras_sociales_monotributo ON public.obras_sociales(es_monotributo);

-- RLS
ALTER TABLE public.obras_sociales ENABLE ROW LEVEL SECURITY;

-- Superadmin: acceso total
DROP POLICY IF EXISTS "Admin obras sociales" ON public.obras_sociales;
CREATE POLICY "Admin obras sociales"
  ON public.obras_sociales FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.professional
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.professional
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- Todos los autenticados: solo leer registros activos
DROP POLICY IF EXISTS "Lectura obras activas" ON public.obras_sociales;
CREATE POLICY "Lectura obras activas"
  ON public.obras_sociales FOR SELECT
  TO authenticated
  USING (activo = true);

-- Admin / recepcionista / profesional: pueden insertar
DROP POLICY IF EXISTS "Insert obras sociales" ON public.obras_sociales;
CREATE POLICY "Insert obras sociales"
  ON public.obras_sociales FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.professional
      WHERE id = auth.uid() AND role IN ('superadmin', 'recepcionista', 'profesional')
    )
  );

-- Admin / recepcionista: pueden actualizar
DROP POLICY IF EXISTS "Update obras sociales" ON public.obras_sociales;
CREATE POLICY "Update obras sociales"
  ON public.obras_sociales FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.professional
      WHERE id = auth.uid() AND role IN ('superadmin', 'recepcionista')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.professional
      WHERE id = auth.uid() AND role IN ('superadmin', 'recepcionista')
    )
  );


-- ================================================================
-- SEED: obras_sociales
-- ================================================================
INSERT INTO public.obras_sociales (rnas, nombre, tipo, es_monotributo, slug_corto) VALUES
('0-0150-8', 'OBRA SOCIAL DE LA ASOCIACION CIVIL PROSINDICATO DE AMAS DE CASA DE LA REPUBLICA ARGENTINA', 'obra_social', true, 'OS_AMAS_CASA'),
('0-0210-5', 'OBRA SOCIAL PROFESIONALES DEL TURF DE LA REPUBLICA ARGENTINA', 'obra_social', true, 'OS_TURF'),
('0-0260-0', 'OBRA SOCIAL DE LOS TRABAJADORES DE LA CARNE Y AFINES DE LA REPUBLICA ARGENTINA', 'obra_social', true, 'OS_CARNE'),
('0-0340-5', 'OBRA SOCIAL ASOCIACION MUTUAL DE LOS OBREROS CATOLICOS PADRE FEDERICO GROTE', 'obra_social', true, 'OS_OBREROS_CATOLICOS'),
('0-0360-3', 'OBRA SOCIAL PROGRAMAS MEDICOS SOCIEDAD ARGENTINA DE CONSULTORIA MUTUAL', 'obra_social', true, 'OS_PROGRAMAS_MEDICOS'),
('0-0380-1', 'OBRA SOCIAL DE LA PREVENCION Y LA SALUD', 'obra_social', true, 'OS_PREVENCION_SALUD'),
('1-0290-4', 'OBRA SOCIAL DEL PERSONAL DE BARRACAS DE LANAS, CUEROS Y ANEXOS', 'obra_social', true, 'OS_BARRACAS'),
('1-0460-3', 'OBRA SOCIAL DE OPERADORES CINEMATOGRAFICOS', 'obra_social', true, 'OS_CINEMATOGRAFICOS'),
('1-0480-1', 'OBRA SOCIAL DE COLOCADORES DE AZULEJOS, MOSAICOS, GRANITEROS, LUSTRADORES Y PORCELANEROS', 'obra_social', true, 'OS_AZULEJOS'),
('1-0620-3', 'OBRA SOCIAL DEL PERSONAL DE DISTRIBUIDORAS CINEMATOGRAFICAS DE LA R.A.', 'obra_social', true, 'OS_DISTRIBUIDORAS_CINE'),
('1-0800-1', 'OBRA SOCIAL PARA EL PERSONAL DE LA INDUSTRIA FORESTAL DE SANTIAGO DEL ESTERO', 'obra_social', true, 'OS_FORESTAL_SGO_ESTERO'),
('1-1130-8', 'OBRA SOCIAL DE MAQUINISTAS DE TEATRO Y TELEVISION', 'obra_social', true, 'OS_MAQUINISTAS_TEATRO'),
('1-1280-6', 'OBRA SOCIAL DE MUSICOS', 'obra_social', true, 'OS_MUSICOS'),
('1-1380-9', 'OBRA SOCIAL DE COMISARIOS NAVALES', 'obra_social', true, 'OS_COMISARIOS_NAVALES'),
('1-1510-2', 'OBRA SOCIAL DE TRABAJADORES DE PRENSA DE BUENOS AIRES', 'obra_social', true, 'OS_PRENSA_BA'),
('1-1820-0', 'OBRA SOCIAL DE AGENTES DE PROPAGANDA MEDICA DE LA REPUBLICA ARGENTINA', 'obra_social', true, 'OS_PROPAGANDA_MEDICA'),
('1-2210-4', 'OBRA SOCIAL DE VIAJANTES VENDEDORES DE LA REPUBLICA ARGENTINA (ANDAR)', 'obra_social', true, 'ANDAR'),
('1-2250-0', 'OBRA SOCIAL DEL PERSONAL DE LA INDUSTRIA DEL VIDRIO', 'obra_social', true, 'OS_VIDRIO'),
('1-2850-8', 'OBRA SOCIAL DE FARMACEUTICOS Y BIOQUIMICOS', 'obra_social', true, 'OS_FARMACEUTICOS'),
('4-0040-4', 'OBRA SOCIAL DEL PERSONAL DE DIRECCION DE LA INDUSTRIA CERVECERA Y MALTERA', 'obra_social', true, 'OS_CERVECERA'),
('4-0060-2', 'OBRA SOCIAL DEL PERSONAL DIRECTIVO DE LA INDUSTRIA DE LA CONSTRUCCION', 'obra_social', true, 'OSSPE'),
('4-0170-4', 'OBRA SOCIAL DE EMPRESARIOS, PROFESIONALES Y MONOTRIBUTISTAS', 'obra_social', true, 'OS_EMPRESARIOS'),
('4-0220-2', 'OBRA SOCIAL MUTUALIDAD INDUSTRIAL TEXTIL ARGENTINA', 'obra_social', true, 'OS_TEXTIL'),
('4-0260-8', 'OBRA SOCIAL ASOCIACION DE SERVICIOS SOCIALES PARA EMPRESARIOS Y PERSONAL DE DIRECCION', 'obra_social', true, 'ASSPE'),
('9-0170-9', 'MUTUAL MEDICA CONCORDIA', 'mutual', true, 'MUTUAL_CONCORDIA'),
('9-0180-8', 'ASOCIACION MUTUAL DE PARTICIPANTES DE ECONOMIA SOLIDARIAS', 'mutual', true, 'OS_ECONOMIA_SOLIDARIA'),
('9-0390-3', 'MET-CORDOBA SA', 'mutual', true, 'MET_CORDOBA'),
('9-0470-8', 'ASOCIACION MUTUAL DEL CONTROL INTEGRAL', 'mutual', true, 'OS_CONTROL_INTEGRAL'),
('9-0500-8', 'ADMINISTRACION RECURSOS PARA SALUD S.A.', 'mutual', true, 'OS_RECURSOS_SALUD'),
('9-0510-7', 'AMSTERDAM SALUD S.A.', 'mutual', true, 'AMSTERDAM_SALUD'),
('1-2670-0', 'OBRA SOCIAL DEL PERSONAL DE LA ACTIVIDAD AZUCARERA TUCUMANA', 'obra_social', false, 'OS_AZUCARERA_TUCUMAN'),
('1-2160-6', 'OBRA SOCIAL CONDUCTORES DE TRANSPORTE COLECTIVO DE PASAJEROS', 'obra_social', false, 'OS_TRANSPORTE_COLECTIVO'),
('1-0810-0', 'OBRA SOCIAL DEL PERSONAL DE LA INDUSTRIA DEL FOSFORO, ENCENDIDO Y AFINES', 'obra_social', false, 'OS_FOSFORO'),
('1-2300-8', 'OBRA SOCIAL PARA EL PERSONAL DE ESTACIONES DE SERVICIO, GARAGES, PLAYAS DE ESTACIONAMIENTO', 'obra_social', false, 'OS_ESTACIONES_SERVICIO'),
('1-1200-4', 'OBRA SOCIAL DEL PERSONAL SUPERIOR MERCEDES BENZ ARGENTINA', 'obra_social', false, 'OS_MERCEDES_BENZ'),
('1-0920-2', 'OBRA SOCIAL DE GUINCHEROS Y MAQUINISTAS DE GRUAS MOVILES', 'obra_social', false, 'OS_GUINCHEROS'),
('1-0900-4', 'OBRA SOCIAL DEL PERSONAL GRAFICO', 'obra_social', false, 'OS_PERSONAL_GRAFICO'),
('1-1210-3', 'OBRA SOCIAL DE LA UNION OBRERA METALURGICA DE LA REPUBLICA ARGENTINA', 'obra_social', false, 'UOM'),
('1-0010-6', 'OBRA SOCIAL PARA EL PERSONAL DE LA INDUSTRIA ACEITERA, DESMOTADORA Y AFINES', 'obra_social', false, 'OS_ACEITERA'),
('1-0020-5', 'OBRA SOCIAL DE ACTORES', 'obra_social', false, 'OS_ACTORES'),
('1-0540-8', 'OBRA SOCIAL DEL PERSONAL DE LA CONSTRUCCION', 'obra_social', false, 'OS_CONSTRUCCION'),
('1-1950-0', 'OBRA SOCIAL DEL PERSONAL DE LA SANIDAD ARGENTINA', 'obra_social', false, 'OS_SANIDAD'),
('OSDE',    'OSDE',                          'prepaga', false, 'OSDE'),
('SWISS',   'SWISS MEDICAL',                 'prepaga', false, 'SWISS_MEDICAL'),
('GALENO',  'GALENO ART',                    'prepaga', false, 'GALENO'),
('HPA',     'HOSPITALES PRIVADOS ARGENTINOS','prepaga', false, 'HPA'),
('DOCE',    'DOCE DE OCTUBRE',               'prepaga', false, 'DOCE'),
('OMINT',   'OMINT',                         'prepaga', false, 'OMINT'),
('PREMIUM', 'PREMIUM ART',                   'prepaga', false, 'PREMIUM'),
('SANCOR',  'SANCOR SALUD',                  'prepaga', false, 'SANCOR'),
('HMT',     'HOSPITAL METROPOLITANO',        'prepaga', false, 'HMT'),
('ITALMED', 'ITALMED',                       'prepaga', false, 'ITALMED'),
('PAMI',    'PAMI',                          'obra_social', false, 'PAMI')
ON CONFLICT (rnas) DO NOTHING;

-- ================================================================
-- MIGRACIÓN: Vincular patient con obras_sociales
-- ================================================================
-- Agrega FK a obras_sociales (obra_social VARCHAR se mantiene como fallback)
ALTER TABLE public.patient
  ADD COLUMN IF NOT EXISTS obrasocial_id UUID REFERENCES public.obras_sociales(id) ON DELETE SET NULL;

-- Índice para joins eficientes
CREATE INDEX IF NOT EXISTS idx_patient_obrasocial ON public.patient(obrasocial_id);

-- ================================================================
-- VISTA: búsqueda de obras sociales activas
-- ================================================================
CREATE OR REPLACE VIEW public.vw_obras_sociales_search AS
SELECT
  id,
  nombre,
  slug_corto,
  tipo,
  es_monotributo
FROM public.obras_sociales
WHERE activo = true
ORDER BY nombre;

-- ================================================================
-- TRIGGER: auto-actualizar updated_at en obras_sociales
-- ================================================================
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_obras ON public.obras_sociales;
CREATE TRIGGER set_timestamp_obras
  BEFORE UPDATE ON public.obras_sociales
  FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

-- ================================================================
-- VERIFICACIÓN (ejecutar manualmente en SQL Editor)
-- ================================================================
-- Conteo por tipo:
-- SELECT tipo, COUNT(*) total, SUM(es_monotributo::int) monotributistas
-- FROM obras_sociales GROUP BY tipo ORDER BY tipo;

-- Top 10 por nombre:
-- SELECT nombre, slug_corto, tipo FROM obras_sociales
-- WHERE activo = true ORDER BY nombre LIMIT 10;

