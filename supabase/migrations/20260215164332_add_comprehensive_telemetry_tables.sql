/*
  # Add Comprehensive John Deere Telemetry Tables

  ## Overview
  Adds complete support for all John Deere Operations Center APIs to capture
  machine alerts, detailed measurements, device states, engine hours, operational
  hours, and implement tracking.

  ## New Tables
  
  ### 1. `machine_alerts`
  Stores diagnostic trouble codes (DTCs) and machine alerts
  - `id` (uuid, primary key)
  - `equipment_id` (text, foreign key to equipment)
  - `alert_id` (text, John Deere alert identifier)
  - `alert_type` (text, type of alert)
  - `severity` (text, alert severity level)
  - `description` (text, alert description)
  - `dtc_code` (text, diagnostic trouble code)
  - `active` (boolean, whether alert is currently active)
  - `started_at` (timestamptz, when alert started)
  - `ended_at` (timestamptz, when alert was resolved)
  - `metadata` (jsonb, additional alert data)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `machine_measurements`
  Stores detailed sensor measurements and telemetry
  - `id` (uuid, primary key)
  - `equipment_id` (text, foreign key to equipment)
  - `measurement_type` (text, type of measurement)
  - `value` (numeric, measurement value)
  - `unit` (text, unit of measurement)
  - `timestamp` (timestamptz, when measurement was taken)
  - `metadata` (jsonb, additional measurement context)
  - `created_at` (timestamptz)

  ### 3. `machine_device_states`
  Stores telematics terminal device state reports
  - `id` (uuid, primary key)
  - `equipment_id` (text, foreign key to equipment)
  - `device_id` (text, telematics device identifier)
  - `state` (text, device state)
  - `signal_strength` (integer, cellular signal strength)
  - `battery_voltage` (numeric, device battery voltage)
  - `last_contact` (timestamptz, last communication time)
  - `metadata` (jsonb, additional device data)
  - `created_at` (timestamptz)

  ### 4. `machine_engine_hours`
  Tracks engine hour readings over time
  - `id` (uuid, primary key)
  - `equipment_id` (text, foreign key to equipment)
  - `engine_hours` (numeric, cumulative engine hours)
  - `timestamp` (timestamptz, when reading was taken)
  - `metadata` (jsonb, additional context)
  - `created_at` (timestamptz)

  ### 5. `machine_operational_hours`
  Tracks periods when machine engine was running
  - `id` (uuid, primary key)
  - `equipment_id` (text, foreign key to equipment)
  - `start_time` (timestamptz, engine start time)
  - `end_time` (timestamptz, engine stop time)
  - `duration_hours` (numeric, calculated duration)
  - `metadata` (jsonb, additional operational data)
  - `created_at` (timestamptz)

  ### 6. `implements`
  Stores implement (attachment) information
  - `id` (uuid, primary key)
  - `org_id` (text, foreign key to organizations)
  - `implement_id` (text, John Deere implement ID)
  - `name` (text, implement name)
  - `make` (text, manufacturer)
  - `model` (text, model number)
  - `serial_number` (text, serial number)
  - `implement_type` (text, type/category)
  - `width` (numeric, working width)
  - `width_unit` (text, unit for width)
  - `metadata` (jsonb, additional implement data)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 7. `equipment_implement_attachments`
  Tracks when implements are attached to equipment
  - `id` (uuid, primary key)
  - `equipment_id` (text, foreign key to equipment)
  - `implement_id` (uuid, foreign key to implements)
  - `attached_at` (timestamptz, attachment start)
  - `detached_at` (timestamptz, attachment end)
  - `created_at` (timestamptz)

  ## Indexes
  Added for common query patterns and performance optimization

  ## Security
  - RLS enabled on all tables
  - Policies allow authenticated users to view all data
  - Service role can manage all data
*/

-- Machine Alerts Table
CREATE TABLE IF NOT EXISTS machine_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id text REFERENCES equipment(id) ON DELETE CASCADE NOT NULL,
  alert_id text DEFAULT '',
  alert_type text DEFAULT '',
  severity text DEFAULT '',
  description text DEFAULT '',
  dtc_code text DEFAULT '',
  active boolean DEFAULT true,
  started_at timestamptz,
  ended_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_machine_alerts_equipment ON machine_alerts(equipment_id);
