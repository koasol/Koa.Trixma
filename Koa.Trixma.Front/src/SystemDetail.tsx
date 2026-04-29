import React, {useEffect, useState} from "react";
import {useParams, useNavigate} from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
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
import {trixma, type System, type Unit} from "./trixma";

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
        sx={{mb: 4, ml: {xs: 1, md: 0}}}
      >
        Back to Dashboard
      </Button>

      <Paper
        elevation={0}
        sx={{
          p: {xs: 2, md: 3},
          border: 1,
          borderColor: "divider",
          borderRadius: 4,
          bgcolor: "background.paper",
          mb: 4,
        }}
      >
        <Typography
          variant="h4"
          gutterBottom
          fontWeight="800"
          sx={{
            background: (theme) =>
              `linear-gradient(135deg, ${theme.palette.text.primary} 0%, ${theme.palette.primary.main} 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {system.name}
        </Typography>
        <Typography
          variant="caption"
          display="block"
          color="text.secondary"
          sx={{fontFamily: "monospace", mb: system.description ? 3 : 0}}
        >
          ID: {system.id} • Created on{" "}
          {system.createdAt || system.created_at
            ? new Date(
                (system.createdAt || system.created_at)!,
              ).toLocaleString()
            : "N/A"}
        </Typography>

        {system.description && (
          <Box>
            <Typography
              variant="subtitle2"
              color="primary"
              gutterBottom
              sx={{
                borderBottom: 1,
                borderColor: "divider",
                pb: 0.5,
                fontWeight: "bold",
              }}
            >
              Description
            </Typography>
            <Typography variant="body2" sx={{lineHeight: 1.6}}>
              {system.description}
            </Typography>
          </Box>
        )}
      </Paper>

      <Box sx={{minWidth: 0}}>
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
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{borderRadius: 3, width: "100%", overflowX: "auto"}}
          >
            <Table size="medium" sx={{minWidth: 700}}>
              <TableHead sx={{bgcolor: "background.paper"}}>
                <TableRow>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      textTransform: "uppercase",
                      fontSize: "0.75rem",
                    }}
                  >
                    Name
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      textTransform: "uppercase",
                      fontSize: "0.75rem",
                    }}
                  >
                    ID
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      textTransform: "uppercase",
                      fontSize: "0.75rem",
                    }}
                  >
                    Uptime
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      textTransform: "uppercase",
                      fontSize: "0.75rem",
                    }}
                  >
                    Battery
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: "bold",
                      textTransform: "uppercase",
                      fontSize: "0.75rem",
                    }}
                  >
                    Menu
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {units.map((unit) => (
                  <TableRow
                    key={unit.id}
                    hover
                    onClick={() => navigate(`/units/${unit.id}`)}
                    sx={{cursor: "pointer"}}
                  >
                    <TableCell sx={{fontWeight: "bold"}}>{unit.name}</TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
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
                        <Typography variant="body2" color="text.secondary">
                          N/A
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
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
                        <Typography variant="body2" color="text.secondary">
                          N/A
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(event) => handleMenuOpen(event, unit)}
                        aria-label={`Open menu for ${unit.name}`}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Menu
              anchorEl={menuAnchorEl}
              open={Boolean(menuAnchorEl)}
              onClose={handleMenuClose}
              onClick={(event) => event.stopPropagation()}
            >
              <MenuItem onClick={handleMenuClose}>
                <ListItemIcon>
                  <EditIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>{`Edit unit${menuUnit ? ` (${menuUnit.name})` : ""}`}</ListItemText>
              </MenuItem>
              <MenuItem onClick={handleMenuClose}>
                <ListItemIcon>
                  <DeleteIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>{`Delete unit${menuUnit ? ` (${menuUnit.name})` : ""}`}</ListItemText>
              </MenuItem>
            </Menu>
          </TableContainer>
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
      </Box>
    </Box>
  );
};

export default SystemDetail;
