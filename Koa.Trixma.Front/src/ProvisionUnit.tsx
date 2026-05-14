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
  TextField,
  Typography,
} from "@mui/material"
import {
  NorthEast as NorthEastIcon,
} from "@mui/icons-material"
import AppBreadcrumbs from "./components/AppBreadcrumbs"
import { trixma, type System, type UnitProvisioningStatus, type Unit } from "./api"

interface ProvisioningLoadState {
  imei: string
  systems: System[]
  status: UnitProvisioningStatus | null
  error: string | null
}

interface ProvisionUnitProps {
  embedded?: boolean
}

const ProvisionUnit: React.FC<ProvisionUnitProps> = ({ embedded = false }) => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const imei = searchParams.get("imei")?.trim() ?? ""

  const [loadState, setLoadState] = useState<ProvisioningLoadState>({
    imei: "",
    systems: [],
    status: null,
    error: null,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manualImei, setManualImei] = useState("")
  const [unitName, setUnitName] = useState("")
  const [existingUnit, setExistingUnit] = useState<Unit | null>(null)
  const [assignmentModeOverride, setAssignmentModeOverride] = useState<
    "system" | "unassigned" | null
  >(null)
  const [selectedSystemIdOverride, setSelectedSystemIdOverride] = useState<
    string | null
  >(null)

  useEffect(() => {
    if (!imei) {
      return
    }

    let active = true

    const load = async () => {
      const [systemsResponse, statusResponse] = await Promise.all([
        trixma.getSystems(),
        trixma.getUnitProvisioningStatus(imei),
      ])

      if (!active) return

      if (systemsResponse.error) {
        setLoadState({
          imei,
          systems: [],
          status: null,
          error: systemsResponse.error,
        })
        return
      }

      if (statusResponse.error || !statusResponse.data) {
        setLoadState({
          imei,
          systems: systemsResponse.data ?? [],
          status: null,
          error: statusResponse.error ?? "Failed to load provisioning details",
        })
        return
      }

      setLoadState({
        imei,
        systems: systemsResponse.data ?? [],
        status: statusResponse.data,
        error: null,
      })
    }

    void load()

    return () => {
      active = false
    }
  }, [imei])

  const isValidImei = (value: string): boolean => {
    const digits = value.trim().replace(/\D/g, '')
    return digits.length === 15
  }

  useEffect(() => {
    if (!manualImei || !isValidImei(manualImei) || loadState.imei === manualImei.trim()) {
      return
    }

    let active = true

    const load = async () => {
      const trimmedImei = manualImei.trim()
      const [systemsResponse, statusResponse] = await Promise.all([
        trixma.getSystems(),
        trixma.getUnitProvisioningStatus(trimmedImei),
      ])

      if (!active) return

      if (systemsResponse.error) {
        setLoadState({
          imei: trimmedImei,
          systems: [],
          status: null,
          error: systemsResponse.error,
        })
        return
      }

      if (statusResponse.error || !statusResponse.data) {
        setLoadState({
          imei: trimmedImei,
          systems: systemsResponse.data ?? [],
          status: null,
          error: statusResponse.error ?? "Failed to load provisioning details",
        })
        return
      }

      setLoadState({
        imei: trimmedImei,
        systems: systemsResponse.data ?? [],
        status: statusResponse.data,
        error: null,
      })
    }

    void load()

    return () => {
      active = false
    }
  }, [manualImei])

  // Fetch existing unit details if this is a re-provision
  useEffect(() => {
    const rawStatus = loadState.status
    if (!rawStatus?.exists || !rawStatus?.unitId) {
      setExistingUnit(null)
      setUnitName("")
      return
    }

    let active = true

    const load = async () => {
      const { data: unitData, error: unitError } = await trixma.getUnitById(rawStatus.unitId!)

      if (!active) return

      if (unitError || !unitData) {
        setExistingUnit(null)
        setUnitName("")
        return
      }

      setExistingUnit(unitData)
      setUnitName(unitData.name)
    }

    void load()

    return () => {
      active = false
    }
  }, [loadState.status?.exists, loadState.status?.unitId, loadState.imei])

  const imeiError = manualImei && !isValidImei(manualImei) ? 'IMEI must be 15 digits' : ''
  
  const validImei = imei || (manualImei && isValidImei(manualImei) ? manualImei.trim() : '')

  const loading = Boolean(validImei) && loadState.imei !== validImei
  const systems = loadState.imei === validImei ? loadState.systems : []
  const status = loadState.imei === validImei ? loadState.status : null
  const assignmentMode =
    assignmentModeOverride ?? (status?.systemId ? "system" : "unassigned")
  const selectedSystemId = selectedSystemIdOverride ?? status?.systemId ?? ""
  const loadError = loadState.imei === validImei
    ? loadState.error
    : null

  const handleProvision = async () => {
    if (!validImei || imeiError) return
    // If not an existing unit, require a unit name
    if (!existingUnit && !unitName.trim()) return
    if (assignmentMode === "system" && !selectedSystemId) {
      setError("Select a system before provisioning this unit.")
      return
    }

    setSubmitting(true)
    setError(null)

    const { data, error: provisionError } = await trixma.provisionUnit({
      imei: validImei,
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

  const paperContent = (
    <Stack spacing={2.5}>
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
              Setup new unit
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mt: 1.25 }}
            >
              Provision a new unit to a system, or as a stand-alone unit which can be linked later
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
            <Box sx={{ mb: 2.5 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 0.75 }}
              >
                IMEI
              </Typography>
              {imei ? (
                <Typography
                  variant="h6"
                  fontWeight={700}
                  sx={{ fontFamily: "monospace", wordBreak: "break-word" }}
                >
                  {imei}
                </Typography>
              ) : (
                <TextField
                  placeholder="Enter device IMEI (15 digits)"
                  value={manualImei}
                  onChange={(e) => setManualImei(e.target.value)}
                  fullWidth
                  size="small"
                  disabled={submitting}
                  inputProps={{ maxLength: 15 }}
                  error={Boolean(imeiError)}
                  helperText={imeiError}
                />
              )}
            </Box>

            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 0.75 }}
              >
                Unit Name
              </Typography>
              <TextField
                placeholder="Enter unit name"
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                fullWidth
                size="small"
                disabled={submitting || Boolean(existingUnit)}
              />
              {existingUnit && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 0.5 }}
                >
                  This unit already has a name and cannot be changed.
                </Typography>
              )}
            </Box>
          </Paper>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Stack spacing={2.5}>
              {loadError && <Alert severity="error">{loadError}</Alert>}
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
                    onChange={(event) => {
                      setAssignmentModeOverride(
                        event.target.value as "system" | "unassigned",
                      )
                      if (event.target.value === "unassigned") {
                        setSelectedSystemIdOverride("")
                      }
                    }}
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
                        setSelectedSystemIdOverride(event.target.value)
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
                  !validImei ||
                  Boolean(imeiError) ||
                  (!existingUnit && !unitName.trim()) ||
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
  )

  const paper = (
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
      {paperContent}
    </Paper>
  )

  if (embedded) {
    return paper
  }

  return (
    <Box sx={{ maxWidth: 560, mx: "auto", width: "100%" }}>
      <AppBreadcrumbs
        items={[
          { label: "Systems", to: "/" },
          { label: "Units", to: "/" },
          { label: "Provision Unit" },
        ]}
      />
      {paper}
    </Box>
  )
}

export default ProvisionUnit
