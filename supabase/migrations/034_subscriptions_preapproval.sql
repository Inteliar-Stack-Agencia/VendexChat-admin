ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS mp_preapproval_id TEXT,
  ADD COLUMN IF NOT EXISTS last_payment_status TEXT,
  ADD COLUMN IF NOT EXISTS payment_failure_reason TEXT;
