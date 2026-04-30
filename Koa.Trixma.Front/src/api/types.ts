export interface System {
  id: string;
  name: string;
  description?: string;
  ownedBy?: string;
  createdAt?: string;
  units?: Unit[];
}

export interface Unit {
  id: string;
  name: string;
  systemId: string | null;
  ipAddress?: string | null;
  macAddress?: string | null;
  imei?: string | null;
  nfcId?: string | null;
  lastProvisionedAt?: string | null;
  uptimeMs?: number | null;
  batteryMv?: number | null;
  measurements?: MeasurementDataPoint[];
}

export interface MeasurementDataPoint {
  timestamp: string;
  value: number;
}

export interface MeasurementGroup {
  type: string;
  data: MeasurementDataPoint[];
}

export interface TrixmaResponse<T> {
  data: T | null;
  error: string | null;
}
