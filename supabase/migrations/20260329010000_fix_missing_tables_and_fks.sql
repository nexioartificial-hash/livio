-- ================================================================
-- Migration: Fix missing tables, broken FKs, and add indexes
-- Date: 2026-03-29
-- ================================================================

-- ================================================================
-- A) CREATE tarea table (dashboard tasks)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.tarea (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinic(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    completada BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tarea ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own clinic tasks" ON public.tarea;
CREATE POLICY "Users manage own clinic tasks" ON public.tarea FOR ALL
USING (clinic_id = (SELECT clinic_id FROM public.professional WHERE id = auth.uid()))
WITH CHECK (clinic_id = (SELECT clinic_id FROM public.professional WHERE id = auth.uid()));

-- Auto-update updated_at
DROP TRIGGER IF EXISTS set_timestamp_tarea ON public.tarea;
CREATE TRIGGER set_timestamp_tarea
  BEFORE UPDATE ON public.tarea
  FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

-- ================================================================
-- B) CREATE notifications table
-- ================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    clinic_id UUID REFERENCES public.clinic(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('agenda', 'stock', 'lead', 'alerta', 'info')),
    title TEXT NOT NULL,
    body TEXT,
    link TEXT,
    unread BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Users can insert notifications for themselves
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
CREATE POLICY "Users can insert own notifications" ON public.notifications
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can delete their own notifications
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications
    FOR DELETE USING (user_id = auth.uid());

-- ================================================================
-- C) FIX foreign keys on lead and alerta tables
--    clinic_id wrongly references professional(id), should reference clinic(id)
-- ================================================================

-- Fix lead.clinic_id FK
DO $$
DECLARE
    _con_name TEXT;
BEGIN
    -- Find the constraint name for lead.clinic_id -> professional(id)
    SELECT con.conname INTO _con_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    JOIN pg_class frel ON frel.oid = con.confrelid
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'lead'
      AND frel.relname = 'professional'
      AND con.contype = 'f';

    IF _con_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.lead DROP CONSTRAINT %I', _con_name);
    END IF;
END $$;

ALTER TABLE public.lead
    ADD CONSTRAINT lead_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinic(id) ON DELETE CASCADE;

-- Fix alerta.clinic_id FK
DO $$
DECLARE
    _con_name TEXT;
BEGIN
    SELECT con.conname INTO _con_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    JOIN pg_class frel ON frel.oid = con.confrelid
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'alerta'
      AND frel.relname = 'professional'
      AND con.contype = 'f';

    IF _con_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.alerta DROP CONSTRAINT %I', _con_name);
    END IF;
END $$;

ALTER TABLE public.alerta
    ADD CONSTRAINT alerta_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinic(id) ON DELETE CASCADE;

-- ================================================================
-- D) Performance indexes on clinic_id columns
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_patient_clinic_id ON public.patient(clinic_id);
CREATE INDEX IF NOT EXISTS idx_turno_clinic_id ON public.turno(clinic_id);
CREATE INDEX IF NOT EXISTS idx_lead_clinic_id ON public.lead(clinic_id);
CREATE INDEX IF NOT EXISTS idx_alerta_clinic_id ON public.alerta(clinic_id);
CREATE INDEX IF NOT EXISTS idx_tratamientos_clinic_id ON public.tratamientos(clinic_id);
CREATE INDEX IF NOT EXISTS idx_inventario_clinic_id ON public.inventario(clinic_id);
-- idx_clinical_record_clinic_id moved to next migration (column added there)
CREATE INDEX IF NOT EXISTS idx_tarea_clinic_id ON public.tarea(clinic_id);
CREATE INDEX IF NOT EXISTS idx_notifications_clinic_id ON public.notifications(clinic_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
