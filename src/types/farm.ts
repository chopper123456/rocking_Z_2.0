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
  name: string;
  make: string;
  model: string;
  equipment_type: string;
  serial_number: string;
  engine_hours: number;
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

export interface ConnectionStatus {
  connected: boolean;
  isExpired?: boolean;
  expiresAt?: string;
  scopes?: string;
  lastUpdated?: string;
}
