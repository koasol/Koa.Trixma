import {Close as CloseIcon} from "@mui/icons-material";
import {Box, Button, Chip, CircularProgress, Drawer, IconButton, Paper, Typography} from "@mui/material";
import {type Unit} from "../api";

interface AddUnitDrawerProps {
  systemId: string;
  open: boolean;
  allUnits: Unit[];
  allUnitsLoading: boolean;
  allUnitsError: string | null;
  assigningUnitId: string | null;
  onClose: () => void;
  onOpenUnit: (unitId: string) => void;
  onProvisionUnit: () => void;
  onAddUnitToSystem: (unit: Unit) => void;
}

const AddUnitDrawer: React.FC<AddUnitDrawerProps> = ({
  systemId,
  open,
  allUnits,
  allUnitsLoading,
  allUnitsError,
  assigningUnitId,
  onClose,
  onOpenUnit,
  onProvisionUnit,
  onAddUnitToSystem,
}) => (
  <Drawer anchor="right" open={open} onClose={onClose}>
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
          Available Units
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
        Showing all units available for this user, whether assigned to a system or not.
      </Typography>

      <Box
        sx={{
          mb: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 1,
        }}
      >
        <Typography variant="subtitle2" fontWeight="bold">
          Unit not showing?
        </Typography>
        <Button variant="contained" size="small" onClick={onProvisionUnit}>
          Provision unit
        </Button>
      </Box>

      {allUnitsLoading ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            py: 6,
          }}
        >
          <CircularProgress size={24} sx={{mb: 1}} />
          <Typography variant="body2" color="text.secondary">
            Loading units...
          </Typography>
        </Box>
      ) : allUnitsError ? (
        <Paper variant="outlined" sx={{p: 2.5, borderStyle: "dashed"}}>
          <Typography color="error" variant="body2">
            {allUnitsError}
          </Typography>
        </Paper>
      ) : allUnits.length === 0 ? (
        <Paper variant="outlined" sx={{p: 2.5, borderStyle: "dashed"}}>
          <Typography color="text.secondary" variant="body2">
            No units available.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{display: "flex", flexDirection: "column", gap: 1.25}}>
          {allUnits.map((unit) => {
            const isAssigned = Boolean(unit.systemId);
            const isAssignedToCurrent = unit.systemId === systemId;

            return (
              <Paper
                key={unit.id}
                variant="outlined"
                onClick={() => onOpenUnit(unit.id)}
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  cursor: "pointer",
                  borderColor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(0, 209, 255, 0.35)" : "rgba(124, 58, 237, 0.35)",
                  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                  "&:hover": {
                    borderColor: "primary.main",
                    boxShadow: (theme) => theme.shadows[1],
                  },
                }}
              >
                <Box sx={{width: "100%", minWidth: 0}}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
                    <Typography variant="subtitle2" sx={{fontWeight: 700}}>
                      {unit.name || "Unnamed unit"}
                    </Typography>
                    <Chip
                      size="small"
                      label={
                        !isAssigned ? "Unassigned" : isAssignedToCurrent ? "Assigned here" : "Assigned elsewhere"
                      }
                      color={!isAssigned ? "default" : isAssignedToCurrent ? "success" : "warning"}
                      variant="outlined"
                    />
                  </Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: "block",
                      fontFamily: "monospace",
                      mt: 0.75,
                    }}
                  >
                    ID: {unit.id}
                  </Typography>
                  {unit.systemId && (
                    <Typography variant="caption" color="text.secondary" sx={{display: "block", mt: 0.25}}>
                      System: {unit.systemId}
                    </Typography>
                  )}

                  {!isAssignedToCurrent && (
                    <Box
                      sx={{
                        mt: 1.5,
                        pt: 1,
                        borderTop: 1,
                        borderColor: "divider",
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "flex-end",
                      }}
                    >
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={(event) => {
                          event.stopPropagation();
                          onAddUnitToSystem(unit);
                        }}
                        disabled={assigningUnitId === unit.id}
                      >
                        {assigningUnitId === unit.id ? "Adding..." : "Add to system"}
                      </Button>
                    </Box>
                  )}
                </Box>
              </Paper>
            );
          })}
        </Box>
      )}
    </Box>
  </Drawer>
);

export default AddUnitDrawer;
