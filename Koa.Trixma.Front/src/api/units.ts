import {request} from "./client";
import type {Unit, MeasurementGroup, TrixmaResponse} from "./types";
import {mockUnits} from "./mocks/units";

export const getUnitById = (id: string): Promise<TrixmaResponse<Unit>> =>
  import.meta.env.DEV
    ? Promise.resolve({
        data: mockUnits.find((u) => u.id === id) ?? null,
        error: null,
      })
    : request(`/units/${id}`, {}, "Failed to fetch unit");

export const getMeasurements = (
  unitId: string,
  from: string,
  to: string,
): Promise<TrixmaResponse<MeasurementGroup[]>> =>
  request(
    `/units/${unitId}/measurements?from=${from}&to=${to}`,
    {},
    "Failed to fetch measurements",
  );

export const pingUnit = (
  unitId: string,
): Promise<TrixmaResponse<{message: string}>> =>
  request(`/units/${unitId}/ping`, {method: "POST"}, "Failed to ping unit");

export const deleteUnit = (unitId: string): Promise<TrixmaResponse<void>> =>
  import.meta.env.DEV
    ? (() => {
        const index = mockUnits.findIndex((u) => u.id === unitId);
        if (index >= 0) {
          mockUnits.splice(index, 1);
        }
        return Promise.resolve({data: undefined, error: null});
      })()
    : request(
        `/units/${unitId}`,
        {method: "DELETE", parseResponse: false},
        "Failed to delete unit",
      );

export const updateUnit = (
  unitId: string,
  payload: {
    name: string;
    imei?: string | null;
    nfcId?: string | null;
    ipAddress?: string | null;
    macAddress?: string | null;
  },
): Promise<TrixmaResponse<Unit>> =>
  import.meta.env.DEV
    ? (() => {
        const index = mockUnits.findIndex((u) => u.id === unitId);
        if (index < 0) {
          return Promise.resolve({data: null, error: "Unit not found"});
        }
        const updated = {...mockUnits[index], ...payload};
        mockUnits[index] = updated;
        return Promise.resolve({data: updated, error: null});
      })()
    : request(
        `/units/${unitId}`,
        {method: "PUT", body: JSON.stringify(payload)},
        "Failed to update unit",
      );
