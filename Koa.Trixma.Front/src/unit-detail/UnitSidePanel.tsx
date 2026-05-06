import React from "react";
import {
  Box,
  Paper,
  Typography,
  Chip,
  Button,
  IconButton,
} from "@mui/material";
import {
  Add as AddIcon,
  ViewSidebar as ViewSidebarIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import type {AlarmCondition, Unit} from "../api";

interface UnitSidePanelProps {
  unit: Unit;
  onOpenAlarm: (alarmId: string) => void;
  onAddAlarm: () => void;
  formatAlarmCondition: (condition: AlarmCondition) => string;
  onClosePanel?: () => void;
}

const UnitSidePanel: React.FC<UnitSidePanelProps> = ({
  unit,
  onOpenAlarm,
  onAddAlarm,
  formatAlarmCondition,
  onClosePanel,
}) => {
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
        <Box sx={{display: "flex", alignItems: "center", gap: 1, mb: 1}}>
          <ViewSidebarIcon color="action" fontSize="small" />
          <Typography variant="h6" fontWeight="bold">
            Settings
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Unit-specific settings will be available here.
        </Typography>
      </Paper>
    </Box>
  );
};

export default UnitSidePanel;
