import {request} from "./client";
import type {
  AlarmEvent,
  AlarmRule,
  CreateAlarmRulePayload,
  CreateAlarmRuleResponse,
  UpdateAlarmRulePayload,
  TrixmaResponse,
} from "./types";

export const getAlarmRulesByUnitId = (
  unitId: string,
): Promise<TrixmaResponse<AlarmRule[]>> =>
  request(`/alarmrules/unit/${unitId}`, {}, "Failed to fetch alarm rules");

export const createAlarmRule = (
  payload: CreateAlarmRulePayload,
): Promise<TrixmaResponse<CreateAlarmRuleResponse>> =>
  request(
    "/alarmrules",
    {method: "POST", body: JSON.stringify(payload)},
    "Failed to create alarm rule",
  );

export const getAlarmRuleById = (
  alarmRuleId: string,
): Promise<TrixmaResponse<AlarmRule>> =>
  request(`/alarmrules/${alarmRuleId}`, {}, "Failed to fetch alarm rule");

export const updateAlarmRule = (
  alarmRuleId: string,
  payload: UpdateAlarmRulePayload,
): Promise<TrixmaResponse<void>> =>
  request(
    `/alarmrules/${alarmRuleId}`,
    {method: "PUT", body: JSON.stringify(payload), parseResponse: false},
    "Failed to update alarm rule",
  );

export const getAlarmEvents = (
  alarmRuleId: string,
): Promise<TrixmaResponse<AlarmEvent[]>> =>
  request(
    `/alarmrules/${alarmRuleId}/events`,
    {},
    "Failed to fetch alarm events",
  );
