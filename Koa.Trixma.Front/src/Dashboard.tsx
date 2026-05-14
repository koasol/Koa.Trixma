import React, {useCallback, useEffect, useMemo, useState} from "react";
import {
  Link as RouterLink,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActionArea,
  CardActions,
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Paper,
  Stack,
  Divider,
  TextField,
  Drawer,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Add as AddIcon,
  MoreHoriz as MoreIcon,
  FilterAltOff as FilterAltOffIcon,
  Close as CloseIcon,
  Battery20 as Battery20Icon,
  Battery30 as Battery30Icon,
  Battery50 as Battery50Icon,
  Battery80 as Battery80Icon,
  BatteryFull as BatteryFullIcon,
  BatteryAlert as BatteryAlertIcon,
  RestartAlt as RestartAltIcon,
  Memory as MemoryIcon,
} from "@mui/icons-material";
import {trixma, type AlarmCondition, type AlarmEvent, type System, type Unit} from "./api";
import {type User} from "firebase/auth";
import AppBreadcrumbs from "./components/AppBreadcrumbs";
import ProvisionUnit from "./ProvisionUnit";

interface DashboardProps {
  user: User;
}

type UnitOverviewTab = "overview" | "telemetry" | "alarms" | "settings" | "firmware";

const Dashboard: React.FC<DashboardProps> = ({user}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [systems, setSystems] = useState<System[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unitsError, setUnitsError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<
    string | number | null
  >(null);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [unitCounts, setUnitCounts] = useState<Record<string | number, number>>(
    {},
  );
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activeSystemId, setActiveSystemId] = useState<string | number | null>(
    null,
  );
  const [alarmRules, setAlarmRules] = useState<
    Array<{
      id: string;
      unitId: string;
      name: string;
      measurementType: string;
      threshold: number;
      enabled: boolean;
      createdAt: string;
    }>
  >([]);
  const [triggeredAlarms, setTriggeredAlarms] = useState<
    Array<{
      id: string;
      alarmRuleId: string;
      unitId: string;
      unitName: string;
      message: string;
      firedAt: string;
    }>
  >([]);
  const [alarmsLoading, setAlarmsLoading] = useState(false);
  const [alarmsError, setAlarmsError] = useState<string | null>(null);
  const [addAlarmDialogOpen, setAddAlarmDialogOpen] = useState(false);
  const [addAlarmSubmitting, setAddAlarmSubmitting] = useState(false);
  const [addAlarmError, setAddAlarmError] = useState<string | null>(null);
  const [addAlarmUnitId, setAddAlarmUnitId] = useState("");
  const [addAlarmName, setAddAlarmName] = useState("");
  const [addAlarmMeasurementType, setAddAlarmMeasurementType] = useState("temperature");
  const [addAlarmCondition, setAddAlarmCondition] = useState<AlarmCondition>(1);
  const [addAlarmThreshold, setAddAlarmThreshold] = useState("0");
  const [addAlarmCooldownMinutes, setAddAlarmCooldownMinutes] = useState("60");
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<
    "1h" | "3h" | "6h" | "24h" | "7d" | "30d"
  >("24h");
  const [selectedSystemId, setSelectedSystemId] = useState<
    string | number | null
  >(null);
  const [addSystemDialogOpen, setAddSystemDialogOpen] = useState(false);
  const [newSystemName, setNewSystemName] = useState("");
  const [newSystemDescription, setNewSystemDescription] = useState("");
  const [addSystemSubmitting, setAddSystemSubmitting] = useState(false);
  const [addSystemError, setAddSystemError] = useState<string | null>(null);
  const [provisioningDialogOpen, setProvisioningDialogOpen] = useState(false);
  const [selectedOverviewUnit, setSelectedOverviewUnit] = useState<Unit | null>(null);
  const [unitOverviewOpen, setUnitOverviewOpen] = useState(false);
  const [unitOverviewLoading, setUnitOverviewLoading] = useState(false);
  const [unitOverviewError, setUnitOverviewError] = useState<string | null>(null);
  const [activeUnitOverviewTab, setActiveUnitOverviewTab] = useState<UnitOverviewTab>("overview");

  const view = searchParams.get("view");
  const activeView = useMemo<
    "overview" | "systems" | "units" | "alarms" | "settings"
  >(() => {
    if (
      view === "systems" ||
      view === "units" ||
      view === "alarms" ||
      view === "settings"
    ) {
      return view;
    }
    return "overview";
  }, [view]);

  useEffect(() => {
    let mounted = true;

    const fetchDashboardData = async () => {
      try {
        if (!mounted) return;
        setError(null);
        setUnitsError(null);
        setLoading(true);
        const [
          {data: systemsData, error: systemsError},
          {data: unitsData, error: allUnitsError},
        ] = await Promise.all([trixma.getSystems(), trixma.getUnits()]);

        if (systemsError) throw new Error(systemsError);
        if (allUnitsError) {
          console.error("Error fetching all units:", allUnitsError);
          if (mounted) setUnitsError(allUnitsError);
        }

        if (mounted) {
          const systemsList = systemsData || [];
          const unitsList = unitsData || [];
          setSystems(systemsList);
          setUnits(unitsList);

          const counts = unitsList.reduce<Record<string, number>>(
            (acc, unit) => {
              if (unit.systemId) {
                acc[unit.systemId] = (acc[unit.systemId] || 0) + 1;
              }
              return acc;
            },
            {},
          );
          setUnitCounts(counts);
        }
      } catch (err: unknown) {
        console.error("Error fetching systems:", err);
        if (mounted)
          setError(
            err instanceof Error ? err.message : "An unknown error occurred",
          );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }

    return () => {
      mounted = false;
    };
  }, [user]);

  const handleOpenMenu = (
    e: React.MouseEvent<HTMLElement>,
    id: string | number,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
    setActiveSystemId(id);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setActiveSystemId(null);
  };

  const handleEdit = () => {
    if (activeSystemId) {
      navigate(`/systems/${activeSystemId}/edit`);
    }
    handleCloseMenu();
  };

  const handleDeleteRequest = () => {
    if (activeSystemId) {
      setConfirmDeleteId(activeSystemId);
    }
    handleCloseMenu();
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      setDeletingId(confirmDeleteId);
      const {error: delError} = await trixma.deleteSystem(confirmDeleteId);
      if (delError) throw new Error(delError);
      setSystems((prev) =>
        prev.filter((s) => String(s.id) !== String(confirmDeleteId)),
      );
    } catch (err: unknown) {
      console.error("Error deleting system:", err);
      setError(err instanceof Error ? err.message : "Failed to delete system");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const fetchAlarmRules = useCallback(async () => {
    if (activeView !== "alarms") return;
    if (units.length === 0) {
      setAlarmRules([]);
      setAlarmsError(null);
      return;
    }

    try {
      setAlarmsLoading(true);
      setAlarmsError(null);
      const responses = await Promise.all(
        units.map(async (unit) => {
          const {data, error: fetchError} =
            await trixma.getAlarmRulesByUnitId(unit.id);
          if (fetchError) {
            throw new Error(
              `Failed to load alarms for ${unit.name || unit.id}: ${fetchError}`,
            );
          }
          return data || [];
        }),
      );

      const allRules = responses.flat().sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });

      setAlarmRules(allRules);
    } catch (err: unknown) {
      console.error("Error fetching alarms:", err);
      setAlarmsError(
        err instanceof Error ? err.message : "Failed to load alarms",
      );
    } finally {
      setAlarmsLoading(false);
    }
  }, [activeView, units]);

  useEffect(() => {
    void fetchAlarmRules();
  }, [fetchAlarmRules]);

  const fetchTriggeredAlarms = useCallback(async () => {
    if (activeView !== "overview") return;
    if (units.length === 0) {
      setTriggeredAlarms([]);
      setAlarmsError(null);
      return;
    }

    try {
      setAlarmsLoading(true);
      setAlarmsError(null);

      const unitLookup = new Map(units.map((unit) => [unit.id, unit]));
      const alarmRulesByUnit = await Promise.all(
        units.map(async (unit) => {
          const {data, error: fetchError} =
            await trixma.getAlarmRulesByUnitId(unit.id);
          if (fetchError) {
            throw new Error(
              `Failed to load alarms for ${unit.name || unit.id}: ${fetchError}`,
            );
          }
          return data || [];
        }),
      );

      const rules = alarmRulesByUnit.flat();
      const alarmEvents = await Promise.all(
        rules.map(async (rule) => {
          const {data, error: eventError} = await trixma.getAlarmEvents(rule.id);
          if (eventError) {
            throw new Error(
              `Failed to load trigger history for ${rule.name || rule.id}: ${eventError}`,
            );
          }

          return (data || []).map((event: AlarmEvent) => {
            const unit = unitLookup.get(rule.unitId);
            return {
              id: event.id,
              alarmRuleId: rule.id,
              unitId: rule.unitId,
              unitName: unit?.name || rule.unitId,
              message: event.message || rule.name || "Triggered alarm",
              firedAt: event.firedAt,
            };
          });
        }),
      );

      const recentTriggered = alarmEvents
        .flat()
        .sort((a, b) => {
          const aTime = a.firedAt ? new Date(a.firedAt).getTime() : 0;
          const bTime = b.firedAt ? new Date(b.firedAt).getTime() : 0;
          return bTime - aTime;
        });

      setTriggeredAlarms(recentTriggered);
    } catch (err: unknown) {
      console.error("Error fetching triggered alarms:", err);
      setAlarmsError(
        err instanceof Error ? err.message : "Failed to load triggered alarms",
      );
    } finally {
      setAlarmsLoading(false);
    }
  }, [activeView, units]);

  useEffect(() => {
    void fetchTriggeredAlarms();
  }, [fetchTriggeredAlarms]);

  const getUnitName = (unitId: string) => {
    const unit = units.find((u) => u.id === unitId);
    return unit?.name || unitId;
  };

  const filteredUnits = useMemo(() => {
    if (!selectedSystemId) return units;
    return units.filter((u) => u.systemId === selectedSystemId);
  }, [units, selectedSystemId]);

  const selectedSystemName = useMemo(() => {
    if (!selectedSystemId) return null;
    return (
      systems.find((s) => String(s.id) === String(selectedSystemId))?.name ??
      null
    );
  }, [systems, selectedSystemId]);

  const getSystemNameForUnit = (systemId: string | null) => {
    if (!systemId) return "Unassigned";
    return systems.find((s) => String(s.id) === String(systemId))?.name ?? "-";
  };

  const getBatteryPercentForUnit = (unit: Unit): number | null => {
    if (unit.batteryPercent != null) {
      return Math.max(0, Math.min(100, Math.round(unit.batteryPercent)));
    }
    if (unit.batteryMv == null) return null;

    const voltage = unit.batteryMv / 1000;
    if (voltage >= 4.1) return 100;
    if (voltage >= 4.0) return 90;
    if (voltage >= 3.9) return 80;
    if (voltage >= 3.85) return 70;
    if (voltage >= 3.8) return 60;
    if (voltage >= 3.75) return 50;
    if (voltage >= 3.7) return 40;
    if (voltage >= 3.65) return 30;
    if (voltage >= 3.5) return 20;
    if (voltage >= 3.3) return 10;
    if (voltage >= 3.0) return 5;
    return 0;
  };

  const getBatteryLevel = (mv: number): number => {
    const voltage = mv / 1000;

    if (voltage >= 4.1) return 100;
    if (voltage >= 4.0) return 90;
    if (voltage >= 3.9) return 80;
    if (voltage >= 3.85) return 70;
    if (voltage >= 3.8) return 60;
    if (voltage >= 3.75) return 50;
    if (voltage >= 3.7) return 40;
    if (voltage >= 3.65) return 30;
    if (voltage >= 3.5) return 20;
    if (voltage >= 3.3) return 10;
    if (voltage >= 3.0) return 5;
    return 0;
  };

  const getBatteryIcon = (level: number) => {
    if (level <= 5) return BatteryAlertIcon;
    if (level <= 20) return Battery20Icon;
    if (level <= 35) return Battery30Icon;
    if (level <= 65) return Battery50Icon;
    if (level <= 85) return Battery80Icon;
    return BatteryFullIcon;
  };

  const getBatteryColor = (level: number): "error" | "warning" | "success" => {
    if (level <= 20) return "error";
    if (level <= 50) return "warning";
    return "success";
  };

  const formatRemainingLife = (hours: number): string => {
    if (hours < 1) {
      return `${Math.max(1, Math.round(hours * 60))}m`;
    }
    if (hours < 24) {
      return `${hours.toFixed(1)}h`;
    }

    const days = Math.floor(hours / 24);
    const remHours = Math.round(hours % 24);
    return `${days}d ${remHours}h`;
  };

  const getBatteryForecastLabel = (unit: Unit | null): string | null => {
    if (!unit) return null;
    const status = unit.batteryForecastStatus;
    if (status === "ok" && unit.batteryRemainingHours != null) {
      return `Est. life ${formatRemainingLife(unit.batteryRemainingHours)}`;
    }
    if (status === "charging") {
      return "Battery charging";
    }
    if (status === "unstable") {
      return "Life estimate recalibrating";
    }
    if (status === "insufficient_data") {
      return "Collecting battery trend";
    }
    return null;
  };

  const getBatteryForecastColor = (
    unit: Unit | null,
  ): "default" | "success" | "warning" => {
    if (
      !unit ||
      unit.batteryForecastStatus !== "ok" ||
      unit.batteryRemainingHours == null
    ) {
      return "default";
    }
    if (unit.batteryRemainingHours >= 24) {
      return "success";
    }
    if (unit.batteryRemainingHours >= 8) {
      return "warning";
    }
    return "warning";
  };

  const formatUptime = (ms: number): string => {
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);

    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const formatTimeAgo = (timestamp: string): string => {
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

    if (diffMinutes < 1) return "just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const handleOpenUnitOverview = async (unitId: string) => {
    setActiveUnitOverviewTab("overview");
    setUnitOverviewOpen(true);
    setUnitOverviewLoading(true);
    setUnitOverviewError(null);

    const fallbackUnit = units.find((unit) => unit.id === unitId) ?? null;
    setSelectedOverviewUnit(fallbackUnit);

    try {
      const {data, error: fetchError} = await trixma.getUnitById(unitId);
      if (fetchError || !data) {
        throw new Error(fetchError ?? "Unit not found");
      }
      setSelectedOverviewUnit(data);
    } catch (err: unknown) {
      setUnitOverviewError(
        err instanceof Error ? err.message : "Failed to load unit overview",
      );
    } finally {
      setUnitOverviewLoading(false);
    }
  };

  const handleCloseUnitOverview = () => {
    setUnitOverviewOpen(false);
    setUnitOverviewLoading(false);
    setUnitOverviewError(null);
    setActiveUnitOverviewTab("overview");
  };

  const handleOpenAddSystemDialog = () => {
    setAddSystemError(null);
    setAddSystemDialogOpen(true);
  };

  const handleCloseAddSystemDialog = () => {
    if (addSystemSubmitting) return;
    setAddSystemDialogOpen(false);
    setNewSystemName("");
    setNewSystemDescription("");
    setAddSystemError(null);
  };

  const handleCreateSystem = async () => {
    const trimmedName = newSystemName.trim();
    const trimmedDescription = newSystemDescription.trim();

    if (!trimmedName) {
      setAddSystemError("System name is required");
      return;
    }

    try {
      setAddSystemSubmitting(true);
      setAddSystemError(null);
      const {data, error: createError} = await trixma.createSystem({
        name: trimmedName,
        description: trimmedDescription,
      });

      if (createError) throw new Error(createError);
      if (!data) throw new Error("Failed to create system");

      setSystems((prev) => [data, ...prev]);
      setSelectedSystemId(data.id);
      handleCloseAddSystemDialog();
    } catch (err: unknown) {
      setAddSystemError(
        err instanceof Error ? err.message : "Failed to create system",
      );
    } finally {
      setAddSystemSubmitting(false);
    }
  };

  const handleOpenAddAlarmDialog = () => {
    setAddAlarmError(null);
    setAddAlarmDialogOpen(true);
    setAddAlarmUnitId(units[0]?.id ?? "");
    setAddAlarmName("");
    setAddAlarmMeasurementType("temperature");
    setAddAlarmCondition(1);
    setAddAlarmThreshold("0");
    setAddAlarmCooldownMinutes("60");
  };

  const handleCloseAddAlarmDialog = () => {
    if (addAlarmSubmitting) return;
    setAddAlarmDialogOpen(false);
    setAddAlarmError(null);
  };

  const handleCreateAlarm = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedName = addAlarmName.trim();
    const trimmedMeasurementType = addAlarmMeasurementType.trim();
    const parsedThreshold = Number(addAlarmThreshold);
    const parsedCooldown = Number(addAlarmCooldownMinutes);

    if (!addAlarmUnitId) {
      setAddAlarmError("Please select a unit");
      return;
    }
    if (!trimmedName) {
      setAddAlarmError("Alarm name is required");
      return;
    }
    if (!trimmedMeasurementType) {
      setAddAlarmError("Measurement type is required");
      return;
    }
    if (Number.isNaN(parsedThreshold)) {
      setAddAlarmError("Threshold must be a valid number");
      return;
    }
    if (!Number.isInteger(parsedCooldown) || parsedCooldown < 0) {
      setAddAlarmError("Cooldown must be a non-negative integer");
      return;
    }

    try {
      setAddAlarmSubmitting(true);
      setAddAlarmError(null);

      const {error: createError} = await trixma.createAlarmRule({
        unitId: addAlarmUnitId,
        name: trimmedName,
        measurementType: trimmedMeasurementType,
        condition: addAlarmCondition,
        threshold: parsedThreshold,
        cooldownMinutes: parsedCooldown,
      });

      if (createError) throw new Error(createError);

      void fetchTriggeredAlarms();
      handleCloseAddAlarmDialog();
    } catch (err: unknown) {
      setAddAlarmError(
        err instanceof Error ? err.message : "Failed to create alarm",
      );
    } finally {
      setAddAlarmSubmitting(false);
    }
  };

  return (
    <Box sx={{width: "100%"}} id="dashboard-main-box">
      {activeView === "overview" && (
        <Box sx={{width: "100%"}}>
          {/* Top Content - Constrained Width */}
          <Box sx={{mx: "auto", px: {xs: 1, sm: 1.5}}}>
            {/* Breadcrumbs */}
            <Box sx={{display: "flex", alignItems: "center", gap: 0.75, mb: 0.5}}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{fontWeight: 500}}
              >
                Fleet
              </Typography>
              <Typography variant="caption" color="text.secondary">
                /
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{fontWeight: 500}}
              >
                Overview
              </Typography>
            </Box>

            {/* Page Header with Title, Time Selector, and Add Button */}
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                mb: 2.5,
                gap: 1.5,
                flexWrap: "wrap",
              }}
            >
              <Box>
                <Typography
                  variant="h4"
                  component="h1"
                  fontWeight="800"
                  sx={{
                    mb: 0.5,
                    background: (t) =>
                      `linear-gradient(135deg, ${t.palette.text.primary} 0%, ${t.palette.primary.main} 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Command center
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {systems.length} systems across {units.length} units
                </Typography>
              </Box>
              <Box sx={{display: "flex", alignItems: "center", gap: 2}}>
                {/* Time Period Selector */}
                <Box
                  sx={{
                    display: "inline-flex",
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1,
                    p: 0,
                  }}
                >
                  {(["1h", "3h", "6h", "24h", "7d", "30d"] as const).map(
                    (period) => (
                      <Button
                        key={period}
                        variant={
                          selectedTimePeriod === period ? "contained" : "text"
                        }
                        onClick={() => setSelectedTimePeriod(period)}
                        sx={{
                          borderRadius: 0,
                          px: 1.5,
                          py: 0.75,
                          fontSize: "0.85rem",
                          fontWeight: 500,
                          textTransform: "none",
                          ...(selectedTimePeriod === period
                            ? {}
                            : {color: "text.secondary"}),
                          "&:hover": {
                            bgcolor: "action.hover",
                          },
                        }}
                      >
                        {period}
                      </Button>
                    ),
                  )}
                </Box>
                {/* Add Unit Button */}
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => navigate("/units/new")}
                  sx={{fontWeight: 600}}
                >
                  Add unit
                </Button>
              </Box>
            </Box>

            {/* Summary Stats Cards */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  md: "repeat(3, 1fr)",
                  lg: "repeat(6, 1fr)",
                },
                gap: 1.5,
                mb: 2.5,
              }}
            >
              {/* Active Units */}
              <Paper variant="outlined" sx={{p: 1.25}}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    textTransform: "uppercase",
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                  }}
                >
                  Active units
                </Typography>
                <Box
                  sx={{display: "flex", alignItems: "baseline", gap: 0.75, mt: 0.5}}
                >
                  <Typography variant="h5" fontWeight={700}>
                    {Math.max(0, ...Object.values(unitCounts)) || units.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    / {units.length}
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{mt: 0.5, display: "block"}}
                >
                  online in last 60s
                </Typography>
              </Paper>

              {/* Open Alarms */}
              <Paper
                variant="outlined"
                sx={{
                  p: 1.25,
                  ...(alarmRules.length > 5 ? {bgcolor: "error.light"} : {}),
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    textTransform: "uppercase",
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                  }}
                >
                  Open alarms
                </Typography>
                <Box
                  sx={{display: "flex", alignItems: "baseline", gap: 0.75, mt: 0.5}}
                >
                  <Typography
                    variant="h5"
                    fontWeight={700}
                    sx={{
                      ...(alarmRules.length > 5 ? {color: "error.main"} : {}),
                    }}
                  >
                    {alarmRules.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    active
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{mt: 0.5, display: "block"}}
                >
                  critical priority
                </Typography>
              </Paper>

              {/* Uptime */}
              <Paper variant="outlined" sx={{p: 1.25}}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    textTransform: "uppercase",
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                  }}
                >
                  Uptime · 7d
                </Typography>
                <Box
                  sx={{display: "flex", alignItems: "baseline", gap: 0.75, mt: 0.5}}
                >
                  <Typography variant="h5" fontWeight={700}>
                    99.2%
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{mt: 0.5, display: "block"}}
                >
                  SLA target 99.0%
                </Typography>
              </Paper>

              {/* Log Entries */}
              <Paper variant="outlined" sx={{p: 1.25}}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    textTransform: "uppercase",
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                  }}
                >
                  Log entries
                </Typography>
                <Box
                  sx={{display: "flex", alignItems: "baseline", gap: 0.75, mt: 0.5}}
                >
                  <Typography variant="h5" fontWeight={700}>
                    1.2K
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{mt: 0.5, display: "block"}}
                >
                  in {selectedTimePeriod}
                </Typography>
              </Paper>

              {/* Data Points Processed */}
              <Paper variant="outlined" sx={{p: 1.25}}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    textTransform: "uppercase",
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                  }}
                >
                  Data points
                </Typography>
                <Box
                  sx={{display: "flex", alignItems: "baseline", gap: 0.75, mt: 0.5}}
                >
                  <Typography variant="h5" fontWeight={700}>
                    42.5M
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{mt: 0.5, display: "block"}}
                >
                  processed today
                </Typography>
              </Paper>

              {/* System Health */}
              <Paper variant="outlined" sx={{p: 1.25}}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    textTransform: "uppercase",
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                  }}
                >
                  System health
                </Typography>
                <Box
                  sx={{display: "flex", alignItems: "baseline", gap: 0.75, mt: 0.5}}
                >
                  <Typography
                    variant="h5"
                    fontWeight={700}
                    sx={{color: "success.main"}}
                  >
                    Healthy
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{mt: 0.5, display: "block"}}
                >
                  all systems operational
                </Typography>
              </Paper>
            </Box>
          </Box>

          {/* Three Column List Section - Full Width */}
          <Box
            sx={{
              mt: 2.5,
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {xs: "1fr", md: "repeat(12, 1fr)"},
                gap: 2,
                px: {xs: 1, sm: 1.5},
                mx: "auto",
              }}
            >
              {/* Systems List */}
              <Paper
                variant="outlined"
                sx={{
                  gridColumn: {xs: "span 1", md: "span 2"},
                  borderRadius: 1,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    px: 1.5,
                    py: 1,
                  }}
                >
                  <Box sx={{display: "flex", alignItems: "baseline", gap: 1}}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Systems
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {systems.length}
                    </Typography>
                  </Box>
                  <Box sx={{display: "flex", alignItems: "center", gap: 0.5}}>
                    <IconButton
                      size="small"
                      aria-label="Add system"
                      onClick={handleOpenAddSystemDialog}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" aria-label="Systems menu">
                      <MoreIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
                <Divider />
                <Box sx={{flex: 1, overflowY: "auto", maxHeight: 350}}>
                  {systems.length === 0 ? (
                    <Box sx={{px: 1.5, py: 1.5}}>
                      <Typography variant="body2" color="text.secondary">
                        No systems found
                      </Typography>
                    </Box>
                  ) : (
                    systems.map((system, index) => (
                      <Box
                        key={system.id}
                        onClick={() => setSelectedSystemId(system.id)}
                        sx={{
                          px: 1.5,
                          py: 1,
                          cursor: "pointer",
                          bgcolor:
                            selectedSystemId === system.id
                              ? "action.selected"
                              : "transparent",
                          borderTop: index === 0 ? 0 : 1,
                          borderColor: "divider",
                          transition: "background-color 0.2s ease",
                          "&:hover": {
                            bgcolor: "action.hover",
                          },
                        }}
                      >
                        <Typography variant="body2" fontWeight={600}>
                          {system.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {units.filter((u) => u.systemId === system.id).length}{" "}
                          units
                        </Typography>
                      </Box>
                    ))
                  )}
                </Box>
              </Paper>

              {/* Units List */}
              <Paper
                variant="outlined"
                sx={{
                  gridColumn: {xs: "span 1", md: "span 6"},
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Box
                  sx={{
                    px: 1.5,
                    py: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                  }}
                >
                  <Box sx={{display: "flex", alignItems: "baseline", gap: 1}}>
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                    >
                      Units {selectedSystemName ? `(${selectedSystemName})` : ""}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {filteredUnits.length}
                    </Typography>
                  </Box>
                  <Box sx={{display: "flex", alignItems: "center", gap: 0.5}}>
                    <IconButton
                      size="small"
                      aria-label="Provision new unit"
                      onClick={() => setProvisioningDialogOpen(true)}
                    >
                      <MemoryIcon fontSize="small" />
                    </IconButton>
                    {selectedSystemId && (
                      <IconButton
                        size="small"
                        aria-label="Clear system filter"
                        onClick={() => setSelectedSystemId(null)}
                      >
                        <FilterAltOffIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </Box>
                <Divider />
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    display: "grid",
                    gridTemplateColumns:
                      "minmax(140px, 1.8fr) minmax(100px, 1.2fr) minmax(90px, 1fr) minmax(130px, 1.4fr)",
                    gap: 1,
                    borderBottom: 1,
                    borderColor: "divider",
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{fontWeight: 700}}>
                    Unit
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{fontWeight: 700}}>
                    System
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{fontWeight: 700}}>
                    Uptime
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{fontWeight: 700}}>
                    Battery
                  </Typography>
                </Box>
                <Box sx={{flex: 1, overflowY: "auto", maxHeight: 350}}>
                  {filteredUnits.length === 0 ? (
                    <Box
                      sx={{
                        px: 1.5,
                        py: 2,
                        display: "flex",
                        justifyContent: "center",
                      }}
                    >
                      <Box
                        sx={{
                          display: "inline-block",
                          textAlign: "center",
                          border: 1,
                          borderColor: "rgba(247, 114, 45, 0.55)",
                          borderRadius: 1,
                          py: 1,
                          px: 1.5,
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          No units in the selected system
                        </Typography>
                      </Box>
                    </Box>
                  ) : (
                    filteredUnits.map((unit, index) => {
                      const batteryPercent = getBatteryPercentForUnit(unit);
                      return (
                        <Box
                          key={unit.id}
                          onClick={() => {
                            void handleOpenUnitOverview(unit.id);
                          }}
                          sx={{
                            px: 1.5,
                            py: 1,
                            cursor: "pointer",
                            borderTop: index === 0 ? 0 : 1,
                            borderColor: "divider",
                            transition: "background-color 0.2s ease",
                            "&:hover": {
                              bgcolor: "action.hover",
                            },
                          }}
                        >
                          <Box
                            sx={{
                              display: "grid",
                              gridTemplateColumns:
                                "minmax(140px, 1.8fr) minmax(100px, 1.2fr) minmax(90px, 1fr) minmax(130px, 1.4fr)",
                              gap: 1,
                              alignItems: "center",
                            }}
                          >
                            <Box sx={{minWidth: 0}}>
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                noWrap
                                title={unit.name}
                              >
                                {unit.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" noWrap>
                                IMEI: {unit.imei || "N/A"}
                              </Typography>
                            </Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              noWrap
                              title={getSystemNameForUnit(unit.systemId)}
                            >
                              {getSystemNameForUnit(unit.systemId)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {unit.uptimeMs != null
                                ? formatUptime(unit.uptimeMs)
                                : "N/A"}
                            </Typography>
                            {batteryPercent == null ? (
                              <Typography variant="caption" color="text.secondary">
                                N/A
                              </Typography>
                            ) : (
                              <Box sx={{display: "flex", alignItems: "center", gap: 0.75}}>
                                <Box
                                  sx={{
                                    width: "100%",
                                    maxWidth: 92,
                                    height: 7,
                                    borderRadius: 999,
                                    overflow: "hidden",
                                    bgcolor: "action.disabledBackground",
                                    border: 1,
                                    borderColor: "divider",
                                  }}
                                >
                                  <Box
                                    sx={{
                                      width: `${batteryPercent}%`,
                                      height: "100%",
                                      bgcolor:
                                        batteryPercent <= 20
                                          ? "error.main"
                                          : batteryPercent <= 50
                                            ? "warning.main"
                                            : "success.main",
                                    }}
                                  />
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{minWidth: 34}}>
                                  {batteryPercent}%
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Box>
                      );
                    })
                  )}
                </Box>
              </Paper>

              {/* Alarms List */}
              <Paper
                variant="outlined"
                sx={{
                  gridColumn: {xs: "span 1", md: "span 4"},
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    px: 1.5,
                    py: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                  }}
                >
                  <Box sx={{display: "flex", alignItems: "baseline", gap: 1}}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Alarms
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {triggeredAlarms.length}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    aria-label="Add alarm"
                    onClick={handleOpenAddAlarmDialog}
                    disabled={units.length === 0}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Divider />
                <Box sx={{flex: 1, overflowY: "auto", maxHeight: 350}}>
                  {alarmsLoading ? (
                    <Box
                      sx={{display: "flex", justifyContent: "center", py: 2}}
                    >
                      <CircularProgress size={24} />
                    </Box>
                  ) : alarmsError ? (
                    <Box sx={{px: 1.5, py: 1.5}}>
                      <Typography variant="caption" color="error">
                        {alarmsError}
                      </Typography>
                    </Box>
                  ) : triggeredAlarms.length === 0 ? (
                    <Box sx={{px: 1.5, py: 1.5}}>
                      <Typography variant="body2" color="text.secondary">
                        No triggered alarms
                      </Typography>
                    </Box>
                  ) : (
                    <Box>
                      {triggeredAlarms.slice(0, 10).map((alarm) => (
                        <Box
                          key={alarm.id}
                          onClick={() => {
                            const unit = units.find((entry) => entry.id === alarm.unitId);
                            if (!unit?.systemId) return;
                            navigate(`/systems/${unit.systemId}/alarms/${alarm.alarmRuleId}`);
                          }}
                          sx={{
                            px: 1.5,
                            py: 1,
                            borderTop: 1,
                            borderColor: "divider",
                            cursor: "pointer",
                            transition: "background-color 0.2s ease",
                            "&:hover": {
                              bgcolor: "action.hover",
                            },
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              gap: 1.5,
                            }}
                          >
                            <Box sx={{minWidth: 0, flex: 1}}>
                              <Typography variant="body2" fontWeight={600} noWrap>
                                {alarm.message}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" noWrap>
                                Unit: {alarm.unitName}
                              </Typography>
                            </Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{whiteSpace: "nowrap", textAlign: "right", pt: 0.25}}
                            >
                              {formatTimeAgo(alarm.firedAt)}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                      {triggeredAlarms.length > 10 && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{textAlign: "center", mt: 1, display: "block"}}
                        >
                          +{triggeredAlarms.length - 10} more
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              </Paper>
            </Box>
          </Box>
        </Box>
      )}

      {activeView === "systems" && (
        <>
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate("/systems/new")}
              sx={{fontWeight: 700}}
            >
              Add System
            </Button>
          </Box>

          {loading ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                py: 8,
              }}
            >
              <CircularProgress size={32} sx={{mb: 2}} />
              <Typography color="text.secondary">
                Fetching systems...
              </Typography>
            </Box>
          ) : error ? (
            <Box
              sx={{
                p: 3,
                bgcolor: "error.main",
                color: "error.contrastText",
                borderRadius: 2,
              }}
            >
              <Typography>Error loading systems: {error}</Typography>
            </Box>
          ) : systems.length > 0 ? (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {xs: "1fr", lg: "3fr 1fr"},
                gap: 2.5,
              }}
            >
              <Box sx={{minWidth: 0}}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {xs: "1fr", md: "1fr 1fr"},
                    gap: 2,
                  }}
                >
                  {systems.map((system) => (
                    <Box key={system.id} sx={{minWidth: 0}}>
                      <Card
                        sx={{
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          transition: "all 0.3s",
                          "&:hover": {
                            transform: "translateY(-4px)",
                            boxShadow: (theme) => theme.shadows[10],
                            borderColor: "primary.main",
                          },
                          border: 1,
                          borderColor: "divider",
                          bgcolor: "background.paper",
                        }}
                      >
                        <CardActionArea
                          component={RouterLink}
                          to={`/systems/${system.id}`}
                          sx={{
                            flexGrow: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "stretch",
                          }}
                        >
                          <CardContent sx={{flexGrow: 1}}>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                mb: 2,
                              }}
                            >
                              <Box>
                                <Typography
                                  variant="h6"
                                  component="div"
                                  fontWeight="bold"
                                >
                                  {system.name}
                                </Typography>
                                <Chip
                                  label={`#${system.id}`}
                                  size="small"
                                  variant="outlined"
                                  sx={{
                                    mt: 0.5,
                                    height: 20,
                                    fontSize: "0.7rem",
                                    fontFamily: "monospace",
                                    color: "text.secondary",
                                  }}
                                />
                              </Box>
                              <IconButton
                                size="small"
                                onClick={(e) => handleOpenMenu(e, system.id)}
                                sx={{color: "text.secondary"}}
                              >
                                <MoreIcon />
                              </IconButton>
                            </Box>

                            {system.description && (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  display: "-webkit-box",
                                  WebkitLineClamp: 3,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                  lineHeight: 1.6,
                                  mb: 2,
                                }}
                              >
                                {system.description}
                              </Typography>
                            )}
                          </CardContent>
                        </CardActionArea>
                        <Divider />
                        <CardActions
                          sx={{justifyContent: "space-between", px: 1.5, py: 1}}
                        >
                          <Chip
                            label={
                              unitCounts[system.id] !== undefined
                                ? `${unitCounts[system.id]} Units`
                                : "... Units"
                            }
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{
                              fontWeight: 700,
                              bgcolor: (theme) =>
                                theme.palette.mode === "dark"
                                  ? "rgba(0, 209, 255, 0.1)"
                                  : "rgba(124, 58, 237, 0.1)",
                            }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {system.createdAt
                              ? new Date(system.createdAt).toLocaleDateString()
                              : "No date"}
                          </Typography>
                        </CardActions>
                      </Card>
                    </Box>
                  ))}
                </Box>
              </Box>

              <Box sx={{minWidth: 0}}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 2,
                    position: {xs: "static", lg: "sticky"},
                    top: {lg: 100},
                  }}
                >
                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    Quick Stats
                  </Typography>
                  <Stack spacing={2} sx={{mt: 2}}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Total Systems
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {systems.length}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Account Status
                      </Typography>
                      <Chip
                        label="Active"
                        color="success"
                        size="small"
                        variant="outlined"
                        sx={{fontWeight: 600}}
                      />
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Last Updated
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        Just now
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Box>
            </Box>
          ) : (
            <Paper
              variant="outlined"
              sx={{p: 3, textAlign: "center", bgcolor: "background.paper"}}
            >
              <Typography color="text.secondary">
                No systems found. Click "Add System" to create your first
                system.
              </Typography>
            </Paper>
          )}
        </>
      )}

      {activeView === "units" && (
        <>
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Button
              variant="contained"
              sx={{fontWeight: 700}}
              onClick={() => navigate("/units/provision")}
            >
              Provision Unit
            </Button>
          </Box>

          {loading ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                py: 8,
              }}
            >
              <CircularProgress size={32} sx={{mb: 2}} />
              <Typography color="text.secondary">Fetching units...</Typography>
            </Box>
          ) : unitsError ? (
            <Box
              sx={{
                p: 3,
                bgcolor: "error.main",
                color: "error.contrastText",
                borderRadius: 2,
              }}
            >
              <Typography>Error loading units: {unitsError}</Typography>
            </Box>
          ) : units.length > 0 ? (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "1fr 1fr",
                  xl: "1fr 1fr 1fr",
                },
                gap: 2,
              }}
            >
              {units.map((unit) => (
                <Paper
                  key={unit.id}
                  variant="outlined"
                  onClick={() => navigate(`/units/${unit.id}`)}
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    cursor: "pointer",
                    transition:
                      "border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease",
                    "&:hover": {
                      borderColor: "primary.main",
                      boxShadow: (theme) => theme.shadows[2],
                      transform: "translateY(-1px)",
                    },
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    fontWeight="bold"
                    gutterBottom
                  >
                    {unit.name || "Unnamed unit"}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{display: "block", fontFamily: "monospace", mb: 1}}
                  >
                    ID: {unit.id}
                  </Typography>
                  <Box sx={{display: "flex", flexWrap: "wrap", gap: 1}}>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={
                        unit.systemId
                          ? `System: ${unit.systemId}`
                          : "Unassigned"
                      }
                    />
                    {unit.imei && (
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`IMEI: ${unit.imei}`}
                      />
                    )}
                    {unit.nfcId && (
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`NFC: ${unit.nfcId}`}
                      />
                    )}
                  </Box>
                </Paper>
              ))}
            </Box>
          ) : (
            <Paper
              variant="outlined"
              sx={{p: 3, textAlign: "center", bgcolor: "background.paper"}}
            >
              <Typography color="text.secondary">No units found.</Typography>
            </Paper>
          )}
        </>
      )}

      {activeView === "alarms" && (
        <>
          {alarmsLoading ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                py: 8,
              }}
            >
              <CircularProgress size={32} sx={{mb: 2}} />
              <Typography color="text.secondary">Fetching alarms...</Typography>
            </Box>
          ) : alarmsError ? (
            <Box
              sx={{
                p: 3,
                bgcolor: "error.main",
                color: "error.contrastText",
                borderRadius: 2,
              }}
            >
              <Typography>Error loading alarms: {alarmsError}</Typography>
            </Box>
          ) : alarmRules.length > 0 ? (
            <Box sx={{display: "flex", flexDirection: "column", gap: 1.5}}>
              {alarmRules.map((alarm) => (
                <Paper
                  key={alarm.id}
                  variant="outlined"
                  onClick={() =>
                    navigate(
                      `/systems/${units.find((u) => u.id === alarm.unitId)?.systemId}/alarms/${alarm.id}`,
                    )
                  }
                  sx={{
                    p: 2,
                    borderRadius: 2,
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
                    <Typography variant="subtitle1" fontWeight="bold">
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
                    sx={{mt: 0.5}}
                  >
                    Unit: {getUnitName(alarm.unitId)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Triggers when {alarm.measurementType} reaches{" "}
                    {alarm.threshold}
                  </Typography>
                </Paper>
              ))}
            </Box>
          ) : (
            <Paper
              variant="outlined"
              sx={{p: 3, textAlign: "center", bgcolor: "background.paper"}}
            >
              <Typography color="text.secondary">No alarms found.</Typography>
            </Paper>
          )}
        </>
      )}

      {activeView === "settings" && (
        <Paper
          variant="outlined"
          sx={{p: 3, textAlign: "center", borderStyle: "dashed"}}
        >
          <Typography variant="h6" gutterBottom>
            Settings
          </Typography>
          <Typography color="text.secondary">
            Dashboard settings will be available here.
          </Typography>
        </Paper>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        PaperProps={{
          sx: {
            minWidth: 140,
            "& .MuiMenuItem-root": {
              minHeight: 34,
              py: 0.5,
              px: 1.25,
            },
          },
        }}
      >
        <MenuItem onClick={handleEdit}>Edit</MenuItem>
        <MenuItem onClick={handleDeleteRequest} sx={{color: "error.main"}}>
          Delete
        </MenuItem>
      </Menu>

      <Dialog
        open={addAlarmDialogOpen}
        onClose={handleCloseAddAlarmDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Create alarm</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
            Create a new alarm rule from the dashboard.
          </Typography>

          <Box component="form" id="dashboard-create-alarm-form" onSubmit={handleCreateAlarm}>
            <Stack spacing={2}>
              <TextField
                select
                label="Unit"
                value={addAlarmUnitId}
                onChange={(e) => setAddAlarmUnitId(e.target.value)}
                required
                disabled={addAlarmSubmitting || units.length === 0}
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
                value={addAlarmName}
                onChange={(e) => setAddAlarmName(e.target.value)}
                required
                disabled={addAlarmSubmitting || units.length === 0}
                fullWidth
              />

              <TextField
                label="Measurement type"
                placeholder="e.g. temperature"
                value={addAlarmMeasurementType}
                onChange={(e) => setAddAlarmMeasurementType(e.target.value)}
                required
                disabled={addAlarmSubmitting || units.length === 0}
                fullWidth
              />

              <TextField
                select
                label="Condition"
                value={addAlarmCondition}
                onChange={(e) =>
                  setAddAlarmCondition(Number(e.target.value) as AlarmCondition)
                }
                required
                disabled={addAlarmSubmitting || units.length === 0}
                fullWidth
              >
                <MenuItem value={0}>Below</MenuItem>
                <MenuItem value={1}>Above</MenuItem>
                <MenuItem value={2}>Equal</MenuItem>
              </TextField>

              <TextField
                label="Threshold"
                type="number"
                value={addAlarmThreshold}
                onChange={(e) => setAddAlarmThreshold(e.target.value)}
                required
                disabled={addAlarmSubmitting || units.length === 0}
                fullWidth
              />

              <TextField
                label="Cooldown minutes"
                type="number"
                value={addAlarmCooldownMinutes}
                onChange={(e) => setAddAlarmCooldownMinutes(e.target.value)}
                required
                disabled={addAlarmSubmitting || units.length === 0}
                inputProps={{min: 0, step: 1}}
                fullWidth
              />

              {addAlarmError && (
                <Typography variant="body2" color="error">
                  {addAlarmError}
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
        <DialogActions sx={{p: 2}}>
          <Button onClick={handleCloseAddAlarmDialog} disabled={addAlarmSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="dashboard-create-alarm-form"
            variant="contained"
            disabled={addAlarmSubmitting || units.length === 0}
          >
            {addAlarmSubmitting ? "Creating..." : "Create alarm"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={addSystemDialogOpen}
        onClose={handleCloseAddSystemDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Add system</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{pt: 0.5}}>
            <TextField
              autoFocus
              label="System name"
              value={newSystemName}
              onChange={(e) => setNewSystemName(e.target.value)}
              size="small"
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={newSystemDescription}
              onChange={(e) => setNewSystemDescription(e.target.value)}
              size="small"
              fullWidth
              multiline
              minRows={2}
            />
            {addSystemError && (
              <Typography variant="body2" color="error">
                {addSystemError}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{p: 2}}>
          <Button onClick={handleCloseAddSystemDialog} disabled={addSystemSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateSystem}
            variant="contained"
            disabled={addSystemSubmitting}
          >
            {addSystemSubmitting ? "Adding..." : "Add system"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
      >
        <DialogTitle>Delete system?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This action cannot be undone. All data associated with this system
            will be permanently removed.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{p: 2}}>
          <Button
            onClick={() => setConfirmDeleteId(null)}
            disabled={deletingId !== null}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            disabled={deletingId !== null}
          >
            {deletingId ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={provisioningDialogOpen}
        onClose={() => setProvisioningDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogContent sx={{p: 0}}>
          <ProvisionUnit embedded />
        </DialogContent>
      </Dialog>

      <Drawer
        anchor="right"
        open={unitOverviewOpen}
        onClose={handleCloseUnitOverview}
        sx={{
          "& .MuiDrawer-paper": {
            width: {xs: "100vw", sm: "40vw"},
            maxWidth: {sm: 720},
            top: {xs: 56, sm: 64},
            height: {xs: "calc(100% - 56px)", sm: "calc(100% - 64px)"},
          },
        }}
      >
        <Box sx={{p: 2, display: "flex", flexDirection: "column", height: "100%"}}>
          <Box sx={{display: "flex", justifyContent: "flex-end", mb: 1}}>
            <IconButton onClick={handleCloseUnitOverview} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {unitOverviewLoading && !selectedOverviewUnit ? (
            <Box sx={{display: "flex", justifyContent: "center", py: 4}}>
              <CircularProgress size={24} />
            </Box>
          ) : unitOverviewError && !selectedOverviewUnit ? (
            <Typography color="error">{unitOverviewError}</Typography>
          ) : selectedOverviewUnit ? (
            <>
              <AppBreadcrumbs
                items={[
                  {label: "Systems", to: "/"},
                  ...(selectedOverviewUnit.systemId
                    ? [
                        {
                          label: getSystemNameForUnit(selectedOverviewUnit.systemId),
                          to: `/systems/${selectedOverviewUnit.systemId}`,
                        },
                        {
                          label: "Units",
                          to: `/systems/${selectedOverviewUnit.systemId}?tab=units`,
                        },
                      ]
                    : [{label: "Units"}]),
                  {label: selectedOverviewUnit.name || "Unit"},
                ]}
                sx={{mb: 2, ml: 0}}
              />

              <Box sx={{mb: 3, px: {xs: 1, md: 0}}}>
                <Typography
                  variant="h4"
                  fontWeight="800"
                  sx={{
                    mb: 1,
                    background: (theme) =>
                      `linear-gradient(135deg, ${theme.palette.text.primary} 0%, ${theme.palette.primary.main} 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {selectedOverviewUnit.name || "Unnamed unit"}
                </Typography>

                <Box sx={{display: "flex", flexWrap: "wrap", gap: 1, mb: 2}}>
                  {selectedOverviewUnit.uptimeMs != null && (
                    <Chip
                      icon={<RestartAltIcon sx={{fontSize: "0.9rem !important"}} />}
                      label={`Up ${formatUptime(selectedOverviewUnit.uptimeMs)}`}
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{fontWeight: 700, fontSize: "0.7rem"}}
                    />
                  )}
                  {selectedOverviewUnit.batteryMv != null &&
                    (() => {
                      const level = getBatteryLevel(selectedOverviewUnit.batteryMv as number);
                      const BatteryIcon = getBatteryIcon(level);
                      const color = getBatteryColor(level);
                      return (
                        <Chip
                          icon={<BatteryIcon sx={{fontSize: "0.9rem !important"}} />}
                          label={`${level}% (${((selectedOverviewUnit.batteryMv as number) / 1000).toFixed(2)}V)`}
                          size="small"
                          color={color}
                          variant="outlined"
                          sx={{fontWeight: 700, fontSize: "0.7rem"}}
                        />
                      );
                    })()}
                  {getBatteryForecastLabel(selectedOverviewUnit) && (
                    <Chip
                      label={getBatteryForecastLabel(selectedOverviewUnit) as string}
                      size="small"
                      color={getBatteryForecastColor(selectedOverviewUnit)}
                      variant="outlined"
                      sx={{fontWeight: 700, fontSize: "0.7rem"}}
                    />
                  )}
                  {selectedOverviewUnit.batteryForecastStatus === "ok" &&
                    selectedOverviewUnit.batteryForecastConfidence != null && (
                      <Chip
                        label={`Confidence ${Math.round(selectedOverviewUnit.batteryForecastConfidence * 100)}%`}
                        size="small"
                        variant="outlined"
                        sx={{fontWeight: 700, fontSize: "0.7rem"}}
                      />
                    )}
                </Box>

                <Paper
                  elevation={0}
                  sx={{
                    mx: -2,
                    border: 1,
                    borderColor: "divider",
                    borderLeft: 0,
                    borderRight: 0,
                    borderRadius: 0,
                    bgcolor: "background.paper",
                    overflow: "hidden",
                  }}
                >
                  <Tabs
                    value={activeUnitOverviewTab}
                    onChange={(_event, newValue: UnitOverviewTab) => setActiveUnitOverviewTab(newValue)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                      px: 0,
                      "& .MuiTab-root:hover": {
                        bgcolor: "action.hover",
                      },
                    }}
                  >
                    <Tab value="overview" label="Overview" />
                    <Tab value="telemetry" label="Telemetry" />
                    <Tab value="alarms" label="Alarms" />
                    <Tab value="settings" label="Settings" />
                    <Tab value="firmware" label="Firmware" />
                  </Tabs>
                </Paper>
              </Box>

              {unitOverviewError && (
                <Typography color="error" sx={{mb: 2}}>
                  {unitOverviewError}
                </Typography>
              )}

              <Box sx={{display: "flex", flexDirection: "column", gap: 1.5, mb: 2, flex: 1, overflowY: "auto", pt: 1}}>
                {activeUnitOverviewTab === "overview" ? (
                  <>
                    <Box>
                      <Typography variant="caption" color="primary" sx={{fontWeight: "bold"}}>
                        ID
                      </Typography>
                      <Typography variant="body2" sx={{fontFamily: "monospace", wordBreak: "break-all"}}>
                        {selectedOverviewUnit.id}
                      </Typography>
                    </Box>

                    {selectedOverviewUnit.name && (
                      <Box>
                        <Typography variant="caption" color="primary" sx={{fontWeight: "bold"}}>
                          Name
                        </Typography>
                        <Typography variant="body2">{selectedOverviewUnit.name}</Typography>
                      </Box>
                    )}

                    {selectedOverviewUnit.imei && (
                      <Box>
                        <Typography variant="caption" color="primary" sx={{fontWeight: "bold"}}>
                          IMEI
                        </Typography>
                        <Typography variant="body2" sx={{fontFamily: "monospace"}}>
                          {selectedOverviewUnit.imei}
                        </Typography>
                      </Box>
                    )}

                    {selectedOverviewUnit.macAddress && (
                      <Box>
                        <Typography variant="caption" color="primary" sx={{fontWeight: "bold"}}>
                          MAC Address
                        </Typography>
                        <Typography variant="body2" sx={{fontFamily: "monospace"}}>
                          {selectedOverviewUnit.macAddress}
                        </Typography>
                      </Box>
                    )}

                    {selectedOverviewUnit.ipAddress && (
                      <Box>
                        <Typography variant="caption" color="primary" sx={{fontWeight: "bold"}}>
                          IP Address
                        </Typography>
                        <Typography variant="body2" sx={{fontFamily: "monospace"}}>
                          {selectedOverviewUnit.ipAddress}
                        </Typography>
                      </Box>
                    )}

                    {selectedOverviewUnit.nfcId && (
                      <Box>
                        <Typography variant="caption" color="primary" sx={{fontWeight: "bold"}}>
                          NFC ID
                        </Typography>
                        <Typography variant="body2" sx={{fontFamily: "monospace"}}>
                          {selectedOverviewUnit.nfcId}
                        </Typography>
                      </Box>
                    )}

                    {selectedOverviewUnit.lastProvisionedAt && (
                      <Box>
                        <Typography variant="caption" color="primary" sx={{fontWeight: "bold"}}>
                          Last Provisioned
                        </Typography>
                        <Typography variant="body2">
                          {new Date(selectedOverviewUnit.lastProvisionedAt).toLocaleString()}
                        </Typography>
                      </Box>
                    )}

                    {selectedOverviewUnit.systemId && (
                      <Box>
                        <Typography variant="caption" color="primary" sx={{fontWeight: "bold"}}>
                          System
                        </Typography>
                        <Typography variant="body2">
                          {getSystemNameForUnit(selectedOverviewUnit.systemId)}
                        </Typography>
                        <Typography variant="body2" sx={{fontFamily: "monospace", color: "text.secondary"}}>
                          {selectedOverviewUnit.systemId}
                        </Typography>
                      </Box>
                    )}

                    {(selectedOverviewUnit.payloadIntervalS != null ||
                      selectedOverviewUnit.gnssRequestIntervalS != null) && (
                      <Box>
                        <Typography variant="caption" color="primary" sx={{fontWeight: "bold"}}>
                          Update Frequency
                        </Typography>
                        {selectedOverviewUnit.payloadIntervalS != null && (
                          <Typography variant="body2">
                            Payload: every {selectedOverviewUnit.payloadIntervalS}s
                          </Typography>
                        )}
                        {selectedOverviewUnit.gnssRequestIntervalS != null && (
                          <Typography variant="body2">
                            GNSS: {selectedOverviewUnit.gnssRequestIntervalS === 0
                              ? "disabled"
                              : `every ${selectedOverviewUnit.gnssRequestIntervalS}s`}
                          </Typography>
                        )}
                      </Box>
                    )}

                    {selectedOverviewUnit.batteryForecastStatus && (
                      <Box>
                        <Typography variant="caption" color="primary" sx={{fontWeight: "bold"}}>
                          Battery Life Forecast
                        </Typography>
                        <Typography variant="body2">
                          {getBatteryForecastLabel(selectedOverviewUnit)}
                        </Typography>
                        {selectedOverviewUnit.batteryForecastStatus === "ok" &&
                          selectedOverviewUnit.batteryDischargeRatePctPerHour != null && (
                            <Typography variant="body2" color="text.secondary">
                              Discharge rate: {selectedOverviewUnit.batteryDischargeRatePctPerHour.toFixed(3)}%/h
                            </Typography>
                          )}
                        {selectedOverviewUnit.batteryForecastStatus === "ok" &&
                          selectedOverviewUnit.batteryForecastConfidence != null && (
                            <Typography variant="body2" color="text.secondary">
                              Confidence: {Math.round(selectedOverviewUnit.batteryForecastConfidence * 100)}%
                            </Typography>
                          )}
                        {selectedOverviewUnit.batteryForecastEstimatedAt && (
                          <Typography variant="body2" color="text.secondary">
                            Updated: {new Date(selectedOverviewUnit.batteryForecastEstimatedAt).toLocaleString()}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </>
                ) : (
                  <Paper
                    variant="outlined"
                    sx={{p: 3, textAlign: "center", borderStyle: "dashed"}}
                  >
                    <Typography color="text.secondary">
                      {activeUnitOverviewTab.charAt(0).toUpperCase() + activeUnitOverviewTab.slice(1)} content will be shown here.
                    </Typography>
                  </Paper>
                )}
              </Box>

              <Button
                variant="contained"
                onClick={() => navigate(`/units/${selectedOverviewUnit.id}`)}
                sx={{fontWeight: 700}}
              >
                Open Unit Details
              </Button>
            </>
          ) : null}
        </Box>
      </Drawer>
    </Box>
  );
};

export default Dashboard;
