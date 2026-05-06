import React, {useEffect, useMemo, useState} from "react";
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
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Timeline as TimelineIcon,
  RestartAlt as RestartAltIcon,
  Sensors as SensorsIcon,
  Notifications as NotificationsIcon,
  Close as CloseIcon,
  InfoOutlined as InfoIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Battery20 as Battery20Icon,
  Battery30 as Battery30Icon,
  Battery50 as Battery50Icon,
  Battery80 as Battery80Icon,
  BatteryFull as BatteryFullIcon,
  BatteryAlert as BatteryAlertIcon,
  Speed as SpeedIcon,
  MoreVert as MoreVertIcon,
  GpsFixed as GpsFixedIcon,
  AltRoute as AltRouteIcon,
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
  MapContainer,
  TileLayer,
  Circle,
  CircleMarker,
  Polyline,
  Marker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  trixma,
  type AlarmCondition,
  type Unit,
  type MeasurementGroup,
  type MeasurementDataPoint,
} from "./api";
import AppBreadcrumbs from "./components/AppBreadcrumbs";

type LocationMode = "realtime" | "history";

const MapAutoFitBounds: React.FC<{positions: [number, number][]}> = ({
  positions,
}) => {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.setView(positions[0], 16);
      return;
    }
    map.fitBounds(positions, {padding: [24, 24]});
  }, [map, positions]);

  return null;
};

