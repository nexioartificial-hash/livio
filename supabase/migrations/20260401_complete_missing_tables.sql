-- ================================================================
-- MIGRATION: Complete missing tables & fix inventario schema
-- Date: 2026-04-01
-- Purpose: Add all tables/views/seeds that exist in production
--          but were never captured in migrations
-- ================================================================

-- ================================================================
-- 1. OBRAS_SOCIALES (catálogo global de obras sociales argentinas)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.obras_sociales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rnas VARCHAR(20) UNIQUE,
    nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('obra_social', 'prepaga', 'monotributista', 'mutual', 'otros')),
    es_monotributo BOOLEAN DEFAULT FALSE,
    slug_corto VARCHAR(100),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obras_sociales_nombre ON public.obras_sociales(nombre);
CREATE INDEX IF NOT EXISTS idx_obras_sociales_monotributo ON public.obras_sociales(es_monotributo);

ALTER TABLE public.obras_sociales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin obras sociales" ON public.obras_sociales;
CREATE POLICY "Admin obras sociales"
    ON public.obras_sociales FOR ALL
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.professional WHERE id = auth.uid() AND role = 'superadmin')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.professional WHERE id = auth.uid() AND role = 'superadmin')
    );

DROP POLICY IF EXISTS "Lectura obras activas" ON public.obras_sociales;
CREATE POLICY "Lectura obras activas"
    ON public.obras_sociales FOR SELECT
    TO authenticated
    USING (activo = true);

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

-- Trigger updated_at
DROP TRIGGER IF EXISTS set_timestamp_obras ON public.obras_sociales;
CREATE TRIGGER set_timestamp_obras
    BEFORE UPDATE ON public.obras_sociales
    FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

-- ================================================================
-- 2. SEED: obras_sociales (50+ obras sociales argentinas)
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
-- 3. VISTA: búsqueda de obras sociales activas
-- ================================================================
CREATE OR REPLACE VIEW public.vw_obras_sociales_search AS
SELECT id, nombre, slug_corto, tipo, es_monotributo
FROM public.obras_sociales
WHERE activo = true
ORDER BY nombre;

-- ================================================================
-- 4. PATIENT: agregar FK a obras_sociales
-- ================================================================
ALTER TABLE public.patient
    ADD COLUMN IF NOT EXISTS obrasocial_id UUID REFERENCES public.obras_sociales(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_patient_obrasocial ON public.patient(obrasocial_id);

-- ================================================================
-- 5. CLINICA_OBRAS_SOCIALES (obras sociales por clínica con planes y cobertura)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.clinica_obras_sociales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinic(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    plan TEXT DEFAULT '',
    cobertura_pct NUMERIC DEFAULT 0,
    tratamientos TEXT[] DEFAULT '{}',
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinica_obras_sociales_clinic ON public.clinica_obras_sociales(clinic_id);

ALTER TABLE public.clinica_obras_sociales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic members can view own obras sociales" ON public.clinica_obras_sociales;
CREATE POLICY "Clinic members can view own obras sociales"
    ON public.clinica_obras_sociales FOR SELECT
    TO authenticated
    USING (
        clinic_id = (SELECT clinic_id FROM public.professional WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Clinic admin can manage obras sociales" ON public.clinica_obras_sociales;
CREATE POLICY "Clinic admin can manage obras sociales"
    ON public.clinica_obras_sociales FOR ALL
    TO authenticated
    USING (
        clinic_id = (SELECT clinic_id FROM public.professional WHERE id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.professional
            WHERE id = auth.uid() AND role IN ('superadmin', 'recepcionista')
        )
    )
    WITH CHECK (
        clinic_id = (SELECT clinic_id FROM public.professional WHERE id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.professional
            WHERE id = auth.uid() AND role IN ('superadmin', 'recepcionista')
        )
    );

DROP TRIGGER IF EXISTS set_timestamp_clinica_obras ON public.clinica_obras_sociales;
CREATE TRIGGER set_timestamp_clinica_obras
    BEFORE UPDATE ON public.clinica_obras_sociales
    FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

-- ================================================================
-- 6. SUBSCRIPTIONS (suscripciones y pagos con MercadoPago)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id UUID NOT NULL REFERENCES public.clinic(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    plan TEXT NOT NULL DEFAULT 'trial',
    status TEXT NOT NULL DEFAULT 'trialing',
    trial_ends_at TIMESTAMPTZ,
    current_period_ends_at TIMESTAMPTZ,
    mp_preference_id TEXT,
    mp_payment_id TEXT,
    mp_preapproval_id TEXT,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT subscriptions_clinica_id_key UNIQUE (clinica_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_clinica ON public.subscriptions(clinica_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Cualquier miembro de la clínica puede ver la suscripción
DROP POLICY IF EXISTS "Clinic members can view subscription" ON public.subscriptions;
CREATE POLICY "Clinic members can view subscription"
    ON public.subscriptions FOR SELECT
    TO authenticated
    USING (
        clinica_id = (SELECT clinic_id FROM public.professional WHERE id = auth.uid())
    );

-- Solo el admin puede modificar (los webhooks usan service_role que bypasea RLS)
DROP POLICY IF EXISTS "Admin can manage subscription" ON public.subscriptions;
CREATE POLICY "Admin can manage subscription"
    ON public.subscriptions FOR ALL
    TO authenticated
    USING (
        clinica_id = (SELECT clinic_id FROM public.professional WHERE id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.professional
            WHERE id = auth.uid() AND role = 'superadmin'
        )
    )
    WITH CHECK (
        clinica_id = (SELECT clinic_id FROM public.professional WHERE id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.professional
            WHERE id = auth.uid() AND role = 'superadmin'
        )
    );

DROP TRIGGER IF EXISTS set_timestamp_subscriptions ON public.subscriptions;
CREATE TRIGGER set_timestamp_subscriptions
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

-- ================================================================
-- 7. INVENTARIO: actualizar schema para coincidir con el código
-- ================================================================

-- Renombrar columnas existentes
ALTER TABLE public.inventario RENAME COLUMN producto TO nombre;
ALTER TABLE public.inventario RENAME COLUMN stock_min TO stock_minimo;
ALTER TABLE public.inventario RENAME COLUMN precio_unit TO precio_compra;
ALTER TABLE public.inventario RENAME COLUMN vencimiento TO caduca;

-- Eliminar columna vieja
ALTER TABLE public.inventario DROP COLUMN IF EXISTS ubicacion;

-- Agregar columnas nuevas
ALTER TABLE public.inventario ADD COLUMN IF NOT EXISTS precio_venta DECIMAL DEFAULT 0;
ALTER TABLE public.inventario ADD COLUMN IF NOT EXISTS sucursal_id UUID REFERENCES public.sucursal(id) ON DELETE SET NULL;
ALTER TABLE public.inventario ADD COLUMN IF NOT EXISTS proveedor TEXT DEFAULT '';
ALTER TABLE public.inventario ADD COLUMN IF NOT EXISTS lote TEXT DEFAULT '';
ALTER TABLE public.inventario ADD COLUMN IF NOT EXISTS notas TEXT DEFAULT '';
ALTER TABLE public.inventario ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;

-- Cambiar tipo de categoria a TEXT si era VARCHAR
ALTER TABLE public.inventario ALTER COLUMN categoria TYPE TEXT;
ALTER TABLE public.inventario ALTER COLUMN nombre TYPE TEXT;

CREATE INDEX IF NOT EXISTS idx_inventario_sucursal ON public.inventario(sucursal_id);
