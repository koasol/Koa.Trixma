import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  CircularProgress, 
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  useTheme
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip
} from 'recharts';
import { trixma, type Unit, type Measurement, type GroupedMeasurements } from './trixma';

const UnitDetail: React.FC = () => {
  const theme = useTheme();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [unit, setUnit] = useState<Unit | null>(null);
  const [measurements, setMeasurements] = useState<GroupedMeasurements>({});
  const [period, setPeriod] = useState<string>('24h');
  const [loading, setLoading] = useState(true);
  const [measurementsLoading, setMeasurementsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUnitDetail = async () => {
      try {
        setLoading(true);
        const { data, error } = await trixma.getUnitById(id!);

        if (error) throw new Error(error);
        setUnit(data);
      } catch (err: unknown) {
        console.error('Error fetching unit details:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchUnitDetail();
    }
  }, [id]);

  useEffect(() => {
    const fetchMeasurements = async () => {
      if (!id) return;
      try {
        setMeasurementsLoading(true);
        
        const to = new Date();
        const from = new Date();
        
        switch (period) {
          case '24h': from.setHours(from.getHours() - 24); break;
          case '1w': from.setDate(from.getDate() - 7); break;
          case '1m': from.setMonth(from.getMonth() - 1); break;
          case '3m': from.setMonth(from.getMonth() - 3); break;
          case '6m': from.setMonth(from.getMonth() - 6); break;
          case '1y': from.setFullYear(from.getFullYear() - 1); break;
          default: from.setHours(from.getHours() - 24);
        }

        const { data, error } = await trixma.getMeasurements(
          id, 
          from.toISOString(), 
          to.toISOString()
        );

        if (error) throw new Error(error);
        setMeasurements(data || {});
      } catch (err: unknown) {
        console.error('Error fetching measurements:', err);
      } finally {
        setMeasurementsLoading(false);
      }
    };

    fetchMeasurements();
  }, [id, period]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
        <CircularProgress size={32} sx={{ mb: 2 }} />
        <Typography color="text.secondary">Loading unit details...</Typography>
      </Box>
    );
  }

  if (error || !unit) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography color="error" gutterBottom>Error: {error || 'Unit not found'}</Typography>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate(-1)}
        >
          Go Back
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

  const formatXAxis = (tickItem: string) => {
    const date = new Date(tickItem);
    if (period === '24h') {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderChart = (groupName: string, data: Measurement[]) => {
    const sortedData = [...data].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const lastPoint = sortedData[sortedData.length - 1];
    const lastRecorded = lastPoint ? new Date(lastPoint.timestamp).toLocaleString() : 'N/A';

    const gradientId = `colorValue-${groupName}`;

    return (
      <Box key={groupName} sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ textTransform: 'capitalize', color: 'text.secondary', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {groupName}
          <Chip 
            label={`${data.length} points`} 
            size="small" 
            variant="outlined" 
            sx={{ 
              ml: 1, 
              fontSize: '0.7rem', 
              fontWeight: 'bold',
              height: 20,
              opacity: 0.8
            }} 
          />
          {lastPoint && (
            <Chip 
              label={`Last: ${lastRecorded}`} 
              size="small" 
              variant="outlined" 
              sx={{ 
                fontSize: '0.7rem', 
                fontWeight: 'bold',
                height: 20,
                opacity: 0.8
              }} 
            />
          )}
        </Typography>
        <Paper 
          variant="outlined" 
          sx={{ 
            p: { xs: 1, md: 3 }, 
            borderRadius: 3, 
            bgcolor: 'background.paper',
            height: 350,
            width: '100%',
            overflow: 'hidden'
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={sortedData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                vertical={false} 
                stroke={theme.palette.divider} 
              />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={formatXAxis}
                stroke={theme.palette.text.secondary}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                minTickGap={30}
              />
              <YAxis 
                stroke={theme.palette.text.secondary}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => typeof value === 'number' ? value.toFixed(1) : value}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme.palette.background.paper, 
                  borderColor: theme.palette.divider,
                  borderRadius: '8px',
                  color: theme.palette.text.primary
                }}
                itemStyle={{ color: theme.palette.primary.main }}
                labelFormatter={(label) => new Date(label).toLocaleString()}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={theme.palette.primary.main} 
                fillOpacity={1} 
                fill={`url(#${gradientId})`} 
                strokeWidth={3}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Paper>
      </Box>
    );
  };

  const totalPoints = Object.values(measurements).reduce((acc, current) => acc + current.length, 0);
  
  const latestTimestamp = totalPoints > 0 
    ? new Date(Math.max(...Object.values(measurements).flat().map(m => new Date(m.timestamp).getTime()))).toLocaleString()
    : null;

  return (
    <Box sx={{ width: '100%', maxWidth: 1000, mx: 'auto', px: { xs: 1, sm: 2, md: 0 } }}>
      <Button 
        variant="outlined" 
        startIcon={<ArrowBackIcon />} 
        onClick={() => navigate(`/systems/${unit.systemId}`)}
        sx={{ mb: 4, ml: { xs: 1, md: 0 } }}
      >
        Back to System
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
          {unit.name}
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Chip 
            label={unit.status || 'Unknown'} 
            size="small" 
            color={getStatusColor(unit.status)}
            variant="outlined"
            sx={{ fontWeight: 700, fontSize: '0.7rem', mr: 1 }}
          />
          <Chip 
            label={unit.type || 'N/A'} 
            size="small" 
            variant="outlined"
            sx={{ fontWeight: 700, fontSize: '0.7rem' }}
          />
        </Box>

        <Typography variant="caption" display="block" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
          ID: {unit.id} • Last Update: {unit.updated_at ? new Date(unit.updated_at).toLocaleString() : 'N/A'}
        </Typography>
      </Paper>

      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ mb: 2, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
          <Typography variant="h5" fontWeight="bold" sx={{ color: 'primary.main', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <TimelineIcon /> Unit Measurements
            {totalPoints > 0 && (
              <>
                <Chip 
                  label={`${totalPoints} total`} 
                  size="small" 
                  sx={{ 
                    bgcolor: 'primary.main', 
                    color: 'primary.contrastText',
                    fontWeight: 'bold',
                    fontSize: '0.75rem',
                    ml: 1
                  }} 
                />
                {latestTimestamp && (
                  <Chip 
                    label={`Latest recorded: ${latestTimestamp}`} 
                    size="small" 
                    variant="outlined"
                    sx={{ 
                      borderColor: 'primary.main',
                      color: 'primary.main',
                      fontWeight: 'bold',
                      fontSize: '0.75rem',
                      ml: 1
                    }} 
                  />
                )}
              </>
            )}
          </Typography>
          
          <ToggleButtonGroup
            size="small"
            value={period}
            exclusive
            onChange={(_e, newPeriod) => newPeriod && setPeriod(newPeriod)}
            sx={{ bgcolor: 'background.paper' }}
          >
            <ToggleButton value="24h" sx={{ px: 1.5, py: 0.5, fontSize: '0.75rem', fontWeight: 'bold' }}>24h</ToggleButton>
            <ToggleButton value="1w" sx={{ px: 1.5, py: 0.5, fontSize: '0.75rem', fontWeight: 'bold' }}>1w</ToggleButton>
            <ToggleButton value="1m" sx={{ px: 1.5, py: 0.5, fontSize: '0.75rem', fontWeight: 'bold' }}>1m</ToggleButton>
            <ToggleButton value="3m" sx={{ px: 1.5, py: 0.5, fontSize: '0.75rem', fontWeight: 'bold' }}>3m</ToggleButton>
            <ToggleButton value="6m" sx={{ px: 1.5, py: 0.5, fontSize: '0.75rem', fontWeight: 'bold' }}>6m</ToggleButton>
            <ToggleButton value="1y" sx={{ px: 1.5, py: 0.5, fontSize: '0.75rem', fontWeight: 'bold' }}>1y</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        
        {measurementsLoading ? (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', bgcolor: 'background.paper' }}>
            <CircularProgress size={24} sx={{ mb: 1 }} />
            <Typography variant="body2" color="text.secondary">Fetching measurements...</Typography>
          </Paper>
        ) : Object.keys(measurements).length > 0 ? (
          Object.entries(measurements).map(([groupName, groupData]) => renderChart(groupName, groupData))
        ) : (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderStyle: 'dashed' }}>
            <Typography color="text.secondary">No measurements found for this unit in the selected period ({period}).</Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default UnitDetail;
