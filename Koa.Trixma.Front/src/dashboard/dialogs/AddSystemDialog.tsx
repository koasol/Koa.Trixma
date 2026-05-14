import React from "react"
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Stack,
  TextField,
  Typography,
  Box,
} from "@mui/material"

interface AddSystemDialogProps {
  open: boolean
  submitting: boolean
  error: string | null
  name: string
  description: string
  onNameChange: (name: string) => void
  onDescriptionChange: (description: string) => void
  onSubmit: () => Promise<void>
  onClose: () => void
}

const AddSystemDialog: React.FC<AddSystemDialogProps> = ({
  open,
  submitting,
  error,
  name,
  description,
  onNameChange,
  onDescriptionChange,
  onSubmit,
  onClose,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ mb: 2.5 }}>
          <Typography
            variant="overline"
            color="primary.main"
            fontWeight={700}
          >
            System setup
          </Typography>
          <Typography
            variant="h5"
            component="h2"
            fontWeight={800}
            sx={{ lineHeight: 1.1, mt: 0.5 }}
          >
            Add system
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1 }}
          >
            Create a new system to organize your units.
          </Typography>
        </Box>
        <Stack spacing={1.5} sx={{ mt: 2 }}>
          <TextField
            autoFocus
            label="System name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            size="small"
            fullWidth
            required
          />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            size="small"
            fullWidth
            multiline
            minRows={2}
          />
          {error && (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          variant="contained"
          disabled={submitting}
        >
          {submitting ? "Adding..." : "Add system"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default AddSystemDialog
