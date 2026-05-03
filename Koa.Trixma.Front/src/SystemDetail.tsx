import React, {useCallback, useEffect, useState} from "react";
import {ArrowBack as ArrowBackIcon} from "@mui/icons-material";
import {Box, Button, CircularProgress, Typography} from "@mui/material";
import {useNavigate, useParams, useSearchParams} from "react-router-dom";
import {trixma, type AlarmRule, type System, type Unit} from "./api";
import AddUnitDrawer from "./system-detail/AddUnitDrawer";
import AlarmsTab from "./system-detail/AlarmsTab";
import SettingsTab from "./system-detail/SettingsTab";
import SystemHeader from "./system-detail/SystemHeader";
import SystemTabs, {type SystemDetailTab} from "./system-detail/SystemTabs";
import UnitsTab from "./system-detail/UnitsTab";
import AppBreadcrumbs from "./components/AppBreadcrumbs";

const SystemDetail: React.FC = () => {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: SystemDetailTab =
    tabParam === "alarms" || tabParam === "events"
      ? "alarms"
      : tabParam === "settings"
        ? "settings"
        : "units";
  const [system, setSystem] = useState<System | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuUnit, setMenuUnit] = useState<Unit | null>(null);
  const [confirmDeleteUnitId, setConfirmDeleteUnitId] = useState<string | null>(
    null,
  );
  const [deletingUnitId, setDeletingUnitId] = useState<string | null>(null);
  const [addUnitDrawerOpen, setAddUnitDrawerOpen] = useState(false);
  const [allUnits, setAllUnits] = useState<Unit[]>([]);
  const [allUnitsLoading, setAllUnitsLoading] = useState(false);
  const [allUnitsError, setAllUnitsError] = useState<string | null>(null);
  const [assigningUnitId, setAssigningUnitId] = useState<string | null>(null);
  const [alarmRules, setAlarmRules] = useState<AlarmRule[]>([]);
  const [alarmRulesLoading, setAlarmRulesLoading] = useState(false);
  const [alarmRulesError, setAlarmRulesError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SystemDetailTab>(initialTab);
  const [infoDrawerOpen, setInfoDrawerOpen] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const fetchSystemDetail = async () => {
      try {
        setLoading(true);
        const {data, error} = await trixma.getSystemById(id!);

        if (error) throw new Error(error);
        setSystem(data);

        // After system is fetched, fetch units
        await fetchUnits();
      } catch (err: unknown) {
        console.error("Error fetching system details:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred",
        );
      } finally {
        setLoading(false);
      }
    };

    const fetchUnits = async () => {
      try {
        setUnitsLoading(true);
        const {data, error} = await trixma.getUnitsBySystemId(id!);

        if (error) throw new Error(error);
        setUnits(data || []);
      } catch (err: unknown) {
        console.error("Error fetching units:", err);
        // We don't necessarily want to block the whole page if units fail
      } finally {
        setUnitsLoading(false);
      }
    };

    if (id) {
      fetchSystemDetail();
    }
  }, [id]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, unit: Unit) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setMenuUnit(unit);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuUnit(null);
  };

  const handleDeleteRequest = () => {
    if (menuUnit) {
      setConfirmDeleteUnitId(menuUnit.id);
    }
    handleMenuClose();
  };

  const handleEditUnit = () => {
    if (menuUnit) {
      navigate(`/units/${menuUnit.id}/edit`);
    }
    handleMenuClose();
  };

  const confirmDeleteUnit = async () => {
    if (!confirmDeleteUnitId) return;
    try {
      setDeletingUnitId(confirmDeleteUnitId);
      const {error: delError} = await trixma.deleteUnit(confirmDeleteUnitId);
      if (delError) throw new Error(delError);
      setUnits((prev) => prev.filter((u) => u.id !== confirmDeleteUnitId));
    } catch (err: unknown) {
      console.error("Error deleting unit:", err);
      setError(err instanceof Error ? err.message : "Failed to delete unit");
    } finally {
      setDeletingUnitId(null);
      setConfirmDeleteUnitId(null);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: SystemDetailTab) => {
    setActiveTab(newValue);
    const nextParams = new URLSearchParams(searchParams);
    if (newValue === "units") {
      nextParams.delete("tab");
    } else {
      nextParams.set("tab", newValue);
    }
    setSearchParams(nextParams, {replace: true});
  };

  const fetchAlarmRules = useCallback(async () => {
    if (units.length === 0) {
      setAlarmRules([]);
      setAlarmRulesError(null);
      return;
    }

    try {
      setAlarmRulesLoading(true);
      setAlarmRulesError(null);

      const responses = await Promise.all(
        units.map(async (unit) => {
          const {data, error: fetchError} = await trixma.getAlarmRulesByUnitId(
            unit.id,
          );
          if (fetchError) {
            throw new Error(
              `Failed to load alarms for ${unit.name || unit.id}: ${fetchError}`,
            );
          }
          return data || [];
        }),
      );

      const allRules = responses.flat().sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });

      setAlarmRules(allRules);
    } catch (err: unknown) {
      console.error("Error fetching alarm rules:", err);
      setAlarmRulesError(
        err instanceof Error ? err.message : "Failed to load alarms",
      );
    } finally {
      setAlarmRulesLoading(false);
    }
  }, [units]);

  useEffect(() => {
    if (activeTab === "alarms") {
      void fetchAlarmRules();
    }
  }, [activeTab, fetchAlarmRules]);

  const fetchAllUnits = async () => {
    try {
      setAllUnitsLoading(true);
      setAllUnitsError(null);
      const {data, error: fetchError} = await trixma.getUnits();
      if (fetchError) throw new Error(fetchError);
      setAllUnits(data || []);
    } catch (err: unknown) {
      console.error("Error fetching all units:", err);
      setAllUnitsError(
        err instanceof Error ? err.message : "Failed to load units",
      );
    } finally {
      setAllUnitsLoading(false);
    }
  };

  const handleOpenAddUnitDrawer = () => {
    setAddUnitDrawerOpen(true);
    fetchAllUnits();
  };

  const handleCloseAddUnitDrawer = () => {
    setAddUnitDrawerOpen(false);
  };

  const handleAddUnitToSystem = async (unit: Unit) => {
    if (!id) return;
    try {
      setAssigningUnitId(unit.id);
      const {data: updatedUnit, error: updateError} = await trixma.updateUnit(
        unit.id,
        {
          name: unit.name || "",
          systemId: id,
          imei: unit.imei ?? null,
          nfcId: unit.nfcId ?? null,
          ipAddress: unit.ipAddress ?? null,
          macAddress: unit.macAddress ?? null,
        },
      );
      if (updateError) throw new Error(updateError);

      setAllUnits((prev) =>
        prev.map((u) =>
          u.id === unit.id ? {...u, ...(updatedUnit || {}), systemId: id} : u,
        ),
      );

      setUnits((prev) => {
        const alreadyExists = prev.some((u) => u.id === unit.id);
        if (alreadyExists) {
          return prev.map((u) =>
            u.id === unit.id ? {...u, ...(updatedUnit || {}), systemId: id} : u,
          );
        }
        return [...prev, {...unit, ...(updatedUnit || {}), systemId: id}];
      });
    } catch (err: unknown) {
      console.error("Error adding unit to system:", err);
      setAllUnitsError(
        err instanceof Error ? err.message : "Failed to add unit to system",
      );
    } finally {
      setAssigningUnitId(null);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          py: 8,
        }}
      >
        <CircularProgress size={32} sx={{mb: 2}} />
        <Typography color="text.secondary">
          Loading system details...
        </Typography>
      </Box>
    );
  }

  if (error || !system) {
    return (
      <Box sx={{textAlign: "center", py: 8}}>
        <AppBreadcrumbs items={[{label: "Systems", to: "/"}, {label: "System"}]} />
        <Typography color="error" gutterBottom>
          Error: {error || "System not found"}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/")}
        >
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1000,
        mx: "auto",
        px: {xs: 1, sm: 2, md: 0},
      }}
    >
      <SystemHeader
        system={system}
        infoDrawerOpen={infoDrawerOpen}
        onInfoDrawerOpen={() => setInfoDrawerOpen(true)}
        onInfoDrawerClose={() => setInfoDrawerOpen(false)}
      />

      <SystemTabs activeTab={activeTab} onChange={handleTabChange} />

      <Box sx={{minWidth: 0}}>
        {activeTab === "units" && (
          <UnitsTab
            units={units}
            unitsLoading={unitsLoading}
            onAddUnit={handleOpenAddUnitDrawer}
            menuAnchorEl={menuAnchorEl}
            menuUnit={menuUnit}
            confirmDeleteUnitId={confirmDeleteUnitId}
            deletingUnitId={deletingUnitId}
            onOpenUnit={(unitId) => navigate(`/units/${unitId}`)}
            onMenuOpen={handleMenuOpen}
            onMenuClose={handleMenuClose}
            onEditUnit={handleEditUnit}
            onDeleteRequest={handleDeleteRequest}
            onCloseDeleteDialog={() => setConfirmDeleteUnitId(null)}
            onConfirmDelete={() => {
              void confirmDeleteUnit();
            }}
          />
        )}

        {activeTab === "alarms" && (
          <AlarmsTab
            units={units}
            alarmRules={alarmRules}
            alarmRulesLoading={alarmRulesLoading}
            alarmRulesError={alarmRulesError}
            onRetry={() => {
              void fetchAlarmRules();
            }}
            onCreateAlarm={() => navigate(`/systems/${id}/alarms/new`)}
            onOpenAlarm={(alarmId) => navigate(`/systems/${id}/alarms/${alarmId}`)}
            onEditAlarm={(alarmId) => navigate(`/systems/${id}/alarms/${alarmId}/edit`)}
          />
        )}

        {activeTab === "settings" && <SettingsTab />}
      </Box>

      {id && (
        <AddUnitDrawer
          systemId={id}
          open={addUnitDrawerOpen}
          allUnits={allUnits}
          allUnitsLoading={allUnitsLoading}
          allUnitsError={allUnitsError}
          assigningUnitId={assigningUnitId}
          onClose={handleCloseAddUnitDrawer}
          onOpenUnit={(unitId) => navigate(`/units/${unitId}`)}
          onProvisionUnit={() => navigate("/units/provision")}
          onAddUnitToSystem={(unit) => {
            void handleAddUnitToSystem(unit);
          }}
        />
      )}
    </Box>
  );
};

export default SystemDetail;
