import React from "react"
import { Drawer, Box, Typography, IconButton } from "@mui/material"
import { Close as CloseIcon } from "@mui/icons-material"
import type { Unit } from "../api"

interface UnitInfoDrawerProps {
  open: boolean
  unit: Unit
  onClose: () => void
  getBatteryForecastLabel: () => string | null
}

const UnitInfoDrawer: React.FC<UnitInfoDrawerProps> = ({
  open,
  unit,
  onClose,
  getBatteryForecastLabel,
}) => {
  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      sx={{
        "& .MuiDrawer-paper": {
          top: { xs: 56, sm: 64 },
          height: { xs: "calc(100% - 56px)", sm: "calc(100% - 64px)" },
        },
      }}
    >
      <Box sx={{ width: { xs: "100vw", sm: 460 }, p: 2 }}>
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
          <IconButton onClick={onClose} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 2 }}>
          <Box>
            <Typography
              variant="caption"
              color="primary"
              sx={{ fontWeight: "bold" }}
            >
              ID
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontFamily: "monospace", wordBreak: "break-all" }}
            >
              {unit.id}
            </Typography>
          </Box>

          {unit.name && (
            <Box>
              <Typography
                variant="caption"
                color="primary"
                sx={{ fontWeight: "bold" }}
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
                sx={{ fontWeight: "bold" }}
              >
                IMEI
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                {unit.imei}
              </Typography>
            </Box>
          )}

          {unit.macAddress && (
            <Box>
              <Typography
                variant="caption"
                color="primary"
                sx={{ fontWeight: "bold" }}
              >
                MAC Address
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                {unit.macAddress}
              </Typography>
            </Box>
          )}

          {unit.ipAddress && (
            <Box>
              <Typography
                variant="caption"
                color="primary"
                sx={{ fontWeight: "bold" }}
              >
                IP Address
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                {unit.ipAddress}
              </Typography>
            </Box>
          )}

          {unit.nfcId && (
            <Box>
              <Typography
                variant="caption"
                color="primary"
                sx={{ fontWeight: "bold" }}
              >
                NFC ID
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                {unit.nfcId}
              </Typography>
            </Box>
          )}

          {unit.lastProvisionedAt && (
            <Box>
              <Typography
                variant="caption"
                color="primary"
                sx={{ fontWeight: "bold" }}
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
                sx={{ fontWeight: "bold" }}
              >
                System ID
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
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
                sx={{ fontWeight: "bold" }}
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

          {unit.batteryForecastStatus && (
            <Box>
              <Typography
                variant="caption"
                color="primary"
                sx={{ fontWeight: "bold" }}
              >
                Battery Life Forecast
              </Typography>
              <Typography variant="body2">
                {getBatteryForecastLabel()}
              </Typography>
              {unit.batteryForecastStatus === "ok" &&
                unit.batteryDischargeRatePctPerHour != null && (
                  <Typography variant="body2" color="text.secondary">
                    Discharge rate:{" "}
                    {unit.batteryDischargeRatePctPerHour.toFixed(3)}%/h
                  </Typography>
                )}
              {unit.batteryForecastStatus === "ok" &&
                unit.batteryForecastConfidence != null && (
                  <Typography variant="body2" color="text.secondary">
                    Confidence:{" "}
                    {Math.round(unit.batteryForecastConfidence * 100)}%
                  </Typography>
                )}
              {unit.batteryForecastEstimatedAt && (
                <Typography variant="body2" color="text.secondary">
                  Updated:{" "}
                  {new Date(unit.batteryForecastEstimatedAt).toLocaleString()}
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </Drawer>
  )
}

export default UnitInfoDrawer
