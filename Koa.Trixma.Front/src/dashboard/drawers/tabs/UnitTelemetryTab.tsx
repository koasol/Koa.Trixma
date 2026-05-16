import React, { useEffect, useState } from "react"
import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Typography,
} from "@mui/material"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { trixma, type MeasurementDataPoint, type MeasurementGroup, type Unit } from "../../../api"
import { formatTelemetryXAxis } from "./tabUtils"

interface UnitTelemetryTabProps {
  unit: Unit
}

const UnitTelemetryTab: React.FC<UnitTelemetryTabProps> = ({ unit }) => {
  const [telemetryGroups, setTelemetryGroups] = useState<MeasurementGroup[]>([])
  const [telemetryLoading, setTelemetryLoading] = useState(false)
  const [telemetryError, setTelemetryError] = useState<string | null>(null)

  useEffect(() => {
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
  }, [unit.id])

  const gnssTypes = new Set(["lat_udeg", "lon_udeg", "acc_cm"])
  const chartTelemetryGroups = telemetryGroups.filter(
    (group) => !gnssTypes.has(group.type) && group.data.length > 0,
  )

  const renderTelemetryChart = (
    type: string,
    data: MeasurementDataPoint[],
  ) => {
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
        sx={{
          p: 1.5,
          borderColor: "divider",
          bgcolor: "background.paper",
          minWidth: 0,
        }}
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
          <Typography
            variant="subtitle2"
            sx={{ textTransform: "capitalize", fontWeight: 700 }}
          >
            {type}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {latest
              ? `Last: ${new Date(latest.timestamp).toLocaleString()}`
              : "No data"}
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
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#2a2d3a"
              />
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
            No non-location telemetry measurements are available for this unit
            in the last 24 hours.
          </Typography>
        </Paper>
      )}
    </>
  )
}

export default UnitTelemetryTab
