import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  CircularProgress,
  Chip
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Storage as StorageIcon
} from '@mui/icons-material';
import { trixma, type System, type Unit } from './trixma';

const SystemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [system, setSystem] = useState<System | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    const fetchSystemDetail = async () => {
      try {
        setLoading(true);
        const { data, error } = await trixma.getSystemById(id!);

        if (error) throw new Error(error);
        setSystem(data);
        
        // After system is fetched, fetch units
        await fetchUnits();
      } catch (err: unknown) {
        console.error('Error fetching system details:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    const fetchUnits = async () => {
      try {
        setUnitsLoading(true);
        const { data, error } = await trixma.getUnitsBySystemId(id!);

        if (error) throw new Error(error);
        setUnits(data || []);
      } catch (err: unknown) {
        console.error('Error fetching units:', err);
        // We don't necessarily want to block the whole page if units fail
      } finally {
        setUnitsLoading(false);
      }
    };

    if (id) {
      fetchSystemDetail();
    }
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
        <CircularProgress size={32} sx={{ mb: 2 }} />
        <Typography color="text.secondary">Loading system details...</Typography>
      </Box>
    );
  }

  if (error || !system) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography color="error" gutterBottom>Error: {error || 'System not found'}</Typography>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate('/')}
        >
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  const getStatusColor = (status?: string): import('@mui/material').ChipProps['color'] => {
    const s = status?.toLowerCase();
    if (s === 'online' || s === 'active') return 'success';
    if (s === 'offline' || s === 'inactive') return 'error';
    return 'default';
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 1000, mx: 'auto', px: { xs: 1, sm: 2, md: 0 } }}>
      <Button 
        variant="outlined" 
        startIcon={<ArrowBackIcon />} 
        onClick={() => navigate('/')}
        sx={{ mb: 4, ml: { xs: 1, md: 0 } }}
      >
        Back to Dashboard
      </Button>
      
      <Paper 
        elevation={0} 
        sx={{ 
          p: { xs: 2, md: 3 }, 
          border: 1, 
          borderColor: 'divider', 
          borderRadius: 4,
          bgcolor: 'background.paper',
          mb: 4
        }}
      >
        <Typography variant="h4" gutterBottom fontWeight="800" sx={{ 
          background: (theme) => `linear-gradient(135deg, ${theme.palette.text.primary} 0%, ${theme.palette.primary.main} 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          {system.name}
        </Typography>
        <Typography variant="caption" display="block" color="text.secondary" sx={{ fontFamily: 'monospace', mb: system.description ? 3 : 0 }}>
          ID: {system.id} • Created on {(system.createdAt || system.created_at) ? new Date((system.createdAt || system.created_at)!).toLocaleString() : 'N/A'}
        </Typography>
        
        {system.description && (
          <Box>
            <Typography variant="subtitle2" color="primary" gutterBottom sx={{ borderBottom: 1, borderColor: 'divider', pb: 0.5, fontWeight: 'bold' }}>
              Description
            </Typography>
            <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
              {system.description}
            </Typography>
          </Box>
        )}
      </Paper>

      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h5" gutterBottom fontWeight="bold" sx={{ color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <StorageIcon /> System Units
        </Typography>
        
        {unitsLoading ? (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', bgcolor: 'background.paper' }}>
            <CircularProgress size={24} sx={{ mb: 1 }} />
            <Typography variant="body2" color="text.secondary">Fetching units...</Typography>
          </Paper>
        ) : units.length > 0 ? (
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, width: '100%', overflowX: 'auto' }}>
            <Table size="medium" sx={{ minWidth: 600 }}>
              <TableHead sx={{ bgcolor: 'background.paper' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.75rem' }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.75rem' }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.75rem' }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.75rem' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.75rem' }}>Last Update</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {units.map((unit) => (
                  <TableRow 
                    key={unit.id} 
                    hover 
                    onClick={() => navigate(`/units/${unit.id}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Chip 
                        label={unit.id} 
                        size="small" 
                        variant="outlined" 
                        sx={{ 
                          fontFamily: 'monospace', 
                          fontSize: '0.75rem',
                          color: 'primary.main',
                          borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(0, 209, 255, 0.2)' : 'rgba(124, 58, 237, 0.2)',
                          bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(0, 209, 255, 0.1)' : 'rgba(124, 58, 237, 0.1)'
                        }} 
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{unit.name}</TableCell>
                    <TableCell>{unit.type || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={unit.status || 'Unknown'} 
                        size="small" 
                        color={getStatusColor(unit.status)}
                        variant="outlined"
                        sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                      {unit.updated_at ? new Date(unit.updated_at).toLocaleString() : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderStyle: 'dashed' }}>
            <Typography color="text.secondary">No units found for this system.</Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default SystemDetail;
