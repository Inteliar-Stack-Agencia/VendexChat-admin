-- Add Telegram bot notification settings to global_settings
INSERT INTO public.global_settings (key, value) VALUES
('telegram_bot_token', '""'),
('telegram_chat_id', '""'),
('telegram_notifications_enabled', 'false'),
('telegram_notify_payments', 'true'),
('telegram_notify_subscriptions', 'true'),
('telegram_notify_new_stores', 'true')
ON CONFLICT (key) DO NOTHING;
