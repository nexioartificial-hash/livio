-- ================================================================
-- TABLA: lead (Tareas/Prospectos)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.lead (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES public.professional(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    telefono TEXT,
    email TEXT,
    motivoconsulta TEXT,
    estadopipeline TEXT DEFAULT 'nuevo', -- nuevo, contactado, descartado
    estado TEXT DEFAULT 'nuevo',          -- redundante para el código del dashboard, se usará 'nuevo'/'contactado'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para leads
ALTER TABLE public.lead ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinics can view own leads" ON public.lead;
CREATE POLICY "Clinics can view own leads" ON public.lead 
    FOR SELECT USING (clinic_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.professional p 
        WHERE p.id = auth.uid() AND p.clinic_id = lead.clinic_id
    ));

DROP POLICY IF EXISTS "Clinics can update own leads" ON public.lead;
CREATE POLICY "Clinics can update own leads" ON public.lead 
    FOR UPDATE USING (clinic_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.professional p 
        WHERE p.id = auth.uid() AND p.clinic_id = lead.clinic_id
    ));

-- ================================================================
-- TABLA: alerta (Alertas persistentes)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.alerta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES public.professional(id) ON DELETE CASCADE,
    mensaje TEXT NOT NULL,
    tipo TEXT DEFAULT 'info', -- info, aviso, urgente
    leida BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para alertas
ALTER TABLE public.alerta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinics can view own alerts" ON public.alerta;
CREATE POLICY "Clinics can view own alerts" ON public.alerta 
    FOR SELECT USING (clinic_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.professional p 
        WHERE p.id = auth.uid() AND p.clinic_id = alerta.clinic_id
    ));

DROP POLICY IF EXISTS "Clinics can update own alerts" ON public.alerta;
CREATE POLICY "Clinics can update own alerts" ON public.alerta 
    FOR UPDATE USING (clinic_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.professional p 
        WHERE p.id = auth.uid() AND p.clinic_id = alerta.clinic_id
    ));

-- Función para updated_at (si ya existe en production_schema.sql saltar)
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_lead ON public.lead;
CREATE TRIGGER set_timestamp_lead
  BEFORE UPDATE ON public.lead
  FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
