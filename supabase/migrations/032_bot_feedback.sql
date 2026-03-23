-- Bot feedback: questions the Telegram bot couldn't answer
-- Used to train the bot per-store over time

CREATE TABLE IF NOT EXISTS bot_feedback (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    chat_id     BIGINT,
    username    TEXT,
    question    TEXT NOT NULL,
    bot_context TEXT,          -- what the bot replied (optional, for context)
    resolved    BOOLEAN DEFAULT false,
    notes       TEXT,          -- admin notes when resolving
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bot_feedback_store_id   ON bot_feedback(store_id);
CREATE INDEX idx_bot_feedback_resolved   ON bot_feedback(resolved);
CREATE INDEX idx_bot_feedback_created_at ON bot_feedback(created_at DESC);

-- RLS
ALTER TABLE bot_feedback ENABLE ROW LEVEL SECURITY;

-- Tenants can see their own store's feedback
CREATE POLICY "tenant_read_own_feedback" ON bot_feedback
    FOR SELECT USING (
        store_id IN (
            SELECT id FROM stores WHERE owner_id = auth.uid()
        )
    );

-- Edge functions use service role, so they bypass RLS
