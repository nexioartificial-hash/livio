-- =============================================================================
-- Migration: Fix RLS Clinic Isolation
-- Date: 2026-03-29
-- Description: Replaces USING(true) policies with proper clinic_id isolation.
--              Adds clinic_id to clinical_record. Adds role escalation trigger.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Helper: reusable subquery to get the current user's clinic_id
--    (used in all policies below)
--    Pattern: (SELECT clinic_id FROM public.professional WHERE id = auth.uid())
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Add clinic_id to clinical_record (it was missing)
-- ---------------------------------------------------------------------------
ALTER TABLE public.clinical_record
    ADD COLUMN IF NOT EXISTS clinic_id UUID;

-- Backfill clinic_id from the parent patient row
UPDATE public.clinical_record cr
SET clinic_id = p.clinic_id
FROM public.patient p
WHERE cr.patient_id = p.id
  AND cr.clinic_id IS NULL;

-- ---------------------------------------------------------------------------
-- 2. Fix PATIENT policies
-- ---------------------------------------------------------------------------

-- SELECT
DROP POLICY IF EXISTS "Professionals can view all patients" ON public.patient;
CREATE POLICY "Clinic members can view own patients"
ON public.patient FOR SELECT
USING (
    clinic_id = (SELECT clinic_id FROM public.professional WHERE id = auth.uid())
);

-- INSERT
DROP POLICY IF EXISTS "Professionals can insert patients" ON public.patient;
CREATE POLICY "Clinic members can insert own patients"
ON public.patient FOR INSERT
WITH CHECK (
    clinic_id = (SELECT clinic_id FROM public.professional WHERE id = auth.uid())
);

-- UPDATE
DROP POLICY IF EXISTS "Clinic members can update own patients" ON public.patient;
CREATE POLICY "Clinic members can update own patients"
ON public.patient FOR UPDATE
USING (
    clinic_id = (SELECT clinic_id FROM public.professional WHERE id = auth.uid())
)
WITH CHECK (
    clinic_id = (SELECT clinic_id FROM public.professional WHERE id = auth.uid())
);

-- DELETE (superadmin only)
DROP POLICY IF EXISTS "Superadmin can delete patients" ON public.patient;
CREATE POLICY "Superadmin can delete patients"
ON public.patient FOR DELETE
USING (
    clinic_id = (SELECT clinic_id FROM public.professional WHERE id = auth.uid())
    AND public.is_admin()
);

-- ---------------------------------------------------------------------------
-- 3. Fix CLINICAL_RECORD policies
-- ---------------------------------------------------------------------------

-- Drop the old wide-open policies
DROP POLICY IF EXISTS "Professionals can view clinical records" ON public.clinical_record;
DROP POLICY IF EXISTS "Professionals can insert clinical records" ON public.clinical_record;

-- SELECT
CREATE POLICY "Clinic members can view own clinical records"
ON public.clinical_record FOR SELECT
USING (
    clinic_id = (SELECT clinic_id FROM public.professional WHERE id = auth.uid())
);

-- INSERT
CREATE POLICY "Clinic members can insert own clinical records"
ON public.clinical_record FOR INSERT
WITH CHECK (
    clinic_id = (SELECT clinic_id FROM public.professional WHERE id = auth.uid())
);

-- UPDATE
DROP POLICY IF EXISTS "Clinic members can update own clinical records" ON public.clinical_record;
CREATE POLICY "Clinic members can update own clinical records"
ON public.clinical_record FOR UPDATE
USING (
    clinic_id = (SELECT clinic_id FROM public.professional WHERE id = auth.uid())
)
WITH CHECK (
    clinic_id = (SELECT clinic_id FROM public.professional WHERE id = auth.uid())
);

-- DELETE (superadmin only)
DROP POLICY IF EXISTS "Superadmin can delete clinical records" ON public.clinical_record;
CREATE POLICY "Superadmin can delete clinical records"
ON public.clinical_record FOR DELETE
USING (
    clinic_id = (SELECT clinic_id FROM public.professional WHERE id = auth.uid())
    AND public.is_admin()
);

-- ---------------------------------------------------------------------------
-- 4. Fix TURNO (appointments) policies
-- ---------------------------------------------------------------------------

-- Drop old wide-open policies
DROP POLICY IF EXISTS "Professionals can view all turnos" ON public.turno;
DROP POLICY IF EXISTS "Professionals can manage turnos" ON public.turno;

-- SELECT
CREATE POLICY "Clinic members can view own turnos"
ON public.turno FOR SELECT
USING (
    clinic_id = (SELECT clinic_id FROM public.professional WHERE id = auth.uid())
);

-- INSERT
CREATE POLICY "Clinic members can insert own turnos"
ON public.turno FOR INSERT
WITH CHECK (
    clinic_id = (SELECT clinic_id FROM public.professional WHERE id = auth.uid())
);

-- UPDATE
CREATE POLICY "Clinic members can update own turnos"
ON public.turno FOR UPDATE
USING (
    clinic_id = (SELECT clinic_id FROM public.professional WHERE id = auth.uid())
)
WITH CHECK (
    clinic_id = (SELECT clinic_id FROM public.professional WHERE id = auth.uid())
);

-- DELETE (superadmin only)
CREATE POLICY "Superadmin can delete turnos"
ON public.turno FOR DELETE
USING (
    clinic_id = (SELECT clinic_id FROM public.professional WHERE id = auth.uid())
    AND public.is_admin()
);

-- ---------------------------------------------------------------------------
-- 5. Prevent role escalation on professional table
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.professional
            WHERE id = auth.uid() AND role = 'superadmin'
        ) THEN
            RAISE EXCEPTION 'Only superadmin can change roles';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.professional;
CREATE TRIGGER trg_prevent_role_escalation
    BEFORE UPDATE ON public.professional
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_role_escalation();

-- ---------------------------------------------------------------------------
-- 6. Tighten professional table policies
--    Keep "view own profile" and "superadmin full access" from the original
--    migration but add a same-clinic SELECT so team members can see each other.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Clinic members can view team" ON public.professional;
CREATE POLICY "Clinic members can view team"
ON public.professional FOR SELECT
USING (
    clinic_id = (SELECT clinic_id FROM public.professional WHERE id = auth.uid())
);

-- Index moved from previous migration (column was added in this file)
CREATE INDEX IF NOT EXISTS idx_clinical_record_clinic_id ON public.clinical_record(clinic_id);
