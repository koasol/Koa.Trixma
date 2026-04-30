import React, {useEffect, useState} from "react";
import {useParams, useNavigate} from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Storage as StorageIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  RestartAlt as RestartAltIcon,
  Battery20 as Battery20Icon,
  Battery30 as Battery30Icon,
  Battery50 as Battery50Icon,
  Battery80 as Battery80Icon,
  BatteryFull as BatteryFullIcon,
  BatteryAlert as BatteryAlertIcon,
} from "@mui/icons-material";
import {trixma, type System, type Unit} from "./api";

const SystemDetail: React.FC = () => {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const [system, setSystem] = useState<System | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuUnit, setMenuUnit] = useState<Unit | null>(null);
  const [confirmDeleteUnitId, setConfirmDeleteUnitId] = useState<string | null>(
    null,
  );
  const [deletingUnitId, setDeletingUnitId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"units" | "events" | "settings">(
    "units",
  );

  useEffect(() => {
    const fetchSystemDetail = async () => {
      try {
        setLoading(true);
        const {data, error} = await trixma.getSystemById(id!);

        if (error) throw new Error(error);
        setSystem(data);

        // After system is fetched, fetch units
        await fetchUnits();
      } catch (err: unknown) {
        console.error("Error fetching system details:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred",
        );
      } finally {
        setLoading(false);
      }
    };

    const fetchUnits = async () => {
      try {
        setUnitsLoading(true);
        const {data, error} = await trixma.getUnitsBySystemId(id!);

        if (error) throw new Error(error);
        setUnits(data || []);
      } catch (err: unknown) {
        console.error("Error fetching units:", err);
        // We don't necessarily want to block the whole page if units fail
      } finally {
        setUnitsLoading(false);
      }
    };

    if (id) {
      fetchSystemDetail();
    }
  }, [id]);

  if (loading) {
    return (
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
          Loading system details...
        </Typography>
      </Box>
    );
  }

  if (error || !system) {
    return (
      <Box sx={{textAlign: "center", py: 8}}>
        <Typography color="error" gutterBottom>
          Error: {error || "System not found"}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/")}
        >
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  const formatUptime = (ms: number): string => {
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
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

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, unit: Unit) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setMenuUnit(unit);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuUnit(null);
  };

  const handleDeleteRequest = () => {
    if (menuUnit) {
      setConfirmDeleteUnitId(menuUnit.id);
    }
    handleMenuClose();
  };

  const handleEditUnit = () => {
    if (menuUnit) {
      navigate(`/units/${menuUnit.id}/edit`);
    }
    handleMenuClose();
  };

  const confirmDeleteUnit = async () => {
    if (!confirmDeleteUnitId) return;
    try {
      setDeletingUnitId(confirmDeleteUnitId);
      const {error: delError} = await trixma.deleteUnit(confirmDeleteUnitId);
      if (delError) throw new Error(delError);
      setUnits((prev) => prev.filter((u) => u.id !== confirmDeleteUnitId));
    } catch (err: unknown) {
      console.error("Error deleting unit:", err);
      setError(err instanceof Error ? err.message : "Failed to delete unit");
    } finally {
      setDeletingUnitId(null);
      setConfirmDeleteUnitId(null);
    }
  };

  const handleTabChange = (
    _event: React.SyntheticEvent,
    newValue: "units" | "events" | "settings",
  ) => {
    setActiveTab(newValue);
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1000,
        mx: "auto",
        px: {xs: 1, sm: 2, md: 0},
      }}
    >
      <Button
        variant="outlined"
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate("/")}
        sx={{mb: 2, ml: {xs: 1, md: 0}}}
      >
        Back to Dashboard
      </Button>

      <Box sx={{mb: 2.5, px: {xs: 1, md: 0}}}>
        <Typography
          variant="h5"
          fontWeight="800"
          sx={{
            background: (theme) =>
              `linear-gradient(135deg, ${theme.palette.text.primary} 0%, ${theme.palette.primary.main} 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            mb: 0.5,
          }}
        >
          {system.name}
        </Typography>
        <Typography
          variant="caption"
          display="block"
          color="text.secondary"
          sx={{fontFamily: "monospace", mb: system.description ? 1 : 0}}
        >
          ID: {system.id} • Created on{" "}
          {system.createdAt
            ? new Date(system.createdAt).toLocaleString()
            : "N/A"}
        </Typography>

        {system.description && (
          <Box>
            <Typography
              variant="caption"
              color="primary"
              sx={{fontWeight: "bold", opacity: 0.9}}
            >
              Description
            </Typography>
            <Typography variant="body2" sx={{lineHeight: 1.45}}>
              {system.description}
            </Typography>
          </Box>
        )}
      </Box>

      <Paper
        elevation={0}
        sx={{
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          bgcolor: "background.paper",
          mb: 3,
          overflow: "hidden",
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{px: {xs: 1, sm: 2}}}
        >
          <Tab value="units" label="Units" />
          <Tab value="events" label="Events" />
          <Tab value="settings" label="Settings" />
        </Tabs>
      </Paper>

      <Box sx={{minWidth: 0}}>
        {activeTab === "units" && (
          <>
            <Typography
              variant="h5"
              gutterBottom
              fontWeight="bold"
              sx={{
                color: "primary.main",
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <StorageIcon /> System Units
            </Typography>

            {unitsLoading ? (
              <Paper
                variant="outlined"
                sx={{p: 4, textAlign: "center", bgcolor: "background.paper"}}
              >
                <CircularProgress size={24} sx={{mb: 1}} />
                <Typography variant="body2" color="text.secondary">
                  Fetching units...
                </Typography>
              </Paper>
            ) : units.length > 0 ? (
              <Box
                sx={{
                  display: "grid",
                  gap: 2,
                  gridTemplateColumns: "1fr",
                  "@media (min-width:500px)": {
                    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  },
                }}
              >
                {units.map((unit) => (
                  <Paper
                    key={unit.id}
                    variant="outlined"
                    onClick={() => navigate(`/units/${unit.id}`)}
                    sx={{
                      p: {xs: 2, sm: 2.5},
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
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 1,
                      }}
                    >
                      <Typography
                        variant="h6"
                        sx={{fontWeight: 700, lineHeight: 1.2}}
                      >
                        {unit.name || "Unnamed unit"}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={(event) => handleMenuOpen(event, unit)}
                        aria-label={`Open menu for ${unit.name || "Unnamed unit"}`}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Box>

                    <Box
                      sx={{display: "flex", flexWrap: "wrap", gap: 1, mt: 1.5}}
                    >
                      <Chip
                        label={unit.id}
                        size="small"
                        variant="outlined"
                        sx={{
                          fontFamily: "monospace",
                          fontSize: "0.75rem",
                          color: "primary.main",
                          borderColor: (theme) =>
                            theme.palette.mode === "dark"
                              ? "rgba(0, 209, 255, 0.2)"
                              : "rgba(124, 58, 237, 0.2)",
                          bgcolor: (theme) =>
                            theme.palette.mode === "dark"
                              ? "rgba(0, 209, 255, 0.1)"
                              : "rgba(124, 58, 237, 0.1)",
                        }}
                      />

                      {unit.uptimeMs != null ? (
                        <Chip
                          icon={
                            <RestartAltIcon
                              sx={{fontSize: "0.9rem !important"}}
                            />
                          }
                          label={`Up ${formatUptime(unit.uptimeMs)}`}
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{fontWeight: 700, fontSize: "0.7rem"}}
                        />
                      ) : (
                        <Chip
                          label="Uptime: N/A"
                          size="small"
                          variant="outlined"
                          sx={{fontWeight: 600, fontSize: "0.7rem"}}
                        />
                      )}

                      {unit.batteryMv != null ? (
                        (() => {
                          const level = getBatteryLevel(unit.batteryMv);
                          const BatteryIcon = getBatteryIcon(level);
                          const color = getBatteryColor(level);
                          return (
                            <Chip
                              icon={
                                <BatteryIcon
                                  sx={{fontSize: "0.9rem !important"}}
                                />
                              }
                              label={`${level}% (${(unit.batteryMv / 1000).toFixed(2)}V)`}
                              size="small"
                              color={color}
                              variant="outlined"
                              sx={{fontWeight: 700, fontSize: "0.7rem"}}
                            />
                          );
                        })()
                      ) : (
                        <Chip
                          label="Battery: N/A"
                          size="small"
                          variant="outlined"
                          sx={{fontWeight: 600, fontSize: "0.7rem"}}
                        />
                      )}
                    </Box>
                  </Paper>
                ))}
                <Menu
                  anchorEl={menuAnchorEl}
                  open={Boolean(menuAnchorEl)}
                  onClose={handleMenuClose}
                  onClick={(event) => event.stopPropagation()}
                >
                  <MenuItem onClick={handleEditUnit}>
                    <ListItemIcon>
                      <EditIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{`Edit unit${menuUnit ? ` (${menuUnit.name})` : ""}`}</ListItemText>
                  </MenuItem>
                  <MenuItem
                    onClick={handleDeleteRequest}
                    sx={{color: "error.main"}}
                  >
                    <ListItemIcon>
                      <DeleteIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{`Delete unit${menuUnit ? ` (${menuUnit.name})` : ""}`}</ListItemText>
                  </MenuItem>
                </Menu>

                <Dialog
                  open={confirmDeleteUnitId !== null}
                  onClose={() => setConfirmDeleteUnitId(null)}
                >
                  <DialogTitle>Delete unit?</DialogTitle>
                  <DialogContent>
                    <DialogContentText>
                      This action cannot be undone. The selected unit will be
                      permanently removed.
                    </DialogContentText>
                  </DialogContent>
                  <DialogActions sx={{p: 2}}>
                    <Button
                      onClick={() => setConfirmDeleteUnitId(null)}
                      disabled={deletingUnitId !== null}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={confirmDeleteUnit}
                      color="error"
                      variant="contained"
                      disabled={deletingUnitId !== null}
                    >
                      {deletingUnitId ? "Deleting..." : "Delete"}
                    </Button>
                  </DialogActions>
                </Dialog>
              </Box>
            ) : (
              <Paper
                variant="outlined"
                sx={{p: 4, textAlign: "center", borderStyle: "dashed"}}
              >
                <Typography color="text.secondary">
                  No units found for this system.
                </Typography>
              </Paper>
            )}
          </>
        )}

        {activeTab === "events" && (
          <Paper
            variant="outlined"
            sx={{p: 4, textAlign: "center", borderStyle: "dashed"}}
          >
            <Typography variant="h6" gutterBottom>
              Events
            </Typography>
            <Typography color="text.secondary">
              Event history will be available here.
            </Typography>
          </Paper>
        )}

        {activeTab === "settings" && (
          <Paper
            variant="outlined"
            sx={{p: 4, textAlign: "center", borderStyle: "dashed"}}
          >
            <Typography variant="h6" gutterBottom>
              Settings
            </Typography>
            <Typography color="text.secondary">
              System settings will be available here.
            </Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default SystemDetail;
