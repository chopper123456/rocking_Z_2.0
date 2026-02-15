export interface Organization {
  id: string;
  name: string;
  type: string;
  connection_status: string;
  raw_data: Record<string, unknown>;
  synced_at: string;
}

export interface Farm {
  id: string;
  org_id: string;
  name: string;
  raw_data: Record<string, unknown>;
  synced_at: string;
}

export interface Field {
  id: string;
  org_id: string;
  farm_id: string | null;
  name: string;
  acreage: number;
  crop_type: string;
  raw_data: Record<string, unknown>;
  synced_at: string;
}

export interface Boundary {
  id: string;
  field_id: string;
  org_id: string;
  geojson: GeoJSON.Geometry | Record<string, unknown>;
  acreage: number;
  raw_data: Record<string, unknown>;
  synced_at: string;
}

export interface Equipment {
  id: string;
  org_id?: string;
  name: string;
  make: string;
  model: string;
  equipment_type: string;
  serial_number: string;
  engine_hours: number;
  last_location_lat: number;
  last_location_lon: number;
  last_location_time: string | null;
  cumulative_operating_hours: number;
  cumulative_idle_hours: number;
  cumulative_fuel_used: number;
  fuel_remaining_ratio: number;
  def_remaining_ratio: number;
  cumulative_distance: number;
  telemetry_state: string;
  last_telemetry_sync: string | null;
  aemp_data: Record<string, unknown>;
  raw_data: Record<string, unknown>;
  synced_at: string;
}

export interface FieldOperation {
  id: string;
  field_id: string;
  org_id: string;
  operation_type: string;
  start_date: string | null;
  end_date: string | null;
  area: number;
  products: unknown[];
  measurements: Record<string, unknown>;
  raw_data: Record<string, unknown>;
  synced_at: string;
}

export interface Product {
  id: string;
  org_id: string;
  name: string;
  product_type: string;
  manufacturer: string;
  raw_data: Record<string, unknown>;
  synced_at: string;
}

export interface Operator {
  id: string;
  org_id: string;
  name: string;
  raw_data: Record<string, unknown>;
  synced_at: string;
}

export interface Flag {
  id: string;
  field_id: string;
  org_id: string;
  category: string;
  notes: string;
  latitude: number;
  longitude: number;
  raw_data: Record<string, unknown>;
  synced_at: string;
}

export interface SyncLogEntry {
  id: string;
  sync_type: string;
  status: string;
  records_synced: number;
  error_message: string;
  started_at: string;
  completed_at: string | null;
}

export interface MachineAlert {
  id: string;
  equipment_id: string;
  alert_id: string;
  alert_type: string;
  severity: string;
  description: string;
  dtc_code: string;
  active: boolean;
  started_at: string | null;
  ended_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MachineMeasurement {
  id: string;
  equipment_id: string;
  measurement_type: string;
  value: number;
  unit: string;
  timestamp: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface MachineDeviceState {
  id: string;
  equipment_id: string;
  device_id: string;
  state: string;
  signal_strength: number;
  battery_voltage: number;
  last_contact: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface MachineEngineHours {
  id: string;
  equipment_id: string;
  engine_hours: number;
  timestamp: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface MachineOperationalHours {
  id: string;
  equipment_id: string;
  start_time: string;
  end_time: string | null;
  duration_hours: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Implement {
  id: string;
  org_id: string;
  implement_id: string;
  name: string;
  make: string;
  model: string;
  serial_number: string;
  implement_type: string;
  width: number;
  width_unit: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface EquipmentImplementAttachment {
  id: string;
  equipment_id: string;
  implement_id: string;
  attached_at: string;
  detached_at: string | null;
  created_at: string;
}

export interface ConnectionStatus {
  connected: boolean;
  isExpired?: boolean;
  expiresAt?: string;
  scopes?: string;
  lastUpdated?: string;
}
