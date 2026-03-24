-- Persistent storage for bot pending actions (replaces in-memory pendingActions)
-- Needed because Edge Functions are stateless/serverless

CREATE TABLE IF NOT EXISTS bot_pending_actions (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    chat_id     BIGINT NOT NULL,
    actions     JSONB NOT NULL,           -- Array of AIAction objects
    created_at  TIMESTAMPTZ DEFAULT now(),
    expires_at  TIMESTAMPTZ DEFAULT now() + INTERVAL '5 minutes'
);

-- Index for quick lookup by store + chat
CREATE INDEX IF NOT EXISTS idx_bot_pending_actions_lookup
    ON bot_pending_actions(store_id, chat_id);

-- Auto-cleanup expired actions
CREATE INDEX IF NOT EXISTS idx_bot_pending_actions_expires
    ON bot_pending_actions(expires_at);

-- RLS
ALTER TABLE bot_pending_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on bot_pending_actions"
    ON bot_pending_actions FOR ALL
    USING (true)
    WITH CHECK (true);
