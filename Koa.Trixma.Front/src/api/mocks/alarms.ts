import type {AlarmEvent, AlarmRule} from "../types";

export const mockAlarmRules: AlarmRule[] = [
  {
    id: "d74afd8c-f192-4392-bf91-019db7899a46",
    unitId: "69dff343-7fbe-4b1a-9174-dbe1ab96897e",
    measurementType: "temperature",
    condition: 1,
    threshold: 20,
    name: "High temp",
    enabled: true,
    cooldownMinutes: 720,
    createdAt: "2026-05-14T06:05:12.537309Z",
  },
  {
    id: "a4b8d0a2-4e4b-4f7c-9ad2-9dc0c0fd9c21",
    unitId: "c1f73ca9-0375-490d-8cc1-a6ec997e5768",
    measurementType: "humidity",
    condition: 0,
    threshold: 30,
    name: "Low humidity",
    enabled: true,
    cooldownMinutes: 180,
    createdAt: "2026-05-14T07:20:00.000000Z",
  },
  {
    id: "2e5d3f61-b8d5-4b5b-a0a8-8f2a53b60b72",
    unitId: "917ae610-e4a2-4e95-9bdf-03da7d3f7766",
    measurementType: "battery",
    condition: 0,
    threshold: 15,
    name: "Battery warning",
    enabled: false,
    cooldownMinutes: 60,
    createdAt: "2026-05-14T08:45:00.000000Z",
  },
];

export const mockAlarmEvents: AlarmEvent[] = [
  {
    id: "d0c0a1f4-7c6d-4fb6-b2f8-9bc2c6b2c111",
    alarmRuleId: "d74afd8c-f192-4392-bf91-019db7899a46",
    firedAt: "2026-05-14T06:12:12.537309Z",
    actualValue: 22.4,
    message: "Temperature exceeded threshold",
  },
  {
    id: "b6db1ee0-7e4d-4f94-8a9c-5c876bd3a222",
    alarmRuleId: "d74afd8c-f192-4392-bf91-019db7899a46",
    firedAt: "2026-05-14T07:02:41.537309Z",
    actualValue: 24.1,
    message: "Temperature remained above limit",
  },
  {
    id: "7f7d16fd-6df9-4d2d-90ce-7e7a2c2d8333",
    alarmRuleId: "a4b8d0a2-4e4b-4f7c-9ad2-9dc0c0fd9c21",
    firedAt: "2026-05-14T07:25:00.000000Z",
    actualValue: 26.8,
    message: "Humidity dropped below target",
  },
  {
    id: "3c4ddf25-7d28-4c31-8ca0-f76a8d8e7444",
    alarmRuleId: "2e5d3f61-b8d5-4b5b-a0a8-8f2a53b60b72",
    firedAt: "2026-05-14T09:10:00.000000Z",
    actualValue: 14.7,
    message: "Battery level reached warning range",
  },
];