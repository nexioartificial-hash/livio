-- Migration: Onboarding & Clinic Structure

-- 1. Add columns to professional
ALTER TABLE public.professional ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT false;
ALTER TABLE public.professional ADD COLUMN IF NOT EXISTS specialty TEXT;

-- 2. Create Clinic Table
CREATE TABLE IF NOT EXISTS public.clinic (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    cuit TEXT,
    phone TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Sucursal (Branch) Table
CREATE TABLE IF NOT EXISTS public.sucursal (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID REFERENCES public.clinic(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    google_maps_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Set RLS
ALTER TABLE public.clinic ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sucursal ENABLE ROW LEVEL SECURITY;

-- 5. Policies
-- Professional: Allow users to manage their own profile
DROP POLICY IF EXISTS "Users can manage own profile" ON public.professional;
CREATE POLICY "Users manage own profile"
ON public.professional FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Clinic: Allow owners to manage their clinic
DROP POLICY IF EXISTS "Clinic owners can manage their clinic" ON public.clinic;
CREATE POLICY "Clinic owners manage their clinic" 
ON public.clinic FOR ALL 
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Professionals: Can view their clinic
DROP POLICY IF EXISTS "Professionals can view their clinic" ON public.clinic;
CREATE POLICY "Professionals view their clinic"
ON public.clinic FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.professional 
    WHERE id = auth.uid() AND clinic_id = public.clinic.id
));

-- Sucursal: Allow clinic owners to manage branches
DROP POLICY IF EXISTS "Staff can manage sucursales" ON public.sucursal;
CREATE POLICY "Staff manage sucursales"
ON public.sucursal FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.clinic 
    WHERE id = public.sucursal.clinic_id AND owner_id = auth.uid()
))
WITH CHECK (EXISTS (
    SELECT 1 FROM public.clinic 
    WHERE id = public.sucursal.clinic_id AND owner_id = auth.uid()
));

-- Professionals: Can view branches
DROP POLICY IF EXISTS "Staff can view sucursales" ON public.sucursal;
CREATE POLICY "Staff view sucursales"
ON public.sucursal FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.professional 
    WHERE id = auth.uid() AND clinic_id = public.sucursal.clinic_id
));
