-- Create global_settings table
CREATE TABLE IF NOT EXISTS public.global_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can manage global settings" ON public.global_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'superadmin'
        )
    );

-- Initial values
INSERT INTO public.global_settings (key, value) VALUES 
('maintenance_mode', 'false'),
('allow_registrations', 'true'),
('master_approval', 'false'),
('email_notifications', 'true')
ON CONFLICT (key) DO NOTHING;