CREATE INDEX IF NOT EXISTS idx_machine_alerts_active ON machine_alerts(equipment_id, active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_machine_alerts_started ON machine_alerts(started_at DESC);

ALTER TABLE machine_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read machine alerts"
  ON machine_alerts FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service can manage machine alerts"
  ON machine_alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Service can update machine alerts"
  ON machine_alerts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service can delete machine alerts"
  ON machine_alerts FOR DELETE
  TO authenticated
  USING (true);

-- Machine Measurements Table
CREATE TABLE IF NOT EXISTS machine_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id text REFERENCES equipment(id) ON DELETE CASCADE NOT NULL,
  measurement_type text NOT NULL DEFAULT '',
  value numeric DEFAULT 0,
  unit text DEFAULT '',
  timestamp timestamptz NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_machine_measurements_equipment ON machine_measurements(equipment_id);
CREATE INDEX IF NOT EXISTS idx_machine_measurements_type ON machine_measurements(equipment_id, measurement_type);
CREATE INDEX IF NOT EXISTS idx_machine_measurements_timestamp ON machine_measurements(timestamp DESC);

ALTER TABLE machine_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read machine measurements"
  ON machine_measurements FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service can manage machine measurements"
  ON machine_measurements FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Machine Device States Table
CREATE TABLE IF NOT EXISTS machine_device_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id text REFERENCES equipment(id) ON DELETE CASCADE NOT NULL,
  device_id text DEFAULT '',
  state text DEFAULT '',
  signal_strength integer DEFAULT 0,
  battery_voltage numeric DEFAULT 0,
  last_contact timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_machine_device_states_equipment ON machine_device_states(equipment_id);
CREATE INDEX IF NOT EXISTS idx_machine_device_states_contact ON machine_device_states(last_contact DESC);

ALTER TABLE machine_device_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read device states"
  ON machine_device_states FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service can manage device states"
  ON machine_device_states FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Machine Engine Hours Table
CREATE TABLE IF NOT EXISTS machine_engine_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id text REFERENCES equipment(id) ON DELETE CASCADE NOT NULL,
  engine_hours numeric NOT NULL DEFAULT 0,
  timestamp timestamptz NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_machine_engine_hours_equipment ON machine_engine_hours(equipment_id);
CREATE INDEX IF NOT EXISTS idx_machine_engine_hours_timestamp ON machine_engine_hours(timestamp DESC);

ALTER TABLE machine_engine_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read engine hours"
  ON machine_engine_hours FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service can manage engine hours"
  ON machine_engine_hours FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Machine Operational Hours Table
CREATE TABLE IF NOT EXISTS machine_operational_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id text REFERENCES equipment(id) ON DELETE CASCADE NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  duration_hours numeric DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_machine_operational_hours_equipment ON machine_operational_hours(equipment_id);
CREATE INDEX IF NOT EXISTS idx_machine_operational_hours_start ON machine_operational_hours(start_time DESC);

ALTER TABLE machine_operational_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read operational hours"
  ON machine_operational_hours FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service can manage operational hours"
  ON machine_operational_hours FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Implements Table
CREATE TABLE IF NOT EXISTS implements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  implement_id text UNIQUE,
  name text NOT NULL DEFAULT '',
  make text DEFAULT '',
  model text DEFAULT '',
  serial_number text DEFAULT '',
  implement_type text DEFAULT '',
  width numeric DEFAULT 0,
  width_unit text DEFAULT '',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_implements_organization ON implements(org_id);
CREATE INDEX IF NOT EXISTS idx_implements_type ON implements(implement_type);

ALTER TABLE implements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read implements"
  ON implements FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service can manage implements"
  ON implements FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Service can update implements"
  ON implements FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Equipment Implement Attachments Table
CREATE TABLE IF NOT EXISTS equipment_implement_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id text REFERENCES equipment(id) ON DELETE CASCADE NOT NULL,
  implement_id uuid REFERENCES implements(id) ON DELETE CASCADE NOT NULL,
  attached_at timestamptz NOT NULL,
  detached_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attachments_equipment ON equipment_implement_attachments(equipment_id);
CREATE INDEX IF NOT EXISTS idx_attachments_implement ON equipment_implement_attachments(implement_id);
CREATE INDEX IF NOT EXISTS idx_attachments_active ON equipment_implement_attachments(equipment_id) WHERE detached_at IS NULL;

ALTER TABLE equipment_implement_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read attachments"
  ON equipment_implement_attachments FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service can manage attachments"
  ON equipment_implement_attachments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Service can update attachments"
  ON equipment_implement_attachments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);