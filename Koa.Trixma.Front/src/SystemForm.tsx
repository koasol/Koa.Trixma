import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Button, 
  TextField, 
  Paper, 
  CircularProgress, 
  Alert,
  Stack
} from '@mui/material';
import { 
  Save as SaveIcon
} from '@mui/icons-material';
import { trixma } from './trixma';

const SystemForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditMode && id) {
      const fetchSystem = async () => {
        try {
          setFetching(true);
          const { data, error: fetchError } = await trixma.getSystemById(id);
          if (fetchError) throw new Error(fetchError);
          if (data) {
            setName(data.name);
            setDescription(data.description || '');
          }
        } catch (err: unknown) {
          console.error('Error fetching system:', err);
          setError(err instanceof Error ? err.message : 'Failed to load system details');
        } finally {
          setFetching(false);
        }
      };
      fetchSystem();
    }
  }, [id, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      let response;
      if (isEditMode && id) {
        response = await trixma.updateSystem(id, { name, description });
      } else {
        response = await trixma.createSystem({ name, description });
      }

      const { data, error: apiError } = response;

      if (apiError) throw new Error(apiError);
      
      console.log(isEditMode ? 'System updated:' : 'System created:', data);
      navigate('/');
    } catch (err: unknown) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} system:`, err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: 1, borderColor: 'divider', borderRadius: 3 }}>
          <CircularProgress size={32} sx={{ mb: 2 }} />
          <Typography color="text.secondary">Loading system details...</Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', width: '100%' }}>
      <Paper 
        elevation={0} 
        sx={{ 
          p: { xs: 3, md: 5 }, 
          border: 1, 
          borderColor: 'divider', 
          borderRadius: 4,
          bgcolor: 'background.paper'
        }}
      >
        <Typography variant="h4" component="h1" fontWeight="800" gutterBottom>
          {isEditMode ? 'Edit System' : 'Add New System'}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          {isEditMode ? 'Update the details of your system.' : 'Fill in the details below to create a new system.'}
        </Typography>
        
        <Box component="form" onSubmit={handleSubmit}>
          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}
          
          <Stack spacing={3}>
            <TextField
              label="System Name"
              variant="outlined"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Production Cluster"
              disabled={loading}
              autoFocus
              required
            />
            
            <TextField
              label="Description"
              variant="outlined"
              fullWidth
              multiline
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a brief description of the system..."
              disabled={loading}
            />
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
              <Button 
                variant="outlined" 
                onClick={() => navigate('/')} 
                disabled={loading}
                sx={{ px: 3 }}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="contained" 
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                sx={{ px: 4, fontWeight: 700 }}
              >
                {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update System' : 'Create System')}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
};

export default SystemForm;
