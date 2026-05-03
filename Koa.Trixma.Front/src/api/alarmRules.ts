import {request} from "./client";
import type {
  AlarmRule,
  CreateAlarmRulePayload,
  CreateAlarmRuleResponse,
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
