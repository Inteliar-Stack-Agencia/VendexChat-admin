-- Add unlimited_stock to products table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'unlimited_stock') THEN
        ALTER TABLE products ADD COLUMN unlimited_stock BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Ensure sort_order exists on categories and products
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'sort_order') THEN
        ALTER TABLE products ADD COLUMN sort_order INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'sort_order') THEN
        ALTER TABLE categories ADD COLUMN sort_order INTEGER DEFAULT 0;
    END IF;
END $$;
