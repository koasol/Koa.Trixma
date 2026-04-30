import {request} from "./client";
import type {System, Unit, TrixmaResponse} from "./types";
import {mockSystems} from "./mocks/systems";
import {mockUnits} from "./mocks/units";

export const getSystems = (): Promise<TrixmaResponse<System[]>> =>
  import.meta.env.DEV
    ? Promise.resolve({data: mockSystems, error: null})
    : request("/systems", {}, "Failed to fetch systems");

export const getSystemById = (id: string): Promise<TrixmaResponse<System>> =>
  import.meta.env.DEV
    ? Promise.resolve({
        data: mockSystems.find((s) => s.id === id) ?? null,
        error: null,
      })
    : request(`/systems/${id}`, {}, "Failed to fetch system");

export const getUnitsBySystemId = (
  systemId: string,
): Promise<TrixmaResponse<Unit[]>> =>
  import.meta.env.DEV
    ? Promise.resolve({
        data: mockUnits.filter((u) => u.systemId === systemId),
        error: null,
      })
    : request(`/systems/${systemId}/units`, {}, "Failed to fetch units");

export const createSystem = (system: {
  name: string;
  description: string;
}): Promise<TrixmaResponse<System>> =>
  request(
    "/systems",
    {method: "POST", body: JSON.stringify(system)},
    "Failed to create system",
  );

export const updateSystem = (
  id: string | number,
  system: {name: string; description: string},
): Promise<TrixmaResponse<System>> =>
  request(
    `/systems/${id}`,
    {method: "PUT", body: JSON.stringify(system)},
    "Failed to update system",
  );

export const deleteSystem = (
  id: string | number,
): Promise<TrixmaResponse<void>> =>
  request(
    `/systems/${id}`,
    {method: "DELETE", parseResponse: false},
    "Failed to delete system",
  );
