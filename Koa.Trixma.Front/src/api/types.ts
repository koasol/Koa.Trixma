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

export type AlarmCondition = 0 | 1 | 2;

export interface AlarmRule {
  id: string;
  unitId: string;
  measurementType: string;
  condition: AlarmCondition;
  threshold: number;
  name: string;
  enabled: boolean;
  cooldownMinutes: number;
  createdAt: string;
}

export interface CreateAlarmRulePayload {
  unitId: string;
  name: string;
  measurementType: string;
  condition: AlarmCondition;
  threshold: number;
  cooldownMinutes: number;
}

export interface CreateAlarmRuleResponse {
  id: string;
}

export interface TrixmaResponse<T> {
  data: T | null;
  error: string | null;
}
