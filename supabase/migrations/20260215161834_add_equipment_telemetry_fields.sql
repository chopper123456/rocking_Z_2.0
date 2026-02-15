/*
  # Add Equipment Telemetry Fields for AEMP 2.0 API

  1. Changes to `equipment` table
    - Add `org_id` (text) - organization reference
    - Add `last_location_lat` (numeric) - last known latitude
    - Add `last_location_lon` (numeric) - last known longitude
    - Add `last_location_time` (timestamptz) - timestamp of last location
    - Add `cumulative_operating_hours` (numeric) - total operating hours
    - Add `cumulative_idle_hours` (numeric) - total idle hours
    - Add `cumulative_fuel_used` (numeric) - total fuel consumed
    - Add `fuel_remaining_ratio` (numeric) - fuel level percentage
    - Add `def_remaining_ratio` (numeric) - DEF level percentage
    - Add `cumulative_distance` (numeric) - total distance traveled
    - Add `telemetry_state` (text) - active/inactive state
    - Add `last_telemetry_sync` (timestamptz) - last AEMP sync time
    - Add `aemp_data` (jsonb) - raw AEMP XML data

  2. Indexes
    - Add index on telemetry_state for filtering
    - Add index on last_telemetry_sync for date filtering
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE equipment ADD COLUMN org_id text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment' AND column_name = 'last_location_lat'
  ) THEN
    ALTER TABLE equipment ADD COLUMN last_location_lat numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment' AND column_name = 'last_location_lon'
  ) THEN
    ALTER TABLE equipment ADD COLUMN last_location_lon numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment' AND column_name = 'last_location_time'
  ) THEN
    ALTER TABLE equipment ADD COLUMN last_location_time timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment' AND column_name = 'cumulative_operating_hours'
  ) THEN
    ALTER TABLE equipment ADD COLUMN cumulative_operating_hours numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment' AND column_name = 'cumulative_idle_hours'
  ) THEN
    ALTER TABLE equipment ADD COLUMN cumulative_idle_hours numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment' AND column_name = 'cumulative_fuel_used'
  ) THEN
    ALTER TABLE equipment ADD COLUMN cumulative_fuel_used numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment' AND column_name = 'fuel_remaining_ratio'
  ) THEN
    ALTER TABLE equipment ADD COLUMN fuel_remaining_ratio numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment' AND column_name = 'def_remaining_ratio'
  ) THEN
    ALTER TABLE equipment ADD COLUMN def_remaining_ratio numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment' AND column_name = 'cumulative_distance'
  ) THEN
    ALTER TABLE equipment ADD COLUMN cumulative_distance numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment' AND column_name = 'telemetry_state'
  ) THEN
    ALTER TABLE equipment ADD COLUMN telemetry_state text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment' AND column_name = 'last_telemetry_sync'
  ) THEN
    ALTER TABLE equipment ADD COLUMN last_telemetry_sync timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment' AND column_name = 'aemp_data'
  ) THEN
    ALTER TABLE equipment ADD COLUMN aemp_data jsonb DEFAULT '{}';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_equipment_telemetry_state ON equipment(telemetry_state);
CREATE INDEX IF NOT EXISTS idx_equipment_last_telemetry_sync ON equipment(last_telemetry_sync DESC);
CREATE INDEX IF NOT EXISTS idx_equipment_org_id ON equipment(org_id);
