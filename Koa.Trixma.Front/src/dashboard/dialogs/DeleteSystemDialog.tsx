import React from "react"
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material"

interface DeleteSystemDialogProps {
  open: boolean
  deleting: boolean
  onConfirm: () => Promise<void>
  onCancel: () => void
}

const DeleteSystemDialog: React.FC<DeleteSystemDialogProps> = ({
  open,
  deleting,
  onConfirm,
  onCancel,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
    >
      <DialogTitle>Delete system?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          This action cannot be undone. All data associated with this system
          will be permanently removed.
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={onCancel}
          disabled={deleting}
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          color="error"
          variant="contained"
          disabled={deleting}
        >
          {deleting ? "Deleting..." : "Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DeleteSystemDialog
