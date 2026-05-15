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
  Stack,
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
} from "@mui/icons-material"
import { Circle, CircleMarker, MapContainer, TileLayer } from "react-leaflet"
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

  const formatInterval = (seconds?: number | null): string => {
    const value = seconds ?? 0
    if (value === 0) return "off"
    if (value < 60) return `${value}s`
    if (value < 3600) return `${Math.round(value / 60)}m`
    if (value < 86400) return `${Math.round(value / 3600)}h`
    return `${Math.round(value / 86400)}d`
  }

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