const UnitDetail: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const [unit, setUnit] = useState<Unit | null>(null);
  const [groups, setGroups] = useState<MeasurementGroup[]>([]);
  const [period, setPeriod] = useState<string>("24h");
  const [locationMode, setLocationMode] = useState<LocationMode>("realtime");
  const [unitLoading, setUnitLoading] = useState(true);
  const [measurementsLoading, setMeasurementsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinging, setPinging] = useState(false);
  const [queryingFreq, setQueryingFreq] = useState(false);
  const [actionsAnchorEl, setActionsAnchorEl] = useState<null | HTMLElement>(
    null,
  );
  const [alarmsDrawerOpen, setAlarmsDrawerOpen] = useState(false);
  const [infoDrawerOpen, setInfoDrawerOpen] = useState(false);
  const [systemInfo, setSystemInfo] = useState<{
    id: string;
    name: string;
  } | null>(null);

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
        case "48h":
          from.setHours(from.getHours() - 48);
          break;
        case "7d":
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

  useEffect(() => {
    if (!unit?.systemId) return;

    let isActive = true;

    const fetchSystemName = async () => {
      const {data} = await trixma.getSystemById(unit.systemId as string);
      if (!isActive) return;
      setSystemInfo({
        id: unit.systemId as string,
        name: data?.name || "System",
      });
    };

    void fetchSystemName();

    return () => {
      isActive = false;
    };
  }, [unit?.systemId]);

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
        <AppBreadcrumbs
          items={[
            {label: "Systems", to: "/"},
            {label: "Units"},
            {label: "Unit"},
          ]}
        />
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

  const handleQueryFrequency = async () => {
    if (!id) return;
    setQueryingFreq(true);
    await trixma.queryUnitFrequency(id);
    // Reload unit to pick up updated frequency fields
    const {data} = await trixma.getUnitById(id);
    if (data) setUnit(data);
    setQueryingFreq(false);
  };

  const handleOpenActionsMenu = (event: React.MouseEvent<HTMLElement>) => {
    setActionsAnchorEl(event.currentTarget);
  };

  const handleCloseActionsMenu = () => {
    setActionsAnchorEl(null);
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
    if (period === "24h" || period === "48h") {
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
  const gnssTypes = new Set(["lat_udeg", "lon_udeg", "acc_cm"]);
  const chartGroups = groups.filter((g) => !gnssTypes.has(g.type));

  const getLatestMeasurement = (points: MeasurementDataPoint[]) => {
    if (points.length === 0) return null;
    return points.reduce((latest, current) => {
      return new Date(current.timestamp).getTime() >
        new Date(latest.timestamp).getTime()
        ? current
        : latest;
    });
  };

  const latMeasurements = groups.find((g) => g.type === "lat_udeg")?.data || [];
  const lonMeasurements = groups.find((g) => g.type === "lon_udeg")?.data || [];
  const accMeasurements = groups.find((g) => g.type === "acc_cm")?.data || [];

  const latPoint = getLatestMeasurement(latMeasurements);
  const lonPoint = getLatestMeasurement(lonMeasurements);
  const accPoint = getLatestMeasurement(accMeasurements);

  const historyLocationPoints = useMemo(() => {
    const latSorted = [...latMeasurements].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    const lonSorted = [...lonMeasurements].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    let latIndex = 0;
    let lonIndex = 0;
    let currentLat: number | null = null;
    let currentLon: number | null = null;

    const points: Array<{lat: number; lon: number; timestamp: string}> = [];

    while (latIndex < latSorted.length || lonIndex < lonSorted.length) {
      const nextLat = latSorted[latIndex];
      const nextLon = lonSorted[lonIndex];
      const nextLatTime = nextLat
        ? new Date(nextLat.timestamp).getTime()
        : Number.POSITIVE_INFINITY;
      const nextLonTime = nextLon
        ? new Date(nextLon.timestamp).getTime()
        : Number.POSITIVE_INFINITY;

      if (nextLatTime <= nextLonTime) {
        currentLat = nextLat.value / 1_000_000;
        latIndex += 1;
      }
      if (nextLonTime <= nextLatTime) {
        currentLon = nextLon.value / 1_000_000;
        lonIndex += 1;
      }

      if (currentLat != null && currentLon != null) {
        const currentTime = Math.max(nextLatTime, nextLonTime);
        const timestamp = new Date(currentTime).toISOString();
        const previous = points[points.length - 1];
        if (
          !previous ||
          previous.lat !== currentLat ||
          previous.lon !== currentLon
        ) {
          points.push({lat: currentLat, lon: currentLon, timestamp});
        }
      }
    }

    return points;
  }, [latMeasurements, lonMeasurements]);

  const latDeg = latPoint ? latPoint.value / 1_000_000 : null;
  const lonDeg = lonPoint ? lonPoint.value / 1_000_000 : null;
  const accMeters = accPoint ? accPoint.value / 100 : null;
  const hasRealtimeLocation = latDeg != null && lonDeg != null;
  const hasHistoryLocation = historyLocationPoints.length > 0;
  const hasGnssLocation =
    locationMode === "history" ? hasHistoryLocation : hasRealtimeLocation;
  const historyPolylinePositions = historyLocationPoints.map(
    (p) => [p.lat, p.lon] as [number, number],
  );
  const historyDirectionArrows = useMemo(() => {
    if (historyPolylinePositions.length < 2) return [];

    const maxArrows = 14;
    const segmentCount = historyPolylinePositions.length - 1;
    const step = Math.max(1, Math.ceil(segmentCount / maxArrows));
    const arrows: Array<{position: [number, number]; angle: number}> = [];

    for (let i = 0; i < segmentCount; i += step) {
      const from = historyPolylinePositions[i];
      const to = historyPolylinePositions[i + 1];
      if (!from || !to) continue;
      if (from[0] === to[0] && from[1] === to[1]) continue;

      const midLat = (from[0] + to[0]) / 2;
      const midLon = (from[1] + to[1]) / 2;
      const angle =
        (Math.atan2(to[1] - from[1], to[0] - from[0]) * 180) / Math.PI;

      arrows.push({position: [midLat, midLon], angle});
    }

    return arrows;
  }, [historyPolylinePositions]);
  const latestHistoryPoint =
    historyLocationPoints.length > 0
      ? historyLocationPoints[historyLocationPoints.length - 1]
      : null;
  const mapZoom = (() => {
    if (!accMeters || accMeters <= 0) return 16;
    if (accMeters <= 5) return 18;
    if (accMeters <= 15) return 17;
    if (accMeters <= 40) return 16;
    if (accMeters <= 100) return 15;
    return 14;
  })();
  const systemName =
    unit.systemId && systemInfo?.id === unit.systemId
      ? systemInfo.name
      : "System";
  const systemPath = unit.systemId ? `/systems/${unit.systemId}` : "/";
  const unitsPath = unit.systemId ? `/systems/${unit.systemId}?tab=units` : "/";
  const actionButtonSx = {
    fontWeight: "bold",
    lineHeight: 1.1,
    "& .MuiButton-startIcon": {
      display: "inline-flex",
      alignItems: "center",
      mt: 0,
      mb: 0,
    },
    "& .MuiButton-startIcon .MuiSvgIcon-root": {
      fontSize: 20,
    },
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
      <AppBreadcrumbs
        items={[
          {label: "Systems", to: "/"},
          {label: systemName, to: systemPath},
          {label: "Units", to: unitsPath},
          {label: unit.name},
        ]}
      />

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
          <Box sx={{display: "flex", alignItems: "center", gap: 1}}>
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
            <IconButton
              aria-label="Unit info"
              color="primary"
              onClick={() => setInfoDrawerOpen(true)}
              size="large"
              sx={{ml: 0.5, p: 0.75}}
            >
              <InfoIcon sx={{fontSize: 24}} />
            </IconButton>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            {isMobile ? (
              <>
                <IconButton
                  aria-label="Open unit actions"
                  aria-controls={
                    actionsAnchorEl ? "unit-actions-menu" : undefined
                  }
                  aria-haspopup="true"
                  aria-expanded={actionsAnchorEl ? "true" : undefined}
                  onClick={handleOpenActionsMenu}
                >
                  <MoreVertIcon />
                </IconButton>
                <Menu
                  id="unit-actions-menu"
                  anchorEl={actionsAnchorEl}
                  open={Boolean(actionsAnchorEl)}
                  onClose={handleCloseActionsMenu}
                  anchorOrigin={{vertical: "bottom", horizontal: "right"}}
                  transformOrigin={{vertical: "top", horizontal: "right"}}
                >
                  <MenuItem
                    sx={{alignItems: "center"}}
                    onClick={() => {
                      handleCloseActionsMenu();
                      setAlarmsDrawerOpen(true);
                    }}
                  >
                    <ListItemIcon
                      sx={{minWidth: 34, display: "flex", alignItems: "center"}}
                    >
                      <NotificationsIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primaryTypographyProps={{lineHeight: 1.2}}>
                      Connected Alarms
                    </ListItemText>
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<NotificationsIcon />}
                  onClick={() => setAlarmsDrawerOpen(true)}
                  sx={actionButtonSx}
                >
                  Connected Alarms
                </Button>
              </>
            )}
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
      </Box>

      <Drawer
        anchor="left"
        open={infoDrawerOpen}
        onClose={() => setInfoDrawerOpen(false)}
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
              Unit Info
            </Typography>
            <IconButton onClick={() => setInfoDrawerOpen(false)} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box sx={{display: "flex", flexDirection: "column", gap: 1.5, mb: 2}}>
            <Box>
              <Typography
                variant="caption"
                color="primary"
                sx={{fontWeight: "bold"}}
              >
                ID
              </Typography>
              <Typography
                variant="body2"
                sx={{fontFamily: "monospace", wordBreak: "break-all"}}
              >
                {unit.id}
              </Typography>
            </Box>

            {unit.name && (
              <Box>
                <Typography
                  variant="caption"
                  color="primary"
                  sx={{fontWeight: "bold"}}
                >
                  Name
                </Typography>
                <Typography variant="body2">{unit.name}</Typography>
              </Box>
            )}

            {unit.imei && (
              <Box>
                <Typography
                  variant="caption"
                  color="primary"
                  sx={{fontWeight: "bold"}}
                >
                  IMEI
                </Typography>
                <Typography variant="body2" sx={{fontFamily: "monospace"}}>
                  {unit.imei}
                </Typography>
              </Box>
            )}

            {unit.macAddress && (
              <Box>
                <Typography
                  variant="caption"
                  color="primary"
                  sx={{fontWeight: "bold"}}
                >
                  MAC Address
                </Typography>
                <Typography variant="body2" sx={{fontFamily: "monospace"}}>
                  {unit.macAddress}
                </Typography>
              </Box>
            )}

            {unit.ipAddress && (
              <Box>
                <Typography
                  variant="caption"
                  color="primary"
                  sx={{fontWeight: "bold"}}
                >
                  IP Address
                </Typography>
                <Typography variant="body2" sx={{fontFamily: "monospace"}}>
                  {unit.ipAddress}
                </Typography>
              </Box>
            )}

            {unit.nfcId && (
              <Box>
                <Typography
                  variant="caption"
                  color="primary"
                  sx={{fontWeight: "bold"}}
                >
                  NFC ID
                </Typography>
                <Typography variant="body2" sx={{fontFamily: "monospace"}}>
                  {unit.nfcId}
                </Typography>
              </Box>
            )}

            {unit.lastProvisionedAt && (
              <Box>
                <Typography
                  variant="caption"
                  color="primary"
                  sx={{fontWeight: "bold"}}
                >
                  Last Provisioned
                </Typography>
                <Typography variant="body2">
                  {new Date(unit.lastProvisionedAt).toLocaleString()}
                </Typography>
              </Box>
            )}

            {unit.systemId && (
              <Box>
                <Typography
                  variant="caption"
                  color="primary"
                  sx={{fontWeight: "bold"}}
                >
                  System ID
                </Typography>
                <Typography variant="body2" sx={{fontFamily: "monospace"}}>
                  {unit.systemId}
                </Typography>
              </Box>
            )}

            {(unit.payloadIntervalS != null ||
              unit.gnssRequestIntervalS != null) && (
              <Box>
                <Typography
                  variant="caption"
                  color="primary"
                  sx={{fontWeight: "bold"}}
                >
                  Update Frequency
                </Typography>
                {unit.payloadIntervalS != null && (
                  <Typography variant="body2">
                    Payload: every {unit.payloadIntervalS}s
                  </Typography>
                )}
                {unit.gnssRequestIntervalS != null && (
                  <Typography variant="body2">
                    GNSS:{" "}
                    {unit.gnssRequestIntervalS === 0
                      ? "disabled"
                      : `every ${unit.gnssRequestIntervalS}s`}
                  </Typography>
                )}
              </Box>
            )}
          </Box>

          <Box sx={{display: "flex", gap: 1, mb: 1}}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={
                pinging ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <SensorsIcon />
                )
              }
              onClick={handlePing}
              disabled={pinging}
              sx={{fontWeight: "bold", flex: 1, minWidth: 0}}
            >
              {pinging ? "Sending Ping..." : "Ping Unit"}
            </Button>

            <Button
              variant="outlined"
              color="primary"
              startIcon={
                queryingFreq ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <SpeedIcon />
                )
              }
              onClick={handleQueryFrequency}
              disabled={queryingFreq}
              sx={{fontWeight: "bold", flex: 1, minWidth: 0}}
            >
              {queryingFreq ? "Querying..." : "Query Frequency"}
            </Button>
          </Box>

          <Button
            variant="contained"
            color="primary"
            fullWidth
            startIcon={<EditIcon />}
            onClick={() => {
              setInfoDrawerOpen(false);
              navigate(`/units/${unit.id}/edit`);
            }}
            sx={{fontWeight: "bold"}}
          >
            Edit Unit
          </Button>
        </Box>
      </Drawer>

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
              sx={{p: 2.5, textAlign: "center", borderStyle: "dashed"}}
            >
              <Typography color="text.secondary">
                No alarms connected to this unit.
              </Typography>
            </Paper>
          )}

          <Button
            variant="contained"
            color="primary"
            fullWidth
            startIcon={<AddIcon />}
            onClick={() => {
              setAlarmsDrawerOpen(false);
              navigate(
                `/systems/${unit.systemId}/alarms/new?unitId=${unit.id}`,
              );
            }}
            sx={{fontWeight: "bold", mt: 2}}
          >
            Add Alarm
          </Button>
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
            {["24h", "48h", "7d", "1m", "3m", "6m"].map((p) => (
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
          <>
            {(latPoint || lonPoint || accPoint) && (
              <Box sx={{mb: 4}}>
                <Box
                  sx={{
                    mb: 2,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
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
                      mb: 0,
                    }}
                  >
                    GNSS Location
                    {hasGnssLocation && (latPoint || lonPoint) && (
                      <Chip
                        label={`Last: ${new Date(
                          Math.max(
                            latPoint
                              ? new Date(latPoint.timestamp).getTime()
                              : 0,
                            lonPoint
                              ? new Date(lonPoint.timestamp).getTime()
                              : 0,
                          ),
                        ).toLocaleString()}`}
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
                    {accMeters != null && (
                      <Chip
                        label={`Accuracy: ${accMeters.toFixed(1)} m`}
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

                  <ToggleButtonGroup
                    size="small"
                    value={locationMode}
                    exclusive
                    onChange={(_e, v: LocationMode | null) => {
                      if (v) setLocationMode(v);
                    }}
                    sx={{bgcolor: "background.paper"}}
                  >
                    <ToggleButton
                      value="realtime"
                      aria-label="Realtime location"
                    >
                      <GpsFixedIcon fontSize="small" sx={{mr: 0.5}} />
                      Realtime
                    </ToggleButton>
                    <ToggleButton value="history" aria-label="History location">
                      <AltRouteIcon fontSize="small" sx={{mr: 0.5}} />
                      History
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                <Paper
                  variant="outlined"
                  sx={{
                    p: {xs: 1, md: 2},
                    borderRadius: 3,
                    bgcolor: "background.paper",
                    overflow: "hidden",
                  }}
                >
                  {hasGnssLocation ? (
                    <>
                      <Box
                        sx={{
                          width: "100%",
                          height: 360,
                          borderRadius: 2,
                          overflow: "hidden",
                        }}
                      >
                        <MapContainer
                          center={
                            locationMode === "history" && latestHistoryPoint
                              ? [latestHistoryPoint.lat, latestHistoryPoint.lon]
                              : [latDeg as number, lonDeg as number]
                          }
                          zoom={locationMode === "history" ? 14 : mapZoom}
                          style={{height: "100%", width: "100%"}}
                          scrollWheelZoom={false}
                        >
                          <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />
                          {locationMode === "realtime" &&
                            accMeters != null &&
                            accMeters > 0 && (
                              <Circle
                                center={[latDeg as number, lonDeg as number]}
                                radius={accMeters}
                                pathOptions={{
                                  color: theme.palette.primary.main,
                                  fillColor: theme.palette.primary.main,
                                  fillOpacity: 0.12,
                                  weight: 2,
                                }}
                              />
                            )}
                          {locationMode === "history" ? (
                            <>
                              <MapAutoFitBounds
                                positions={historyPolylinePositions}
                              />
                              {historyPolylinePositions.length > 1 && (
                                <Polyline
                                  positions={historyPolylinePositions}
                                  pathOptions={{
                                    color: theme.palette.primary.main,
                                    weight: 3,
                                    opacity: 0.85,
                                  }}
                                />
                              )}
                              {historyDirectionArrows.map((arrow, index) => (
                                <Marker
                                  key={`route-arrow-${index}`}
                                  position={arrow.position}
                                  icon={L.divIcon({
                                    className: "",
                                    html: `<div style="color:${theme.palette.primary.main};font-size:12px;line-height:1;transform:rotate(${arrow.angle}deg);transform-origin:center;">&#9650;</div>`,
                                    iconSize: [12, 12],
                                    iconAnchor: [6, 6],
                                  })}
                                  interactive={false}
                                />
                              ))}
                              {historyLocationPoints.map((point, index) => (
                                <CircleMarker
                                  key={`${point.timestamp}-${index}`}
                                  center={[point.lat, point.lon]}
                                  radius={
                                    index === historyLocationPoints.length - 1
                                      ? 6
                                      : 4
                                  }
                                  pathOptions={{
                                    color:
                                      index === historyLocationPoints.length - 1
                                        ? theme.palette.success.main
                                        : theme.palette.primary.main,
                                    fillColor:
                                      index === historyLocationPoints.length - 1
                                        ? theme.palette.success.main
                                        : theme.palette.primary.main,
                                    fillOpacity: 0.9,
                                    weight: 2,
                                  }}
                                />
                              ))}
                            </>
                          ) : (
                            <CircleMarker
                              center={[latDeg as number, lonDeg as number]}
                              radius={7}
                              pathOptions={{
                                color: theme.palette.primary.main,
                                fillColor: theme.palette.primary.main,
                                fillOpacity: 1,
                                weight: 2,
                              }}
                            />
                          )}
                        </MapContainer>
                      </Box>
                      <Box
                        sx={{
                          mt: 1,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 1,
                          flexWrap: "wrap",
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {locationMode === "history" && latestHistoryPoint
                            ? `Lat: ${latestHistoryPoint.lat.toFixed(6)} | Lon: ${latestHistoryPoint.lon.toFixed(6)}`
                            : `Lat: ${(latDeg as number).toFixed(6)} | Lon: ${(lonDeg as number).toFixed(6)}`}
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() =>
                            window.open(
                              locationMode === "history" && latestHistoryPoint
                                ? `https://www.openstreetmap.org/?mlat=${latestHistoryPoint.lat}&mlon=${latestHistoryPoint.lon}#map=17/${latestHistoryPoint.lat}/${latestHistoryPoint.lon}`
                                : `https://www.openstreetmap.org/?mlat=${latDeg}&mlon=${lonDeg}#map=17/${latDeg}/${lonDeg}`,
                              "_blank",
                              "noopener,noreferrer",
                            )
                          }
                        >
                          Open in OpenStreetMap
                        </Button>
                      </Box>
                    </>
                  ) : (
                    <Typography
                      color="text.secondary"
                      sx={{p: 2, textAlign: "center"}}
                    >
                      No valid GNSS location (lat/lon) found for this period.
                    </Typography>
                  )}
                </Paper>
              </Box>
            )}

            {chartGroups.map((g) => renderChart(g.type, g.data))}
          </>
        ) : (
          <Paper
            variant="outlined"
            sx={{p: 4, textAlign: "center", borderStyle: "dashed"}}
          >
            <Typography color="text.secondary">
              No measurements found for this unit in the selected period (
              {period}).
            </Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default UnitDetail;
