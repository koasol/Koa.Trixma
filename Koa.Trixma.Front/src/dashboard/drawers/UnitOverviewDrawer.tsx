import React, { useEffect, useMemo, useState } from "react"
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  Paper,
  Slider,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tab,
  Tabs,
  Typography,
} from "@mui/material"
import { alpha } from "@mui/material/styles"
import {
  Add as AddIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Map as MapIcon,
  OpenInNew as OpenInNewIcon,
  RestartAlt as RestartAltIcon,
  Satellite as SatelliteIcon,
  Sensors as SensorsIcon,
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
} from "@mui/icons-material"
import { Circle, CircleMarker, MapContainer, TileLayer } from "react-leaflet"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useNavigate } from "react-router-dom"
import { trixma, type MeasurementDataPoint, type MeasurementGroup, type Unit } from "../../api"
import AppBreadcrumbs from "../../components/AppBreadcrumbs"
import {
  getBatteryForecastColor,
  getBatteryForecastLabel,
  getBatteryIcon,
  getBatteryColor,
  getBatteryLevel,
} from "../utils/batteryUtils"
import { formatUptime } from "../utils/timeUtils"

type UnitOverviewTab =
  | "overview"
  | "telemetry"
  | "alarms"
  | "settings"
  | "firmware"

interface UnitOverviewDrawerProps {
  open: boolean
  loading: boolean
  error: string | null
  unit: Unit | null
  activeTab: UnitOverviewTab
  onClose: () => void
  onTabChange: (tab: UnitOverviewTab) => void
  onAddAlarm?: (unitId: string) => void
  onPingUnit?: (unitId: string) => void
  onUnitUpdated?: (unit: Unit) => void
  pinging?: boolean
  getSystemNameForUnit: (systemId: string | null) => string
  formatUptime?: (ms: number) => string
  getBatteryLevel?: (mv: number) => number
  getBatteryIcon?: (level: number) => React.ElementType
  getBatteryColor?: (level: number) => "error" | "warning" | "success"
}

const INTERVAL_OPTIONS = [
  1, 10, 30, 60, 180, 300, 600, 900, 1800, 3600, 10800, 18000, 43200, 86400,
  172800,
]

const findClosestInterval = (seconds: number): number => {
  return INTERVAL_OPTIONS.reduce((closest, candidate) => {
    return Math.abs(candidate - seconds) < Math.abs(closest - seconds)
      ? candidate
      : closest
  }, INTERVAL_OPTIONS[0])
}

const getIntervalIndex = (seconds: number): number => {
  const closest = findClosestInterval(seconds)
  const index = INTERVAL_OPTIONS.indexOf(closest)
  return index >= 0 ? index : 0
}

const getIntervalFromSliderValue = (value: number | number[]): number => {
  const raw = typeof value === "number" ? value : value[0]
  const index = Math.max(
    0,
    Math.min(INTERVAL_OPTIONS.length - 1, Math.round(raw)),
  )
  return INTERVAL_OPTIONS[index]
}

const INTERVAL_MARKS = INTERVAL_OPTIONS.map((_value, index) => ({
  value: index,
}))

