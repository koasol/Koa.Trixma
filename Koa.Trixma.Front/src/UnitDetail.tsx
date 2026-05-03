import React, {useEffect, useState} from "react";
import {useParams, useNavigate} from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
  useMediaQuery,
  Drawer,
  IconButton,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Timeline as TimelineIcon,
  RestartAlt as RestartAltIcon,
  Sensors as SensorsIcon,
  Notifications as NotificationsIcon,
  Close as CloseIcon,
  Battery20 as Battery20Icon,
  Battery30 as Battery30Icon,
  Battery50 as Battery50Icon,
  Battery80 as Battery80Icon,
  BatteryFull as BatteryFullIcon,
  BatteryAlert as BatteryAlertIcon,
} from "@mui/icons-material";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  trixma,
  type AlarmCondition,
  type Unit,
  type MeasurementGroup,
  type MeasurementDataPoint,
} from "./api";

const UnitDetail: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const [unit, setUnit] = useState<Unit | null>(null);
  const [groups, setGroups] = useState<MeasurementGroup[]>([]);
  const [period, setPeriod] = useState<string>("24h");
  const [unitLoading, setUnitLoading] = useState(true);
  const [measurementsLoading, setMeasurementsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinging, setPinging] = useState(false);
  const [alarmsDrawerOpen, setAlarmsDrawerOpen] = useState(false);

  // Load unit info once
  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      setUnitLoading(true);
      const {data, error: fetchError} = await trixma.getUnitById(id);
      if (fetchError || !data) setError(fetchError ?? "Unit not found");
      else setUnit(data);
      setUnitLoading(false);
    };
    fetch();
  }, [id]);

  // Load measurements whenever period changes
  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      setMeasurementsLoading(true);
      const to = new Date();
      const from = new Date();
      switch (period) {
        case "24h":
          from.setHours(from.getHours() - 24);
          break;
        case "1w":
          from.setDate(from.getDate() - 7);
          break;
        case "1m":
          from.setMonth(from.getMonth() - 1);
          break;
        case "3m":
          from.setMonth(from.getMonth() - 3);
          break;
        case "6m":
          from.setMonth(from.getMonth() - 6);
          break;
        case "1y":
          from.setFullYear(from.getFullYear() - 1);
          break;
        default:
          from.setHours(from.getHours() - 24);
      }
      const {data} = await trixma.getMeasurements(
        id,
        from.toISOString(),
        to.toISOString(),
      );
      setGroups(data ?? []);
      setMeasurementsLoading(false);
    };
    fetch();
  }, [id, period]);

  if (unitLoading) {
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
        <Typography color="text.secondary">Loading unit details...</Typography>
      </Box>
    );
  }

  if (error || !unit) {
    return (
      <Box sx={{textAlign: "center", py: 8}}>
        <Typography color="error" gutterBottom>
          Error: {error || "Unit not found"}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
        >
          Go Back
        </Button>
      </Box>
    );
  }

  const handlePing = async () => {
    if (!id) return;
    setPinging(true);
    await trixma.pingUnit(id);
    setPinging(false);
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

  const formatAlarmCondition = (condition: AlarmCondition): string => {
    if (condition === 0) return "Below";
    if (condition === 1) return "Above";
    return "Equal";
  };

  const formatXAxis = (tick: string) => {
    const date = new Date(tick);
    if (period === "24h") {
      return date.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"});
    }
    return date.toLocaleDateString([], {month: "short", day: "numeric"});
  };

  const renderChart = (type: string, data: MeasurementDataPoint[]) => {
    const sorted = [...data].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    const last = sorted[sorted.length - 1];
    const gradientId = `grad-${type}`;

    return (
      <Box key={type} sx={{mb: 4}}>
        <Typography
          variant="h6"
          gutterBottom
          sx={{
            textTransform: "capitalize",
            color: "text.secondary",
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1,
            mb: 2,
          }}
        >
          {type}
          <Chip
            label={`${data.length} points`}
            size="small"
            variant="outlined"
            sx={{
              ml: 1,
              fontSize: "0.7rem",
              fontWeight: "bold",
              height: 20,
              opacity: 0.8,
            }}
          />
          {last && (
            <Chip
              label={`Last: ${new Date(last.timestamp).toLocaleString()}`}
              size="small"
              variant="outlined"
              sx={{
                fontSize: "0.7rem",
                fontWeight: "bold",
                height: 20,
                opacity: 0.8,
              }}
            />
          )}
        </Typography>
        <Paper
          variant="outlined"
          sx={{
            p: {xs: 1, md: 3},
            borderRadius: 3,
            bgcolor: "background.paper",
            height: 350,
            width: "100%",
            overflow: "hidden",
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={sorted}
              margin={{top: 10, right: 30, left: 0, bottom: 0}}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={theme.palette.primary.main}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={theme.palette.primary.main}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={theme.palette.divider}
              />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXAxis}
                stroke={theme.palette.text.secondary}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                minTickGap={30}
              />
              <YAxis
                stroke={theme.palette.text.secondary}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) =>
                  typeof v === "number" ? v.toFixed(1) : v
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  borderColor: theme.palette.divider,
                  borderRadius: "8px",
                  color: theme.palette.text.primary,
                }}
                itemStyle={{color: theme.palette.primary.main}}
                labelFormatter={(l) => new Date(l).toLocaleString()}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={theme.palette.primary.main}
                fillOpacity={1}
                fill={`url(#${gradientId})`}
                strokeWidth={3}
                activeDot={{r: 6, strokeWidth: 0}}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Paper>
      </Box>
    );
  };

  const totalPoints = groups.reduce((acc, g) => acc + g.data.length, 0);
  const latestTimestamp =
    totalPoints > 0
      ? new Date(
          Math.max(
            ...groups.flatMap((g) =>
              g.data.map((d) => new Date(d.timestamp).getTime()),
            ),
          ),
        ).toLocaleString()
      : null;

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
        onClick={() => navigate(`/systems/${unit.systemId}`)}
        sx={{mb: 4, ml: {xs: 1, md: 0}}}
      >
        Back to System
      </Button>

      <Box sx={{mb: 4, px: {xs: 1, md: 0}}}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 1.5,
            mb: 1,
          }}
        >
          <Typography
            variant="h4"
            gutterBottom
            fontWeight="800"
            sx={{
              mb: 0,
              background: (t) =>
                `linear-gradient(135deg, ${t.palette.text.primary} 0%, ${t.palette.primary.main} 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {unit.name}
          </Typography>

          <Box sx={{display: "flex", alignItems: "center", gap: 1}}>
            <Button
              variant={isMobile ? "outlined" : "text"}
              color="primary"
              startIcon={isMobile ? undefined : <NotificationsIcon />}
              onClick={() => setAlarmsDrawerOpen(true)}
              sx={{
                minWidth: isMobile ? 40 : undefined,
                px: isMobile ? 1 : 2,
                fontWeight: "bold",
              }}
            >
              {isMobile ? <NotificationsIcon fontSize="small" /> : "Connected Alarms"}
            </Button>

            <Button
              variant="contained"
              color="primary"
              startIcon={
                isMobile
                  ? undefined
                  : pinging
                    ? <CircularProgress size={16} color="inherit" />
                    : <SensorsIcon />
              }
              onClick={handlePing}
              disabled={pinging}
              sx={{
                minWidth: isMobile ? 40 : undefined,
                px: isMobile ? 1 : 2,
                fontWeight: "bold",
              }}
            >
              {isMobile ? (
                pinging ? <CircularProgress size={16} color="inherit" /> : <SensorsIcon fontSize="small" />
              ) : pinging ? (
                "Sending Ping..."
              ) : (
                "Ping Unit"
              )}
            </Button>
          </Box>
        </Box>

        <Box sx={{mb: 2, display: "flex", flexWrap: "wrap", gap: 1}}>
          {unit.uptimeMs != null && (
            <Chip
              icon={<RestartAltIcon sx={{fontSize: "0.9rem !important"}} />}
              label={`Up ${formatUptime(unit.uptimeMs)}`}
              size="small"
              color="success"
              variant="outlined"
              sx={{fontWeight: 700, fontSize: "0.7rem"}}
            />
          )}
          {unit.batteryMv != null &&
            (() => {
              const level = getBatteryLevel(unit.batteryMv);
              const BatteryIcon = getBatteryIcon(level);
              const color = getBatteryColor(level);
              return (
                <Chip
                  icon={<BatteryIcon sx={{fontSize: "0.9rem !important"}} />}
                  label={`${level}% (${(unit.batteryMv / 1000).toFixed(2)}V)`}
                  size="small"
                  color={color}
                  variant="outlined"
                  sx={{fontWeight: 700, fontSize: "0.7rem"}}
                />
              );
            })()}
        </Box>

        <Typography
          variant="caption"
          display="block"
          color="text.secondary"
          sx={{fontFamily: "monospace"}}
        >
          ID: {unit.id}
        </Typography>
      </Box>

      <Drawer
        anchor="right"
        open={alarmsDrawerOpen}
        onClose={() => setAlarmsDrawerOpen(false)}
      >
        <Box sx={{width: {xs: "100vw", sm: 460}, p: 2}}>
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
            <IconButton onClick={() => setAlarmsDrawerOpen(false)} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {unit.alarms && unit.alarms.length > 0 ? (
            <Box sx={{display: "flex", flexDirection: "column", gap: 1.25}}>
              {unit.alarms.map((alarm) => (
                <Paper
                  key={alarm.id}
                  variant="outlined"
                  onClick={() => {
                    setAlarmsDrawerOpen(false);
                    navigate(`/systems/${unit.systemId}/alarms/${alarm.id}`);
                  }}
                  sx={{
                    p: 1.5,
                    borderRadius: 1.5,
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
                    Triggers when {alarm.measurementType} is {" "}
                    {formatAlarmCondition(alarm.condition).toLowerCase()} {" "}
                    {alarm.threshold}
                  </Typography>
                </Paper>
              ))}
            </Box>
          ) : (
            <Paper
              variant="outlined"
              sx={{p: 2.5, textAlign: "center", borderStyle: "dashed"}}
            >
              <Typography color="text.secondary">
                No alarms connected to this unit.
              </Typography>
            </Paper>
          )}
        </Box>
      </Drawer>

      <Box sx={{minWidth: 0}}>
        <Box
          sx={{
            mb: 2,
            display: "flex",
            flexDirection: {xs: "column", sm: "row"},
            justifyContent: "space-between",
            alignItems: {xs: "flex-start", sm: "center"},
            gap: 2,
          }}
        >
          <Typography
            variant="h5"
            fontWeight="bold"
            sx={{
              color: "primary.main",
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <TimelineIcon /> Unit Measurements
            {totalPoints > 0 && (
              <>
                <Chip
                  label={`${totalPoints} total`}
                  size="small"
                  sx={{
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    fontWeight: "bold",
                    fontSize: "0.75rem",
                    ml: 1,
                  }}
                />
                {latestTimestamp && (
                  <Chip
                    label={`Latest: ${latestTimestamp}`}
                    size="small"
                    variant="outlined"
                    sx={{
                      borderColor: "primary.main",
                      color: "primary.main",
                      fontWeight: "bold",
                      fontSize: "0.75rem",
                      ml: 1,
                    }}
                  />
                )}
              </>
            )}
          </Typography>

          <ToggleButtonGroup
            size="small"
            value={period}
            exclusive
            onChange={(_e, v) => v && setPeriod(v)}
            sx={{bgcolor: "background.paper"}}
          >
            {["24h", "1w", "1m", "3m", "6m", "1y"].map((p) => (
              <ToggleButton
                key={p}
                value={p}
                sx={{px: 1.5, py: 0.5, fontSize: "0.75rem", fontWeight: "bold"}}
              >
                {p}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        {measurementsLoading ? (
          <Paper
            variant="outlined"
            sx={{p: 4, textAlign: "center", bgcolor: "background.paper"}}
          >
            <CircularProgress size={24} sx={{mb: 1}} />
            <Typography variant="body2" color="text.secondary">
              Fetching measurements...
            </Typography>
          </Paper>
        ) : groups.length > 0 ? (
          groups.map((g) => renderChart(g.type, g.data))
        ) : (
          <Paper
            variant="outlined"
            sx={{p: 4, textAlign: "center", borderStyle: "dashed"}}
          >
            <Typography color="text.secondary">
              No measurements found for this unit in the selected period ({period}).
            </Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default UnitDetail;
