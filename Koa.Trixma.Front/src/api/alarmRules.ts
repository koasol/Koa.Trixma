import {request} from "./client";
import type {
  AlarmEvent,
  AlarmRule,
  CreateAlarmRulePayload,
  CreateAlarmRuleResponse,
  UpdateAlarmRulePayload,
  TrixmaResponse,
} from "./types";
import {mockAlarmEvents, mockAlarmRules} from "./mocks/alarms";

export const getAlarmRulesByUnitId = (
  unitId: string,
): Promise<TrixmaResponse<AlarmRule[]>> =>
  import.meta.env.DEV
    ? Promise.resolve({
        data: mockAlarmRules.filter((alarm) => alarm.unitId === unitId),
        error: null,
      })
    : request(`/alarmrules/unit/${unitId}`, {}, "Failed to fetch alarm rules");

export const createAlarmRule = (
  payload: CreateAlarmRulePayload,
): Promise<TrixmaResponse<CreateAlarmRuleResponse>> =>
  import.meta.env.DEV
    ? (() => {
        const created: AlarmRule = {
          id: crypto.randomUUID(),
          unitId: payload.unitId,
          name: payload.name,
          measurementType: payload.measurementType,
          condition: payload.condition,
          threshold: payload.threshold,
          enabled: true,
          cooldownMinutes: payload.cooldownMinutes,
          createdAt: new Date().toISOString(),
        }

        mockAlarmRules.unshift(created)

        return Promise.resolve({data: {id: created.id}, error: null})
      })()
    : request(
        "/alarmrules",
        {method: "POST", body: JSON.stringify(payload)},
        "Failed to create alarm rule",
      );

export const getAlarmRuleById = (
  alarmRuleId: string,
): Promise<TrixmaResponse<AlarmRule>> =>
  import.meta.env.DEV
    ? Promise.resolve({
        data: mockAlarmRules.find((alarm) => alarm.id === alarmRuleId) ?? null,
        error: null,
      })
    : request(`/alarmrules/${alarmRuleId}`, {}, "Failed to fetch alarm rule");

export const updateAlarmRule = (
  alarmRuleId: string,
  payload: UpdateAlarmRulePayload,
): Promise<TrixmaResponse<void>> =>
  import.meta.env.DEV
    ? (() => {
        const index = mockAlarmRules.findIndex((alarm) => alarm.id === alarmRuleId)
        if (index < 0) {
          return Promise.resolve({data: null, error: "Alarm not found"})
        }

        mockAlarmRules[index] = {
          ...mockAlarmRules[index],
          ...payload,
        }

        return Promise.resolve({data: undefined, error: null})
      })()
    : request(
        `/alarmrules/${alarmRuleId}`,
        {method: "PUT", body: JSON.stringify(payload), parseResponse: false},
        "Failed to update alarm rule",
      );

export const deleteAlarmRule = (
  alarmRuleId: string,
): Promise<TrixmaResponse<void>> =>
  import.meta.env.DEV
    ? (() => {
        const index = mockAlarmRules.findIndex((alarm) => alarm.id === alarmRuleId)
        if (index >= 0) {
          mockAlarmRules.splice(index, 1)
        }

        return Promise.resolve({data: undefined, error: null})
      })()
    : request(
        `/alarmrules/${alarmRuleId}`,
        {method: "DELETE", parseResponse: false},
        "Failed to delete alarm rule",
      );

export const getAlarmEvents = (
  alarmRuleId: string,
): Promise<TrixmaResponse<AlarmEvent[]>> =>
  import.meta.env.DEV
    ? Promise.resolve({
        data: mockAlarmEvents.filter(
          (event) => event.alarmRuleId === alarmRuleId,
        ),
        error: null,
      })
    : request(
        `/alarmrules/${alarmRuleId}/events`,
        {},
        "Failed to fetch alarm events",
      );
