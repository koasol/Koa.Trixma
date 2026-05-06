import React from "react";
import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  type SxProps,
  type Theme,
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  MoreVert as MoreVertIcon,
  InfoOutlined as InfoIcon,
  RestartAlt as RestartAltIcon,
} from "@mui/icons-material";
import type {Unit} from "../api";

interface UnitHeaderSectionProps {
  unit: Unit;
  isMobile: boolean;
  actionsAnchorEl: null | HTMLElement;
  onOpenActionsMenu: (event: React.MouseEvent<HTMLElement>) => void;
  onCloseActionsMenu: () => void;
  onOpenAlarmsDrawer: () => void;
  onOpenInfoDrawer: () => void;
  actionButtonSx: SxProps<Theme>;
  formatUptime: (ms: number) => string;
  getBatteryLevel: (mv: number) => number;
  getBatteryIcon: (level: number) => React.ElementType;
  getBatteryColor: (level: number) => "error" | "warning" | "success";
  getBatteryForecastLabel: () => string | null;
  getBatteryForecastColor: () => "default" | "success" | "warning";
}

const UnitHeaderSection: React.FC<UnitHeaderSectionProps> = ({
  unit,
  isMobile,
  actionsAnchorEl,
  onOpenActionsMenu,
  onCloseActionsMenu,
  onOpenAlarmsDrawer,
  onOpenInfoDrawer,
  actionButtonSx,
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
            onClick={onOpenInfoDrawer}
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
                onClick={onOpenActionsMenu}
              >
                <MoreVertIcon />
              </IconButton>
              <Menu
                id="unit-actions-menu"
                anchorEl={actionsAnchorEl}
                open={Boolean(actionsAnchorEl)}
                onClose={onCloseActionsMenu}
                anchorOrigin={{vertical: "bottom", horizontal: "right"}}
                transformOrigin={{vertical: "top", horizontal: "right"}}
              >
                <MenuItem
                  sx={{alignItems: "center"}}
                  onClick={() => {
                    onCloseActionsMenu();
                    onOpenAlarmsDrawer();
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
            <Button
              variant="outlined"
              color="primary"
              startIcon={<NotificationsIcon />}
              onClick={onOpenAlarmsDrawer}
              sx={actionButtonSx}
            >
              Connected Alarms
            </Button>
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
