import React, {useEffect, useMemo, useState} from "react";
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
} from "@mui/material";
import {Add as AddIcon, MoreHoriz as MoreIcon} from "@mui/icons-material";
import {trixma, type System, type Unit} from "./api";
import {type User} from "firebase/auth";

interface DashboardProps {
  user: User;
}

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
  const [alarmsLoading, setAlarmsLoading] = useState(false);
  const [alarmsError, setAlarmsError] = useState<string | null>(null);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<
    "1h" | "3h" | "6h" | "24h" | "7d" | "30d"
  >("24h");
  const [selectedSystemId, setSelectedSystemId] = useState<
    string | number | null
  >(null);

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

  useEffect(() => {
    const fetchAlarms = async () => {
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
    };

    void fetchAlarms();
  }, [activeView, units]);

  const getUnitName = (unitId: string) => {
    const unit = units.find((u) => u.id === unitId);
    return unit?.name || unitId;
  };

  const filteredUnits = useMemo(() => {
    if (!selectedSystemId) return units;
    return units.filter((u) => u.systemId === selectedSystemId);
  }, [units, selectedSystemId]);

  return (
    <Box sx={{width: "100%"}}>
      {activeView === "overview" && (
        <Box>
          {/* Top Content - Constrained Width */}
          <Box sx={{maxWidth: 1200, mx: "auto", px: 2}}>
            {/* Breadcrumbs */}
            <Box sx={{display: "flex", alignItems: "center", gap: 1, mb: 1}}>
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
                mb: 4,
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <Box>
                <Typography
                  variant="h4"
                  component="h1"
                  fontWeight="800"
                  sx={{mb: 0.5}}
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
                },
                gap: 2,
                mb: 4,
              }}
            >
              {/* Active Units */}
              <Paper variant="outlined" sx={{p: 2.5}}>
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
                  sx={{display: "flex", alignItems: "baseline", gap: 1, mt: 1}}
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
                  sx={{mt: 1, display: "block"}}
                >
                  online in last 60s
                </Typography>
              </Paper>

              {/* Open Alarms */}
              <Paper
                variant="outlined"
                sx={{
                  p: 2.5,
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
                  sx={{display: "flex", alignItems: "baseline", gap: 1, mt: 1}}
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
                  sx={{mt: 1, display: "block"}}
                >
                  critical priority
                </Typography>
              </Paper>

              {/* Uptime */}
              <Paper variant="outlined" sx={{p: 2.5}}>
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
                  sx={{display: "flex", alignItems: "baseline", gap: 1, mt: 1}}
                >
                  <Typography variant="h5" fontWeight={700}>
                    99.2%
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{mt: 1, display: "block"}}
                >
                  SLA target 99.0%
                </Typography>
              </Paper>

              {/* Log Entries */}
              <Paper variant="outlined" sx={{p: 2.5}}>
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
                  sx={{display: "flex", alignItems: "baseline", gap: 1, mt: 1}}
                >
                  <Typography variant="h5" fontWeight={700}>
                    1.2K
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{mt: 1, display: "block"}}
                >
                  in {selectedTimePeriod}
                </Typography>
              </Paper>

              {/* Data Points Processed */}
              <Paper variant="outlined" sx={{p: 2.5}}>
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
                  sx={{display: "flex", alignItems: "baseline", gap: 1, mt: 1}}
                >
                  <Typography variant="h5" fontWeight={700}>
                    42.5M
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{mt: 1, display: "block"}}
                >
                  processed today
                </Typography>
              </Paper>

              {/* System Health */}
              <Paper variant="outlined" sx={{p: 2.5}}>
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
                  sx={{display: "flex", alignItems: "baseline", gap: 1, mt: 1}}
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
                  sx={{mt: 1, display: "block"}}
                >
                  all systems operational
                </Typography>
              </Paper>
            </Box>
          </Box>

          {/* Three Column List Section - Full Width */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {xs: "1fr", md: "repeat(3, 1fr)"},
              gap: 3,
              mt: 4,
              px: 2,
            }}
          >
            {/* Systems List */}
            <Paper
              variant="outlined"
              sx={{p: 2.5, display: "flex", flexDirection: "column"}}
            >
              <Typography
                variant="subtitle2"
                fontWeight={700}
                sx={{
                  mb: 2,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Systems
              </Typography>
              <Box sx={{flex: 1, overflowY: "auto", maxHeight: 350}}>
                <Stack spacing={1}>
                  {systems.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No systems found
                    </Typography>
                  ) : (
                    systems.map((system) => (
                      <Box
                        key={system.id}
                        onClick={() => setSelectedSystemId(system.id)}
                        sx={{
                          p: 1.5,
                          border: 1,
                          borderColor:
                            selectedSystemId === system.id
                              ? "primary.main"
                              : "divider",
                          borderRadius: 1,
                          cursor: "pointer",
                          bgcolor:
                            selectedSystemId === system.id
                              ? "action.selected"
                              : "transparent",
                          transition: "all 0.2s",
                          "&:hover": {
                            bgcolor: "action.hover",
                            borderColor: "primary.main",
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
                </Stack>
              </Box>
            </Paper>

            {/* Units List */}
            <Paper
              variant="outlined"
              sx={{p: 2.5, display: "flex", flexDirection: "column"}}
            >
              <Typography
                variant="subtitle2"
                fontWeight={700}
                sx={{
                  mb: 2,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Units {selectedSystemId && `(System)`}
              </Typography>
              <Box sx={{flex: 1, overflowY: "auto", maxHeight: 350}}>
                <Stack spacing={1}>
                  {filteredUnits.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      {selectedSystemId
                        ? "No units in selected system"
                        : "No units found"}
                    </Typography>
                  ) : (
                    filteredUnits.map((unit) => (
                      <Box
                        key={unit.id}
                        onClick={() => navigate(`/units/${unit.id}`)}
                        sx={{
                          p: 1.5,
                          border: 1,
                          borderColor: "divider",
                          borderRadius: 1,
                          cursor: "pointer",
                          transition: "all 0.2s",
                          "&:hover": {
                            bgcolor: "action.hover",
                            borderColor: "primary.main",
                          },
                        }}
                      >
                        <Typography variant="body2" fontWeight={600}>
                          {unit.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {unit.macAddress}
                        </Typography>
                      </Box>
                    ))
                  )}
                </Stack>
              </Box>
            </Paper>

            {/* Alarms List */}
            <Paper
              variant="outlined"
              sx={{p: 2.5, display: "flex", flexDirection: "column"}}
            >
              <Typography
                variant="subtitle2"
                fontWeight={700}
                sx={{
                  mb: 2,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Alarms
              </Typography>
              <Box sx={{flex: 1, overflowY: "auto", maxHeight: 350}}>
                {alarmsLoading ? (
                  <Box sx={{display: "flex", justifyContent: "center", py: 2}}>
                    <CircularProgress size={24} />
                  </Box>
                ) : alarmsError ? (
                  <Typography variant="caption" color="error">
                    {alarmsError}
                  </Typography>
                ) : alarmRules.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No alarms
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {alarmRules.slice(0, 10).map((alarm) => (
                      <Box
                        key={alarm.id}
                        sx={{
                          p: 1.5,
                          border: 1,
                          borderColor: "divider",
                          borderRadius: 1,
                          bgcolor: alarm.enabled
                            ? "transparent"
                            : "action.disabledBackground",
                        }}
                      >
                        <Typography variant="body2" fontWeight={600}>
                          {alarm.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {getUnitName(alarm.unitId)} • {alarm.measurementType}
                        </Typography>
                        <Box sx={{mt: 0.5, display: "flex", gap: 1}}>
                          <Chip
                            label={`${alarm.threshold}`}
                            size="small"
                            variant="outlined"
                          />
                          {!alarm.enabled && (
                            <Chip
                              label="Disabled"
                              size="small"
                              variant="outlined"
                              color="warning"
                            />
                          )}
                        </Box>
                      </Box>
                    ))}
                    {alarmRules.length > 10 && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{textAlign: "center", mt: 1}}
                      >
                        +{alarmRules.length - 10} more
                      </Typography>
                    )}
                  </Stack>
                )}
              </Box>
            </Paper>
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
                gap: 3,
              }}
            >
              <Box sx={{minWidth: 0}}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {xs: "1fr", md: "1fr 1fr"},
                    gap: 3,
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
                          sx={{justifyContent: "space-between", px: 2, py: 1.5}}
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
                    p: 3,
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 3,
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
              sx={{p: 4, textAlign: "center", bgcolor: "background.paper"}}
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
              sx={{p: 4, textAlign: "center", bgcolor: "background.paper"}}
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
              sx={{p: 4, textAlign: "center", bgcolor: "background.paper"}}
            >
              <Typography color="text.secondary">No alarms found.</Typography>
            </Paper>
          )}
        </>
      )}

      {activeView === "settings" && (
        <Paper
          variant="outlined"
          sx={{p: 4, textAlign: "center", borderStyle: "dashed"}}
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
      >
        <MenuItem onClick={handleEdit}>Edit</MenuItem>
        <MenuItem onClick={handleDeleteRequest} sx={{color: "error.main"}}>
          Delete
        </MenuItem>
      </Menu>

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
    </Box>
  );
};

export default Dashboard;
