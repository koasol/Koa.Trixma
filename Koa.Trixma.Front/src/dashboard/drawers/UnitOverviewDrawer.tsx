import React from "react"
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  Paper,
  Tab,
  Tabs,
  Typography,
} from "@mui/material"
import {
  Close as CloseIcon,
  RestartAlt as RestartAltIcon,
} from "@mui/icons-material"
import { useNavigate } from "react-router-dom"
import type { System, Unit } from "../../api"
import AppBreadcrumbs from "../../components/AppBreadcrumbs"
import {
  getBatteryForecastColor,
  getBatteryForecastLabel,
  getBatteryIcon,
  getBatteryColor,
  getBatteryLevel,
} from "../utils/batteryUtils"
import { formatUptime } from "../utils/timeUtils"

type UnitOverviewTab = "overview" | "telemetry" | "alarms" | "settings" | "firmware"

interface UnitOverviewDrawerProps {
  open: boolean
  loading: boolean
  error: string | null
  unit: Unit | null
  systems: System[]
  activeTab: UnitOverviewTab
  onClose: () => void
  onTabChange: (tab: UnitOverviewTab) => void
  getSystemNameForUnit: (systemId: string | null) => string
}

const UnitOverviewDrawer: React.FC<UnitOverviewDrawerProps> = ({
  open,
  loading,
  error,
  unit,
  systems,
  activeTab,
  onClose,
  onTabChange,
  getSystemNameForUnit,
}) => {
  const navigate = useNavigate()

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
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", height: "100%" }}>
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

            <Box sx={{ mb: 3, px: { xs: 1, md: 0 } }}>
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
                        unit.batteryForecastConfidence * 100
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
                pt: 1,
              }}
            >
              {activeTab === "overview" ? (
                <>
                  <Box>
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
                          <Typography
                            variant="body2"
                            color="text.secondary"
                          >
                            Discharge rate:{" "}
                            {unit.batteryDischargeRatePctPerHour.toFixed(3)}
                            %/h
                          </Typography>
                        )}
                      {unit.batteryForecastStatus === "ok" &&
                        unit.batteryForecastConfidence != null && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                          >
                            Confidence:{" "}
                            {Math.round(unit.batteryForecastConfidence * 100)}
                            %
                          </Typography>
                        )}
                      {unit.batteryForecastEstimatedAt && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                        >
                          Updated:{" "}
                          {new Date(
                            unit.batteryForecastEstimatedAt
                          ).toLocaleString()}
                        </Typography>
                      )}
                    </Box>
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

            <Button
              variant="contained"
              onClick={() => navigate(`/units/${unit.id}`)}
              sx={{ fontWeight: 700 }}
            >
              Open Unit Details
            </Button>
          </>
        ) : null}
      </Box>
    </Drawer>
  )
}

export default UnitOverviewDrawer
