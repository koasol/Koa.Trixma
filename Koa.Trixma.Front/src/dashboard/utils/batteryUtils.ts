import {
  Battery20 as Battery20Icon,
  Battery30 as Battery30Icon,
  Battery50 as Battery50Icon,
  Battery80 as Battery80Icon,
  BatteryFull as BatteryFullIcon,
  BatteryAlert as BatteryAlertIcon,
} from "@mui/icons-material"
import type { Unit } from "../../api"

export const getBatteryPercentForUnit = (unit: Unit): number | null => {
  if (unit.batteryPercent != null) {
    return Math.max(0, Math.min(100, Math.round(unit.batteryPercent)))
  }
  if (unit.batteryMv == null) return null

  const voltage = unit.batteryMv / 1000
  if (voltage >= 4.1) return 100
  if (voltage >= 4.0) return 90
  if (voltage >= 3.9) return 80
  if (voltage >= 3.85) return 70
  if (voltage >= 3.8) return 60
  if (voltage >= 3.75) return 50
  if (voltage >= 3.7) return 40
  if (voltage >= 3.65) return 30
  if (voltage >= 3.5) return 20
  if (voltage >= 3.3) return 10
  if (voltage >= 3.0) return 5
  return 0
}

export const getBatteryLevel = (mv: number): number => {
  const voltage = mv / 1000

  if (voltage >= 4.1) return 100
  if (voltage >= 4.0) return 90
  if (voltage >= 3.9) return 80
  if (voltage >= 3.85) return 70
  if (voltage >= 3.8) return 60
  if (voltage >= 3.75) return 50
  if (voltage >= 3.7) return 40
  if (voltage >= 3.65) return 30
  if (voltage >= 3.5) return 20
  if (voltage >= 3.3) return 10
  if (voltage >= 3.0) return 5
  return 0
}

export const getBatteryIcon = (level: number) => {
  if (level <= 5) return BatteryAlertIcon
  if (level <= 20) return Battery20Icon
  if (level <= 35) return Battery30Icon
  if (level <= 65) return Battery50Icon
  if (level <= 85) return Battery80Icon
  return BatteryFullIcon
}

export const getBatteryColor = (level: number): "error" | "warning" | "success" => {
  if (level <= 20) return "error"
  if (level <= 50) return "warning"
  return "success"
}

export const formatRemainingLife = (hours: number): string => {
  if (hours < 1) {
    return `${Math.max(1, Math.round(hours * 60))}m`
  }
  if (hours < 24) {
    return `${hours.toFixed(1)}h`
  }

  const days = Math.floor(hours / 24)
  const remHours = Math.round(hours % 24)
  return `${days}d ${remHours}h`
}

export const getBatteryForecastLabel = (unit: Unit | null): string | null => {
  if (!unit) return null
  const status = unit.batteryForecastStatus
  if (status === "ok" && unit.batteryRemainingHours != null) {
    return `Est. life ${formatRemainingLife(unit.batteryRemainingHours)}`
  }
  if (status === "charging") {
    return "Battery charging"
  }
  if (status === "unstable") {
    return "Life estimate recalibrating"
  }
  if (status === "insufficient_data") {
    return "Collecting battery trend"
  }
  return null
}

export const getBatteryForecastColor = (
  unit: Unit | null,
): "default" | "success" | "warning" => {
  if (
    !unit ||
    unit.batteryForecastStatus !== "ok" ||
    unit.batteryRemainingHours == null
  ) {
    return "default"
  }
  if (unit.batteryRemainingHours >= 24) {
    return "success"
  }
  if (unit.batteryRemainingHours >= 8) {
    return "warning"
  }
  return "warning"
}
