import React from "react";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Button,
} from "@mui/material";
import {
  Timeline as TimelineIcon,
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
} from "react-leaflet";
import L from "leaflet";
import type {Theme} from "@mui/material/styles";
import type {MeasurementDataPoint, MeasurementGroup} from "../api";
import type {LocationMode} from "./types";
import MapAutoFitBounds from "./MapAutoFitBounds";

interface UnitMeasurementsSectionProps {
  theme: Theme;
  period: string;
  setPeriod: (period: string) => void;
  locationMode: LocationMode;
  setLocationMode: (mode: LocationMode) => void;
  groups: MeasurementGroup[];
  measurementsLoading: boolean;
}

const UnitMeasurementsSection: React.FC<UnitMeasurementsSectionProps> = ({
  theme,
  period,
  setPeriod,
  locationMode,
  setLocationMode,
  groups,
  measurementsLoading,
}) => {
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

  const historyLocationPoints = (() => {
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
  })();

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

  const historyDirectionArrows = (() => {
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
  })();

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

  return (
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
                          latPoint ? new Date(latPoint.timestamp).getTime() : 0,
                          lonPoint ? new Date(lonPoint.timestamp).getTime() : 0,
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
                  <ToggleButton value="realtime" aria-label="Realtime location">
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
            No measurements found for this unit in the selected period ({period}
            ).
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default UnitMeasurementsSection;
