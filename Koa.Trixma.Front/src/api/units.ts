import { request } from "./client"
import type {
  Unit,
  LocationPreciseRequestResponse,
  MeasurementGroup,
  TrixmaResponse,
  UnitProvisioningStatus,
} from "./types"
import { mockUnits } from "./mocks/units"
import { mockSystems } from "./mocks/systems"
import { mockAlarmRules } from "./mocks/alarms"
import { getAlarmRulesByUnitId } from "./alarmRules"

export const getUnits = (): Promise<TrixmaResponse<Unit[]>> =>
  import.meta.env.DEV
    ? Promise.resolve({ data: mockUnits, error: null })
    : request("/units", {}, "Failed to fetch units")

export const getUnitById = (id: string): Promise<TrixmaResponse<Unit>> =>
  import.meta.env.DEV
    ? Promise.resolve({
        data: (() => {
          const unit = mockUnits.find((u) => u.id === id)
          if (!unit) return null
          return {
            ...unit,
            alarms: mockAlarmRules.filter((alarm) => alarm.unitId === id),
          }
        })(),
        error: null,
      })
    : (async () => {
        const { data: unitData, error: unitError } = await request<Unit>(
          `/units/${id}`,
          {},
          "Failed to fetch unit",
        )

        if (unitError || !unitData) {
          return { data: unitData, error: unitError }
        }

        const { data: alarmsData, error: alarmsError } =
          await getAlarmRulesByUnitId(id)

        if (alarmsError) {
          return { data: null, error: alarmsError }
        }

        return { data: { ...unitData, alarms: alarmsData || [] }, error: null }
      })()

export const getMeasurements = (
  unitId: string,
  from: string,
  to: string,
): Promise<TrixmaResponse<MeasurementGroup[]>> =>
  request(
    `/units/${unitId}/measurements?from=${from}&to=${to}`,
    {},
    "Failed to fetch measurements",
  )

export const pingUnit = (
  unitId: string,
): Promise<TrixmaResponse<{ message: string }>> =>
  request(`/units/${unitId}/ping`, { method: "POST" }, "Failed to ping unit")

export const queryUnitFrequency = (
  unitId: string,
): Promise<TrixmaResponse<{ message: string }>> =>
  request(
    `/units/${unitId}/freq-query`,
    { method: "POST" },
    "Failed to query unit frequency",
  )

export const setUnitFrequency = (
  unitId: string,
  payload: {
    payloadIntervalS?: number | null
    gnssRequestIntervalS?: number | null
  },
): Promise<TrixmaResponse<{ message: string }>> =>
  request(
    `/units/${unitId}/freq-set`,
    { method: "POST", body: JSON.stringify(payload) },
    "Failed to set unit frequency",
  )

export const setUnitGnss = (
  unitId: string,
  payload: {
    enabled: boolean
  },
): Promise<TrixmaResponse<{ message: string }>> =>
  request(
    `/units/${unitId}/gnss-set`,
    { method: "POST", body: JSON.stringify(payload) },
    "Failed to set unit GNSS configuration",
  )

export const setUnitLte = (
  unitId: string,
  payload: {
    enabled: boolean
  },
): Promise<TrixmaResponse<{ message: string }>> =>
  request(
    `/units/${unitId}/lte-set`,
    { method: "POST", body: JSON.stringify(payload) },
    "Failed to set unit LTE configuration",
  )

export const requestPreciseLocation = (
  unitId: string,
  payload?: {
    requestId?: string
    maxWaitS?: number
    minAccCm?: number
  },
): Promise<TrixmaResponse<LocationPreciseRequestResponse>> =>
  import.meta.env.DEV
    ? Promise.resolve({
        data: {
          message: "Location request sent",
          requestId: payload?.requestId ?? `gnss-req-${Date.now()}`,
        },
        error: null,
      })
    : request(
        `/units/${unitId}/location-precise-request`,
        {
          method: "POST",
          body: JSON.stringify({
            requestId: payload?.requestId,
            maxWaitS: payload?.maxWaitS ?? 120,
            minAccCm: payload?.minAccCm ?? 5000,
          }),
        },
        "Failed to request precise location",
      )

export const getUnitProvisioningStatus = (
  imei: string,
): Promise<TrixmaResponse<UnitProvisioningStatus>> =>
  import.meta.env.DEV
    ? Promise.resolve({
        data: (() => {
          const unit = mockUnits.find((entry) => entry.imei === imei) ?? null
          const system = unit?.systemId
            ? mockSystems.find((entry) => entry.id === unit.systemId)
            : null

          return {
            imei,
            exists: Boolean(unit),
            canProvision: true,
            isOwnedByCurrentUser: Boolean(unit),
            isAssigned: Boolean(unit?.systemId),
            unitId: unit?.id ?? null,
            systemId: unit?.systemId ?? null,
            systemName: system?.name ?? null,
          }
        })(),
        error: null,
      })
    : request(
        `/units/provisioning?imei=${encodeURIComponent(imei)}`,
        {},
        "Failed to fetch provisioning status",
      )

export const provisionUnit = (payload: {
  imei: string
  systemId?: string | null
}): Promise<TrixmaResponse<Unit>> =>
  import.meta.env.DEV
    ? (() => {
        const existingIndex = mockUnits.findIndex(
          (entry) => entry.imei === payload.imei,
        )
        const existingUnit =
          existingIndex >= 0 ? mockUnits[existingIndex] : null
        const provisionedUnit: Unit = existingUnit
          ? {
              ...existingUnit,
              systemId: payload.systemId ?? null,
              lastProvisionedAt: new Date().toISOString(),
            }
          : {
              id: crypto.randomUUID(),
              name: `Unit ${payload.imei}`,
              imei: payload.imei,
              systemId: payload.systemId ?? null,
              ipAddress: null,
              macAddress: null,
              nfcId: null,
              lastProvisionedAt: new Date().toISOString(),
              uptimeMs: null,
              batteryMv: null,
              measurements: [],
            }

        if (existingIndex >= 0) {
          mockUnits[existingIndex] = provisionedUnit
        } else {
          mockUnits.push(provisionedUnit)
        }

        return Promise.resolve({ data: provisionedUnit, error: null })
      })()
    : request(
        "/units/provisioning",
        { method: "POST", body: JSON.stringify(payload) },
        "Failed to provision unit",
      )

export const deleteUnit = (unitId: string): Promise<TrixmaResponse<void>> =>
  import.meta.env.DEV
    ? (() => {
        const index = mockUnits.findIndex((u) => u.id === unitId)
        if (index >= 0) {
          mockUnits.splice(index, 1)
        }
        return Promise.resolve({ data: undefined, error: null })
      })()
    : request(
        `/units/${unitId}`,
        { method: "DELETE", parseResponse: false },
        "Failed to delete unit",
      )

export const updateUnit = (
  unitId: string,
  payload: {
    name: string
    systemId?: string | null
    imei?: string | null
    nfcId?: string | null
    ipAddress?: string | null
    macAddress?: string | null
  },
): Promise<TrixmaResponse<void>> =>
  import.meta.env.DEV
    ? (() => {
        const index = mockUnits.findIndex((u) => u.id === unitId)
        if (index < 0) {
          return Promise.resolve({ data: null, error: "Unit not found" })
        }
        const updated = { ...mockUnits[index], ...payload }
        mockUnits[index] = updated
        return Promise.resolve({ data: undefined, error: null })
      })()
    : request(
        `/units/${unitId}`,
        { method: "PUT", body: JSON.stringify(payload), parseResponse: false },
        "Failed to update unit",
      )
