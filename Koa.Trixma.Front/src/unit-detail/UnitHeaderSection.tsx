import React from "react";
import {Box, Typography, IconButton} from "@mui/material";
import {
  InfoOutlined as InfoIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import type {Unit} from "../api";

interface UnitHeaderSectionProps {
  unit: Unit;
  onOpenInfoDrawer: () => void;
  onOpenSettingsDrawer: () => void;
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
  onOpenSettingsDrawer,
  formatUptime,
  getBatteryLevel,
  getBatteryIcon,
  getBatteryColor,
  getBatteryForecastLabel,
  getBatteryForecastColor,
}) => {
  // Keep these props in use until the header battery/uptime UI is wired in.
  void formatUptime;
  void getBatteryLevel;
  void getBatteryIcon;
  void getBatteryColor;
  void getBatteryForecastLabel;
  void getBatteryForecastColor;

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

          <IconButton
            aria-label="Unit settings"
            color="primary"
            onClick={onOpenSettingsDrawer}
            size="large"
            sx={{ml: 0.5, p: 0.75}}
          >
            <SettingsIcon sx={{fontSize: 24}} />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
};

export default UnitHeaderSection;
