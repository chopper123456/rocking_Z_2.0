/*
  # Chemical Inventory & Spray Applications

  ## chemical_inventory
  Tracks chemical/product inventory with low-stock thresholds
  - product_id (links to products from John Deere)
  - product_name (denormalized for display)
  - quantity (current amount)
  - unit (gal, L, etc.)
  - low_stock_threshold (alert when below this)
  - last_updated

  ## spray_applications
  Logs spray applications (manual + from John Deere field operations)
  - equipment_id (sprayer used)
  - product_id
  - product_name
  - amount_applied (quantity used)
  - unit
  - field_id (optional)
  - application_date
  - source (manual | john_deere)
  - metadata (raw from JD if synced)
*/

CREATE TABLE IF NOT EXISTS chemical_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text DEFAULT '',
  product_name text NOT NULL DEFAULT '',
  quantity numeric DEFAULT 0,
  unit text DEFAULT 'gal',
  low_stock_threshold numeric DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chemical_inventory_product ON chemical_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_chemical_inventory_low_stock ON chemical_inventory(quantity) WHERE quantity <= low_stock_threshold AND low_stock_threshold > 0;

ALTER TABLE chemical_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for chemical_inventory" ON chemical_inventory;
CREATE POLICY "Allow all for chemical_inventory"
  ON chemical_inventory FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS spray_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id text DEFAULT '',
  equipment_name text DEFAULT '',
  product_id text DEFAULT '',
  product_name text NOT NULL DEFAULT '',
  amount_applied numeric NOT NULL DEFAULT 0,
  unit text DEFAULT 'gal',
  field_id text DEFAULT '',
  field_name text DEFAULT '',
  application_date timestamptz NOT NULL DEFAULT now(),
  source text DEFAULT 'manual',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spray_applications_date ON spray_applications(application_date DESC);
CREATE INDEX IF NOT EXISTS idx_spray_applications_product ON spray_applications(product_id);
CREATE INDEX IF NOT EXISTS idx_spray_applications_equipment ON spray_applications(equipment_id);

ALTER TABLE spray_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for spray_applications" ON spray_applications;
CREATE POLICY "Allow all for spray_applications"
  ON spray_applications FOR ALL
  USING (true)
  WITH CHECK (true);
