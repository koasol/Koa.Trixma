import {Info as InfoIcon, Close as CloseIcon, Edit as EditIcon} from "@mui/icons-material";
import {Box, Button, Drawer, IconButton, Typography} from "@mui/material";
import {useNavigate} from "react-router-dom";
import {type System} from "../api";
import AppBreadcrumbs from "../components/AppBreadcrumbs";

interface SystemHeaderProps {
  system: System;
  infoDrawerOpen: boolean;
  onInfoDrawerOpen: () => void;
  onInfoDrawerClose: () => void;
}

const SystemHeader: React.FC<SystemHeaderProps> = ({system, infoDrawerOpen, onInfoDrawerOpen, onInfoDrawerClose}) => {
  const navigate = useNavigate();

  return (
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
        <AppBreadcrumbs
          items={[
            {label: "Systems", to: "/"},
            {label: system.name},
          ]}
          sx={{mb: 0, ml: 0}}
        />
        <Box sx={{display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", justifyContent: "flex-end"}}>
          <Button variant="outlined" startIcon={<InfoIcon />} onClick={onInfoDrawerOpen}>
            System Info
          </Button>
        </Box>
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
            mb: 0,
          }}
        >
          {system.name}
        </Typography>
      </Box>

      <Drawer
        anchor="left"
        open={infoDrawerOpen}
        onClose={onInfoDrawerClose}
      >
        <Box sx={{width: {xs: "100vw", sm: 460}, p: 2}}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 1.5,
            }}
          >
            <Typography variant="h6" fontWeight="bold">
              System Info
            </Typography>
            <IconButton onClick={onInfoDrawerClose} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box sx={{display: "flex", flexDirection: "column", gap: 1.5, mb: 2}}>
            <Box>
              <Typography variant="caption" color="primary" sx={{fontWeight: "bold"}}>
                ID
              </Typography>
              <Typography
                variant="body2"
                sx={{fontFamily: "monospace", wordBreak: "break-all"}}
              >
                {system.id}
              </Typography>
            </Box>

            {system.name && (
              <Box>
                <Typography variant="caption" color="primary" sx={{fontWeight: "bold"}}>
                  Name
                </Typography>
                <Typography variant="body2">{system.name}</Typography>
              </Box>
            )}

            {system.createdAt && (
              <Box>
                <Typography variant="caption" color="primary" sx={{fontWeight: "bold"}}>
                  Created
                </Typography>
                <Typography variant="body2">
                  {new Date(system.createdAt).toLocaleString()}
                </Typography>
              </Box>
            )}

            {system.description && (
              <Box>
                <Typography variant="caption" color="primary" sx={{fontWeight: "bold"}}>
                  Description
                </Typography>
                <Typography variant="body2" sx={{lineHeight: 1.45}}>
                  {system.description}
                </Typography>
              </Box>
            )}
          </Box>

          <Button
            variant="contained"
            color="primary"
            fullWidth
            startIcon={<EditIcon />}
            onClick={() => {
              onInfoDrawerClose();
              navigate(`/systems/${system.id}/edit`);
            }}
            sx={{fontWeight: "bold"}}
          >
            Edit System
          </Button>
        </Box>
      </Drawer>
    </>
  );
};

export default SystemHeader;
