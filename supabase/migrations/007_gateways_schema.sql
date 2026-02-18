-- Create gateways table
CREATE TABLE IF NOT EXISTS public.gateways (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    is_master BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Constraint to allow only one master gateway per provider
    CONSTRAINT unique_master_gateway UNIQUE (provider, is_master, store_id)
);

-- RLS
ALTER TABLE public.gateways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can manage all gateways" ON public.gateways
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'superadmin'
        )
    );

CREATE POLICY "Merchants can manage their own gateways" ON public.gateways
    FOR ALL USING (
        store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid())
    );
