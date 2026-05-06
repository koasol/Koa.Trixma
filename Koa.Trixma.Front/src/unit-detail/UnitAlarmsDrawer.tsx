import React from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Paper,
  Chip,
  Button,
} from "@mui/material";
import {Close as CloseIcon, Add as AddIcon} from "@mui/icons-material";
import type {AlarmCondition, Unit} from "../api";

interface UnitAlarmsDrawerProps {
  open: boolean;
  unit: Unit;
  onClose: () => void;
  onOpenAlarm: (alarmId: string) => void;
  onAddAlarm: () => void;
  formatAlarmCondition: (condition: AlarmCondition) => string;
}

const UnitAlarmsDrawer: React.FC<UnitAlarmsDrawerProps> = ({
  open,
  unit,
  onClose,
  onOpenAlarm,
  onAddAlarm,
  formatAlarmCondition,
}) => {
  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{width: {xs: "100vw", sm: 460}, p: 2}}>
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
          <IconButton onClick={onClose} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {unit.alarms && unit.alarms.length > 0 ? (
          <Box sx={{display: "flex", flexDirection: "column", gap: 1.25}}>
            {unit.alarms.map((alarm) => (
              <Paper
                key={alarm.id}
                variant="outlined"
                onClick={() => onOpenAlarm(alarm.id)}
                sx={{
                  p: 1.5,
                  borderRadius: 1.5,
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
                  {formatAlarmCondition(alarm.condition).toLowerCase()}{" "}
                  {alarm.threshold}
                </Typography>
              </Paper>
            ))}
          </Box>
        ) : (
          <Paper
            variant="outlined"
            sx={{p: 2.5, textAlign: "center", borderStyle: "dashed"}}
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
      </Box>
    </Drawer>
  );
};

export default UnitAlarmsDrawer;
