-- 037_modifier_groups.sql
-- Modifier groups and options for product customizations (adicionales / opcionales)
-- Similar to how Rappi/PedidosYa handle "Elige tu acompañamiento", "Adicionales", etc.

-- ============================================================
-- modifier_groups: each group is a set of options for a product
-- ============================================================
CREATE TABLE IF NOT EXISTS modifier_groups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,                          -- "Elige tu Acompañamiento", "Adicionales"
  description     TEXT,
  selection_type  TEXT NOT NULL DEFAULT 'single'          -- 'single' (radio) | 'multiple' (checkbox)
                  CHECK (selection_type IN ('single', 'multiple')),
  required        BOOLEAN NOT NULL DEFAULT false,
  min_selections  INTEGER NOT NULL DEFAULT 0,
  max_selections  INTEGER,                                 -- NULL = unlimited
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- modifier_options: each option within a group
-- ============================================================
CREATE TABLE IF NOT EXISTS modifier_options (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,           -- "Papas extra", "Sin picante", "Queso rallado"
  price_delta NUMERIC(12,2) NOT NULL DEFAULT 0,  -- added cost (0 for free options)
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- product_modifier_groups: links products to modifier groups
-- ============================================================
CREATE TABLE IF NOT EXISTS product_modifier_groups (
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  group_id    UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, group_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS modifier_groups_store_id_idx    ON modifier_groups(store_id);
CREATE INDEX IF NOT EXISTS modifier_options_group_id_idx   ON modifier_options(group_id);
CREATE INDEX IF NOT EXISTS modifier_options_store_id_idx   ON modifier_options(store_id);
CREATE INDEX IF NOT EXISTS product_modifier_groups_product_id_idx ON product_modifier_groups(product_id);
CREATE INDEX IF NOT EXISTS product_modifier_groups_group_id_idx   ON product_modifier_groups(group_id);

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_modifier_groups ENABLE ROW LEVEL SECURITY;

-- modifier_groups: store owners can manage their own groups
CREATE POLICY "modifier_groups_store_owner" ON modifier_groups
  USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- modifier_options: store owners can manage options for their groups
CREATE POLICY "modifier_options_store_owner" ON modifier_options
  USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- product_modifier_groups: store owners can manage their product links
CREATE POLICY "product_modifier_groups_store_owner" ON product_modifier_groups
  USING (
    product_id IN (
      SELECT p.id FROM products p
      JOIN stores s ON p.store_id = s.id
      WHERE s.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin'
    )
  );
