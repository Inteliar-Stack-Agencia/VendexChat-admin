-- Performance indexes to reduce Disk IO
-- These indexes optimize the most frequent query patterns across the platform

-- orders: most queried table, filtered by store_id and created_at on every request
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_created ON orders(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_store_status ON orders(store_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- products: filtered by store_id on every product list
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_store_active ON products(store_id, is_active);

-- customers: filtered by store_id on every customer query
CREATE INDEX IF NOT EXISTS idx_customers_store_id ON customers(store_id);

-- categories: filtered by store_id
CREATE INDEX IF NOT EXISTS idx_categories_store_id ON categories(store_id);

-- order_items: joined on order_id in stats and order detail queries
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- coupons: filtered by store_id
CREATE INDEX IF NOT EXISTS idx_coupons_store_id ON coupons(store_id);

-- subscriptions: filtered by store_id and status
CREATE INDEX IF NOT EXISTS idx_subscriptions_store_id ON subscriptions(store_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
