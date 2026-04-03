-- Migración para soporte de apellidos separados
ALTER TABLE public.patient 
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Nota: No movemos full_name a nombre todavía para mantener compatibilidad,
-- pero el sistema empezará a usar last_name si está disponible.
