-- Migration: Invite System for Livio
-- Cumplimiento Ley 27.706: Trazabilidad de roles y accesos

-- 1. Create invite_status enum
DO $$ BEGIN
    CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Invites Table
CREATE TABLE IF NOT EXISTS public.invites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID REFERENCES public.clinic(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'profesional',
    inviter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    inviter_name TEXT,
    status invite_status DEFAULT 'pending',
    token UUID DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate pending invites for the same email in the same clinic
    CONSTRAINT unique_pending_invite UNIQUE (clinic_id, email)
);

-- 3. Enable RLS
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Superadmin of the clinic can manage all invites
DROP POLICY IF EXISTS "Clinic owner manages invites" ON public.invites;
CREATE POLICY "Clinic owner manages invites"
ON public.invites FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.professional
        WHERE id = auth.uid()
          AND role = 'superadmin'
          AND clinic_id = invites.clinic_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.professional
        WHERE id = auth.uid()
          AND role = 'superadmin'
          AND clinic_id = invites.clinic_id
    )
);

-- Anyone can view their own invite (by email match through auth)
DROP POLICY IF EXISTS "Users can view own invites" ON public.invites;
CREATE POLICY "Users can view own invites"
ON public.invites FOR SELECT
USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- 5. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_invites_email ON public.invites(email);
CREATE INDEX IF NOT EXISTS idx_invites_clinic_status ON public.invites(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_invites_token ON public.invites(token);
