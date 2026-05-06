import React from "react";
import {
  Box,
  Typography,
  Chip,
  IconButton,
} from "@mui/material";
import {
  InfoOutlined as InfoIcon,
  RestartAlt as RestartAltIcon,
} from "@mui/icons-material";
import type {Unit} from "../api";

interface UnitHeaderSectionProps {
  unit: Unit;
  onOpenInfoDrawer: () => void;
  formatUptime: (ms: number) => string;
  getBatteryLevel: (mv: number) => number;
  getBatteryIcon: (level: number) => React.ElementType;
  getBatteryColor: (level: number) => "error" | "warning" | "success";
  getBatteryForecastLabel: () => string | null;
  getBatteryForecastColor: () => "default" | "success" | "warning";
}

const UnitHeaderSection: React.FC<UnitHeaderSectionProps> = ({
  unit,
  onOpenInfoDrawer,
  formatUptime,
  getBatteryLevel,
  getBatteryIcon,
  getBatteryColor,
  getBatteryForecastLabel,
  getBatteryForecastColor,
}) => {
  const forecastLabel = getBatteryForecastLabel();

  return (
    <Box sx={{mb: 4, px: {xs: 1, md: 0}}}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-start",
          alignItems: "center",
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
            onClick={onOpenInfoDrawer}
            size="large"
            sx={{ml: 0.5, p: 0.75}}
          >
            <InfoIcon sx={{fontSize: 24}} />
          </IconButton>
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
            const level = getBatteryLevel(unit.batteryMv as number);
            const BatteryIcon = getBatteryIcon(level);
            const color = getBatteryColor(level);
            return (
              <Chip
                icon={<BatteryIcon sx={{fontSize: "0.9rem !important"}} />}
                label={`${level}% (${((unit.batteryMv as number) / 1000).toFixed(2)}V)`}
                size="small"
                color={color}
                variant="outlined"
                sx={{fontWeight: 700, fontSize: "0.7rem"}}
              />
            );
          })()}
        {forecastLabel && (
          <Chip
            label={forecastLabel}
            size="small"
            color={getBatteryForecastColor()}
            variant="outlined"
            sx={{fontWeight: 700, fontSize: "0.7rem"}}
          />
        )}
        {unit.batteryForecastStatus === "ok" &&
          unit.batteryForecastConfidence != null && (
            <Chip
              label={`Confidence ${Math.round(unit.batteryForecastConfidence * 100)}%`}
              size="small"
              variant="outlined"
              sx={{fontWeight: 700, fontSize: "0.7rem"}}
            />
          )}
      </Box>
    </Box>
  );
};

export default UnitHeaderSection;
