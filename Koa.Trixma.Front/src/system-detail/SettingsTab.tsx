import {Paper, Typography} from "@mui/material";

const SettingsTab: React.FC = () => (
  <Paper variant="outlined" sx={{p: 4, textAlign: "center", borderStyle: "dashed"}}>
    <Typography variant="h6" gutterBottom>
      Settings
    </Typography>
    <Typography color="text.secondary">System settings will be available here.</Typography>
  </Paper>
);

export default SettingsTab;
