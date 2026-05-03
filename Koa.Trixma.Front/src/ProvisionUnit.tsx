import React from "react";
import {Box, Typography, Paper} from "@mui/material";
import AppBreadcrumbs from "./components/AppBreadcrumbs";

const ProvisionUnit: React.FC = () => {
  return (
    <Box sx={{maxWidth: 900, mx: "auto", width: "100%"}}>
      <AppBreadcrumbs
        items={[
          {label: "Systems", to: "/"},
          {label: "Units", to: "/"},
          {label: "Provision Unit"},
        ]}
      />

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
