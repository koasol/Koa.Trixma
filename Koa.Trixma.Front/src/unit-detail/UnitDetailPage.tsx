import React, {useEffect, useRef, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Drawer,
  Typography,
  useTheme,
} from "@mui/material";
import {
  HubConnection,
  HubConnectionBuilder,
  LogLevel,
} from "@microsoft/signalr";
import {
  ArrowBack as ArrowBackIcon,
  Battery20 as Battery20Icon,
  Battery30 as Battery30Icon,
  Battery50 as Battery50Icon,
  Battery80 as Battery80Icon,
  BatteryFull as BatteryFullIcon,
  BatteryAlert as BatteryAlertIcon,
} from "@mui/icons-material";
import {
  trixma,
  type AlarmCondition,
  type LocationPreciseStatusEvent,
  type MeasurementGroup,
  type Unit,
} from "../api";
import {BASE_URL} from "../api/client";
import {auth} from "../assets/firebase";
import AppBreadcrumbs from "../components/AppBreadcrumbs";
import UnitHeaderSection from "./UnitHeaderSection";
import UnitInfoDrawer from "./UnitInfoDrawer";
import UnitSidePanel from "./UnitSidePanel";
import UnitMeasurementsSection from "./UnitMeasurementsSection";
import UnitAlarmCreateDialog from "./UnitAlarmCreateDialog";
import type {LocationMode} from "./types";

