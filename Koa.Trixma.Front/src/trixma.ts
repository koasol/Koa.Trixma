import { auth } from './assets/firebase';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:8080';

export interface System {
  id: string | number;
  name: string;
  description?: string;
  createdAt?: string;
  created_at?: string;
}

export interface Unit {
  id: string | number;
  name: string;
  type?: string;
  status?: string;
  systemId: string | number;
  updated_at?: string;
  uptimeMs?: number;
  lastProvisionedAt?: string;
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

const getHeaders = async () => {
  const user = auth.currentUser;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (user) {
    const token = await user.getIdToken();
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

export const trixma = {
  getSystems: async (): Promise<TrixmaResponse<System[]>> => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${BASE_URL}/systems`, { headers });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return { data, error: null };
    } catch (error: unknown) {
      return { data: null, error: error instanceof Error ? error.message : 'Failed to fetch systems' };
    }
  },

  getSystemById: async (id: string): Promise<TrixmaResponse<System>> => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${BASE_URL}/systems/${id}`, { headers });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return { data, error: null };
    } catch (error: unknown) {
      return { data: null, error: error instanceof Error ? error.message : 'Failed to fetch system' };
    }
  },

  getUnitsBySystemId: async (systemId: string): Promise<TrixmaResponse<Unit[]>> => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${BASE_URL}/systems/${systemId}/units`, { headers });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return { data, error: null };
    } catch (error: unknown) {
      return { data: null, error: error instanceof Error ? error.message : 'Failed to fetch units' };
    }
  },

  getUnitById: async (id: string): Promise<TrixmaResponse<Unit>> => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${BASE_URL}/units/${id}`, { headers });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return { data, error: null };
    } catch (error: unknown) {
      return { data: null, error: error instanceof Error ? error.message : 'Failed to fetch unit' };
    }
  },

  getMeasurements: async (unitId: string, from: string, to: string): Promise<TrixmaResponse<MeasurementGroup[]>> => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${BASE_URL}/units/${unitId}/measurements?from=${from}&to=${to}`, { headers });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return { data, error: null };
    } catch (error: unknown) {
      return { data: null, error: error instanceof Error ? error.message : 'Failed to fetch measurements' };
    }
  },

  createSystem: async (system: { name: string; description: string }): Promise<TrixmaResponse<System>> => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${BASE_URL}/systems`, {
        method: 'POST',
        headers,
        body: JSON.stringify(system),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return { data, error: null };
    } catch (error: unknown) {
      return { data: null, error: error instanceof Error ? error.message : 'Failed to create system' };
    }
  },

  updateSystem: async (id: string | number, system: { name: string; description: string }): Promise<TrixmaResponse<System>> => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${BASE_URL}/systems/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(system),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return { data, error: null };
    } catch (error: unknown) {
      return { data: null, error: error instanceof Error ? error.message : 'Failed to update system' };
    }
  },

  deleteSystem: async (id: string | number): Promise<TrixmaResponse<void>> => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${BASE_URL}/systems/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return { data: undefined, error: null };
    } catch (error: unknown) {
      return { data: null, error: error instanceof Error ? error.message : 'Failed to delete system' };
    }
  },

  pingUnit: async (unitId: string): Promise<TrixmaResponse<{ message: string }>> => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${BASE_URL}/units/${unitId}/ping`, {
        method: 'POST',
        headers,
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return { data, error: null };
    } catch (error: unknown) {
      return { data: null, error: error instanceof Error ? error.message : 'Failed to ping unit' };
    }
  }
};
