import React from "react"
import {
  Paper,
  Typography,
} from "@mui/material"
import { type Unit } from "../../../api"

interface UnitFirmwareTabProps {
  unit: Unit
}

const UnitFirmwareTab: React.FC<UnitFirmwareTabProps> = () => {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 3, textAlign: "center", borderStyle: "dashed" }}
    >
      <Typography color="text.secondary">
        Firmware content will be shown here.
      </Typography>
    </Paper>
  )
}

export default UnitFirmwareTab
