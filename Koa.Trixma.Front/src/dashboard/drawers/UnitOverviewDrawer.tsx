import React, { useState } from "react"
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
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material"
import {
  Close as CloseIcon,
  Edit as EditIcon,
  OpenInNew as OpenInNewIcon,
  Sensors as SensorsIcon,
  RestartAlt as RestartAltIcon,
} from "@mui/icons-material"
import { useNavigate } from "react-router-dom"
import { trixma, type Unit } from "../../api"
import AppBreadcrumbs from "../../components/AppBreadcrumbs"
import {
  getBatteryForecastColor,
  getBatteryForecastLabel,
  getBatteryIcon,
  getBatteryColor,
  getBatteryLevel,
} from "../utils/batteryUtils"
import { formatUptime } from "../utils/timeUtils"
import UnitOverviewTab from "./tabs/UnitOverviewTab"
import UnitTelemetryTab from "./tabs/UnitTelemetryTab"
import UnitAlarmsTab from "./tabs/UnitAlarmsTab"
import UnitSettingsTab from "./tabs/UnitSettingsTab"
import UnitFirmwareTab from "./tabs/UnitFirmwareTab"

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
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editImei, setEditImei] = useState("")
  const [editNfcId, setEditNfcId] = useState("")
  const [editIpAddress, setEditIpAddress] = useState("")
  const [editMacAddress, setEditMacAddress] = useState("")

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
              {activeTab === "overview" && (
                <UnitOverviewTab
                  unit={unit}
                  getSystemNameForUnit={getSystemNameForUnit}
                  formatUptimeFunc={formatUptimeFunc}
                  getBatteryLevelFunc={getBatteryLevelFunc}
                  getBatteryColorFunc={getBatteryColorFunc}
                />
              )}
              {activeTab === "telemetry" && <UnitTelemetryTab unit={unit} />}
              {activeTab === "alarms" && (
                <UnitAlarmsTab unit={unit} onAddAlarm={onAddAlarm} />
              )}
              {activeTab === "settings" && (
                <UnitSettingsTab unit={unit} onUnitUpdated={onUnitUpdated} />
              )}
              {activeTab === "firmware" && <UnitFirmwareTab unit={unit} />}
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
                      onChange={(event) =>
                        setEditIpAddress(event.target.value)
                      }
                      disabled={editSubmitting}
                      fullWidth
                    />
                    <TextField
                      label="MAC address"
                      value={editMacAddress}
                      onChange={(event) =>
                        setEditMacAddress(event.target.value)
                      }
                      disabled={editSubmitting}
                      fullWidth
                    />
                  </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                  <Button
                    onClick={handleCloseEditDialog}
                    disabled={editSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={editSubmitting}
                  >
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
