import React, {useEffect, useState} from "react";
import {Link as RouterLink, useNavigate} from "react-router-dom";
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
  Tabs,
  Tab,
} from "@mui/material";
import {Add as AddIcon, MoreHoriz as MoreIcon} from "@mui/icons-material";
import {trixma, type System, type Unit} from "./api";
import {type User} from "firebase/auth";

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({user}) => {
  const navigate = useNavigate();
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
  const [activeTab, setActiveTab] = useState<"systems" | "units" | "settings">(
    "systems",
  );

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

  const handleTabChange = (
    _event: React.SyntheticEvent,
    newValue: "systems" | "units" | "settings",
  ) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{width: "100%", maxWidth: 1200, mx: "auto"}}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Typography variant="h4" component="h1" fontWeight="800">
          Dashboard
        </Typography>
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
          <Tab value="systems" label="Systems" />
          <Tab value="units" label="Units" />
          <Tab value="settings" label="Settings" />
        </Tabs>
      </Paper>

      {activeTab === "systems" && (
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

      {activeTab === "units" && (
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

      {activeTab === "settings" && (
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