const UnitOverviewDrawer: React.FC<UnitOverviewDrawerProps> = ({
  open,
  loading,
  error,
  unit,
  activeTab,
  onClose,
  onTabChange,
  onAddAlarm,
  onPingUnit,
  onUnitUpdated,
  pinging = false,
  getSystemNameForUnit,
  formatUptime: formatUptimeFunc,
  getBatteryLevel: getBatteryLevelFunc,
  getBatteryColor: getBatteryColorFunc,
}) => {
  const navigate = useNavigate()
  const [mapViewMode, setMapViewMode] = useState<"normal" | "satellite">(
    "satellite",
  )
  const [locationGroups, setLocationGroups] = useState<MeasurementGroup[]>([])
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editImei, setEditImei] = useState("")
  const [editNfcId, setEditNfcId] = useState("")
  const [editIpAddress, setEditIpAddress] = useState("")
  const [editMacAddress, setEditMacAddress] = useState("")
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [telemetryGroups, setTelemetryGroups] = useState<MeasurementGroup[]>([])
  const [telemetryLoading, setTelemetryLoading] = useState(false)
  const [telemetryError, setTelemetryError] = useState<string | null>(null)
  const [localGnssEnabled, setLocalGnssEnabled] = useState(
    unit?.gnssEnabled ?? false,
  )
  const [localPayloadInterval, setLocalPayloadInterval] = useState(
    findClosestInterval(unit?.payloadIntervalS ?? 60),
  )
  const [localGnssInterval, setLocalGnssInterval] = useState(
    findClosestInterval(unit?.gnssRequestIntervalS ?? 120),
  )

  const formatInterval = (seconds?: number | null): string => {
    const value = seconds ?? 0
    if (value === 0) return "off"
    if (value < 60) return `${value}s`
    if (value < 3600) return `${Math.round(value / 60)}m`
    if (value < 86400) return `${Math.round(value / 3600)}h`
    return `${Math.round(value / 86400)}d`
  }

  const formatTelemetryXAxis = (tick: string) => {
    const date = new Date(tick)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  useEffect(() => {
    if (!unit) return
    setLocalGnssEnabled(unit.gnssEnabled ?? false)
    setLocalPayloadInterval(findClosestInterval(unit.payloadIntervalS ?? 60))
    setLocalGnssInterval(findClosestInterval(unit.gnssRequestIntervalS ?? 120))
    setSettingsError(null)
  }, [unit?.id, unit?.gnssEnabled, unit?.payloadIntervalS, unit?.gnssRequestIntervalS])

  useEffect(() => {
    if (!open || !unit?.id || activeTab !== "overview") return

    let cancelled = false
    const fetchLocationData = async () => {
      setLocationLoading(true)
      setLocationError(null)
      const to = new Date()
      const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000)
      const { data, error: fetchError } = await trixma.getMeasurements(
        unit.id,
        from.toISOString(),
        to.toISOString(),
      )
      if (cancelled) return
      if (fetchError) {
        setLocationError(fetchError)
        setLocationGroups([])
      } else {
        setLocationGroups(data || [])
      }
      setLocationLoading(false)
    }

    void fetchLocationData()
    return () => {
      cancelled = true
    }
  }, [activeTab, open, unit?.id])

  useEffect(() => {
    if (!open || !unit?.id || activeTab !== "telemetry") return

    let cancelled = false
    const fetchTelemetryData = async () => {
      setTelemetryLoading(true)
      setTelemetryError(null)
      const to = new Date()
      const from = new Date(to.getTime() - 24 * 60 * 60 * 1000)
      const { data, error: fetchError } = await trixma.getMeasurements(
        unit.id,
        from.toISOString(),
        to.toISOString(),
      )
      if (cancelled) return
      if (fetchError) {
        setTelemetryError(fetchError)
        setTelemetryGroups([])
      } else {
        setTelemetryGroups(data || [])
      }
      setTelemetryLoading(false)
    }

    void fetchTelemetryData()
    return () => {
      cancelled = true
    }
  }, [activeTab, open, unit?.id])

  const getLatestMeasurement = (points: MeasurementDataPoint[]) => {
    if (points.length === 0) return null
    return points.reduce((latest, current) => {
      return new Date(current.timestamp).getTime() >
        new Date(latest.timestamp).getTime()
        ? current
        : latest
    })
  }

  const latMeasurements = useMemo(
    () => locationGroups.find((g) => g.type === "lat_udeg")?.data || [],
    [locationGroups],
  )
  const lonMeasurements = useMemo(
    () => locationGroups.find((g) => g.type === "lon_udeg")?.data || [],
    [locationGroups],
  )
  const accMeasurements = useMemo(
    () => locationGroups.find((g) => g.type === "acc_cm")?.data || [],
    [locationGroups],
  )

  const latPoint = getLatestMeasurement(latMeasurements)
  const lonPoint = getLatestMeasurement(lonMeasurements)
  const accPoint = getLatestMeasurement(accMeasurements)
  const latDeg = latPoint ? latPoint.value / 1_000_000 : null
  const lonDeg = lonPoint ? lonPoint.value / 1_000_000 : null
  const accMeters = accPoint ? accPoint.value / 100 : null
  const hasLocation = latDeg != null && lonDeg != null
  const alarms = unit?.alarms ?? []
  const gnssTypes = new Set(["lat_udeg", "lon_udeg", "acc_cm"])
  const chartTelemetryGroups = telemetryGroups.filter(
    (group) => !gnssTypes.has(group.type) && group.data.length > 0,
  )

  const renderTelemetryChart = (type: string, data: MeasurementDataPoint[]) => {
    const sorted = [...data].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    )
    const latest = sorted[sorted.length - 1]
    const gradientId = `drawer-grad-${type}`

    return (
      <Paper
        key={type}
        variant="outlined"
        sx={{ p: 1.5, borderColor: "divider", bgcolor: "background.paper", minWidth: 0 }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            mb: 1,
            flexWrap: "wrap",
          }}
        >
          <Typography variant="subtitle2" sx={{ textTransform: "capitalize", fontWeight: 700 }}>
            {type}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {latest ? `Last: ${new Date(latest.timestamp).toLocaleString()}` : "No data"}
          </Typography>
        </Box>
        <Box sx={{ width: "100%", height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sorted} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#42a5f5" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="#42a5f5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2a2d3a" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatTelemetryXAxis}
                stroke="#9aa0ad"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                minTickGap={28}
              />
              <YAxis
                stroke="#9aa0ad"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) =>
                  typeof value === "number" ? value.toFixed(1) : value
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111423",
                  borderColor: "#2f3445",
                  borderRadius: "8px",
                  color: "#eef1ff",
                }}
                labelFormatter={(label) => new Date(label).toLocaleString()}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#42a5f5"
                fillOpacity={1}
                fill={`url(#${gradientId})`}
                strokeWidth={2.5}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    )
  }

  const formatAlarmCondition = (condition: number) => {
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

  const handleOpenEditDialog = () => {
    if (!unit) return
    setEditName(unit.name || "")
    setEditImei(unit.imei || "")
    setEditNfcId(unit.nfcId || "")
    setEditIpAddress(unit.ipAddress || "")
    setEditMacAddress(unit.macAddress || "")
    setEditError(null)
    setEditDialogOpen(true)
  }

  const handleCloseEditDialog = () => {
    if (editSubmitting) return
    setEditDialogOpen(false)
    setEditError(null)
  }

  const handleSubmitEdit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!unit) return

    try {
      setEditSubmitting(true)
      setEditError(null)

      const { error: updateError } = await trixma.updateUnit(unit.id, {
        name: editName,
        systemId: unit.systemId ?? null,
        imei: editImei.trim() ? editImei.trim() : null,
        nfcId: editNfcId.trim() ? editNfcId.trim() : null,
        ipAddress: editIpAddress.trim() ? editIpAddress.trim() : null,
        macAddress: editMacAddress.trim() ? editMacAddress.trim() : null,
      })

      if (updateError) throw new Error(updateError)

      const updatedUnit: Unit = {
        ...unit,
        name: editName,
        imei: editImei.trim() ? editImei.trim() : null,
        nfcId: editNfcId.trim() ? editNfcId.trim() : null,
        ipAddress: editIpAddress.trim() ? editIpAddress.trim() : null,
        macAddress: editMacAddress.trim() ? editMacAddress.trim() : null,
      }

      onUnitUpdated?.(updatedUnit)
      setEditDialogOpen(false)
    } catch (err: unknown) {
      setEditError(
        err instanceof Error ? err.message : "Failed to update unit",
      )
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleGnssToggle = async (enabled: boolean) => {
    if (!unit) return
    setSettingsLoading(true)
    setSettingsError(null)
    setLocalGnssEnabled(enabled)

    try {
      const { error: updateError } = await trixma.setUnitGnss(unit.id, { enabled })
      if (updateError) {
        setSettingsError(updateError)
        setLocalGnssEnabled(!enabled)
      } else {
        onUnitUpdated?.({ ...unit, gnssEnabled: enabled })
      }
    } catch {
      setSettingsError("Failed to update GNSS setting")
      setLocalGnssEnabled(!enabled)
    } finally {
      setSettingsLoading(false)
    }
  }

  const handlePayloadIntervalChange = (_event: Event, value: number | number[]) => {
    setLocalPayloadInterval(getIntervalFromSliderValue(value))
  }

  const handlePayloadIntervalCommit = async (
    _event: Event | React.SyntheticEvent,
    value: number | number[],
  ) => {
    if (!unit) return
    const nextInterval = getIntervalFromSliderValue(value)
    setSettingsLoading(true)
    setSettingsError(null)

    try {
      const { error: updateError } = await trixma.setUnitFrequency(unit.id, {
        payloadIntervalS: nextInterval,
      })
      if (updateError) {
        setSettingsError(updateError)
        setLocalPayloadInterval(findClosestInterval(unit.payloadIntervalS ?? 60))
      } else {
        onUnitUpdated?.({ ...unit, payloadIntervalS: nextInterval })
      }
    } catch {
      setSettingsError("Failed to update payload interval")
      setLocalPayloadInterval(findClosestInterval(unit.payloadIntervalS ?? 60))
    } finally {
      setSettingsLoading(false)
    }
  }

  const handleGnssIntervalChange = (_event: Event, value: number | number[]) => {
    setLocalGnssInterval(getIntervalFromSliderValue(value))
  }

  const handleGnssIntervalCommit = async (
    _event: Event | React.SyntheticEvent,
    value: number | number[],
  ) => {
    if (!unit) return
    const nextInterval = getIntervalFromSliderValue(value)
    setSettingsLoading(true)
    setSettingsError(null)

    try {
      const { error: updateError } = await trixma.setUnitFrequency(unit.id, {
        gnssRequestIntervalS: nextInterval,
      })
      if (updateError) {
        setSettingsError(updateError)
        setLocalGnssInterval(
          findClosestInterval(unit.gnssRequestIntervalS ?? 120),
        )
      } else {
        onUnitUpdated?.({ ...unit, gnssRequestIntervalS: nextInterval })
      }
    } catch {
      setSettingsError("Failed to update GNSS interval")
      setLocalGnssInterval(findClosestInterval(unit.gnssRequestIntervalS ?? 120))
    } finally {
      setSettingsLoading(false)
    }
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        "& .MuiDrawer-paper": {
          width: { xs: "100vw", sm: "40vw" },
          maxWidth: { sm: 720 },
          top: { xs: 56, sm: 64 },
          height: { xs: "calc(100% - 56px)", sm: "calc(100% - 64px)" },
        },
      }}
    >
      <Box
        sx={{ p: 2, display: "flex", flexDirection: "column", height: "100%" }}
      >
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
          <IconButton onClick={onClose} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {loading && !unit ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : error && !unit ? (
          <Typography color="error">{error}</Typography>
        ) : unit ? (
          <>
            <AppBreadcrumbs
              items={[
                { label: "Systems", to: "/" },
                ...(unit.systemId
                  ? [
                      {
                        label: getSystemNameForUnit(unit.systemId),
                        to: `/systems/${unit.systemId}`,
                      },
                      {
                        label: "Units",
                        to: `/systems/${unit.systemId}?tab=units`,
                      },
                    ]
                  : [{ label: "Units" }]),
                { label: unit.name || "Unit" },
              ]}
              sx={{ mb: 2, ml: 0 }}
            />

            <Box sx={{ mb: 0, px: { xs: 1, md: 0 } }}>
              <Typography
                variant="h4"
                fontWeight="800"
                sx={{
                  mb: 1,
                  background: (theme) =>
                    `linear-gradient(135deg, ${theme.palette.text.primary} 0%, ${theme.palette.primary.main} 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {unit.name || "Unnamed unit"}
              </Typography>

              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
                {unit.uptimeMs != null && (
                  <Chip
                    icon={
                      <RestartAltIcon sx={{ fontSize: "0.9rem !important" }} />
                    }
                    label={`Up ${formatUptime(unit.uptimeMs)}`}
                    size="small"
                    color="success"
                    variant="outlined"
                    sx={{ fontWeight: 700, fontSize: "0.7rem" }}
                  />
                )}
                {unit.batteryMv != null &&
                  (() => {
                    const level = getBatteryLevel(unit.batteryMv)
                    const BatteryIcon = getBatteryIcon(level)
                    const color = getBatteryColor(level)
                    return (
                      <Chip
                        icon={
                          <BatteryIcon sx={{ fontSize: "0.9rem !important" }} />
                        }
                        label={`${level}% (${(unit.batteryMv / 1000).toFixed(2)}V)`}
                        size="small"
                        color={color}
                        variant="outlined"
                        sx={{ fontWeight: 700, fontSize: "0.7rem" }}
                      />
                    )
                  })()}
                {getBatteryForecastLabel(unit) && (
                  <Chip
                    label={getBatteryForecastLabel(unit) as string}
                    size="small"
                    color={getBatteryForecastColor(unit)}
                    variant="outlined"
                    sx={{ fontWeight: 700, fontSize: "0.7rem" }}
                  />
                )}
                {unit.batteryForecastStatus === "ok" &&
                  unit.batteryForecastConfidence != null && (
                    <Chip
                      label={`Confidence ${Math.round(
                        unit.batteryForecastConfidence * 100,
                      )}%`}
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 700, fontSize: "0.7rem" }}
                    />
                  )}
              </Box>

              <Paper
                elevation={0}
                sx={{
                  mx: -2,
                  px: 2,
                  border: 1,
                  borderColor: "divider",
                  borderLeft: 0,
                  borderRight: 0,
                  borderRadius: 0,
                  bgcolor: "background.paper",
                  overflow: "hidden",
                }}
              >
                <Tabs
                  value={activeTab}
                  onChange={(_event, newValue: UnitOverviewTab) =>
                    onTabChange(newValue)
                  }
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{
                    px: 0,
                    "& .MuiTab-root:hover": {
                      bgcolor: "action.hover",
                    },
                  }}
                >
                  <Tab value="overview" label="Overview" />
                  <Tab value="telemetry" label="Telemetry" />
                  <Tab value="alarms" label="Alarms" />
                  <Tab value="settings" label="Settings" />
                  <Tab value="firmware" label="Firmware" />
                </Tabs>
              </Paper>
            </Box>

            {error && (
              <Typography color="error" sx={{ mb: 2 }}>
                {error}
              </Typography>
            )}

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
                mb: 2,
                flex: 1,
                overflowY: "auto",
                pt: 2,
                mx: -2,
                px: 2,
                bgcolor: "#0e1118",
              }}
            >
              {activeTab === "overview" ? (
                <>
                  {(() => {
                    const resolvedFormatUptime = formatUptimeFunc ?? formatUptime
                    const resolvedGetBatteryLevel =
                      getBatteryLevelFunc ?? getBatteryLevel
                    const resolvedGetBatteryColor =
                      getBatteryColorFunc ?? getBatteryColor

                    const uptimeValue =
                      unit.uptimeMs != null
                        ? resolvedFormatUptime(unit.uptimeMs)
                        : "N/A"

                    const batteryLevelValue =
                      unit.batteryMv != null
                        ? resolvedGetBatteryLevel(unit.batteryMv)
                        : unit.batteryPercent ?? null

                    const batteryTone =
                      batteryLevelValue != null
                        ? resolvedGetBatteryColor(batteryLevelValue)
                        : "success"

                    const statusCards: Array<{
                      key: string
                      label: string
                      value: string
                      detail: string
                      alert?: boolean
                    }> = [
                      {
                        key: "battery",
                        label: "BATTERY",
                        value:
                          batteryLevelValue != null
                            ? `${Math.round(batteryLevelValue)}%`
                            : "N/A",
                        detail:
                          batteryTone === "error"
                            ? "critical"
                            : batteryTone === "warning"
                              ? "low"
                              : "healthy",
                        alert: batteryTone === "error",
                      },
                      {
                        key: "uptime",
                        label: "UPTIME",
                        value: uptimeValue,
                        detail: "device runtime",
                      },
                      {
                        key: "payload",
                        label: "PAYLOAD",
                        value: formatInterval(unit.payloadIntervalS),
                        detail: "report interval",
                      },
                      {
                        key: "gnss",
                        label: "GNSS",
                        value: unit.gnssEnabled ? "ON" : "OFF",
                        detail:
                          unit.gnssEnabled
                            ? "location active"
                            : "location disabled",
                      },
                      {
                        key: "gnssReq",
                        label: "GNSS REQ",
                        value: formatInterval(unit.gnssRequestIntervalS),
                        detail: "request interval",
                      },
                      {
                        key: "system",
                        label: "SYSTEM",
                        value: unit.systemId
                          ? getSystemNameForUnit(unit.systemId)
                          : "Unlinked",
                        detail: unit.systemId ? "assigned" : "assign to system",
                        alert: !unit.systemId,
                      },
                    ]

                    return (
                      <>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mb: 1.25,
                          }}
                        >
                          <Typography
                            variant="overline"
                            sx={{
                              letterSpacing: "0.18em",
                              fontWeight: 700,
                              color: "text.secondary",
                              lineHeight: 1.2,
                            }}
                          >
                            Live status
                          </Typography>
                          <Box
                            sx={{
                              flex: 1,
                              borderTop: 1,
                              borderColor: "divider",
                              opacity: 0.8,
                            }}
                          />
                        </Box>

                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: {
                              xs: "1fr",
                              sm: "repeat(2, minmax(0, 1fr))",
                              md: "repeat(3, minmax(0, 1fr))",
                            },
                            gap: 1,
                          }}
                        >
                          {statusCards.map((card) => (
                            <Paper
                              key={card.key}
                              variant="outlined"
                              sx={{
                                p: 1.25,
                                borderRadius: 1,
                                borderColor: card.alert
                                  ? (theme) =>
                                      alpha(
                                        theme.palette.error.main,
                                        theme.palette.mode === "dark"
                                          ? 0.55
                                          : 0.35,
                                      )
                                  : "divider",
                                bgcolor: card.alert
                                  ? (theme) =>
                                      alpha(
                                        theme.palette.error.main,
                                        theme.palette.mode === "dark"
                                          ? 0.14
                                          : 0.08,
                                      )
                                  : "background.paper",
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  display: "block",
                                  letterSpacing: "0.16em",
                                  textTransform: "uppercase",
                                  color: "text.secondary",
                                  fontWeight: 700,
                                  mb: 0.25,
                                }}
                              >
                                {card.label}
                              </Typography>
                              <Typography
                                variant="h5"
                                fontWeight={800}
                                sx={{
                                  fontSize: "1.55rem",
                                  lineHeight: 1.05,
                                  color: card.alert ? "error.main" : "text.primary",
                                }}
                              >
                                {card.value}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ color: "text.secondary", mt: 0.25, display: "block" }}
                              >
                                {card.detail}
                              </Typography>
                            </Paper>
                          ))}
                        </Box>

                        <Box sx={{ mt: 2 }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              mb: 1.25,
                            }}
                          >
                            <Typography
                              variant="overline"
                              sx={{
                                letterSpacing: "0.18em",
                                fontWeight: 700,
                                color: "text.secondary",
                                lineHeight: 1.2,
                              }}
                            >
                              Location
                            </Typography>
                            <Box
                              sx={{
                                flex: 1,
                                borderTop: 1,
                                borderColor: "divider",
                                opacity: 0.8,
                              }}
                            />
                          </Box>

                          <Paper
                            variant="outlined"
                            sx={{
                              p: 1.25,
                              borderRadius: 1,
                              bgcolor: "background.paper",
                              borderColor: "divider",
                            }}
                          >
                            {locationLoading ? (
                              <Box
                                sx={{
                                  py: 4,
                                  display: "flex",
                                  justifyContent: "center",
                                }}
                              >
                                <CircularProgress size={22} />
                              </Box>
                            ) : hasLocation ? (
                              <>
                                <Box
                                  sx={{
                                    width: "100%",
                                    height: 300,
                                    borderRadius: 1,
                                    overflow: "hidden",
                                  }}
                                >
                                  <MapContainer
                                    center={[latDeg as number, lonDeg as number]}
                                    zoom={15}
                                    style={{ height: "100%", width: "100%" }}
                                    scrollWheelZoom={false}
                                  >
                                    <TileLayer
                                      attribution={
                                        mapViewMode === "satellite"
                                          ? "&copy; Esri, DigitalGlobe, Earthstar Geographics"
                                          : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                      }
                                      url={
                                        mapViewMode === "satellite"
                                          ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                          : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                      }
                                    />
                                    {accMeters != null && accMeters > 0 && (
                                      <Circle
                                        center={[latDeg as number, lonDeg as number]}
                                        radius={accMeters}
                                        pathOptions={{
                                          color: "#3f51b5",
                                          fillColor: "#3f51b5",
                                          fillOpacity: 0.12,
                                          weight: 2,
                                        }}
                                      />
                                    )}
                                    <CircleMarker
                                      center={[latDeg as number, lonDeg as number]}
                                      radius={7}
                                      pathOptions={{
                                        color: "#3f51b5",
                                        fillColor: "#3f51b5",
                                        fillOpacity: 1,
                                        weight: 2,
                                      }}
                                    />
                                  </MapContainer>
                                </Box>

                                <Box
                                  sx={{
                                    mt: 1,
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: 1,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    Lat: {(latDeg as number).toFixed(6)} | Lon: {(lonDeg as number).toFixed(6)}
                                  </Typography>
                                  <ToggleButtonGroup
                                    size="small"
                                    value={mapViewMode}
                                    exclusive
                                    onChange={(_e, v) => v && setMapViewMode(v)}
                                    sx={{ bgcolor: "background.paper" }}
                                  >
                                    <ToggleButton
                                      value="normal"
                                      aria-label="Normal map"
                                    >
                                      <MapIcon
                                        fontSize="small"
                                        sx={{ mr: 0.5 }}
                                      />
                                      Normal
                                    </ToggleButton>
                                    <ToggleButton
                                      value="satellite"
                                      aria-label="Satellite view"
                                    >
                                      <SatelliteIcon
                                        fontSize="small"
                                        sx={{ mr: 0.5 }}
                                      />
                                      Satellite
                                    </ToggleButton>
                                  </ToggleButtonGroup>
                                </Box>
                              </>
                            ) : (
                              <Typography
                                color="text.secondary"
                                sx={{ p: 2, textAlign: "center" }}
                              >
                                {locationError
                                  ? `Could not load location data: ${locationError}`
                                  : "No valid GNSS location (lat/lon) is available for this unit."}
                              </Typography>
                            )}
                          </Paper>
                        </Box>
                      </>
                    )
                  })()}

                  <Box
                    sx={{
                      mt: 2,
                    }}
                  >
                  </Box>

                  <Box sx={{ mt: 2 }}>
                    <Typography
                      variant="caption"
                      color="primary"
                      sx={{ fontWeight: "bold" }}
                    >
                      ID
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontFamily: "monospace", wordBreak: "break-all" }}
                    >
                      {unit.id}
                    </Typography>
                  </Box>

                  {unit.name && (
                    <Box>
                      <Typography
                        variant="caption"
                        color="primary"
                        sx={{ fontWeight: "bold" }}
                      >
                        Name
                      </Typography>
                      <Typography variant="body2">{unit.name}</Typography>
                    </Box>
                  )}

                  {unit.imei && (
                    <Box>
                      <Typography
                        variant="caption"
                        color="primary"
                        sx={{ fontWeight: "bold" }}
                      >
                        IMEI
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: "monospace" }}
                      >
                        {unit.imei}
                      </Typography>
                    </Box>
                  )}

                  {unit.macAddress && (
                    <Box>
                      <Typography
                        variant="caption"
                        color="primary"
                        sx={{ fontWeight: "bold" }}
                      >
                        MAC Address
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: "monospace" }}
                      >
                        {unit.macAddress}
                      </Typography>
                    </Box>
                  )}

                  {unit.ipAddress && (
                    <Box>
                      <Typography
                        variant="caption"
                        color="primary"
                        sx={{ fontWeight: "bold" }}
                      >
                        IP Address
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: "monospace" }}
                      >
                        {unit.ipAddress}
                      </Typography>
                    </Box>
                  )}

                  {unit.nfcId && (
                    <Box>
                      <Typography
                        variant="caption"
                        color="primary"
                        sx={{ fontWeight: "bold" }}
                      >
                        NFC ID
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: "monospace" }}
                      >
                        {unit.nfcId}
                      </Typography>
                    </Box>
                  )}

                  {unit.lastProvisionedAt && (
                    <Box>
                      <Typography
                        variant="caption"
                        color="primary"
                        sx={{ fontWeight: "bold" }}
                      >
                        Last Provisioned
                      </Typography>
                      <Typography variant="body2">
                        {new Date(unit.lastProvisionedAt).toLocaleString()}
                      </Typography>
                    </Box>
                  )}

                  {unit.systemId && (
                    <Box>
                      <Typography
                        variant="caption"
                        color="primary"
                        sx={{ fontWeight: "bold" }}
                      >
                        System
                      </Typography>
                      <Typography variant="body2">
                        {getSystemNameForUnit(unit.systemId)}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: "monospace",
                          color: "text.secondary",
                        }}
                      >
                        {unit.systemId}
                      </Typography>
                    </Box>
                  )}

                  {(unit.payloadIntervalS != null ||
                    unit.gnssRequestIntervalS != null) && (
                    <Box>
                      <Typography
                        variant="caption"
                        color="primary"
                        sx={{ fontWeight: "bold" }}
                      >
                        Update Frequency
                      </Typography>
                      {unit.payloadIntervalS != null && (
                        <Typography variant="body2">
                          Payload: every {unit.payloadIntervalS}s
                        </Typography>
                      )}
                      {unit.gnssRequestIntervalS != null && (
                        <Typography variant="body2">
                          GNSS:{" "}
                          {unit.gnssRequestIntervalS === 0
                            ? "disabled"
                            : `every ${unit.gnssRequestIntervalS}s`}
                        </Typography>
                      )}
                    </Box>
                  )}

                  {unit.batteryForecastStatus && (
                    <Box>
                      <Typography
                        variant="caption"
                        color="primary"
                        sx={{ fontWeight: "bold" }}
                      >
                        Battery Life Forecast
                      </Typography>
                      <Typography variant="body2">
                        {getBatteryForecastLabel(unit)}
                      </Typography>
                      {unit.batteryForecastStatus === "ok" &&
                        unit.batteryDischargeRatePctPerHour != null && (
                          <Typography variant="body2" color="text.secondary">
                            Discharge rate:{" "}
                            {unit.batteryDischargeRatePctPerHour.toFixed(3)}
                            %/h
                          </Typography>
                        )}
                      {unit.batteryForecastStatus === "ok" &&
                        unit.batteryForecastConfidence != null && (
                          <Typography variant="body2" color="text.secondary">
                            Confidence:{" "}
                            {Math.round(unit.batteryForecastConfidence * 100)}%
                          </Typography>
                        )}
                      {unit.batteryForecastEstimatedAt && (
                        <Typography variant="body2" color="text.secondary">
                          Updated:{" "}
                          {new Date(
                            unit.batteryForecastEstimatedAt,
                          ).toLocaleString()}
                        </Typography>
                      )}
                    </Box>
                  )}
                </>
              ) : activeTab === "telemetry" ? (
                <>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1.25,
                    }}
                  >
                    <Typography
                      variant="overline"
                      sx={{
                        letterSpacing: "0.18em",
                        fontWeight: 700,
                        color: "text.secondary",
                        lineHeight: 1.2,
                      }}
                    >
                      Measurement telemetry
                    </Typography>
                    <Box
                      sx={{
                        flex: 1,
                        borderTop: 1,
                        borderColor: "divider",
                        opacity: 0.8,
                      }}
                    />
                  </Box>

                  {telemetryError && (
                    <Alert severity="error" sx={{ mb: 1.5 }}>
                      Could not load telemetry data: {telemetryError}
                    </Alert>
                  )}

                  {telemetryLoading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : chartTelemetryGroups.length > 0 ? (
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "1fr",
                          sm: "repeat(2, minmax(0, 1fr))",
                        },
                        gap: 1.5,
                      }}
                    >
                      {chartTelemetryGroups.map((group) =>
                        renderTelemetryChart(group.type, group.data),
                      )}
                    </Box>
                  ) : (
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        textAlign: "center",
                        borderStyle: "dashed",
                        bgcolor: "#191a26",
                        borderColor: "divider",
                      }}
                    >
                      <Typography color="text.secondary">
                        No non-location telemetry measurements are available for this unit in the last 24 hours.
                      </Typography>
                    </Paper>
                  )}
                </>
              ) : activeTab === "alarms" ? (
                <>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1.25,
                    }}
                  >
                    <Typography
                      variant="overline"
                      sx={{
                        letterSpacing: "0.18em",
                        fontWeight: 700,
                        color: "text.secondary",
                        lineHeight: 1.2,
                      }}
                    >
                      Connected Alarms
                    </Typography>
                    <Box
                      sx={{
                        flex: 1,
                        borderTop: 1,
                        borderColor: "divider",
                        opacity: 0.8,
                      }}
                    />
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => onAddAlarm?.(unit.id)}
                    >
                      Add Alarm
                    </Button>
                  </Box>

                  {alarms.length > 0 ? (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
                      {alarms.map((alarm) => (
                        <Paper
                          key={alarm.id}
                          variant="outlined"
                          sx={{
                            p: 1.25,
                            borderRadius: 1.25,
                            transition: "all 0.2s ease",
                            bgcolor: "#191a26",
                            borderColor: "divider",
                            "&:hover": {
                              borderColor: "primary.main",
                              bgcolor: "#191a26",
                            },
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              gap: 1,
                            }}
                          >
                            <Box
                              sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}
                            >
                              <Typography variant="subtitle2" fontWeight="bold">
                                {alarm.name || "Unnamed alarm"}
                              </Typography>
                              <Chip
                                size="small"
                                label={alarm.enabled ? "Enabled" : "Disabled"}
                                color={alarm.enabled ? "success" : "default"}
                                variant="outlined"
                                sx={{ alignSelf: "flex-start" }}
                              />
                            </Box>
                          </Box>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 0.75 }}
                          >
                            Triggers when {alarm.measurementType} is{" "}
                            {formatAlarmCondition(alarm.condition).toLowerCase()}{" "}
                            {alarm.threshold}
                          </Typography>
                        </Paper>
                      ))}
                    </Box>
                  ) : (
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        textAlign: "center",
                        borderStyle: "dashed",
                        bgcolor: "#191a26",
                        borderColor: "divider",
                      }}
                    >
                      <Typography color="text.secondary">
                        No alarms connected to this unit.
                      </Typography>
                    </Paper>
                  )}
                </>
              ) : activeTab === "settings" ? (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    bgcolor: "background.paper",
                    borderColor: "divider",
                    boxShadow: 1,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 2,
                    }}
                  >
                    <Typography
                      variant="overline"
                      sx={{
                        letterSpacing: "0.18em",
                        fontWeight: 700,
                        color: "text.secondary",
                        lineHeight: 1.2,
                      }}
                    >
                      Device settings
                    </Typography>
                    <Box
                      sx={{
                        flex: 1,
                        borderTop: 1,
                        borderColor: "divider",
                        opacity: 0.8,
                      }}
                    />
                  </Box>

                  {settingsError && (
                    <Alert severity="error" sx={{ mb: 2, fontSize: "0.875rem" }}>
                      {settingsError}
                    </Alert>
                  )}

                  <Stack spacing={2.5}>
                    <Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          mb: 1,
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          {localGnssEnabled ? (
                            <WifiIcon sx={{ fontSize: "1.25rem", color: "success.main" }} />
                          ) : (
                            <WifiOffIcon sx={{ fontSize: "1.25rem", color: "text.secondary" }} />
                          )}
                          <Typography variant="subtitle2" fontWeight="600">
                            GNSS
                          </Typography>
                        </Box>
                        <Switch
                          checked={localGnssEnabled}
                          onChange={(event) => handleGnssToggle(event.target.checked)}
                          disabled={settingsLoading}
                          size="small"
                        />
                      </Box>
                    </Box>

                    <Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          mb: 1,
                        }}
                      >
                        <Typography variant="subtitle2" fontWeight="600">
                          Payload Interval
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          {settingsLoading && <CircularProgress size={14} />}
                          <Typography variant="caption" fontFamily="monospace" fontWeight="600">
                            {formatInterval(localPayloadInterval)}
                          </Typography>
                        </Box>
                      </Box>
                      <Slider
                        value={getIntervalIndex(localPayloadInterval)}
                        onChange={handlePayloadIntervalChange}
                        onChangeCommitted={handlePayloadIntervalCommit}
                        min={0}
                        max={INTERVAL_OPTIONS.length - 1}
                        disabled={settingsLoading}
                        valueLabelDisplay="off"
                        step={1}
                        marks={INTERVAL_MARKS}
                        sx={{
                          "& .MuiSlider-thumb": {
                            height: 18,
                            width: 18,
                          },
                        }}
                      />
                    </Box>

                    <Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          mb: 1,
                        }}
                      >
                        <Typography variant="subtitle2" fontWeight="600">
                          GNSS Update Frequency
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          {settingsLoading && <CircularProgress size={14} />}
                          <Typography variant="caption" fontFamily="monospace" fontWeight="600">
                            {formatInterval(localGnssInterval)}
                          </Typography>
                        </Box>
                      </Box>
                      <Slider
                        value={getIntervalIndex(localGnssInterval)}
                        onChange={handleGnssIntervalChange}
                        onChangeCommitted={handleGnssIntervalCommit}
                        min={0}
                        max={INTERVAL_OPTIONS.length - 1}
                        disabled={settingsLoading}
                        valueLabelDisplay="off"
                        step={1}
                        marks={INTERVAL_MARKS}
                        sx={{
                          "& .MuiSlider-thumb": {
                            height: 18,
                            width: 18,
                          },
                        }}
                      />
                    </Box>
                  </Stack>
                </Paper>
              ) : (
                <Paper
                  variant="outlined"
                  sx={{ p: 3, textAlign: "center", borderStyle: "dashed" }}
                >
                  <Typography color="text.secondary">
                    {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}{" "}
                    content will be shown here.
                  </Typography>
                </Paper>
              )}
            </Box>

            <Paper
              elevation={0}
              sx={{
                mt: "auto",
                pt: 2,
                borderTop: 1,
                borderColor: "divider",
                bgcolor: "background.paper",
              }}
            >
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={
                    pinging ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <SensorsIcon />
                    )
                  }
                  onClick={() => onPingUnit?.(unit.id)}
                  disabled={pinging}
                  sx={{ fontWeight: 700, flex: 1 }}
                >
                  {pinging ? "Pinging..." : "Ping unit"}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={handleOpenEditDialog}
                  sx={{ fontWeight: 700, flex: 1 }}
                >
                  Edit unit
                </Button>
                <Button
                  variant="contained"
                  startIcon={<OpenInNewIcon />}
                  onClick={() => navigate(`/units/${unit.id}`)}
                  sx={{ fontWeight: 700, flex: 1 }}
                >
                  View unit details
                </Button>
              </Stack>
            </Paper>

            <Dialog
              open={editDialogOpen}
              onClose={handleCloseEditDialog}
              fullWidth
              maxWidth="sm"
            >
              <DialogTitle>Edit unit</DialogTitle>
              <Box component="form" onSubmit={handleSubmitEdit}>
                <DialogContent>
                  {editError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {editError}
                    </Alert>
                  )}
                  <Stack spacing={2}>
                    <TextField
                      label="Unit name"
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      disabled={editSubmitting}
                      autoFocus
                      fullWidth
                    />
                    <TextField
                      label="IMEI"
                      value={editImei}
                      onChange={(event) => setEditImei(event.target.value)}
                      disabled={editSubmitting}
                      fullWidth
                    />
                    <TextField
                      label="NFC ID"
                      value={editNfcId}
                      onChange={(event) => setEditNfcId(event.target.value)}
                      disabled={editSubmitting}
                      fullWidth
                    />
                    <TextField
                      label="IP address"
                      value={editIpAddress}
                      onChange={(event) => setEditIpAddress(event.target.value)}
                      disabled={editSubmitting}
                      fullWidth
                    />
                    <TextField
                      label="MAC address"
                      value={editMacAddress}
                      onChange={(event) => setEditMacAddress(event.target.value)}
                      disabled={editSubmitting}
                      fullWidth
                    />
                  </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                  <Button onClick={handleCloseEditDialog} disabled={editSubmitting}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="contained" disabled={editSubmitting}>
                    {editSubmitting ? "Saving..." : "Save changes"}
                  </Button>
                </DialogActions>
              </Box>
            </Dialog>
          </>
        ) : null}
      </Box>
    </Drawer>
  )
}

export default UnitOverviewDrawer
