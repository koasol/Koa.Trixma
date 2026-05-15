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
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Slider,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material"
import { alpha } from "@mui/material/styles"
import {
  Add as AddIcon,
  Close as CloseIcon,
  DeleteOutline as DeleteOutlineIcon,
  Edit as EditIcon,
  MoreVert as MoreVertIcon,
  MyLocation as MyLocationIcon,
  Sensors as SensorsIcon,
  Speed as SpeedIcon,
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material"
import type { AlarmCondition, AlarmRule, Unit } from "../api"
import { trixma } from "../api"

interface UnitSidePanelProps {
  unit: Unit
  pinging: boolean
  queryingFreq: boolean
  requestingLocation: boolean
  onAddAlarm: () => void
  onPing: () => void
  onQueryFrequency: () => void
  onRequestPreciseLocation: () => void
  onEdit: () => void
  formatAlarmCondition: (condition: AlarmCondition) => string
  onClosePanel?: () => void
  onUnitUpdate?: (updatedUnit: Unit) => void
  formatUptime?: (ms: number) => string
  getBatteryLevel?: (mv: number) => number
  getBatteryIcon?: (level: number) => React.ElementType
  getBatteryColor?: (level: number) => "error" | "warning" | "success"
}

type AlarmMenuAction = "toggle" | "delete"

const CONDITION_OPTIONS: Array<{ value: AlarmCondition; label: string }> = [
  { value: 0, label: "Below" },
  { value: 1, label: "Above" },
  { value: 2, label: "Equal" },
]

const INTERVAL_OPTIONS = [
  1, 10, 30, 60, 180, 300, 600, 900, 1800, 3600, 10800, 18000, 43200, 86400,
  172800,
]

const formatSeconds = (seconds: number | null | undefined): string => {
  const value = seconds ?? 1
  switch (value) {
    case 1:
      return "1s"
    case 10:
      return "10s"
    case 30:
      return "30s"
    case 60:
      return "1m"
    case 180:
      return "3m"
    case 300:
      return "5m"
    case 600:
      return "10m"
    case 900:
      return "15m"
    case 1800:
      return "30m"
    case 3600:
      return "1h"
    case 10800:
      return "3h"
    case 18000:
      return "5h"
    case 43200:
      return "12h"
    case 86400:
      return "24h"
    case 172800:
      return "48h"
    default:
      if (value < 60) return `${value}s`
      if (value < 3600) return `${Math.round(value / 60)}m`
      if (value < 86400) return `${Math.round(value / 3600)}h`
      return `${Math.round(value / 86400)}d`
  }
}

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

const UnitSidePanel: React.FC<UnitSidePanelProps> = ({
  unit,
  pinging,
  queryingFreq,
  requestingLocation,
  onAddAlarm,
  onPing,
  onQueryFrequency,
  onRequestPreciseLocation,
  onEdit,
  formatAlarmCondition,
  onClosePanel,
  onUnitUpdate,
  formatUptime,
  getBatteryLevel,
  getBatteryIcon,
  getBatteryColor,
}) => {
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [localGnssEnabled, setLocalGnssEnabled] = useState(
    unit.gnssEnabled ?? false,
  )
  const [localPayloadInterval, setLocalPayloadInterval] = useState(
    findClosestInterval(unit.payloadIntervalS ?? 60),
  )
  const [localGnssInterval, setLocalGnssInterval] = useState(
    findClosestInterval(unit.gnssRequestIntervalS ?? 120),
  )
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)
  const [menuAlarmId, setMenuAlarmId] = useState<string | null>(null)
  const [alarmDialogError, setAlarmDialogError] = useState<string | null>(null)
  const [alarmActionLoading, setAlarmActionLoading] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingAlarm, setEditingAlarm] = useState<AlarmRule | null>(null)
  const [editName, setEditName] = useState("")
  const [editMeasurementType, setEditMeasurementType] = useState("")
  const [editCondition, setEditCondition] = useState<AlarmCondition>(1)
  const [editThreshold, setEditThreshold] = useState("0")
  const [editCooldownMinutes, setEditCooldownMinutes] = useState("60")
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<AlarmMenuAction | null>(
    null,
  )
  const [confirmAlarm, setConfirmAlarm] = useState<AlarmRule | null>(null)

  const alarms = unit.alarms ?? []
  const selectedMenuAlarm = alarms.find((alarm) => alarm.id === menuAlarmId)

  const refreshUnitData = async () => {
    if (!onUnitUpdate) return
    const { data, error } = await trixma.getUnitById(unit.id)
    if (error || !data) {
      setAlarmDialogError(error ?? "Failed to refresh unit alarms")
      return
    }
    onUnitUpdate(data)
  }

  const handleOpenAlarmMenu = (
    event: React.MouseEvent<HTMLElement>,
    alarmId: string,
  ) => {
    setMenuAnchorEl(event.currentTarget)
    setMenuAlarmId(alarmId)
  }

  const handleCloseAlarmMenu = () => {
    setMenuAnchorEl(null)
    setMenuAlarmId(null)
  }

  const handleOpenEditDialog = (alarm: AlarmRule) => {
    setAlarmDialogError(null)
    setEditingAlarm(alarm)
    setEditName(alarm.name || "")
    setEditMeasurementType(alarm.measurementType || "")
    setEditCondition(alarm.condition)
    setEditThreshold(String(alarm.threshold))
    setEditCooldownMinutes(String(alarm.cooldownMinutes))
    setEditDialogOpen(true)
  }

  const handleCloseEditDialog = () => {
    if (alarmActionLoading) return
    setEditDialogOpen(false)
    setEditingAlarm(null)
    setAlarmDialogError(null)
  }

  const handleOpenConfirmDialog = (
    action: AlarmMenuAction,
    alarm: AlarmRule,
  ) => {
    setAlarmDialogError(null)
    setConfirmAction(action)
    setConfirmAlarm(alarm)
    setConfirmDialogOpen(true)
  }

  const handleCloseConfirmDialog = () => {
    if (alarmActionLoading) return
    setConfirmDialogOpen(false)
    setConfirmAction(null)
    setConfirmAlarm(null)
    setAlarmDialogError(null)
  }

  const handleSaveAlarmEdit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!editingAlarm) return

    const parsedThreshold = Number(editThreshold)
    const parsedCooldown = Number(editCooldownMinutes)

    if (!editName.trim()) {
      setAlarmDialogError("Alarm name is required")
      return
    }
    if (!editMeasurementType.trim()) {
      setAlarmDialogError("Measurement type is required")
      return
    }
    if (Number.isNaN(parsedThreshold)) {
      setAlarmDialogError("Threshold must be a valid number")
      return
    }
    if (!Number.isInteger(parsedCooldown) || parsedCooldown < 0) {
      setAlarmDialogError("Cooldown must be a non-negative integer")
      return
    }

    try {
      setAlarmActionLoading(true)
      setAlarmDialogError(null)

      const { error } = await trixma.updateAlarmRule(editingAlarm.id, {
        name: editName.trim(),
        measurementType: editMeasurementType.trim(),
        condition: editCondition,
        threshold: parsedThreshold,
        cooldownMinutes: parsedCooldown,
        enabled: editingAlarm.enabled,
      })

      if (error) {
        setAlarmDialogError(error)
        return
      }

      await refreshUnitData()
      handleCloseEditDialog()
    } catch {
      setAlarmDialogError("Failed to update alarm")
    } finally {
      setAlarmActionLoading(false)
    }
  }

  const handleConfirmAction = async () => {
    if (!confirmAction || !confirmAlarm) return

    try {
      setAlarmActionLoading(true)
      setAlarmDialogError(null)

      if (confirmAction === "delete") {
        const { error } = await trixma.deleteAlarmRule(confirmAlarm.id)
        if (error) {
          setAlarmDialogError(error)
          return
        }
      } else {
        const { error } = await trixma.updateAlarmRule(confirmAlarm.id, {
          name: confirmAlarm.name,
          measurementType: confirmAlarm.measurementType,
          condition: confirmAlarm.condition,
          threshold: confirmAlarm.threshold,
          cooldownMinutes: confirmAlarm.cooldownMinutes,
          enabled: !confirmAlarm.enabled,
        })
        if (error) {
          setAlarmDialogError(error)
          return
        }
      }

      await refreshUnitData()
      handleCloseConfirmDialog()
    } catch {
      setAlarmDialogError(
        confirmAction === "delete"
          ? "Failed to delete alarm"
          : "Failed to change alarm status",
      )
    } finally {
      setAlarmActionLoading(false)
    }
  }

  const handleGnssToggle = async (enabled: boolean) => {
    setSettingsLoading(true)
    setSettingsError(null)
    setLocalGnssEnabled(enabled)

    try {
      const { error } = await trixma.setUnitGnss(unit.id, { enabled })
      if (error) {
        setSettingsError(error)
        setLocalGnssEnabled(!enabled)
      } else if (onUnitUpdate) {
        onUnitUpdate({ ...unit, gnssEnabled: enabled })
      }
    } catch {
      setSettingsError("Failed to update GNSS setting")
      setLocalGnssEnabled(!enabled)
    } finally {
      setSettingsLoading(false)
    }
  }

  const handlePayloadIntervalChange = async (
    _event: Event,
    value: number | number[],
  ) => {
    setLocalPayloadInterval(getIntervalFromSliderValue(value))
  }

  const handlePayloadIntervalCommit = async (
    _event: Event | React.SyntheticEvent,
    value: number | number[],
  ) => {
    const nextInterval = getIntervalFromSliderValue(value)
    setSettingsLoading(true)
    setSettingsError(null)

    try {
      const { error } = await trixma.setUnitFrequency(unit.id, {
        payloadIntervalS: nextInterval,
      })
      if (error) {
        setSettingsError(error)
        setLocalPayloadInterval(
          findClosestInterval(unit.payloadIntervalS ?? 60),
        )
      } else if (onUnitUpdate) {
        onUnitUpdate({ ...unit, payloadIntervalS: nextInterval })
      }
    } catch {
      setSettingsError("Failed to update payload interval")
      setLocalPayloadInterval(findClosestInterval(unit.payloadIntervalS ?? 60))
    } finally {
      setSettingsLoading(false)
    }
  }

  const handleGnssIntervalChange = async (
    _event: Event,
    value: number | number[],
  ) => {
    setLocalGnssInterval(getIntervalFromSliderValue(value))
  }

  const handleGnssIntervalCommit = async (
    _event: Event | React.SyntheticEvent,
    value: number | number[],
  ) => {
    const nextInterval = getIntervalFromSliderValue(value)
    setSettingsLoading(true)
    setSettingsError(null)

    try {
      const { error } = await trixma.setUnitFrequency(unit.id, {
        gnssRequestIntervalS: nextInterval,
      })
      if (error) {
        setSettingsError(error)
        setLocalGnssInterval(
          findClosestInterval(unit.gnssRequestIntervalS ?? 120),
        )
      } else if (onUnitUpdate) {
        onUnitUpdate({ ...unit, gnssRequestIntervalS: nextInterval })
      }
    } catch {
      setSettingsError("Failed to update GNSS interval")
      setLocalGnssInterval(
        findClosestInterval(unit.gnssRequestIntervalS ?? 120),
      )
    } finally {
      setSettingsLoading(false)
    }
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        height: "100%",
        p: 0.5,
        bgcolor: (theme) =>
          alpha(
            theme.palette.primary.main,
            theme.palette.mode === "dark" ? 0.18 : 0.08,
          ),
        borderRadius: 2,
      }}
    >
      {onClosePanel && (
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <IconButton
            color="primary"
            onClick={onClosePanel}
            aria-label="Hide side panel"
            sx={{
              border: 1,
              borderColor: "divider",
              bgcolor: "background.paper",
              boxShadow: 1,
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      )}

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
            justifyContent: "space-between",
            mb: 1.5,
          }}
        >
          <Typography variant="h6" fontWeight="bold">
            Unit Actions
          </Typography>
        </Box>

        <Stack spacing={1}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={
                pinging ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <SensorsIcon />
                )
              }
              onClick={onPing}
              disabled={pinging}
              sx={{ fontWeight: "bold", flex: 1, minWidth: 0 }}
            >
              {pinging ? "Sending Ping..." : "Ping Unit"}
            </Button>

            <Button
              variant="outlined"
              color="primary"
              startIcon={
                queryingFreq ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <SpeedIcon />
                )
              }
              onClick={onQueryFrequency}
              disabled={queryingFreq}
              sx={{ fontWeight: "bold", flex: 1, minWidth: 0 }}
            >
              {queryingFreq ? "Querying..." : "Query Frequency"}
            </Button>
          </Stack>

          <Button
            variant="outlined"
            color="primary"
            fullWidth
            startIcon={
              requestingLocation ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <MyLocationIcon />
              )
            }
            onClick={onRequestPreciseLocation}
            disabled={requestingLocation}
            sx={{ fontWeight: "bold" }}
          >
            {requestingLocation
              ? "Requesting location..."
              : "Request Precise Location"}
          </Button>

          <Button
            variant="contained"
            color="primary"
            fullWidth
            startIcon={<EditIcon />}
            onClick={onEdit}
            sx={{ fontWeight: "bold" }}
          >
            Edit Unit
          </Button>
        </Stack>
      </Paper>

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
            justifyContent: "space-between",
            mb: 1.5,
            gap: 1.5,
            flexWrap: "wrap",
          }}
        >
          <Typography variant="h6" fontWeight="bold">
            Connected Alarms
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onAddAlarm}
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
                  bgcolor: (theme) =>
                    alpha(
                      theme.palette.primary.main,
                      theme.palette.mode === "dark" ? 0.16 : 0.06,
                    ),
                  borderColor: "divider",
                  "&:hover": {
                    borderColor: "primary.main",
                    bgcolor: "action.hover",
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
                  <IconButton
                    size="small"
                    aria-label="Alarm actions"
                    onClick={(event) => handleOpenAlarmMenu(event, alarm.id)}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
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
              bgcolor: (theme) =>
                alpha(
                  theme.palette.primary.main,
                  theme.palette.mode === "dark" ? 0.12 : 0.05,
                ),
            }}
          >
            <Typography color="text.secondary">
              No alarms connected to this unit.
            </Typography>
          </Paper>
        )}

        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl) && Boolean(selectedMenuAlarm)}
          onClose={handleCloseAlarmMenu}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <MenuItem
            onClick={() => {
              if (!selectedMenuAlarm) return
              handleCloseAlarmMenu()
              handleOpenConfirmDialog("toggle", selectedMenuAlarm)
            }}
          >
            {selectedMenuAlarm?.enabled ? "Disable alarm" : "Enable alarm"}
          </MenuItem>
          <MenuItem
            onClick={() => {
              if (!selectedMenuAlarm) return
              handleCloseAlarmMenu()
              handleOpenEditDialog(selectedMenuAlarm)
            }}
          >
            <EditIcon fontSize="small" sx={{ mr: 1 }} />
            Edit
          </MenuItem>
          <MenuItem
            onClick={() => {
              if (!selectedMenuAlarm) return
              handleCloseAlarmMenu()
              handleOpenConfirmDialog("delete", selectedMenuAlarm)
            }}
            sx={{ color: "error.main" }}
          >
            <DeleteOutlineIcon fontSize="small" sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        </Menu>
      </Paper>

      <Paper
        variant="outlined"
        sx={{
          p: 2,
          bgcolor: "background.paper",
          borderColor: "divider",
          boxShadow: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <SettingsIcon color="action" fontSize="small" />
          <Typography variant="h6" fontWeight="bold">
            Device Settings
          </Typography>
        </Box>

        {settingsError && (
          <Alert severity="error" sx={{ mb: 2, fontSize: "0.875rem" }}>
            {settingsError}
          </Alert>
        )}

        <Stack spacing={2.5}>
          {/* GNSS Toggle */}
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
                  <WifiIcon
                    sx={{ fontSize: "1.25rem", color: "success.main" }}
                  />
                ) : (
                  <WifiOffIcon
                    sx={{ fontSize: "1.25rem", color: "text.secondary" }}
                  />
                )}
                <Typography variant="subtitle2" fontWeight="600">
                  GNSS
                </Typography>
              </Box>
              <Switch
                checked={localGnssEnabled}
                onChange={(e) => handleGnssToggle(e.target.checked)}
                disabled={settingsLoading}
                size="small"
              />
            </Box>
          </Box>

          {/* Payload Interval Slider */}
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
                <Typography
                  variant="caption"
                  fontFamily="monospace"
                  fontWeight="600"
                >
                  {formatSeconds(localPayloadInterval)}
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

          {/* GNSS Request Interval Slider */}
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
                <Typography
                  variant="caption"
                  fontFamily="monospace"
                  fontWeight="600"
                >
                  {formatSeconds(localGnssInterval)}
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

      <Dialog
        open={editDialogOpen}
        onClose={alarmActionLoading ? undefined : handleCloseEditDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Edit Alarm</DialogTitle>
        <DialogContent>
          {alarmDialogError && (
            <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
              {alarmDialogError}
            </Alert>
          )}
          <Box
            component="form"
            id="unit-alarm-edit-form"
            onSubmit={handleSaveAlarmEdit}
          >
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="Alarm Name"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                required
                disabled={alarmActionLoading}
                fullWidth
              />
              <TextField
                label="Measurement Type"
                value={editMeasurementType}
                onChange={(event) => setEditMeasurementType(event.target.value)}
                required
                disabled={alarmActionLoading}
                fullWidth
              />
              <TextField
                select
                label="Condition"
                value={editCondition}
                onChange={(event) =>
                  setEditCondition(Number(event.target.value) as AlarmCondition)
                }
                required
                disabled={alarmActionLoading}
                fullWidth
              >
                {CONDITION_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Threshold"
                type="number"
                value={editThreshold}
                onChange={(event) => setEditThreshold(event.target.value)}
                required
                disabled={alarmActionLoading}
                fullWidth
              />
              <TextField
                label="Cooldown Minutes"
                type="number"
                value={editCooldownMinutes}
                onChange={(event) => setEditCooldownMinutes(event.target.value)}
                required
                disabled={alarmActionLoading}
                inputProps={{ min: 0, step: 1 }}
                fullWidth
              />
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseEditDialog} disabled={alarmActionLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="unit-alarm-edit-form"
            variant="contained"
            disabled={alarmActionLoading}
          >
            {alarmActionLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmDialogOpen}
        onClose={alarmActionLoading ? undefined : handleCloseConfirmDialog}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {confirmAction === "delete"
            ? "Delete Alarm"
            : confirmAlarm?.enabled
              ? "Disable Alarm"
              : "Enable Alarm"}
        </DialogTitle>
        <DialogContent>
          {alarmDialogError && (
            <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
              {alarmDialogError}
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary">
            {confirmAction === "delete"
              ? `Delete ${confirmAlarm?.name || "this alarm"}? This action cannot be undone.`
              : confirmAlarm?.enabled
                ? `Disable ${confirmAlarm?.name || "this alarm"}?`
                : `Enable ${confirmAlarm?.name || "this alarm"}?`}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleCloseConfirmDialog}
            disabled={alarmActionLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmAction}
            variant="contained"
            color={confirmAction === "delete" ? "error" : "primary"}
            disabled={alarmActionLoading}
          >
            {alarmActionLoading
              ? "Saving..."
              : confirmAction === "delete"
                ? "Delete"
                : confirmAlarm?.enabled
                  ? "Disable"
                  : "Enable"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default UnitSidePanel
