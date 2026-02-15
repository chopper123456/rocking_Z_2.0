/*
  # Add Equipment Location Tracking Tables

  1. New Tables
    - `equipment_location_history`
      - Stores GPS location history from John Deere Location History API
      - Includes latitude, longitude, altitude, and timestamp
      - Links to equipment via equipment_id
    
    - `equipment_breadcrumbs`
      - Stores detailed telemetry breadcrumbs from John Deere Breadcrumbs API
      - Includes location data plus speed, heading, fuel level, machine state
      - Provides rich operational context for each data point
      - Links to equipment via equipment_id

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to read location data
    - Add policies for service role to insert sync data

  3. Indexes
    - Add indexes on equipment_id and timestamp for efficient queries
    - Add index on machine_state for filtering by operational status
*/

CREATE TABLE IF NOT EXISTS equipment_location_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id text NOT NULL,
  timestamp timestamptz NOT NULL,
  latitude double precision NOT NULL DEFAULT 0,
  longitude double precision NOT NULL DEFAULT 0,
  altitude double precision DEFAULT 0,
  raw_data jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS equipment_breadcrumbs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id text NOT NULL,
  timestamp timestamptz NOT NULL,
  latitude double precision NOT NULL DEFAULT 0,
  longitude double precision NOT NULL DEFAULT 0,
  altitude double precision DEFAULT 0,
  speed double precision DEFAULT 0,
  heading double precision DEFAULT 0,
  fuel_level double precision DEFAULT 0,
  machine_state text DEFAULT '',
  correlation_id text DEFAULT '',
  raw_data jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_location_history_equipment ON equipment_location_history(equipment_id);
CREATE INDEX IF NOT EXISTS idx_location_history_timestamp ON equipment_location_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_breadcrumbs_equipment ON equipment_breadcrumbs(equipment_id);
CREATE INDEX IF NOT EXISTS idx_breadcrumbs_timestamp ON equipment_breadcrumbs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_breadcrumbs_machine_state ON equipment_breadcrumbs(machine_state);

ALTER TABLE equipment_location_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_breadcrumbs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read location history"
  ON equipment_location_history
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can insert location history"
  ON equipment_location_history
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read breadcrumbs"
  ON equipment_breadcrumbs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can insert breadcrumbs"
  ON equipment_breadcrumbs
  FOR INSERT
  TO service_role
  WITH CHECK (true);