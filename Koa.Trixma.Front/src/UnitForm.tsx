import React, {useEffect, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  CircularProgress,
  Alert,
  Stack,
} from "@mui/material";
import {Save as SaveIcon} from "@mui/icons-material";
import {trixma} from "./api";
import AppBreadcrumbs from "./components/AppBreadcrumbs";

const UnitForm: React.FC = () => {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [imei, setImei] = useState("");
  const [nfcId, setNfcId] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [macAddress, setMacAddress] = useState("");
  const [systemId, setSystemId] = useState<string | null>(null);
  const [systemName, setSystemName] = useState("System");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("Unit id is missing");
      setFetching(false);
      return;
    }

    const fetchUnit = async () => {
      try {
        setFetching(true);
        const {data, error: fetchError} = await trixma.getUnitById(id);
        if (fetchError) throw new Error(fetchError);
        if (!data) throw new Error("Unit not found");

        setName(data.name || "");
        setImei(data.imei || "");
        setNfcId(data.nfcId || "");
        setIpAddress(data.ipAddress || "");
        setMacAddress(data.macAddress || "");
        setSystemId(data.systemId);
      } catch (err: unknown) {
        console.error("Error fetching unit:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load unit details",
        );
      } finally {
        setFetching(false);
      }
    };

    fetchUnit();
  }, [id]);

  useEffect(() => {
    if (!systemId) {
      setSystemName("System");
      return;
    }

    let isActive = true;
    const fetchSystemName = async () => {
      const {data} = await trixma.getSystemById(systemId);
      if (!isActive) return;
      setSystemName(data?.name || "System");
    };

    void fetchSystemName();
    return () => {
      isActive = false;
    };
  }, [systemId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const {error: apiError} = await trixma.updateUnit(id, {
        name,
        imei: imei.trim() ? imei.trim() : null,
        nfcId: nfcId.trim() ? nfcId.trim() : null,
        ipAddress: ipAddress.trim() ? ipAddress.trim() : null,
        macAddress: macAddress.trim() ? macAddress.trim() : null,
      });

      if (apiError) throw new Error(apiError);
      navigate(`/units/${id}`);
    } catch (err: unknown) {
      console.error("Error updating unit:", err);
      setError(err instanceof Error ? err.message : "Failed to update unit");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <Box sx={{display: "flex", justifyContent: "center", py: 8}}>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: "center",
            border: 1,
            borderColor: "divider",
            borderRadius: 3,
          }}
        >
          <CircularProgress size={32} sx={{mb: 2}} />
          <Typography color="text.secondary">
            Loading unit details...
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{maxWidth: 700, mx: "auto", width: "100%"}}>
      <AppBreadcrumbs
        items={[
          {label: "Systems", to: "/"},
          {label: systemName, to: systemId ? `/systems/${systemId}` : "/"},
          {label: "Units", to: systemId ? `/systems/${systemId}?tab=units` : "/"},
          {label: name || "Unit", to: id ? `/units/${id}` : "/"},
          {label: "Edit"},
        ]}
      />

      <Paper
        elevation={0}
        sx={{
          p: {xs: 3, md: 5},
          border: 1,
          borderColor: "divider",
          borderRadius: 4,
          bgcolor: "background.paper",
        }}
      >
        <Typography variant="h4" component="h1" fontWeight="800" gutterBottom>
          Edit Unit
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{mb: 4}}>
          Update the details for this unit.
        </Typography>

        <Box component="form" onSubmit={handleSubmit}>
          {error && (
            <Alert severity="error" sx={{mb: 3, borderRadius: 2}}>
              {error}
            </Alert>
          )}

          <Stack spacing={3}>
            <TextField
              label="Unit Name"
              variant="outlined"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main Sensor Unit"
              disabled={loading}
              autoFocus
            />

            <TextField
              label="IMEI"
              variant="outlined"
              fullWidth
              value={imei}
              onChange={(e) => setImei(e.target.value)}
              placeholder="e.g. 359404230234776"
              disabled={loading}
            />

            <TextField
              label="NFC ID"
              variant="outlined"
              fullWidth
              value={nfcId}
              onChange={(e) => setNfcId(e.target.value)}
              placeholder="e.g. A22D0201"
              disabled={loading}
            />

            <TextField
              label="IP Address"
              variant="outlined"
              fullWidth
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              placeholder="e.g. 192.168.1.100"
              disabled={loading}
            />

            <TextField
              label="MAC Address"
              variant="outlined"
              fullWidth
              value={macAddress}
              onChange={(e) => setMacAddress(e.target.value)}
              placeholder="e.g. 00:1A:2B:3C:4D:5E"
              disabled={loading}
            />

            <TextField
              label="System ID"
              variant="outlined"
              fullWidth
              value={systemId || ""}
              disabled
              helperText="System assignment is currently read-only on this page."
            />

            <Box
              sx={{display: "flex", justifyContent: "flex-end", gap: 2, mt: 2}}
            >
              <Button
                variant="outlined"
                onClick={() => (id ? navigate(`/units/${id}`) : navigate("/"))}
                disabled={loading}
                sx={{px: 3}}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                startIcon={
                  loading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <SaveIcon />
                  )
                }
                sx={{px: 4, fontWeight: 700}}
              >
                {loading ? "Updating..." : "Update Unit"}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
};

export default UnitForm;
