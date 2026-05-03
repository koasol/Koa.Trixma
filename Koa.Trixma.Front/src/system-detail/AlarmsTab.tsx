import {Add as AddIcon, Edit as EditIcon} from "@mui/icons-material";
import {Box, Button, Chip, CircularProgress, Paper, Typography} from "@mui/material";
import {type AlarmRule, type Unit} from "../api";
import {formatAlarmCondition} from "./utils";

interface AlarmsTabProps {
  units: Unit[];
  alarmRules: AlarmRule[];
  alarmRulesLoading: boolean;
  alarmRulesError: string | null;
  onRetry: () => void;
  onCreateAlarm: () => void;
  onOpenAlarm: (alarmId: string) => void;
  onEditAlarm: (alarmId: string) => void;
}

const AlarmsTab: React.FC<AlarmsTabProps> = ({
  units,
  alarmRules,
  alarmRulesLoading,
  alarmRulesError,
  onRetry,
  onCreateAlarm,
  onOpenAlarm,
  onEditAlarm,
}) => (
  <Box>
    <Box
      sx={{
        mb: 2,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 1,
        flexWrap: "wrap",
      }}
    >
      <Typography variant="h6" fontWeight="bold">
        Alarms
      </Typography>
      <Button variant="contained" startIcon={<AddIcon />} onClick={onCreateAlarm}>
        Create Alarm
      </Button>
    </Box>

    {alarmRulesLoading ? (
      <Paper variant="outlined" sx={{p: 4, textAlign: "center", borderStyle: "dashed"}}>
        <CircularProgress size={24} sx={{mb: 1}} />
        <Typography color="text.secondary">Loading alarms...</Typography>
      </Paper>
    ) : alarmRulesError ? (
      <Paper variant="outlined" sx={{p: 3, borderStyle: "dashed"}}>
        <Typography color="error" sx={{mb: 2}}>
          {alarmRulesError}
        </Typography>
        <Button variant="outlined" onClick={onRetry}>
          Retry
        </Button>
      </Paper>
    ) : alarmRules.length === 0 ? (
      <Paper variant="outlined" sx={{p: 4, textAlign: "center", borderStyle: "dashed"}}>
        <Typography color="text.secondary">No alarms configured for this system yet.</Typography>
      </Paper>
    ) : (
      <Box
        sx={{
          display: "grid",
          gap: 1.5,
          gridTemplateColumns: "1fr",
          "@media (min-width:500px)": {
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          },
        }}
      >
        {alarmRules.map((rule) => {
          const unit = units.find((u) => u.id === rule.unitId);
          return (
            <Paper
              key={rule.id}
              variant="outlined"
              onClick={() => onOpenAlarm(rule.id)}
              sx={{
                p: 2,
                borderRadius: 1,
                borderColor: "divider",
                cursor: "pointer",
                transition: "border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease",
                "&:hover": {
                  borderColor: "primary.main",
                  boxShadow: (theme) => theme.shadows[2],
                  transform: "translateY(-1px)",
                },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 1,
                }}
              >
                <Typography variant="subtitle1" fontWeight="bold">
                  {rule.name || "Unnamed alarm"}
                </Typography>
                <Chip
                  size="small"
                  label={rule.enabled ? "Enabled" : "Disabled"}
                  color={rule.enabled ? "success" : "default"}
                  variant="outlined"
                />
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{mt: 1.25}}>
                Triggers when {rule.measurementType} is {formatAlarmCondition(rule.condition).toLowerCase()} {rule.threshold}
              </Typography>

              <Box
                sx={{
                  mt: 1.5,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1,
                }}
              >
                <Chip size="small" label={`Unit: ${unit?.name || rule.unitId}`} variant="outlined" />
                <Chip size="small" label={`Cooldown: ${rule.cooldownMinutes} min`} variant="outlined" />
                <Chip
                  size="small"
                  label={`Created: ${rule.createdAt ? new Date(rule.createdAt).toLocaleString() : "N/A"}`}
                  variant="outlined"
                />
              </Box>

              <Box
                sx={{
                  mt: 1.5,
                  pt: 1,
                  borderTop: 1,
                  borderColor: "divider",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<EditIcon fontSize="small" />}
                  onClick={(event) => {
                    event.stopPropagation();
                    onEditAlarm(rule.id);
                  }}
                >
                  Edit
                </Button>
              </Box>
            </Paper>
          );
        })}
      </Box>
    )}

  </Box>
);

export default AlarmsTab;
