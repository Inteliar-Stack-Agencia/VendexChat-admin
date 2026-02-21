-- 1. Añadir campo de cupones habilitados a la tienda
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS coupons_enabled BOOLEAN DEFAULT true;

-- 2. Crear tabla de cupones
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    type SMALLINT NOT NULL, -- 1-6 según lógica de la app
    value NUMERIC NOT NULL,
    start_date TIMESTAMPTZ DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    min_purchase_amount NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    applicable_products UUID[] DEFAULT '{}',
    applicable_categories UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, code)
);

-- 3. Habilitar RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de seguridad
CREATE POLICY "Merchants can manage their own coupons" ON public.coupons
    FOR ALL USING (
        store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Anyone can check coupons for a store" ON public.coupons
    FOR SELECT USING (true);
