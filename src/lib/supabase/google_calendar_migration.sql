-- ================================================================
-- Google Calendar Bidirectional Sync — Migration
-- Run this once in Supabase SQL Editor
-- ================================================================

-- 1. Extend professional table with Google token columns
ALTER TABLE public.professional
  ADD COLUMN IF NOT EXISTS google_calendar_id      TEXT          DEFAULT 'primary',
  ADD COLUMN IF NOT EXISTS google_user_email       TEXT,
  ADD COLUMN IF NOT EXISTS google_access_token     TEXT,
  ADD COLUMN IF NOT EXISTS google_refresh_token    TEXT,
  ADD COLUMN IF NOT EXISTS google_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS calendar_sync_enabled   BOOLEAN       DEFAULT FALSE;

-- 2. Extend turno table with google_event_id
ALTER TABLE public.turno
  ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- 3. Create bloqueo_horario table
CREATE TABLE IF NOT EXISTS public.bloqueo_horario (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profesional_id  UUID REFERENCES public.professional(id) ON DELETE CASCADE,
  bloqueo_desde   TIMESTAMPTZ NOT NULL,
  bloqueo_hasta   TIMESTAMPTZ NOT NULL,
  tipo            VARCHAR(50) DEFAULT 'externo_google'
                  CHECK (tipo IN ('externo_google','vacaciones','falta','mantenimiento')),
  descripcion     TEXT,
  google_event_id TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profesional_id, bloqueo_desde, bloqueo_hasta)
);

CREATE INDEX IF NOT EXISTS idx_bloqueo_profesional_rango
  ON public.bloqueo_horario(profesional_id, bloqueo_desde, bloqueo_hasta);

-- 4. RLS bloqueo_horario
ALTER TABLE public.bloqueo_horario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_recepcionista_lee_bloqueos" ON public.bloqueo_horario;
CREATE POLICY "admin_recepcionista_lee_bloqueos" ON public.bloqueo_horario
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.professional
      WHERE id = auth.uid() AND role IN ('superadmin', 'recepcionista')
    )
  );

DROP POLICY IF EXISTS "profesional_lee_sus_bloqueos" ON public.bloqueo_horario;
CREATE POLICY "profesional_lee_sus_bloqueos" ON public.bloqueo_horario
  FOR SELECT USING (profesional_id = auth.uid());

DROP POLICY IF EXISTS "admin_manage_bloqueos" ON public.bloqueo_horario;
CREATE POLICY "admin_manage_bloqueos" ON public.bloqueo_horario
  FOR ALL USING (public.is_admin());
