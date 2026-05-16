import React from "react"
import {
  Box,
  Button,
  Chip,
  Paper,
  Typography,
} from "@mui/material"
import { Add as AddIcon } from "@mui/icons-material"
import { type Unit } from "../../../api"
import { formatAlarmCondition } from "./tabUtils"

interface UnitAlarmsTabProps {
  unit: Unit
  onAddAlarm?: (unitId: string) => void
}

const UnitAlarmsTab: React.FC<UnitAlarmsTabProps> = ({ unit, onAddAlarm }) => {
  const alarms = unit?.alarms ?? []

  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mb: 1.25,
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
          Connected Alarms
        </Typography>
        <Box
          sx={{
            flex: 1,
            borderTop: 1,
            borderColor: "divider",
            opacity: 0.8,
          }}
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => onAddAlarm?.(unit.id)}
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
                bgcolor: "#191a26",
                borderColor: "divider",
                "&:hover": {
                  borderColor: "primary.main",
                  bgcolor: "#191a26",
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
            bgcolor: "#191a26",
            borderColor: "divider",
          }}
        >
          <Typography color="text.secondary">
            No alarms connected to this unit.
          </Typography>
        </Paper>
      )}
    </>
  )
}

export default UnitAlarmsTab
