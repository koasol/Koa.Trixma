import React, {useEffect, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Typography,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import {
  trixma,
  type AlarmCondition,
  type AlarmEvent,
  type AlarmRule,
  type Unit,
} from "./api";
import AppBreadcrumbs from "./components/AppBreadcrumbs";

const AlarmDetail: React.FC = () => {
  const {id: systemId, alarmId} = useParams<{id: string; alarmId: string}>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [alarmRule, setAlarmRule] = useState<AlarmRule | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [events, setEvents] = useState<AlarmEvent[]>([]);
  const [systemName, setSystemName] = useState("System");

  const formatAlarmCondition = (condition: AlarmCondition): string => {
    if (condition === 0) return "Below";
    if (condition === 1) return "Above";
    return "Equal";
  };

  useEffect(() => {
    const fetchAlarmDetail = async () => {
      if (!alarmId) {
        setError("Alarm id is missing from route");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const {data: ruleData, error: ruleError} =
          await trixma.getAlarmRuleById(alarmId);
        if (ruleError) throw new Error(ruleError);
        if (!ruleData) throw new Error("Alarm not found");

        setAlarmRule(ruleData);

        const [
          {data: unitData, error: unitError},
          {data: eventsData, error: eventsError},
        ] = await Promise.all([
          trixma.getUnitById(ruleData.unitId),
          trixma.getAlarmEvents(ruleData.id),
        ]);

        if (unitError) throw new Error(unitError);
        if (eventsError) throw new Error(eventsError);

        setUnit(unitData);
        setEvents(
          (eventsData || []).sort((a, b) => {
            const aTime = a.firedAt ? new Date(a.firedAt).getTime() : 0;
            const bTime = b.firedAt ? new Date(b.firedAt).getTime() : 0;
            return bTime - aTime;
          }),
        );
      } catch (err: unknown) {
        console.error("Error fetching alarm detail:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load alarm detail",
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchAlarmDetail();
  }, [alarmId]);

  useEffect(() => {
    if (!systemId) {
      setSystemName("System");
      return;
    }

    let isActive = true;
    const fetchSystemName = async () => {
      const {data} = await trixma.getSystemById(systemId);
      if (!isActive) return;
      setSystemName(data?.name || "System");
    };

    void fetchSystemName();
    return () => {
      isActive = false;
    };
  }, [systemId]);

  if (loading) {
    return (
      <Box sx={{display: "flex", justifyContent: "center", py: 8}}>
        <Paper
          variant="outlined"
          sx={{p: 4, textAlign: "center", borderRadius: 3}}
        >
          <CircularProgress size={32} sx={{mb: 2}} />
          <Typography color="text.secondary">
            Loading alarm details...
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (error || !alarmRule) {
    return (
      <Box sx={{textAlign: "center", py: 8}}>
        <AppBreadcrumbs
          items={[
            {label: "Systems", to: "/"},
            {label: systemName, to: `/systems/${systemId}`},
            {label: "Alarms", to: `/systems/${systemId}?tab=alarms`},
            {label: "Alarm"},
          ]}
        />
        <Typography color="error" gutterBottom>
          Error: {error || "Alarm not found"}
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
    <Box sx={{maxWidth: 900, mx: "auto", width: "100%"}}>
      <AppBreadcrumbs
        items={[
          {label: "Systems", to: "/"},
          {label: systemName, to: `/systems/${systemId}`},
          {label: "Alarms", to: `/systems/${systemId}?tab=alarms`},
          {label: alarmRule.name || "Alarm"},
        ]}
      />

      <Box
        sx={{
          mb: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        <Button
          variant="contained"
          startIcon={<EditIcon />}
          onClick={() =>
            navigate(`/systems/${systemId}/alarms/${alarmRule.id}/edit`)
          }
        >
          Edit Alarm
        </Button>
      </Box>

      <Paper
        variant="outlined"
        sx={{p: {xs: 2.5, md: 3}, borderRadius: 2, mb: 2.5}}
      >
        <Typography variant="h5" fontWeight="bold" sx={{mb: 1}}>
          {alarmRule.name}
        </Typography>
        <Typography color="text.secondary" sx={{mb: 2}}>
          Triggers when {alarmRule.measurementType} is{" "}
          {formatAlarmCondition(alarmRule.condition).toLowerCase()}{" "}
          {alarmRule.threshold}
        </Typography>

        <Box sx={{display: "flex", flexWrap: "wrap", gap: 1}}>
          <Chip
            size="small"
            label={alarmRule.enabled ? "Enabled" : "Disabled"}
            color={alarmRule.enabled ? "success" : "default"}
            variant="outlined"
          />
          <Chip
            size="small"
            label={`Unit: ${unit?.name || alarmRule.unitId}`}
            variant="outlined"
          />
          <Chip
            size="small"
            label={`Cooldown: ${alarmRule.cooldownMinutes} min`}
            variant="outlined"
          />
          <Chip
            size="small"
            label={`Created: ${
              alarmRule.createdAt
                ? new Date(alarmRule.createdAt).toLocaleString()
                : "N/A"
            }`}
            variant="outlined"
          />
        </Box>
      </Paper>

      <Typography variant="h6" fontWeight="bold" sx={{mb: 1.25}}>
        Trigger History
      </Typography>

      {events.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{p: 3.5, textAlign: "center", borderStyle: "dashed"}}
        >
          <Typography color="text.secondary">
            No trigger events recorded yet.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{display: "flex", flexDirection: "column", gap: 1.25}}>
          {events.map((event) => (
            <Paper
              key={event.id}
              variant="outlined"
              sx={{p: 2, borderRadius: 1.5}}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                  flexWrap: "wrap",
                }}
              >
                <Typography variant="body2" fontWeight="bold">
                  Actual value: {event.actualValue}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {event.firedAt
                    ? new Date(event.firedAt).toLocaleString()
                    : "N/A"}
                </Typography>
              </Box>
              {event.message ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{mt: 0.75}}
                >
                  {event.message}
                </Typography>
              ) : null}
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default AlarmDetail;
