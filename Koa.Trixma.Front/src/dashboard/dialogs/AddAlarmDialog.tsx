import React from "react"
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  MenuItem,
  Stack,
  TextField,
  Typography,
  Box,
} from "@mui/material"
import { type AlarmCondition, type System, type Unit } from "../../api"

interface AddAlarmDialogProps {
  open: boolean
  units: Unit[]
  systems: System[]
  submitting: boolean
  error: string | null
  unitId: string
  name: string
  measurementType: string
  condition: AlarmCondition
  threshold: string
  cooldownMinutes: string
  onUnitIdChange: (id: string) => void
  onNameChange: (name: string) => void
  onMeasurementTypeChange: (type: string) => void
  onConditionChange: (condition: AlarmCondition) => void
  onThresholdChange: (threshold: string) => void
  onCooldownMinutesChange: (minutes: string) => void
  onSubmit: (event: React.FormEvent) => Promise<void>
  onClose: () => void
}

const AddAlarmDialog: React.FC<AddAlarmDialogProps> = ({
  open,
  units,
  systems,
  submitting,
  error,
  unitId,
  name,
  measurementType,
  condition,
  threshold,
  cooldownMinutes,
  onUnitIdChange,
  onNameChange,
  onMeasurementTypeChange,
  onConditionChange,
  onThresholdChange,
  onCooldownMinutesChange,
  onSubmit,
  onClose,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ mb: 2.5 }}>
          <Typography
            variant="overline"
            color="primary.main"
            fontWeight={700}
          >
            Alarm management
          </Typography>
          <Typography
            variant="h5"
            component="h2"
            fontWeight={800}
            sx={{ lineHeight: 1.1, mt: 0.5 }}
          >
            Create alarm
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1 }}
          >
            Create a new alarm rule from the dashboard.
          </Typography>
        </Box>

        <Box component="form" id="dashboard-create-alarm-form" onSubmit={onSubmit}>
          <Stack spacing={2}>
            <TextField
              select
              label="Unit"
              value={unitId}
              onChange={(e) => onUnitIdChange(e.target.value)}
              required
              disabled={submitting || units.length === 0}
              fullWidth
            >
              {units.map((unit) => (
                <MenuItem key={unit.id} value={unit.id}>
                  {unit.name || "Unnamed unit"}
                  {unit.systemId
                    ? ` (${systems.find((system) => String(system.id) === String(unit.systemId))?.name || unit.systemId})`
                    : " (Unassigned)"}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Alarm name"
              placeholder="e.g. High temperature warning"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              required
              disabled={submitting || units.length === 0}
              fullWidth
            />

            <TextField
              label="Measurement type"
              placeholder="e.g. temperature"
              value={measurementType}
              onChange={(e) => onMeasurementTypeChange(e.target.value)}
              required
              disabled={submitting || units.length === 0}
              fullWidth
            />

            <TextField
              select
              label="Condition"
              value={condition}
              onChange={(e) =>
                onConditionChange(Number(e.target.value) as AlarmCondition)
              }
              required
              disabled={submitting || units.length === 0}
              fullWidth
            >
              <MenuItem value={0}>Below</MenuItem>
              <MenuItem value={1}>Above</MenuItem>
              <MenuItem value={2}>Equal</MenuItem>
            </TextField>

            <TextField
              label="Threshold"
              type="number"
              value={threshold}
              onChange={(e) => onThresholdChange(e.target.value)}
              required
              disabled={submitting || units.length === 0}
              fullWidth
            />

            <TextField
              label="Cooldown minutes"
              type="number"
              value={cooldownMinutes}
              onChange={(e) => onCooldownMinutesChange(e.target.value)}
              required
              disabled={submitting || units.length === 0}
              inputProps={{ min: 0, step: 1 }}
              fullWidth
            />

            {error && (
              <Typography variant="body2" color="error">
                {error}
              </Typography>
            )}

            {units.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No units are available yet. Add a unit before creating an alarm.
              </Typography>
            )}
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="dashboard-create-alarm-form"
          variant="contained"
          disabled={submitting || units.length === 0}
        >
          {submitting ? "Creating..." : "Create alarm"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default AddAlarmDialog
