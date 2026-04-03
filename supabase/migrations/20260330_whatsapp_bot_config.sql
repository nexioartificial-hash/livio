-- WhatsApp Bot Configuration per clinic
CREATE TABLE IF NOT EXISTS whatsapp_bot_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinic(id) ON DELETE CASCADE,
  phone_id TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  greeting_message TEXT DEFAULT '¡Hola! Soy el asistente virtual de la clínica. ¿En qué puedo ayudarte?',
  out_of_hours_message TEXT DEFAULT 'Gracias por escribirnos. Estamos fuera del horario de atención. Te responderemos a la brevedad.',
  bot_hours_start TIME DEFAULT '08:00',
  bot_hours_end TIME DEFAULT '20:00',
  bot_active_days INTEGER[] DEFAULT '{1,2,3,4,5,6}',
  ai_model TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
  system_prompt_extra TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, phone_id)
);

ALTER TABLE whatsapp_bot_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_members_can_read_bot_config" ON whatsapp_bot_config
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM professional WHERE id = auth.uid())
  );

CREATE POLICY "clinic_admins_can_manage_bot_config" ON whatsapp_bot_config
  FOR ALL USING (
    clinic_id IN (SELECT clinic_id FROM professional WHERE id = auth.uid() AND role = 'superadmin')
  );
