import React, { useEffect, useState } from "react"
import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Slider,
  Stack,
  Switch,
  Typography,
} from "@mui/material"
import {
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
} from "@mui/icons-material"
import { trixma, type Unit } from "../../../api"
import {
  formatInterval,
  findClosestInterval,
  getIntervalIndex,
  getIntervalFromSliderValue,
  INTERVAL_MARKS,
  INTERVAL_OPTIONS,
} from "./tabUtils"

interface UnitSettingsTabProps {
  unit: Unit
  onUnitUpdated?: (unit: Unit) => void
}

const UnitSettingsTab: React.FC<UnitSettingsTabProps> = ({
  unit,
  onUnitUpdated,
}) => {
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [localGnssEnabled, setLocalGnssEnabled] = useState(
    unit?.gnssEnabled ?? false,
  )
  const [localLteEnabled, setLocalLteEnabled] = useState(
    unit?.lteEnabled ?? false,
  )
  const [localPayloadInterval, setLocalPayloadInterval] = useState(
    findClosestInterval(unit?.payloadIntervalS ?? 60),
  )
  const [localGnssInterval, setLocalGnssInterval] = useState(
    findClosestInterval(unit?.gnssRequestIntervalS ?? 120),
  )

  useEffect(() => {
    if (!unit) return
    setLocalGnssEnabled(unit.gnssEnabled ?? false)
    setLocalLteEnabled(unit.lteEnabled ?? false)
    setLocalPayloadInterval(findClosestInterval(unit.payloadIntervalS ?? 60))
    setLocalGnssInterval(findClosestInterval(unit.gnssRequestIntervalS ?? 120))
    setSettingsError(null)
  }, [unit])

  const handleGnssToggle = async (enabled: boolean) => {
    if (!unit) return
    setSettingsLoading(true)
    setSettingsError(null)
    setLocalGnssEnabled(enabled)

    try {
      const { error: updateError } = await trixma.setUnitGnss(unit.id, {
        enabled,
      })
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

  const handleLteToggle = async (enabled: boolean) => {
    if (!unit) return
    setSettingsLoading(true)
    setSettingsError(null)
    setLocalLteEnabled(enabled)

    try {
      const { error: updateError } = await trixma.setUnitLte(unit.id, {
        enabled,
      })
      if (updateError) {
        setSettingsError(updateError)
        setLocalLteEnabled(!enabled)
      } else {
        onUnitUpdated?.({ ...unit, lteEnabled: enabled })
      }
    } catch {
      setSettingsError("Failed to update LTE setting")
      setLocalLteEnabled(!enabled)
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
        gnssRequestIntervalS: unit.gnssRequestIntervalS ?? 120,
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
        payloadIntervalS: unit.payloadIntervalS ?? 60,
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
                <WifiOffIcon
                  sx={{ fontSize: "1.25rem", color: "text.secondary" }}
                />
              )}
              <Typography variant="subtitle2" fontWeight="600">
                GNSS Location Service
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
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {localLteEnabled ? (
                <WifiIcon sx={{ fontSize: "1.25rem", color: "success.main" }} />
              ) : (
                <WifiOffIcon
                  sx={{ fontSize: "1.25rem", color: "text.secondary" }}
                />
              )}
              <Typography variant="subtitle2" fontWeight="600">
                LTE Location Service
              </Typography>
            </Box>
            <Switch
              checked={localLteEnabled}
              onChange={(event) => handleLteToggle(event.target.checked)}
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
              <Typography
                variant="caption"
                fontFamily="monospace"
                fontWeight="600"
              >
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
              <Typography
                variant="caption"
                fontFamily="monospace"
                fontWeight="600"
              >
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
  )
}

export default UnitSettingsTab
