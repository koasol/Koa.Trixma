import React from "react";
import {useNavigate} from "react-router-dom";
import {Box, Typography, Button, Paper} from "@mui/material";
import {ArrowBack as ArrowBackIcon} from "@mui/icons-material";

const ProvisionUnit: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{maxWidth: 900, mx: "auto", width: "100%"}}>
      <Button
        variant="outlined"
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate("/")}
        sx={{mb: 2}}
      >
        Back to Dashboard
      </Button>

      <Paper
        elevation={0}
        sx={{
          p: {xs: 3, md: 5},
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
          bgcolor: "background.paper",
        }}
      >
        <Typography variant="h4" component="h1" fontWeight="800" gutterBottom>
          Provision Unit
        </Typography>
        <Typography variant="body1" color="text.secondary">
          This page is a placeholder for the unit provisioning workflow. The
          implementation for provisioning steps will be added later.
        </Typography>
      </Paper>
    </Box>
  );
};

export default ProvisionUnit;
