/**
 * Shared utilities for unit overview tabs
 */

export const INTERVAL_OPTIONS = [
  1, 10, 30, 60, 180, 300, 600, 900, 1800, 3600, 10800, 18000, 43200, 86400,
  172800,
]

export const findClosestInterval = (seconds: number): number => {
  return INTERVAL_OPTIONS.reduce((closest, candidate) => {
    return Math.abs(candidate - seconds) < Math.abs(closest - seconds)
      ? candidate
      : closest
  }, INTERVAL_OPTIONS[0])
}

export const getIntervalIndex = (seconds: number): number => {
  const closest = findClosestInterval(seconds)
  const index = INTERVAL_OPTIONS.indexOf(closest)
  return index >= 0 ? index : 0
}

export const getIntervalFromSliderValue = (value: number | number[]): number => {
  const raw = typeof value === "number" ? value : value[0]
  const index = Math.max(
    0,
    Math.min(INTERVAL_OPTIONS.length - 1, Math.round(raw)),
  )
  return INTERVAL_OPTIONS[index]
}

export const INTERVAL_MARKS = INTERVAL_OPTIONS.map((_value, index) => ({
  value: index,
}))

export const formatInterval = (seconds?: number | null): string => {
  const value = seconds ?? 0
  if (value === 0) return "off"
  if (value < 60) return `${value}s`
  if (value < 3600) return `${Math.round(value / 60)}m`
  if (value < 86400) return `${Math.round(value / 3600)}h`
  return `${Math.round(value / 86400)}d`
}

export const formatTelemetryXAxis = (tick: string): string => {
  const date = new Date(tick)
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export const formatAlarmCondition = (condition: number): string => {
  switch (condition) {
    case 0:
      return "Below"
    case 1:
      return "Above"
    case 2:
      return "Equal"
    default:
      return "Unknown"
  }
}
