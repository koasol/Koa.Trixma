import {ArrowBack as ArrowBackIcon, Add as AddIcon} from "@mui/icons-material";
import {Box, Button, Typography} from "@mui/material";
import {type System} from "../api";

interface SystemHeaderProps {
  system: System;
  onBack: () => void;
  onAddUnit: () => void;
}

const SystemHeader: React.FC<SystemHeaderProps> = ({system, onBack, onAddUnit}) => (
  <>
    <Box
      sx={{
        mb: 2,
        px: {xs: 1, md: 0},
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1.5,
      }}
    >
      <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={onBack}>
        Back to Dashboard
      </Button>
      <Button variant="contained" startIcon={<AddIcon />} onClick={onAddUnit}>
        Add Unit
      </Button>
    </Box>

    <Box sx={{mb: 2.5, px: {xs: 1, md: 0}}}>
      <Typography
        variant="h5"
        fontWeight="800"
        sx={{
          background: (theme) =>
            `linear-gradient(135deg, ${theme.palette.text.primary} 0%, ${theme.palette.primary.main} 100%)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          mb: 0.5,
        }}
      >
        {system.name}
      </Typography>
      <Typography
        variant="caption"
        display="block"
        color="text.secondary"
        sx={{fontFamily: "monospace", mb: system.description ? 1 : 0}}
      >
        ID: {system.id} • Created on {system.createdAt ? new Date(system.createdAt).toLocaleString() : "N/A"}
      </Typography>

      {system.description && (
        <Box>
          <Typography variant="caption" color="primary" sx={{fontWeight: "bold", opacity: 0.9}}>
            Description
          </Typography>
          <Typography variant="body2" sx={{lineHeight: 1.45}}>
            {system.description}
          </Typography>
        </Box>
      )}
    </Box>
  </>
);

export default SystemHeader;
