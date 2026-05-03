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
  TextField,
  Typography,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import {trixma, type AlarmCondition, type Unit} from "./api";

const CONDITION_OPTIONS: Array<{value: AlarmCondition; label: string}> = [
  {value: 0, label: "Below"},
  {value: 1, label: "Above"},
  {value: 2, label: "Equal"},
];

const EventForm: React.FC = () => {
  const {id: systemId} = useParams<{id: string}>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState("");

  const [name, setName] = useState("");
  const [measurementType, setMeasurementType] = useState("temperature");
  const [condition, setCondition] = useState<AlarmCondition>(1);
  const [threshold, setThreshold] = useState("0");
  const [cooldownMinutes, setCooldownMinutes] = useState("60");

  useEffect(() => {
    const fetchUnits = async () => {
      if (!systemId) {
        setError("System id is missing from route");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const {data, error: unitsError} =
          await trixma.getUnitsBySystemId(systemId);
        if (unitsError) throw new Error(unitsError);

        const fetchedUnits = data || [];
        setUnits(fetchedUnits);
        if (fetchedUnits.length > 0) {
          setSelectedUnitId(fetchedUnits[0].id);
        }
      } catch (err: unknown) {
        console.error("Error loading units for event form:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load system units",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchUnits();
  }, [systemId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const parsedThreshold = Number(threshold);
    const parsedCooldown = Number(cooldownMinutes);

    if (!selectedUnitId) {
      setError("Please select a unit");
      return;
    }
    if (!name.trim()) {
      setError("Event name is required");
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

      const {error: createError} = await trixma.createAlarmRule({
        unitId: selectedUnitId,
        name: name.trim(),
        measurementType: measurementType.trim(),
        condition,
        threshold: parsedThreshold,
        cooldownMinutes: parsedCooldown,
      });

      if (createError) throw new Error(createError);

      navigate(`/systems/${systemId}?tab=events`);
    } catch (err: unknown) {
      console.error("Error creating event:", err);
      setError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{display: "flex", justifyContent: "center", py: 8}}>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: "center",
            border: 1,
            borderColor: "divider",
            borderRadius: 3,
          }}
        >
          <CircularProgress size={32} sx={{mb: 2}} />
          <Typography color="text.secondary">Loading units...</Typography>
        </Paper>
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
              Create Event
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{mt: 0.75}}>
              Create an alarm event rule for a unit in this system.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/systems/${systemId}?tab=events`)}
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

          {units.length === 0 ? (
            <Alert severity="warning" sx={{mb: 3, borderRadius: 2}}>
              No units are assigned to this system. Add a unit first to create
              an event.
            </Alert>
          ) : null}

          <Stack spacing={3}>
            <TextField
              select
              label="Unit"
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              required
              disabled={saving || units.length === 0}
              fullWidth
            >
              {units.map((unit) => (
                <MenuItem key={unit.id} value={unit.id}>
                  {unit.name || "Unnamed unit"} ({unit.id})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Event Name"
              placeholder="e.g. High temperature warning"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={saving || units.length === 0}
              fullWidth
            />

            <TextField
              label="Measurement Type"
              placeholder="e.g. temperature"
              value={measurementType}
              onChange={(e) => setMeasurementType(e.target.value)}
              required
              disabled={saving || units.length === 0}
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
              disabled={saving || units.length === 0}
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
              disabled={saving || units.length === 0}
              fullWidth
            />

            <TextField
              label="Cooldown Minutes"
              type="number"
              value={cooldownMinutes}
              onChange={(e) => setCooldownMinutes(e.target.value)}
              required
              disabled={saving || units.length === 0}
              inputProps={{min: 0, step: 1}}
              fullWidth
            />

            <Box
              sx={{display: "flex", justifyContent: "flex-end", gap: 2, mt: 1}}
            >
              <Button
                variant="outlined"
                onClick={() => navigate(`/systems/${systemId}?tab=events`)}
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
                disabled={saving || units.length === 0}
              >
                {saving ? "Creating..." : "Create Event"}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
};

export default EventForm;
