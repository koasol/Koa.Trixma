import React, {useEffect, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
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
  type MeasurementGroup,
  type Unit,
} from "../api";
import AppBreadcrumbs from "../components/AppBreadcrumbs";
import UnitHeaderSection from "./UnitHeaderSection";
import UnitInfoDrawer from "./UnitInfoDrawer";
import UnitAlarmsDrawer from "./UnitAlarmsDrawer";
import UnitMeasurementsSection from "./UnitMeasurementsSection";
import type {LocationMode} from "./types";

const UnitDetailPage: React.FC = () => {
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

  const handleOpenActionsMenu = (event: React.MouseEvent<HTMLElement>) => {
    setActionsAnchorEl(event.currentTarget);
  };

  const handleCloseActionsMenu = () => {
    setActionsAnchorEl(null);
  };

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

      <UnitHeaderSection
        unit={unit}
        isMobile={isMobile}
        actionsAnchorEl={actionsAnchorEl}
        onOpenActionsMenu={handleOpenActionsMenu}
        onCloseActionsMenu={handleCloseActionsMenu}
        onOpenAlarmsDrawer={() => setAlarmsDrawerOpen(true)}
        onOpenInfoDrawer={() => setInfoDrawerOpen(true)}
        actionButtonSx={actionButtonSx}
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
        pinging={pinging}
        queryingFreq={queryingFreq}
        onClose={() => setInfoDrawerOpen(false)}
        onPing={handlePing}
        onQueryFrequency={handleQueryFrequency}
        onEdit={() => {
          setInfoDrawerOpen(false);
          navigate(`/units/${unit.id}/edit`);
        }}
        getBatteryForecastLabel={getBatteryForecastLabel}
      />

      <UnitAlarmsDrawer
        open={alarmsDrawerOpen}
        unit={unit}
        onClose={() => setAlarmsDrawerOpen(false)}
        onOpenAlarm={(alarmId) => {
          setAlarmsDrawerOpen(false);
          navigate(`/systems/${unit.systemId}/alarms/${alarmId}`);
        }}
        onAddAlarm={() => {
          setAlarmsDrawerOpen(false);
          navigate(`/systems/${unit.systemId}/alarms/new?unitId=${unit.id}`);
        }}
        formatAlarmCondition={formatAlarmCondition}
      />

      <UnitMeasurementsSection
        theme={theme}
        period={period}
        setPeriod={setPeriod}
        locationMode={locationMode}
        setLocationMode={setLocationMode}
        groups={groups}
        measurementsLoading={measurementsLoading}
      />
    </Box>
  );
};

export default UnitDetailPage;
