import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  MoreVert as MoreVertIcon,
  RestartAlt as RestartAltIcon,
  Storage as StorageIcon,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Typography,
} from "@mui/material";
import {type Unit} from "../api";
import {formatUptime, getBatteryColor, getBatteryIcon, getBatteryLevel} from "./utils";

interface UnitsTabProps {
  units: Unit[];
  unitsLoading: boolean;
  menuAnchorEl: HTMLElement | null;
  menuUnit: Unit | null;
  confirmDeleteUnitId: string | null;
  deletingUnitId: string | null;
  onOpenUnit: (unitId: string) => void;
  onMenuOpen: (event: React.MouseEvent<HTMLElement>, unit: Unit) => void;
  onMenuClose: () => void;
  onEditUnit: () => void;
  onDeleteRequest: () => void;
  onCloseDeleteDialog: () => void;
  onConfirmDelete: () => void;
}

const UnitsTab: React.FC<UnitsTabProps> = ({
  units,
  unitsLoading,
  menuAnchorEl,
  menuUnit,
  confirmDeleteUnitId,
  deletingUnitId,
  onOpenUnit,
  onMenuOpen,
  onMenuClose,
  onEditUnit,
  onDeleteRequest,
  onCloseDeleteDialog,
  onConfirmDelete,
}) => {
  if (unitsLoading) {
    return (
      <Paper variant="outlined" sx={{p: 4, textAlign: "center", bgcolor: "background.paper"}}>
        <CircularProgress size={24} sx={{mb: 1}} />
        <Typography variant="body2" color="text.secondary">
          Fetching units...
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <Typography
        variant="h5"
        gutterBottom
        fontWeight="bold"
        sx={{
          color: "primary.main",
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <StorageIcon /> System Units
      </Typography>

      {units.length > 0 ? (
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: "1fr",
            "@media (min-width:500px)": {
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            },
          }}
        >
          {units.map((unit) => (
            <Paper
              key={unit.id}
              variant="outlined"
              onClick={() => onOpenUnit(unit.id)}
              sx={{
                p: {xs: 2, sm: 2.5},
                borderRadius: 1,
                cursor: "pointer",
                transition: "border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease",
                "&:hover": {
                  borderColor: "primary.main",
                  boxShadow: (theme) => theme.shadows[2],
                  transform: "translateY(-1px)",
                },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 1,
                }}
              >
                <Typography variant="h6" sx={{fontWeight: 700, lineHeight: 1.2}}>
                  {unit.name || "Unnamed unit"}
                </Typography>
                <IconButton
                  size="small"
                  onClick={(event) => onMenuOpen(event, unit)}
                  aria-label={`Open menu for ${unit.name || "Unnamed unit"}`}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  columnGap: 1,
                  rowGap: 1,
                  mt: 2,
                }}
              >
                <Chip
                  label={unit.id}
                  size="small"
                  variant="outlined"
                  sx={{
                    fontFamily: "monospace",
                    fontSize: "0.75rem",
                    color: "primary.main",
                    borderColor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(0, 209, 255, 0.2)" : "rgba(124, 58, 237, 0.2)",
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(0, 209, 255, 0.1)" : "rgba(124, 58, 237, 0.1)",
                  }}
                />

                {unit.uptimeMs != null ? (
                  <Chip
                    icon={<RestartAltIcon sx={{fontSize: "0.9rem !important"}} />}
                    label={`Up ${formatUptime(unit.uptimeMs)}`}
                    size="small"
                    color="success"
                    variant="outlined"
                    sx={{fontWeight: 700, fontSize: "0.7rem"}}
                  />
                ) : (
                  <Chip label="Uptime: N/A" size="small" variant="outlined" sx={{fontWeight: 600, fontSize: "0.7rem"}} />
                )}

                {unit.batteryMv != null ? (
                  (() => {
                    const level = getBatteryLevel(unit.batteryMv);
                    const BatteryIcon = getBatteryIcon(level);
                    const color = getBatteryColor(level);
                    return (
                      <Chip
                        icon={<BatteryIcon sx={{fontSize: "0.9rem !important"}} />}
                        label={`${level}% (${(unit.batteryMv / 1000).toFixed(2)}V)`}
                        size="small"
                        color={color}
                        variant="outlined"
                        sx={{fontWeight: 700, fontSize: "0.7rem"}}
                      />
                    );
                  })()
                ) : (
                  <Chip label="Battery: N/A" size="small" variant="outlined" sx={{fontWeight: 600, fontSize: "0.7rem"}} />
                )}
              </Box>
            </Paper>
          ))}

          <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={onMenuClose} onClick={(event) => event.stopPropagation()}>
            <MenuItem onClick={onEditUnit}>
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>{`Edit unit${menuUnit ? ` (${menuUnit.name})` : ""}`}</ListItemText>
            </MenuItem>
            <MenuItem onClick={onDeleteRequest} sx={{color: "error.main"}}>
              <ListItemIcon>
                <DeleteIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>{`Delete unit${menuUnit ? ` (${menuUnit.name})` : ""}`}</ListItemText>
            </MenuItem>
          </Menu>

          <Dialog open={confirmDeleteUnitId !== null} onClose={onCloseDeleteDialog}>
            <DialogTitle>Delete unit?</DialogTitle>
            <DialogContent>
              <DialogContentText>
                This action cannot be undone. The selected unit will be permanently removed.
              </DialogContentText>
            </DialogContent>
            <DialogActions sx={{p: 2}}>
              <Button onClick={onCloseDeleteDialog} disabled={deletingUnitId !== null}>
                Cancel
              </Button>
              <Button onClick={onConfirmDelete} color="error" variant="contained" disabled={deletingUnitId !== null}>
                {deletingUnitId ? "Deleting..." : "Delete"}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      ) : (
        <Paper variant="outlined" sx={{p: 4, textAlign: "center", borderStyle: "dashed"}}>
          <Typography color="text.secondary">No units found for this system.</Typography>
        </Paper>
      )}
    </>
  );
};

export default UnitsTab;
