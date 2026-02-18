-- Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    email TEXT,
    address TEXT,
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(12, 2) DEFAULT 0,
    last_order_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, whatsapp)
);

-- RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their store customers" ON public.customers
    FOR ALL USING (store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid()));

-- Trigger to auto-populate customers from orders
CREATE OR REPLACE FUNCTION public.handle_new_order_for_crm()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.customers (store_id, name, whatsapp, address, total_orders, total_spent, last_order_at)
    VALUES (
        NEW.store_id, 
        NEW.customer_name, 
        NEW.customer_whatsapp, 
        NEW.customer_address, 
        1, 
        NEW.total, 
        NEW.created_at
    )
    ON CONFLICT (store_id, whatsapp) DO UPDATE SET
        total_orders = public.customers.total_orders + 1,
        total_spent = public.customers.total_spent + EXCLUDED.total_spent,
        last_order_at = EXCLUDED.last_order_at,
        name = EXCLUDED.name,
        address = EXCLUDED.address,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_order_created_crm
    AFTER INSERT ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_order_for_crm();
