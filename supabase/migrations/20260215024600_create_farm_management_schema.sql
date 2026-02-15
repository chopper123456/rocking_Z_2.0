/*
  # Rocking Z Acres - Farm Management Schema

  1. New Tables
    - `jd_tokens` - Stores John Deere OAuth tokens (encrypted)
      - `id` (uuid, primary key)
      - `access_token` (text, encrypted token)
      - `refresh_token` (text, encrypted token)
      - `expires_at` (timestamptz, when access token expires)
      - `scopes` (text, granted scopes)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    - `organizations` - John Deere organizations
      - `id` (text, primary key - JD org ID)
      - `name` (text)
      - `type` (text)
      - `connection_status` (text)
      - `raw_data` (jsonb)
      - `synced_at` (timestamptz)
    - `farms` - Farms within an organization
      - `id` (text, primary key - JD farm ID)
      - `org_id` (text, FK to organizations)
      - `name` (text)
      - `raw_data` (jsonb)
      - `synced_at` (timestamptz)
    - `fields` - Individual fields
      - `id` (text, primary key - JD field ID)
      - `org_id` (text, FK to organizations)
      - `farm_id` (text, FK to farms, nullable)
      - `name` (text)
      - `acreage` (numeric)
      - `crop_type` (text)
      - `raw_data` (jsonb)
      - `synced_at` (timestamptz)
    - `boundaries` - Field boundary GeoJSON
      - `id` (text, primary key - JD boundary ID)
      - `field_id` (text, FK to fields)
      - `org_id` (text)
      - `geojson` (jsonb)
      - `acreage` (numeric)
      - `raw_data` (jsonb)
      - `synced_at` (timestamptz)
    - `equipment` - Machines and implements
      - `id` (text, primary key - JD equipment ID)
      - `name` (text)
      - `make` (text)
      - `model` (text)
      - `equipment_type` (text)
      - `serial_number` (text)
      - `engine_hours` (numeric)
      - `raw_data` (jsonb)
      - `synced_at` (timestamptz)
    - `field_operations` - Planting, spraying, harvest, tillage
      - `id` (text, primary key - JD operation ID)
      - `field_id` (text, FK to fields)
      - `org_id` (text)
      - `operation_type` (text)
      - `start_date` (timestamptz)
      - `end_date` (timestamptz)
      - `area` (numeric)
      - `products` (jsonb, array of products used)
      - `measurements` (jsonb)
      - `raw_data` (jsonb)
      - `synced_at` (timestamptz)
    - `products` - Seed, chemical, fertilizer catalog
      - `id` (text, primary key - JD product ID)
      - `org_id` (text, nullable)
      - `name` (text)
      - `product_type` (text)
      - `manufacturer` (text)
      - `raw_data` (jsonb)
      - `synced_at` (timestamptz)
    - `operators` - Farm operators
      - `id` (text, primary key)
      - `org_id` (text)
      - `name` (text)
      - `raw_data` (jsonb)
      - `synced_at` (timestamptz)
    - `flags` - Field markers/scouting
      - `id` (text, primary key)
      - `field_id` (text, FK to fields)
      - `org_id` (text)
      - `category` (text)
      - `notes` (text)
      - `latitude` (numeric)
      - `longitude` (numeric)
      - `raw_data` (jsonb)
      - `synced_at` (timestamptz)
    - `sync_log` - Track sync operations
      - `id` (uuid, primary key)
      - `sync_type` (text)
      - `status` (text)
      - `records_synced` (integer)
      - `error_message` (text)
      - `started_at` (timestamptz)
      - `completed_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Policies allow service_role access (edge functions use service role key)
    - Authenticated users can read all data

  3. Indexes
    - field_operations by field_id, operation_type, start_date
    - boundaries by field_id
    - fields by org_id
*/

-- John Deere tokens storage
CREATE TABLE IF NOT EXISTS jd_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  scopes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE jd_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read tokens"
  ON jd_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id text PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  type text DEFAULT '',
  connection_status text DEFAULT 'pending',
  raw_data jsonb DEFAULT '{}',
  synced_at timestamptz DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Farms
