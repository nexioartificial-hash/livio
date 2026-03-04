-- Migración para añadir Plan y Número de Afiliado a la tabla de pacientes
ALTER TABLE public.patient 
ADD COLUMN IF NOT EXISTS obra_social_plan TEXT,
ADD COLUMN IF NOT EXISTS affiliate_number TEXT;

-- Comentario para el equipo
COMMENT ON COLUMN public.patient.obra_social_plan IS 'Plan de la obra social del paciente';
COMMENT ON COLUMN public.patient.affiliate_number IS 'Número de afiliado a la obra social';
