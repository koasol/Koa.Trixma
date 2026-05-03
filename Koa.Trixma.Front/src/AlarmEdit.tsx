import React, {useEffect, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
  FormControlLabel,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import {trixma, type AlarmCondition, type AlarmRule} from "./api";

const CONDITION_OPTIONS: Array<{value: AlarmCondition; label: string}> = [
  {value: 0, label: "Below"},
  {value: 1, label: "Above"},
  {value: 2, label: "Equal"},
];

const AlarmEdit: React.FC = () => {
  const {id: systemId, alarmId} = useParams<{id: string; alarmId: string}>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [alarmRule, setAlarmRule] = useState<AlarmRule | null>(null);

  const [name, setName] = useState("");
  const [measurementType, setMeasurementType] = useState("temperature");
  const [condition, setCondition] = useState<AlarmCondition>(1);
  const [threshold, setThreshold] = useState("0");
  const [cooldownMinutes, setCooldownMinutes] = useState("60");
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const fetchAlarmRule = async () => {
      if (!alarmId) {
        setError("Alarm id is missing from route");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const {data, error: fetchError} =
          await trixma.getAlarmRuleById(alarmId);
        if (fetchError) throw new Error(fetchError);
        if (!data) throw new Error("Alarm not found");

        setAlarmRule(data);
        setName(data.name || "");
        setMeasurementType(data.measurementType || "");
        setCondition(data.condition);
        setThreshold(String(data.threshold));
        setCooldownMinutes(String(data.cooldownMinutes));
        setEnabled(Boolean(data.enabled));
      } catch (err: unknown) {
        console.error("Error loading alarm for edit:", err);
        setError(err instanceof Error ? err.message : "Failed to load alarm");
      } finally {
        setLoading(false);
      }
    };

    void fetchAlarmRule();
  }, [alarmId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!alarmId) {
      setError("Alarm id is missing from route");
      return;
    }

    const parsedThreshold = Number(threshold);
    const parsedCooldown = Number(cooldownMinutes);

    if (!name.trim()) {
      setError("Alarm name is required");
      return;
    }
    if (!measurementType.trim()) {
      setError("Measurement type is required");
      return;
    }
    if (Number.isNaN(parsedThreshold)) {
      setError("Threshold must be a valid number");
      return;
    }
    if (!Number.isInteger(parsedCooldown) || parsedCooldown < 0) {
      setError("Cooldown must be a non-negative integer");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const {error: updateError} = await trixma.updateAlarmRule(alarmId, {
        name: name.trim(),
        measurementType: measurementType.trim(),
        condition,
        threshold: parsedThreshold,
        cooldownMinutes: parsedCooldown,
        enabled,
      });

      if (updateError) throw new Error(updateError);

      navigate(`/systems/${systemId}/alarms/${alarmId}`);
    } catch (err: unknown) {
      console.error("Error updating alarm:", err);
      setError(err instanceof Error ? err.message : "Failed to update alarm");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{display: "flex", justifyContent: "center", py: 8}}>
        <Paper
          variant="outlined"
          sx={{p: 4, textAlign: "center", borderRadius: 3}}
        >
          <CircularProgress size={32} sx={{mb: 2}} />
          <Typography color="text.secondary">Loading alarm...</Typography>
        </Paper>
      </Box>
    );
  }

  if (!alarmRule) {
    return (
      <Box sx={{textAlign: "center", py: 8}}>
        <Typography color="error" gutterBottom>
          {error || "Alarm not found"}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/systems/${systemId}?tab=alarms`)}
        >
          Back to Alarms
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{maxWidth: 700, mx: "auto", width: "100%"}}>
      <Paper
        elevation={0}
        sx={{
          p: {xs: 3, md: 5},
          border: 1,
          borderColor: "divider",
          borderRadius: 4,
          bgcolor: "background.paper",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            mb: 3,
          }}
        >
          <Box>
            <Typography variant="h4" component="h1" fontWeight="800">
              Edit Alarm
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{mt: 0.75}}>
              Update the alarm rule configuration.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/systems/${systemId}/alarms/${alarmId}`)}
            disabled={saving}
          >
            Back
          </Button>
        </Box>

        <Box component="form" onSubmit={handleSubmit}>
          {error && (
            <Alert severity="error" sx={{mb: 3, borderRadius: 2}}>
              {error}
            </Alert>
          )}

          <Stack spacing={3}>
            <TextField
              label="Alarm Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={saving}
              fullWidth
            />

            <TextField
              label="Measurement Type"
              value={measurementType}
              onChange={(e) => setMeasurementType(e.target.value)}
              required
              disabled={saving}
              fullWidth
            />

            <TextField
              select
              label="Condition"
              value={condition}
              onChange={(e) =>
                setCondition(Number(e.target.value) as AlarmCondition)
              }
              required
              disabled={saving}
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
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              required
              disabled={saving}
              fullWidth
            />

            <TextField
              label="Cooldown Minutes"
              type="number"
              value={cooldownMinutes}
              onChange={(e) => setCooldownMinutes(e.target.value)}
              required
              disabled={saving}
              inputProps={{min: 0, step: 1}}
              fullWidth
            />

            <FormControlLabel
              control={
                <Switch
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  disabled={saving}
                />
              }
              label={enabled ? "Enabled" : "Disabled"}
            />

            <Box
              sx={{display: "flex", justifyContent: "flex-end", gap: 2, mt: 1}}
            >
              <Button
                variant="outlined"
                onClick={() =>
                  navigate(`/systems/${systemId}/alarms/${alarmId}`)
                }
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={
                  saving ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <SaveIcon />
                  )
                }
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
};

export default AlarmEdit;