CREATE TABLE IF NOT EXISTS farms (
  id text PRIMARY KEY,
  org_id text REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  raw_data jsonb DEFAULT '{}',
  synced_at timestamptz DEFAULT now()
);

ALTER TABLE farms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read farms"
  ON farms FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Fields
CREATE TABLE IF NOT EXISTS fields (
  id text PRIMARY KEY,
  org_id text REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id text REFERENCES farms(id) ON DELETE SET NULL,
  name text NOT NULL DEFAULT '',
  acreage numeric DEFAULT 0,
  crop_type text DEFAULT '',
  raw_data jsonb DEFAULT '{}',
  synced_at timestamptz DEFAULT now()
);

ALTER TABLE fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read fields"
  ON fields FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_fields_org_id ON fields(org_id);

-- Boundaries
CREATE TABLE IF NOT EXISTS boundaries (
  id text PRIMARY KEY,
  field_id text REFERENCES fields(id) ON DELETE CASCADE,
  org_id text DEFAULT '',
  geojson jsonb DEFAULT '{}',
  acreage numeric DEFAULT 0,
  raw_data jsonb DEFAULT '{}',
  synced_at timestamptz DEFAULT now()
);

ALTER TABLE boundaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read boundaries"
  ON boundaries FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_boundaries_field_id ON boundaries(field_id);

-- Equipment
CREATE TABLE IF NOT EXISTS equipment (
  id text PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  make text DEFAULT '',
  model text DEFAULT '',
  equipment_type text DEFAULT '',
  serial_number text DEFAULT '',
  engine_hours numeric DEFAULT 0,
  raw_data jsonb DEFAULT '{}',
  synced_at timestamptz DEFAULT now()
);

ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read equipment"
  ON equipment FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Field Operations
CREATE TABLE IF NOT EXISTS field_operations (
  id text PRIMARY KEY,
  field_id text REFERENCES fields(id) ON DELETE CASCADE,
  org_id text DEFAULT '',
  operation_type text DEFAULT '',
  start_date timestamptz,
  end_date timestamptz,
  area numeric DEFAULT 0,
  products jsonb DEFAULT '[]',
  measurements jsonb DEFAULT '{}',
  raw_data jsonb DEFAULT '{}',
  synced_at timestamptz DEFAULT now()
);

ALTER TABLE field_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read field operations"
  ON field_operations FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_field_ops_field_id ON field_operations(field_id);
CREATE INDEX IF NOT EXISTS idx_field_ops_type ON field_operations(operation_type);
CREATE INDEX IF NOT EXISTS idx_field_ops_start_date ON field_operations(start_date DESC);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id text PRIMARY KEY,
  org_id text DEFAULT '',
  name text NOT NULL DEFAULT '',
  product_type text DEFAULT '',
  manufacturer text DEFAULT '',
  raw_data jsonb DEFAULT '{}',
  synced_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read products"
  ON products FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Operators
CREATE TABLE IF NOT EXISTS operators (
  id text PRIMARY KEY,
  org_id text DEFAULT '',
  name text NOT NULL DEFAULT '',
  raw_data jsonb DEFAULT '{}',
  synced_at timestamptz DEFAULT now()
);

ALTER TABLE operators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read operators"
  ON operators FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Flags
CREATE TABLE IF NOT EXISTS flags (
  id text PRIMARY KEY,
  field_id text REFERENCES fields(id) ON DELETE CASCADE,
  org_id text DEFAULT '',
  category text DEFAULT '',
  notes text DEFAULT '',
  latitude numeric DEFAULT 0,
  longitude numeric DEFAULT 0,
  raw_data jsonb DEFAULT '{}',
  synced_at timestamptz DEFAULT now()
);

ALTER TABLE flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read flags"
  ON flags FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Sync Log
CREATE TABLE IF NOT EXISTS sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  records_synced integer DEFAULT 0,
  error_message text DEFAULT '',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read sync log"
  ON sync_log FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);
