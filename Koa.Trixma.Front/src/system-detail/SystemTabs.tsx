import {Paper, Tab, Tabs} from "@mui/material";

export type SystemDetailTab = "units" | "alarms" | "settings";

interface SystemTabsProps {
  activeTab: SystemDetailTab;
  onChange: (event: React.SyntheticEvent, newValue: SystemDetailTab) => void;
}

const SystemTabs: React.FC<SystemTabsProps> = ({activeTab, onChange}) => (
  <Paper
    elevation={0}
    sx={{
      border: 1,
      borderColor: "divider",
      borderRadius: 1,
      bgcolor: "background.paper",
      mb: 3,
      overflow: "hidden",
    }}
  >
    <Tabs
      value={activeTab}
      onChange={onChange}
      variant="scrollable"
      scrollButtons="auto"
      sx={{px: {xs: 1, sm: 2}}}
    >
      <Tab value="units" label="Units" />
      <Tab value="alarms" label="Alarms" />
      <Tab value="settings" label="Settings" />
    </Tabs>
  </Paper>
);

export default SystemTabs;
