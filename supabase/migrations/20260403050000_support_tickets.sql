-- =============================================================================
-- Migration: Support Tickets System
-- Date: 2026-04-03
-- Description: Creates support_tickets and ticket_messages tables with RLS.
--              Users see their own tickets; superadmin sees all clinic tickets.
--              Livio support replies are inserted via service_role (admin client).
--              Also creates the support-attachments Storage bucket.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. support_tickets
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id    UUID        NOT NULL REFERENCES public.clinic(id) ON DELETE CASCADE,
  created_by   UUID        NOT NULL REFERENCES public.professional(id) ON DELETE CASCADE,
  category     TEXT        NOT NULL CHECK (category IN ('agenda', 'whatsapp', 'pagos', 'calendar', 'cuenta', 'otro')),
  priority     TEXT        NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgente')),
  status       TEXT        NOT NULL DEFAULT 'abierto' CHECK (status IN ('abierto', 'en_progreso', 'resuelto', 'cerrado')),
  subject      TEXT        NOT NULL,
  source_module TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- SELECT: el usuario ve sus propios tickets; superadmin ve todos los de su clínica
CREATE POLICY "Users can view own tickets"
  ON public.support_tickets FOR SELECT
  USING (
    (created_by = auth.uid() AND clinic_id = public.get_my_clinic_id())
    OR
    (clinic_id = public.get_my_clinic_id() AND public.is_admin())
  );

-- INSERT: cualquier profesional autenticado, clinic_id debe ser el suyo
CREATE POLICY "Professionals can create tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (
    clinic_id = public.get_my_clinic_id()
    AND created_by = auth.uid()
  );

-- UPDATE: usuario actualiza sus propios tickets; superadmin actualiza cualquiera de su clínica
CREATE POLICY "Users can update own tickets"
  ON public.support_tickets FOR UPDATE
  USING (
    (created_by = auth.uid() AND clinic_id = public.get_my_clinic_id())
    OR
    (clinic_id = public.get_my_clinic_id() AND public.is_admin())
  )
  WITH CHECK (
    clinic_id = public.get_my_clinic_id()
  );

-- Índices
CREATE INDEX IF NOT EXISTS idx_support_tickets_clinic
  ON public.support_tickets (clinic_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_tickets_created_by
  ON public.support_tickets (created_by, created_at DESC);

-- -----------------------------------------------------------------------------
-- 2. ticket_messages
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    UUID        NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_type  TEXT        NOT NULL CHECK (sender_type IN ('user', 'support')),
  -- NULL cuando sender_type = 'support' (responde Livio via admin client)
  sender_id    UUID        REFERENCES public.professional(id) ON DELETE SET NULL,
  body         TEXT        NOT NULL,
  attachment_url TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- SELECT: el usuario puede ver mensajes de tickets que puede ver (misma lógica)
CREATE POLICY "Users can view messages of own tickets"
  ON public.ticket_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id = ticket_messages.ticket_id
        AND (
          (st.created_by = auth.uid() AND st.clinic_id = public.get_my_clinic_id())
          OR
          (st.clinic_id = public.get_my_clinic_id() AND public.is_admin())
        )
    )
  );

-- INSERT: el usuario puede insertar mensajes en sus tickets accesibles,
--         con sender_type = 'user' y sender_id = su propio uid.
--         Los mensajes de Livio (sender_type = 'support') se insertan
--         desde el admin client con service_role, que bypasea RLS.
CREATE POLICY "Users can insert messages in own tickets"
  ON public.ticket_messages FOR INSERT
  WITH CHECK (
    sender_type = 'user'
    AND sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id = ticket_messages.ticket_id
        AND (
          (st.created_by = auth.uid() AND st.clinic_id = public.get_my_clinic_id())
          OR
          (st.clinic_id = public.get_my_clinic_id() AND public.is_admin())
        )
    )
  );

-- Índice
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket
  ON public.ticket_messages (ticket_id, created_at ASC);

-- -----------------------------------------------------------------------------
-- 3. Storage bucket: support-attachments
--    Privado — los usuarios suben y descargan sus propios adjuntos.
--    Políticas de Storage van sobre storage.objects.
-- -----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'support-attachments',
  'support-attachments',
  false,
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- INSERT: cualquier usuario autenticado puede subir adjuntos
CREATE POLICY "Authenticated users can upload support attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'support-attachments');

-- SELECT: cualquier usuario autenticado puede descargar adjuntos
CREATE POLICY "Authenticated users can read support attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'support-attachments');
