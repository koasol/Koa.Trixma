import React from "react"
import {
  Dialog,
  DialogContent,
} from "@mui/material"
import ProvisionUnit from "../../ProvisionUnit"

interface ProvisioningDialogProps {
  open: boolean
  onClose: () => void
}

const ProvisioningDialog: React.FC<ProvisioningDialogProps> = ({
  open,
  onClose,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogContent sx={{ p: 0 }}>
        <ProvisionUnit embedded />
      </DialogContent>
    </Dialog>
  )
}

export default ProvisioningDialog