const UnitDetailPage: React.FC = () => {
  const theme = useTheme();
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
  const [requestingPreciseLocation, setRequestingPreciseLocation] =
    useState(false);
  const activeLocationRequestIdRef = useRef<string | null>(null);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
  const [infoDrawerOpen, setInfoDrawerOpen] = useState(false);
  const [alarmDialogOpen, setAlarmDialogOpen] = useState(false);
  const [locationNotification, setLocationNotification] = useState<
    string | null
  >(null);
  const [locationNotificationSeverity, setLocationNotificationSeverity] =
    useState<"info" | "success" | "warning" | "error">("info");
  const [systemInfo, setSystemInfo] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    let isActive = true;

    const fetch = async () => {
      const {data, error: fetchError} = await trixma.getUnitById(id);
      if (!isActive) return;
      if (fetchError || !data) {
        setError(fetchError ?? "Unit not found");
      } else {
        setError(null);
        setUnit(data);
      }
      setUnitLoading(false);
    };

    void fetch();

    return () => {
      isActive = false;
    };
  }, [id]);

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

  const getBatteryForecastLabel = () => {
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

  const getBatteryForecastColor = (): "default" | "success" | "warning" => {
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

  const formatAlarmCondition = (condition: AlarmCondition): string => {
    if (condition === 0) return "Below";
    if (condition === 1) return "Above";
    return "Equal";
  };

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
    const {data} = await trixma.getUnitById(id);
    if (data) setUnit(data);
    setQueryingFreq(false);
  };

  const handleRequestPreciseLocation = async () => {
    if (!id) return;
    if (requestingPreciseLocation) return;

    setRequestingPreciseLocation(true);
    setError(null);
    const {data, error: requestError} = await trixma.requestPreciseLocation(
      id,
      {
        maxWaitS: 120,
        minAccCm: 5000,
      },
    );

    if (requestError) {
      setError(requestError);
      setRequestingPreciseLocation(false);
    } else if (data) {
      activeLocationRequestIdRef.current = data.requestId;
      setLocationNotificationSeverity("info");
      setLocationNotification(
        `Location request ${data.requestId} sent and pending. Waiting for device status...`,
      );
    } else {
      setRequestingPreciseLocation(false);
    }
  };

  useEffect(() => {
    if (!id) return;

    let active = true;
    let connection: HubConnection | null = null;

    const connect = async () => {
      const hubConnection = new HubConnectionBuilder()
        .withUrl(`${BASE_URL}/hubs/device-commands`, {
          accessTokenFactory: async () => {
            const currentUser = auth.currentUser;
            if (!currentUser) return "";
            return await currentUser.getIdToken();
          },
        })
        .withAutomaticReconnect()
        .configureLogging(LogLevel.Warning)
        .build();

      const handleLocationStatus = (event: LocationPreciseStatusEvent) => {
        if (!active || event.unitId !== id) return;
        if (
          activeLocationRequestIdRef.current &&
          event.requestId !== activeLocationRequestIdRef.current
        )
          return;

        if (event.result === "accepted") {
          setLocationNotificationSeverity("success");
          setLocationNotification(
            event.detail
              ? `Location request ${event.requestId} accepted: ${event.detail}`
              : `Location request ${event.requestId} accepted by device.`,
          );
        } else if (event.result === "timeout") {
          setLocationNotificationSeverity("warning");
          setLocationNotification(
            event.detail
              ? `Location request ${event.requestId} timed out: ${event.detail}`
              : `Location request ${event.requestId} timed out.`,
          );
        } else if (event.result === "error") {
          setLocationNotificationSeverity("error");
          setLocationNotification(
            event.detail
              ? `Location request ${event.requestId} failed: ${event.detail}`
              : `Location request ${event.requestId} failed.`,
          );
        }

        setRequestingPreciseLocation(false);
        activeLocationRequestIdRef.current = null;
      };

      hubConnection.on("locationPreciseStatus", handleLocationStatus);

      // Keep backward compatibility with old backend event name while rolling out.
      hubConnection.on(
        "locationPreciseAccepted",
        (event: LocationPreciseStatusEvent) => {
          handleLocationStatus({...event, result: "accepted"});
        },
      );

      try {
        await hubConnection.start();
        if (!active) {
          await hubConnection.stop();
          return;
        }
        connection = hubConnection;
      } catch (connectError) {
        console.error("Failed to connect to device command hub", connectError);
      }
    };

    void connect();

    return () => {
      active = false;
      if (connection) {
        void connection.stop();
      }
    };
  }, [id]);

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

  const systemName =
    unit.systemId && systemInfo?.id === unit.systemId
      ? systemInfo.name
      : "System";
  const systemPath = unit.systemId ? `/systems/${unit.systemId}` : "/";
  const unitsPath = unit.systemId ? `/systems/${unit.systemId}?tab=units` : "/";
  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "100%",
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

      <UnitHeaderSection
        unit={unit}
        onOpenInfoDrawer={() => setInfoDrawerOpen(true)}
        onOpenSettingsDrawer={() => setSettingsDrawerOpen(true)}
        formatUptime={formatUptime}
        getBatteryLevel={getBatteryLevel}
        getBatteryIcon={getBatteryIcon}
        getBatteryColor={getBatteryColor}
        getBatteryForecastLabel={getBatteryForecastLabel}
        getBatteryForecastColor={getBatteryForecastColor}
      />

      <UnitInfoDrawer
        open={infoDrawerOpen}
        unit={unit}
        onClose={() => setInfoDrawerOpen(false)}
        getBatteryForecastLabel={getBatteryForecastLabel}
      />

      {locationNotification && (
        <Alert
          severity={locationNotificationSeverity}
          sx={{mb: 2}}
          onClose={() => setLocationNotification(null)}
        >
          {locationNotification}
        </Alert>
      )}

      <UnitMeasurementsSection
        theme={theme}
        period={period}
        setPeriod={setPeriod}
        locationMode={locationMode}
        setLocationMode={setLocationMode}
        groups={groups}
        measurementsLoading={measurementsLoading}
      />

      <Drawer
        anchor="right"
        open={settingsDrawerOpen}
        onClose={() => setSettingsDrawerOpen(false)}
        sx={{
          "& .MuiDrawer-paper": {
            width: {xs: "100vw", sm: 420},
            top: {xs: 56, sm: 64},
            height: {xs: "calc(100% - 56px)", sm: "calc(100% - 64px)"},
            p: 1.5,
            bgcolor: "background.paper",
            borderLeft: 1,
            borderColor: "divider",
          },
        }}
      >
        <UnitSidePanel
          unit={unit}
          pinging={pinging}
          queryingFreq={queryingFreq}
          requestingLocation={requestingPreciseLocation}
          onClosePanel={() => setSettingsDrawerOpen(false)}
          onAddAlarm={() => {
            setSettingsDrawerOpen(false);
            setAlarmDialogOpen(true);
          }}
          onPing={handlePing}
          onQueryFrequency={handleQueryFrequency}
          onRequestPreciseLocation={handleRequestPreciseLocation}
          onEdit={() => {
            setSettingsDrawerOpen(false);
            navigate(`/units/${unit.id}/edit`);
          }}
          formatAlarmCondition={formatAlarmCondition}
          onUnitUpdate={setUnit}
          formatUptime={formatUptime}
          getBatteryLevel={getBatteryLevel}
          getBatteryIcon={getBatteryIcon}
          getBatteryColor={getBatteryColor}
        />
      </Drawer>

      <UnitAlarmCreateDialog
        open={alarmDialogOpen}
        unit={unit}
        onClose={() => setAlarmDialogOpen(false)}
        onCreated={async () => {
          if (!id) return;
          const {data, error: fetchError} = await trixma.getUnitById(id);
          if (fetchError || !data) {
            setError(fetchError ?? "Unit not found");
            return;
          }
          setError(null);
          setUnit(data);
        }}
      />
    </Box>
  );
};

export default UnitDetailPage;
