ALTER TABLE turno ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_turno_reminder_pending
  ON turno (date, reminder_sent)
  WHERE reminder_sent = FALSE;
