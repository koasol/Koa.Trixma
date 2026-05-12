import React from "react";
import {Card, CardContent, Box, Typography, Stack} from "@mui/material";
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from "@mui/icons-material";

export interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: string;
  trend?: "up" | "down" | "neutral";
  helpText?: string;
  alert?: boolean;
  sparklineData?: number[];
}

const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  unit,
  delta,
  trend,
  helpText,
  alert,
  sparklineData,
}) => {
  const getTrendColor = () => {
    if (alert) return "error";
    if (trend === "up") return "success";
    if (trend === "down") return "error";
    return "inherit";
  };

  const getTrendIcon = () => {
    if (trend === "up") return <TrendingUpIcon sx={{fontSize: "0.875rem"}} />;
    if (trend === "down")
      return <TrendingDownIcon sx={{fontSize: "0.875rem"}} />;
    return null;
  };

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: alert ? "error.light" : "background.paper",
        border: alert ? "1px solid" : "1px solid",
        borderColor: alert ? "error.main" : "divider",
      }}
    >
      <CardContent
        sx={{
          p: 1.5,
          display: "flex",
          flexDirection: "column",
          gap: 0.75,
          height: "100%",
        }}
      >
        {/* Label */}
        <Typography
          variant="caption"
          sx={{
            textTransform: "uppercase",
            fontWeight: 500,
            letterSpacing: "0.1em",
            color: "text.secondary",
            fontSize: "0.65rem",
          }}
        >
          {label}
        </Typography>

        {/* Value */}
        <Box sx={{display: "flex", alignItems: "baseline", gap: 0.5}}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              letterSpacing: "-0.02em",
              fontSize: "1.5rem",
              lineHeight: 1,
            }}
          >
            {value}
          </Typography>
          {unit && (
            <Typography
              variant="body2"
              sx={{
                fontSize: "0.75rem",
                color: "text.secondary",
                fontWeight: 500,
              }}
            >
              {unit}
            </Typography>
          )}
        </Box>

        {/* Footer: delta and help text */}
        <Stack
          direction="row"
          spacing={0.5}
          sx={{
            fontSize: "0.65rem",
            color: "text.secondary",
            alignItems: "center",
            mt: "auto",
          }}
        >
          {delta && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.25,
                color:
                  getTrendColor() !== "inherit"
                    ? `${getTrendColor()}.main`
                    : "inherit",
                fontWeight: 600,
              }}
            >
              {getTrendIcon()}
              <span>{delta}</span>
            </Box>
          )}
          {helpText && (
            <>
              {delta && <span>·</span>}
              <span>{helpText}</span>
            </>
          )}
        </Stack>

        {/* Sparkline visualization (simplified with LinearProgress) */}
        {sparklineData && sparklineData.length > 0 && (
          <Box
            sx={{
              position: "absolute",
              right: 12,
              top: 10,
              fontSize: "0.5rem",
              opacity: 0.6,
            }}
          >
            {/* Mini bar chart representation */}
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-end",
                gap: "1px",
                height: "20px",
              }}
            >
              {sparklineData.slice(-8).map((v, i) => {
                const max = Math.max(...sparklineData);
                const min = Math.min(...sparklineData);
                const range = max - min || 1;
                const height = ((v - min) / range) * 100;
                return (
                  <Box
                    key={i}
                    sx={{
                      flex: 1,
                      height: `${Math.max(2, height)}%`,
                      backgroundColor: alert ? "error.main" : "success.main",
                      borderRadius: "2px",
                      opacity: 0.6,
                    }}
                  />
                );
              })}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default KpiCard;
