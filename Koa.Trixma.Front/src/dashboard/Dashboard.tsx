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
  Paper,
  Stack,
  Divider,
  Tooltip,
} from "@mui/material"
import {
  Add as AddIcon,
  MoreHoriz as MoreIcon,
  FilterAltOff as FilterAltOffIcon,
  Memory as MemoryIcon,
  Sensors as SensorsIcon,
} from "@mui/icons-material"
import {trixma, type AlarmCondition, type AlarmEvent, type System, type Unit} from "../api"
import {type User} from "firebase/auth"
import {toast} from "react-toastify"
import AddAlarmDialog from "./dialogs/AddAlarmDialog"
import AddSystemDialog from "./dialogs/AddSystemDialog"
import DeleteSystemDialog from "./dialogs/DeleteSystemDialog"
import ProvisioningDialog from "./dialogs/ProvisioningDialog"
import UnitOverviewDrawer from "./drawers/UnitOverviewDrawer"
import AddUnitDrawer from "../system-detail/AddUnitDrawer"
import {
  getBatteryPercentForUnit,
} from "./utils/batteryUtils"
import { formatUptime, formatTimeAgo } from "./utils/timeUtils"

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
  const [addUnitDrawerOpen, setAddUnitDrawerOpen] = useState(false);
  const [pingingUnitId, setPingingUnitId] = useState<string | null>(null);

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

  const handlePingUnit = async (unitId: string) => {
    if (!unitId || pingingUnitId) return;
    setPingingUnitId(unitId);
    try {
      const {error: pingError} = await trixma.pingUnit(unitId);
      if (pingError) {
        toast.error(pingError, {position: "top-right"});
      } else {
        toast.success("Ping sent", {position: "top-right"});
      }
    } catch {
      toast.error("Failed to ping unit", {position: "top-right"});
    } finally {
      setPingingUnitId(null);
    }
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
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          textAlign: "center",
                          gap: 1.5,
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          No units in the selected system
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => setAddUnitDrawerOpen(true)}
                        >
                          Link unit
                        </Button>
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
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                                minWidth: 0,
                              }}
                            >
                              <Tooltip title="Ping unit">
                                <span>
                                  <IconButton
                                    size="small"
                                    aria-label="Ping unit"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void handlePingUnit(unit.id);
                                    }}
                                    disabled={Boolean(pingingUnitId)}
                                  >
                                    {pingingUnitId === unit.id ? (
                                      <CircularProgress size={14} />
                                    ) : (
                                      <SensorsIcon fontSize="small" />
                                    )}
                                  </IconButton>
                                </span>
                              </Tooltip>
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

      <AddAlarmDialog
        open={addAlarmDialogOpen}
        units={units}
        systems={systems}
        submitting={addAlarmSubmitting}
        error={addAlarmError}
        unitId={addAlarmUnitId}
        name={addAlarmName}
        measurementType={addAlarmMeasurementType}
        condition={addAlarmCondition}
        threshold={addAlarmThreshold}
        cooldownMinutes={addAlarmCooldownMinutes}
        onUnitIdChange={setAddAlarmUnitId}
        onNameChange={setAddAlarmName}
        onMeasurementTypeChange={setAddAlarmMeasurementType}
        onConditionChange={setAddAlarmCondition}
        onThresholdChange={setAddAlarmThreshold}
        onCooldownMinutesChange={setAddAlarmCooldownMinutes}
        onSubmit={handleCreateAlarm}
        onClose={handleCloseAddAlarmDialog}
      />

      <AddSystemDialog
        open={addSystemDialogOpen}
        submitting={addSystemSubmitting}
        error={addSystemError}
        name={newSystemName}
        description={newSystemDescription}
        onNameChange={setNewSystemName}
        onDescriptionChange={setNewSystemDescription}
        onSubmit={handleCreateSystem}
        onClose={handleCloseAddSystemDialog}
      />

      <DeleteSystemDialog
        open={confirmDeleteId !== null}
        deleting={deletingId !== null}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <ProvisioningDialog
        open={provisioningDialogOpen}
        onClose={() => setProvisioningDialogOpen(false)}
      />

      <UnitOverviewDrawer
        open={unitOverviewOpen}
        loading={unitOverviewLoading}
        error={unitOverviewError}
        unit={selectedOverviewUnit}
        activeTab={activeUnitOverviewTab}
        onClose={() => setUnitOverviewOpen(false)}
        onTabChange={setActiveUnitOverviewTab}
        getSystemNameForUnit={getSystemNameForUnit}
      />

      <AddUnitDrawer
        systemId={selectedSystemId as string}
        open={addUnitDrawerOpen}
        allUnits={units}
        allUnitsLoading={loading}
        allUnitsError={error}
        assigningUnitId={null}
        onClose={() => setAddUnitDrawerOpen(false)}
        onOpenUnit={handleOpenUnitOverview}
        onProvisionUnit={() => {
          setAddUnitDrawerOpen(false);
          setProvisioningDialogOpen(true);
        }}
        onAddUnitToSystem={(unit) => {
          if (selectedSystemId) {
            void handleOpenUnitOverview(unit.id);
          }
        }}
      />
    </Box>
  );
};

export default Dashboard;
