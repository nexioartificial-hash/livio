-- Fix: infinite recursion in RLS policy for "professional" table.
-- The "Clinic members can view team" policy queries professional to get
-- the current user's clinic_id, which triggers the same policy again.
-- Solution: use a SECURITY DEFINER function that bypasses RLS.

-- 1. Create helper function to get current user's clinic_id (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_my_clinic_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT clinic_id FROM public.professional WHERE id = auth.uid() LIMIT 1;
$$;

-- 2. Replace the recursive policy with one that uses the helper function
DROP POLICY IF EXISTS "Clinic members can view team" ON public.professional;
CREATE POLICY "Clinic members can view team"
ON public.professional FOR SELECT
USING (
    clinic_id = public.get_my_clinic_id()
);
