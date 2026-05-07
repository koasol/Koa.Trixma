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
import {alpha} from "@mui/material/styles";
import {
  Add as AddIcon,
  Close as CloseIcon,
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  Settings as SettingsIcon,
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

const INTERVAL_OPTIONS = [
  1, 10, 30, 60, 180, 300, 600, 900, 1800, 3600, 10800, 18000, 43200, 86400,
  172800,
];

const formatSeconds = (seconds: number | null | undefined): string => {
  const value = seconds ?? 1;
  switch (value) {
    case 1:
      return "1s";
    case 10:
      return "10s";
    case 30:
      return "30s";
    case 60:
      return "1m";
    case 180:
      return "3m";
    case 300:
      return "5m";
    case 600:
      return "10m";
    case 900:
      return "15m";
    case 1800:
      return "30m";
    case 3600:
      return "1h";
    case 10800:
      return "3h";
    case 18000:
      return "5h";
    case 43200:
      return "12h";
    case 86400:
      return "24h";
    case 172800:
      return "48h";
    default:
      if (value < 60) return `${value}s`;
      if (value < 3600) return `${Math.round(value / 60)}m`;
      if (value < 86400) return `${Math.round(value / 3600)}h`;
      return `${Math.round(value / 86400)}d`;
  }
};

const findClosestInterval = (seconds: number): number => {
  return INTERVAL_OPTIONS.reduce((closest, candidate) => {
    return Math.abs(candidate - seconds) < Math.abs(closest - seconds)
      ? candidate
      : closest;
  }, INTERVAL_OPTIONS[0]);
};

const getIntervalIndex = (seconds: number): number => {
  const closest = findClosestInterval(seconds);
  const index = INTERVAL_OPTIONS.indexOf(closest);
  return index >= 0 ? index : 0;
};

const getIntervalFromSliderValue = (value: number | number[]): number => {
  const raw = typeof value === "number" ? value : value[0];
  const index = Math.max(
    0,
    Math.min(INTERVAL_OPTIONS.length - 1, Math.round(raw)),
  );
  return INTERVAL_OPTIONS[index];
};

const INTERVAL_MARKS = INTERVAL_OPTIONS.map((_value, index) => ({
  value: index,
}));

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
  const [localGnssEnabled, setLocalGnssEnabled] = useState(
    unit.gnssEnabled ?? false,
  );
  const [localPayloadInterval, setLocalPayloadInterval] = useState(
    findClosestInterval(unit.payloadIntervalS ?? 60),
  );
  const [localGnssInterval, setLocalGnssInterval] = useState(
    findClosestInterval(unit.gnssRequestIntervalS ?? 120),
  );

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

  const handlePayloadIntervalChange = async (
    _event: Event,
    value: number | number[],
  ) => {
    setLocalPayloadInterval(getIntervalFromSliderValue(value));
  };

  const handlePayloadIntervalCommit = async (
    _event: Event | React.SyntheticEvent,
    value: number | number[],
  ) => {
    const nextInterval = getIntervalFromSliderValue(value);
    setSettingsLoading(true);
    setSettingsError(null);

    try {
      const {error} = await trixma.setUnitFrequency(unit.id, {
        payloadIntervalS: nextInterval,
      });
      if (error) {
        setSettingsError(error);
        setLocalPayloadInterval(
          findClosestInterval(unit.payloadIntervalS ?? 60),
        );
      } else if (onUnitUpdate) {
        onUnitUpdate({...unit, payloadIntervalS: nextInterval});
      }
    } catch {
      setSettingsError("Failed to update payload interval");
      setLocalPayloadInterval(findClosestInterval(unit.payloadIntervalS ?? 60));
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleGnssIntervalChange = async (
    _event: Event,
    value: number | number[],
  ) => {
    setLocalGnssInterval(getIntervalFromSliderValue(value));
  };

  const handleGnssIntervalCommit = async (
    _event: Event | React.SyntheticEvent,
    value: number | number[],
  ) => {
    const nextInterval = getIntervalFromSliderValue(value);
    setSettingsLoading(true);
    setSettingsError(null);

    try {
      const {error} = await trixma.setUnitFrequency(unit.id, {
        gnssRequestIntervalS: nextInterval,
      });
      if (error) {
        setSettingsError(error);
        setLocalGnssInterval(
          findClosestInterval(unit.gnssRequestIntervalS ?? 120),
        );
      } else if (onUnitUpdate) {
        onUnitUpdate({...unit, gnssRequestIntervalS: nextInterval});
      }
    } catch {
      setSettingsError("Failed to update GNSS interval");
      setLocalGnssInterval(
        findClosestInterval(unit.gnssRequestIntervalS ?? 120),
      );
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
        <Box sx={{display: "flex", justifyContent: "flex-end"}}>
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

      <Paper
        variant="outlined"
        sx={{
          p: 2,
          bgcolor: "background.paper",
          borderColor: "divider",
          boxShadow: 1,
        }}
      >
        <Box sx={{display: "flex", alignItems: "center", gap: 1, mb: 2}}>
          <SettingsIcon color="action" fontSize="small" />
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
                  <WifiOffIcon
                    sx={{fontSize: "1.25rem", color: "text.secondary"}}
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
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{display: "block", mt: 0.75}}
            >
              Allowed values: 1s, 10s, 30s, 1m, 3m, 5m, 10m, 15m, 30m, 1h, 3h,
              5h, 12h, 24h, 48h
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
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{display: "block", mt: 0.75}}
            >
              Allowed values: 1s, 10s, 30s, 1m, 3m, 5m, 10m, 15m, 30m, 1h, 3h,
              5h, 12h, 24h, 48h
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
};

export default UnitSidePanel;
