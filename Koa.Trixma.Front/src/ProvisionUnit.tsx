import React, { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Typography,
} from "@mui/material"
import {
  Memory as MemoryIcon,
  NorthEast as NorthEastIcon,
} from "@mui/icons-material"
import AppBreadcrumbs from "./components/AppBreadcrumbs"
import { trixma, type System, type UnitProvisioningStatus } from "./api"

const ProvisionUnit: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const imei = searchParams.get("imei")?.trim() ?? ""

  const [systems, setSystems] = useState<System[]>([])
  const [status, setStatus] = useState<UnitProvisioningStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [assignmentMode, setAssignmentMode] = useState<"system" | "unassigned">(
    "unassigned",
  )
  const [selectedSystemId, setSelectedSystemId] = useState<string>("")

  useEffect(() => {
    if (!imei) {
      setLoading(false)
      setError("No IMEI was provided in the provisioning link.")
      return
    }

    let active = true

    const load = async () => {
      setLoading(true)
      setError(null)

      const [systemsResponse, statusResponse] = await Promise.all([
        trixma.getSystems(),
        trixma.getUnitProvisioningStatus(imei),
      ])

      if (!active) return

      if (systemsResponse.error) {
        setError(systemsResponse.error)
        setLoading(false)
        return
      }

      if (statusResponse.error || !statusResponse.data) {
        setError(statusResponse.error ?? "Failed to load provisioning details")
        setLoading(false)
        return
      }

      setSystems(systemsResponse.data ?? [])
      setStatus(statusResponse.data)
      if (statusResponse.data.systemId) {
        setAssignmentMode("system")
        setSelectedSystemId(statusResponse.data.systemId)
      }
      setLoading(false)
    }

    void load()

    return () => {
      active = false
    }
  }, [imei])

  const handleProvision = async () => {
    if (!imei) return
    if (assignmentMode === "system" && !selectedSystemId) {
      setError("Select a system before provisioning this unit.")
      return
    }

    setSubmitting(true)
    setError(null)

    const { data, error: provisionError } = await trixma.provisionUnit({
      imei,
      systemId: assignmentMode === "system" ? selectedSystemId : null,
    })

    setSubmitting(false)

    if (provisionError || !data) {
      setError(provisionError ?? "Failed to provision unit")
      return
    }

    navigate(`/units/${data.id}`)
  }

  const linkedMessage = (() => {
    if (!status) return null
    if (!status.exists) {
      return {
        severity: "info" as const,
        text: "This device is new and ready to be provisioned.",
      }
    }
    if (!status.canProvision) {
      return {
        severity: "warning" as const,
        text: "This IMEI is already linked to another account and cannot be provisioned from this user.",
      }
    }
    if (status.isAssigned && status.systemName) {
      return {
        severity: "info" as const,
        text: `This unit is already linked to ${status.systemName}. You can keep it there, move it, or leave it unassigned.`,
      }
    }
    return {
      severity: "info" as const,
      text: "This unit is already linked to your account and currently unassigned.",
    }
  })()

  return (
    <Box sx={{ maxWidth: 560, mx: "auto", width: "100%" }}>
      <AppBreadcrumbs
        items={[
          { label: "Systems", to: "/" },
          { label: "Units", to: "/" },
          { label: "Provision Unit" },
        ]}
      />

      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 4 },
          border: 1,
          borderColor: "divider",
          borderRadius: 4,
          bgcolor: "background.paper",
          backgroundImage:
            "radial-gradient(circle at top, rgba(25,118,210,0.10), transparent 55%)",
        }}
      >
        <Stack spacing={2.5}>
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: "24px",
              display: "grid",
              placeItems: "center",
              bgcolor: "primary.main",
              color: "primary.contrastText",
              boxShadow: (theme) => theme.shadows[6],
            }}
          >
            <MemoryIcon sx={{ fontSize: 36 }} />
          </Box>

          <Box>
            <Typography
              variant="overline"
              color="primary.main"
              fontWeight={700}
            >
              Device provisioning
            </Typography>
            <Typography
              variant="h4"
              component="h1"
              fontWeight={800}
              sx={{ lineHeight: 1.1, mt: 0.5 }}
            >
              Link this unit to your account
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mt: 1.25 }}
            >
              Opened from the device onboarding link on your phone. Confirm
              where this unit should live before finishing provisioning.
            </Typography>
          </Box>

          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 3,
              bgcolor: "background.default",
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 0.75 }}
            >
              IMEI
            </Typography>
            <Typography
              variant="h6"
              fontWeight={700}
              sx={{ fontFamily: "monospace", wordBreak: "break-word" }}
            >
              {imei || "Missing IMEI"}
            </Typography>
          </Paper>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Stack spacing={2.5}>
              {error && <Alert severity="error">{error}</Alert>}

              {linkedMessage && (
                <Alert severity={linkedMessage.severity}>
                  {linkedMessage.text}
                </Alert>
              )}

              {status?.isAssigned && status.systemName && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Current system:
                  </Typography>
                  <Chip
                    label={status.systemName}
                    color="primary"
                    variant="outlined"
                  />
                </Box>
              )}

              <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  sx={{ mb: 1.5 }}
                >
                  Assignment
                </Typography>
                <FormControl fullWidth>
                  <RadioGroup
                    value={assignmentMode}
                    onChange={(event) =>
                      setAssignmentMode(
                        event.target.value as "system" | "unassigned",
                      )
                    }
                  >
                    <FormControlLabel
                      value="unassigned"
                      control={<Radio />}
                      label="Leave unit unassigned for now"
                    />
                    <FormControlLabel
                      value="system"
                      control={<Radio />}
                      label="Add unit directly to a system"
                    />
                  </RadioGroup>
                </FormControl>

                {assignmentMode === "system" && (
                  <FormControl fullWidth sx={{ mt: 1.5 }}>
                    <Select
                      displayEmpty
                      value={selectedSystemId}
                      onChange={(event) =>
                        setSelectedSystemId(event.target.value)
                      }
                    >
                      <MenuItem value="" disabled>
                        Select a system
                      </MenuItem>
                      {systems.map((system) => (
                        <MenuItem key={system.id} value={system.id}>
                          {system.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Paper>

              <Button
                variant="contained"
                size="large"
                fullWidth
                endIcon={
                  submitting ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <NorthEastIcon />
                  )
                }
                disabled={
                  submitting ||
                  !imei ||
                  Boolean(status && !status.canProvision) ||
                  (assignmentMode === "system" && !selectedSystemId)
                }
                onClick={handleProvision}
                sx={{ py: 1.5, fontWeight: 700, borderRadius: 999 }}
              >
                {status?.exists ? "Provision unit" : "Add and provision unit"}
              </Button>
            </Stack>
          )}
        </Stack>
      </Paper>
    </Box>
  )
}

export default ProvisionUnit
