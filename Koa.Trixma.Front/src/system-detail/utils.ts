import {
  Battery20 as Battery20Icon,
  Battery30 as Battery30Icon,
  Battery50 as Battery50Icon,
  Battery80 as Battery80Icon,
  BatteryAlert as BatteryAlertIcon,
  BatteryFull as BatteryFullIcon,
} from "@mui/icons-material";
import {type AlarmCondition} from "../api";

export const formatUptime = (ms: number): string => {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

export const getBatteryLevel = (mv: number): number => {
  const voltage = mv / 1000;
  if (voltage >= 4.1) return 100;
  if (voltage >= 4.0) return 90;
  if (voltage >= 3.9) return 80;
  if (voltage >= 3.85) return 70;
  if (voltage >= 3.8) return 60;
  if (voltage >= 3.75) return 50;
  if (voltage >= 3.7) return 40;
  if (voltage >= 3.65) return 30;
  if (voltage >= 3.5) return 20;
  if (voltage >= 3.3) return 10;
  if (voltage >= 3.0) return 5;
  return 0;
};

export const getBatteryIcon = (level: number) => {
  if (level <= 5) return BatteryAlertIcon;
  if (level <= 20) return Battery20Icon;
  if (level <= 35) return Battery30Icon;
  if (level <= 65) return Battery50Icon;
  if (level <= 85) return Battery80Icon;
  return BatteryFullIcon;
};

export const getBatteryColor = (level: number): "error" | "warning" | "success" => {
  if (level <= 20) return "error";
  if (level <= 50) return "warning";
  return "success";
};

export const formatAlarmCondition = (condition: AlarmCondition): string => {
  if (condition === 0) return "Below";
  if (condition === 1) return "Above";
  return "Equal";
};
