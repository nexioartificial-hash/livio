CREATE TABLE IF NOT EXISTS payment_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES clinic(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  mp_id TEXT,
  amount NUMERIC(12,2),
  currency TEXT DEFAULT 'ARS',
  status TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic members can view payment history"
  ON payment_history FOR SELECT
  USING (clinic_id = get_my_clinic_id());

CREATE INDEX idx_payment_history_clinic ON payment_history (clinic_id, created_at DESC);
