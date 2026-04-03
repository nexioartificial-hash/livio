-- Conversation sessions for WhatsApp bot memory
CREATE TABLE IF NOT EXISTS conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinic(id) ON DELETE CASCADE,
  phone_id TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  patient_id UUID REFERENCES patient(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  message_count INTEGER NOT NULL DEFAULT 0,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conv_sessions_active
  ON conversation_sessions (clinic_id, phone_id, patient_phone, status)
  WHERE status = 'active';

CREATE INDEX idx_conv_sessions_closed
  ON conversation_sessions (clinic_id, patient_phone, last_message_at DESC)
  WHERE status = 'closed' AND summary IS NOT NULL;

ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic members can view conversation sessions"
  ON conversation_sessions FOR SELECT
  USING (clinic_id = get_my_clinic_id());
