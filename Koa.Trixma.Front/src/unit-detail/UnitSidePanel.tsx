import React, {useState} from "react";
import {
  Box,
  Paper,
  Typography,
  Chip,
  Button,
  IconButton,
  Switch,
  Slider,
  Stack,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  Add as AddIcon,
  ViewSidebar as ViewSidebarIcon,
  Close as CloseIcon,
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
} from "@mui/icons-material";
import type {AlarmCondition, Unit} from "../api";
import {trixma} from "../api";

interface UnitSidePanelProps {
  unit: Unit;
  onOpenAlarm: (alarmId: string) => void;
  onAddAlarm: () => void;
  formatAlarmCondition: (condition: AlarmCondition) => string;
  onClosePanel?: () => void;
  onUnitUpdate?: (updatedUnit: Unit) => void;
}

// Convert seconds to human-readable format
const formatSeconds = (seconds: number | null | undefined): string => {
  if (!seconds) return "1s";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
};

const UnitSidePanel: React.FC<UnitSidePanelProps> = ({
  unit,
  onOpenAlarm,
  onAddAlarm,
  formatAlarmCondition,
  onClosePanel,
  onUnitUpdate,
}) => {
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [localGnssEnabled, setLocalGnssEnabled] = useState(unit.gnssEnabled ?? false);
  const [localPayloadInterval, setLocalPayloadInterval] = useState(unit.payloadIntervalS ?? 60);
  const [localGnssInterval, setLocalGnssInterval] = useState(unit.gnssRequestIntervalS ?? 120);

  const MIN_SECONDS = 1;
  const MAX_SECONDS = 86400; // 24 hours

  const handleGnssToggle = async (enabled: boolean) => {
    setSettingsLoading(true);
    setSettingsError(null);
    setLocalGnssEnabled(enabled);

    try {
      const {error} = await trixma.setUnitGnss(unit.id, {enabled});
      if (error) {
        setSettingsError(error);
        setLocalGnssEnabled(!enabled);
      } else if (onUnitUpdate) {
        onUnitUpdate({...unit, gnssEnabled: enabled});
      }
    } catch {
      setSettingsError("Failed to update GNSS setting");
      setLocalGnssEnabled(!enabled);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handlePayloadIntervalChange = async (_event: Event, value: number | number[]) => {
    const newValue = typeof value === "number" ? value : value[0];
    setLocalPayloadInterval(newValue);
  };

  const handlePayloadIntervalCommit = async (_event: Event | React.SyntheticEvent, value: number | number[]) => {
    const newValue = typeof value === "number" ? value : value[0];
    setSettingsLoading(true);
    setSettingsError(null);

    try {
      const {error} = await trixma.setUnitFrequency(unit.id, {
        payloadIntervalS: newValue,
      });
      if (error) {
        setSettingsError(error);
        setLocalPayloadInterval(unit.payloadIntervalS ?? 60);
      } else if (onUnitUpdate) {
        onUnitUpdate({...unit, payloadIntervalS: newValue});
      }
    } catch {
      setSettingsError("Failed to update payload interval");
      setLocalPayloadInterval(unit.payloadIntervalS ?? 60);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleGnssIntervalChange = async (_event: Event, value: number | number[]) => {
    const newValue = typeof value === "number" ? value : value[0];
    setLocalGnssInterval(newValue);
  };

  const handleGnssIntervalCommit = async (_event: Event | React.SyntheticEvent, value: number | number[]) => {
    const newValue = typeof value === "number" ? value : value[0];
    setSettingsLoading(true);
    setSettingsError(null);

    try {
      const {error} = await trixma.setUnitFrequency(unit.id, {
        gnssRequestIntervalS: newValue,
      });
      if (error) {
        setSettingsError(error);
        setLocalGnssInterval(unit.gnssRequestIntervalS ?? 120);
      } else if (onUnitUpdate) {
        onUnitUpdate({...unit, gnssRequestIntervalS: newValue});
      }
    } catch {
      setSettingsError("Failed to update GNSS interval");
      setLocalGnssInterval(unit.gnssRequestIntervalS ?? 120);
    } finally {
      setSettingsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      {onClosePanel && (
        <Box sx={{display: "flex", justifyContent: "flex-end"}}>
          <IconButton
            color="primary"
            onClick={onClosePanel}
            aria-label="Hide side panel"
            sx={{border: 1, borderColor: "divider", bgcolor: "background.paper"}}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      )}

      <Paper variant="outlined" sx={{p: 2}}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 1.5,
          }}
        >
          <Typography variant="h6" fontWeight="bold">
            Connected Alarms
          </Typography>
        </Box>

        {unit.alarms && unit.alarms.length > 0 ? (
          <Box sx={{display: "flex", flexDirection: "column", gap: 1.25}}>
            {unit.alarms.map((alarm) => (
              <Paper
                key={alarm.id}
                variant="outlined"
                onClick={() => onOpenAlarm(alarm.id)}
                sx={{
                  p: 1.25,
                  borderRadius: 1.25,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
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
                    alignItems: "center",
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <Typography variant="subtitle2" fontWeight="bold">
                    {alarm.name || "Unnamed alarm"}
                  </Typography>
                  <Chip
                    size="small"
                    label={alarm.enabled ? "Enabled" : "Disabled"}
                    color={alarm.enabled ? "success" : "default"}
                    variant="outlined"
                  />
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{mt: 0.75}}
                >
                  Triggers when {alarm.measurementType} is{" "}
                  {formatAlarmCondition(alarm.condition).toLowerCase()} {alarm.threshold}
                </Typography>
              </Paper>
            ))}
          </Box>
        ) : (
          <Paper
            variant="outlined"
            sx={{p: 2, textAlign: "center", borderStyle: "dashed"}}
          >
            <Typography color="text.secondary">
              No alarms connected to this unit.
            </Typography>
          </Paper>
        )}

        <Button
          variant="contained"
          color="primary"
          fullWidth
          startIcon={<AddIcon />}
          onClick={onAddAlarm}
          sx={{fontWeight: "bold", mt: 2}}
        >
          Add Alarm
        </Button>
      </Paper>

      <Paper variant="outlined" sx={{p: 2}}>
        <Box sx={{display: "flex", alignItems: "center", gap: 1, mb: 2}}>
          <ViewSidebarIcon color="action" fontSize="small" />
          <Typography variant="h6" fontWeight="bold">
            Device Settings
          </Typography>
        </Box>

        {settingsError && (
          <Alert severity="error" sx={{mb: 2, fontSize: "0.875rem"}}>
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
              <Box sx={{display: "flex", alignItems: "center", gap: 1}}>
                {localGnssEnabled ? (
                  <WifiIcon sx={{fontSize: "1.25rem", color: "success.main"}} />
                ) : (
                  <WifiOffIcon sx={{fontSize: "1.25rem", color: "text.secondary"}} />
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
            <Typography variant="caption" color="text.secondary">
              {localGnssEnabled ? "Enabled" : "Disabled"}
            </Typography>
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
              <Box sx={{display: "flex", alignItems: "center", gap: 1}}>
                {settingsLoading && <CircularProgress size={14} />}
                <Typography variant="caption" fontFamily="monospace" fontWeight="600">
                  {formatSeconds(localPayloadInterval)}
                </Typography>
              </Box>
            </Box>
            <Slider
              value={localPayloadInterval}
              onChange={handlePayloadIntervalChange}
              onChangeCommitted={handlePayloadIntervalCommit}
              min={MIN_SECONDS}
              max={MAX_SECONDS}
              disabled={settingsLoading}
              valueLabelDisplay="off"
              step={1}
              sx={{
                "& .MuiSlider-thumb": {
                  height: 18,
                  width: 18,
                },
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{display: "block", mt: 0.75}}>
              How often the device sends measurements (1s to 24h)
            </Typography>
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
              <Box sx={{display: "flex", alignItems: "center", gap: 1}}>
                {settingsLoading && <CircularProgress size={14} />}
                <Typography variant="caption" fontFamily="monospace" fontWeight="600">
                  {formatSeconds(localGnssInterval)}
                </Typography>
              </Box>
            </Box>
            <Slider
              value={localGnssInterval}
              onChange={handleGnssIntervalChange}
              onChangeCommitted={handleGnssIntervalCommit}
              min={MIN_SECONDS}
              max={MAX_SECONDS}
              disabled={settingsLoading}
              valueLabelDisplay="off"
              step={1}
              sx={{
                "& .MuiSlider-thumb": {
                  height: 18,
                  width: 18,
                },
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{display: "block", mt: 0.75}}>
              How often the device requests GNSS fixes (1s to 24h)
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
};

export default UnitSidePanel;
