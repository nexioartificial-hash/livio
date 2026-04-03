-- 1. Create Role Enum (Indempotent)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('superadmin', 'recepcionista', 'profesional');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Professional/Profile Table
CREATE TABLE IF NOT EXISTS public.professional (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    clinic_id UUID DEFAULT NULL,
    full_name TEXT,
    role user_role DEFAULT 'profesional',
    license TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure cascade delete if table already existed without it
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'professional' AND constraint_type = 'FOREIGN KEY'
    ) THEN
        -- We try to drop and recreate to ensure ON DELETE CASCADE
        -- This is safe in this context as the user is re-running the script
        ALTER TABLE public.professional DROP CONSTRAINT IF EXISTS professional_id_fkey;
        ALTER TABLE public.professional ADD CONSTRAINT professional_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
EXCEPTION
    WHEN others THEN null;
END $$;

-- Enable RLS
ALTER TABLE public.professional ENABLE ROW LEVEL SECURITY;

-- 3. [CLEANUP] Triggers removed
-- We removed the Postgres trigger because it was causing internal errors
-- in Supabase during Admin Invitations. Profiles are now created 
-- manually in the Server Action: src/app/actions/team.ts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 4. RLS Policies
-- Helper function to check role without recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.professional 
        WHERE id = auth.uid() AND role = 'superadmin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Professional Table Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.professional;
CREATE POLICY "Users can view own profile" 
ON public.professional FOR SELECT 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "SuperAdmin full access" ON public.professional;
CREATE POLICY "SuperAdmin full access" 
ON public.professional FOR ALL 
USING (public.is_admin());

-- Historia Clinica RLS (Mock paths/table names)
-- Replace 'historia_clinica' with actual table name
-- CREATE POLICY "Profesional view own patients" ON public.historia_clinica
-- FOR SELECT USING (profesional_id = auth.uid() OR role = 'superadmin');

-- 5. Team Members View (Joined with Auth)
-- This view allows admins to see emails which are stored in auth.users
CREATE OR REPLACE VIEW public.team_members WITH (security_invoker = false) AS
SELECT 
    p.id,
    p.full_name,
    p.role,
    p.clinic_id,
    p.created_at,
    u.email,
    u.last_sign_in_at,
    CASE 
        WHEN u.last_sign_in_at IS NULL THEN 'pendiente' 
        ELSE 'activo' 
    END as status
FROM auth.users u
LEFT JOIN public.professional p ON u.id = p.id;

-- Grant access to the view
-- 6. Patients Table
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

-- 7. Clinical Records / History
CREATE TABLE IF NOT EXISTS public.clinical_record (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES public.patient(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES public.professional(id),
    type TEXT DEFAULT 'consulta', -- consulta, evolucion, etc.
    notes TEXT,
    odontogram_state JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Patients and Records
ALTER TABLE public.patient ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_record ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Professionals can view all patients" ON public.patient;
CREATE POLICY "Professionals can view all patients" 
ON public.patient FOR SELECT 
USING (true); -- Filter by clinic_id in practice

DROP POLICY IF EXISTS "Professionals can insert patients" ON public.patient;
CREATE POLICY "Professionals can insert patients" 
ON public.patient FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Professionals can view clinical records" ON public.clinical_record;
CREATE POLICY "Professionals can view clinical records" 
ON public.clinical_record FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Professionals can insert clinical records" ON public.clinical_record;
CREATE POLICY "Professionals can insert clinical records" 
ON public.clinical_record FOR ALL 
USING (true);

-- 8. Turno Table (Appointments)
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
    status TEXT DEFAULT 'pendiente', -- pendiente, confirmado, cancelado, asistio, no_asistio
    source TEXT DEFAULT 'manual', -- manual, google, excel, calendly
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Turno
ALTER TABLE public.turno ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Professionals can view all turnos" ON public.turno;
CREATE POLICY "Professionals can view all turnos" 
ON public.turno FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Professionals can manage turnos" ON public.turno;
CREATE POLICY "Professionals can manage turnos" 
ON public.turno FOR ALL 
USING (true);
