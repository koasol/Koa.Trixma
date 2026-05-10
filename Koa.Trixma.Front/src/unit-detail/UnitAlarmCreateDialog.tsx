import React, {useEffect, useState} from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {Save as SaveIcon} from "@mui/icons-material";
import {toast} from "react-toastify";
import {trixma, type AlarmCondition, type Unit} from "../api";

interface UnitAlarmCreateDialogProps {
  open: boolean;
  unit: Unit;
  onClose: () => void;
  onCreated: () => Promise<void> | void;
}

const CONDITION_OPTIONS: Array<{value: AlarmCondition; label: string}> = [
  {value: 0, label: "Below"},
  {value: 1, label: "Above"},
  {value: 2, label: "Equal"},
];

const UnitAlarmCreateDialog: React.FC<UnitAlarmCreateDialogProps> = ({
  open,
  unit,
  onClose,
  onCreated,
}) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [measurementType, setMeasurementType] = useState("temperature");
  const [condition, setCondition] = useState<AlarmCondition>(1);
  const [threshold, setThreshold] = useState("0");
  const [cooldownMinutes, setCooldownMinutes] = useState("60");

  useEffect(() => {
    if (!open) return;
    setError(null);
    setName("");
    setMeasurementType("temperature");
    setCondition(1);
    setThreshold("0");
    setCooldownMinutes("60");
  }, [open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

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

      const {error: createError} = await trixma.createAlarmRule({
        unitId: unit.id,
        name: name.trim(),
        measurementType: measurementType.trim(),
        condition,
        threshold: parsedThreshold,
        cooldownMinutes: parsedCooldown,
      });

      if (createError) throw new Error(createError);

      await onCreated();
      toast.success("Alarm saved successfully");
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create alarm");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>Create Alarm for Unit</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
          New alarm will be attached to {unit.name || "this unit"}.
        </Typography>

        <Box
          component="form"
          onSubmit={handleSubmit}
          id="unit-alarm-create-form"
        >
          {error && (
            <Alert severity="error" sx={{mb: 2}}>
              {error}
            </Alert>
          )}

          <Stack spacing={2}>
            <TextField
              label="Alarm Name"
              placeholder="e.g. High temperature warning"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={saving}
              fullWidth
            />

            <TextField
              label="Measurement Type"
              placeholder="e.g. temperature"
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
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions sx={{px: 3, pb: 2}}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="unit-alarm-create-form"
          variant="contained"
          startIcon={
            saving ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <SaveIcon />
            )
          }
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Alarm"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UnitAlarmCreateDialog;
