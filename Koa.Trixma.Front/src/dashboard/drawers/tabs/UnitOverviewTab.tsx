import React, { useEffect, useMemo, useState } from "react"
import {
  Box,
  CircularProgress,
  Paper,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material"
import { alpha } from "@mui/material/styles"
import {
  Map as MapIcon,
  Satellite as SatelliteIcon,
} from "@mui/icons-material"
import { Circle, CircleMarker, MapContainer, TileLayer } from "react-leaflet"
import { trixma, type MeasurementDataPoint, type MeasurementGroup, type Unit } from "../../../api"
import { formatInterval } from "./tabUtils"
import {
  getBatteryForecastLabel,
  getBatteryColor,
  getBatteryLevel,
} from "../../utils/batteryUtils"
import { formatUptime } from "../../utils/timeUtils"

interface UnitOverviewTabProps {
  unit: Unit
  getSystemNameForUnit: (systemId: string | null) => string
  formatUptimeFunc?: (ms: number) => string
  getBatteryLevelFunc?: (mv: number) => number
  getBatteryIconFunc?: (level: number) => React.ElementType
  getBatteryColorFunc?: (level: number) => "error" | "warning" | "success"
}

const UnitOverviewTab: React.FC<UnitOverviewTabProps> = ({
  unit,
  getSystemNameForUnit,
  formatUptimeFunc,
  getBatteryLevelFunc,
  getBatteryColorFunc,
}) => {
  const [mapViewMode, setMapViewMode] = useState<"normal" | "satellite">(
    "satellite",
  )
  const [locationGroups, setLocationGroups] = useState<MeasurementGroup[]>([])
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  useEffect(() => {
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
  }, [unit.id])

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

  const resolvedFormatUptime = formatUptimeFunc ?? formatUptime
  const resolvedGetBatteryLevel = getBatteryLevelFunc ?? getBatteryLevel
  const resolvedGetBatteryColor = getBatteryColorFunc ?? getBatteryColor

  const uptimeValue =
    unit.uptimeMs != null ? resolvedFormatUptime(unit.uptimeMs) : "N/A"

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
        unit.gnssEnabled ? "location active" : "location disabled",
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
                      theme.palette.mode === "dark" ? 0.55 : 0.35,
                    )
                : "divider",
              bgcolor: card.alert
                ? (theme) =>
                    alpha(
                      theme.palette.error.main,
                      theme.palette.mode === "dark" ? 0.14 : 0.08,
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
                <Typography variant="body2" color="text.secondary">
                  Lat: {(latDeg as number).toFixed(6)} | Lon:{" "}
                  {(lonDeg as number).toFixed(6)}
                </Typography>
                <ToggleButtonGroup
                  size="small"
                  value={mapViewMode}
                  exclusive
                  onChange={(_e, v) => v && setMapViewMode(v)}
                  sx={{ bgcolor: "background.paper" }}
                >
                  <ToggleButton value="normal" aria-label="Normal map">
                    <MapIcon fontSize="small" sx={{ mr: 0.5 }} />
                    Normal
                  </ToggleButton>
                  <ToggleButton value="satellite" aria-label="Satellite view">
                    <SatelliteIcon fontSize="small" sx={{ mr: 0.5 }} />
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

      <Box sx={{ mt: 2 }}>
        <Typography variant="caption" color="primary" sx={{ fontWeight: "bold" }}>
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
          <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
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
          <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
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
          <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
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
          <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
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

      {(unit.payloadIntervalS != null || unit.gnssRequestIntervalS != null) && (
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
                Discharge rate: {unit.batteryDischargeRatePctPerHour.toFixed(3)}
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
              {new Date(unit.batteryForecastEstimatedAt).toLocaleString()}
            </Typography>
          )}
        </Box>
      )}
    </>
  )
}

export default UnitOverviewTab
