import { useState, useEffect, useMemo } from 'react'
import { Routes, Route, useNavigate, Link as RouterLink } from 'react-router-dom';
import { signInWithPopup, onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { 
  ThemeProvider, 
  CssBaseline, 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  IconButton, 
  Avatar, 
  Menu, 
  MenuItem, 
  Box, 
  Container,
  Tooltip,
  CircularProgress,
  useMediaQuery
} from '@mui/material';
import { 
  Brightness4 as DarkModeIcon, 
  Brightness7 as LightModeIcon,
  KeyboardArrowDown as ArrowDownIcon
} from '@mui/icons-material';
import { auth, googleProvider } from './assets/firebase';
import Dashboard from './Dashboard';
import SystemDetail from './SystemDetail';
import SystemForm from './SystemForm';
import UnitDetail from './UnitDetail';
import { getTheme } from './theme';

function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [anchorElMenu, setAnchorElMenu] = useState<null | HTMLElement>(null);
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
    }
    return 'dark'
  })

  const theme = useMemo(() => getTheme(themeMode), [themeMode]);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', themeMode)
  }, [themeMode])

  const toggleTheme = () => {
    setThemeMode(prev => prev === 'light' ? 'dark' : 'light')
  }

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElMenu(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorElMenu(null);
  };

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      console.log('User logged in:', result.user);
    } catch (error) {
      console.error('Login failed:', error);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      handleCloseUserMenu();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh',
            bgcolor: 'background.default',
            color: 'text.primary'
          }}
        >
          <CircularProgress color="primary" sx={{ mb: 2 }} />
          <Typography variant="body1">Loading...</Typography>
        </Box>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AppBar 
          position="sticky" 
          elevation={0}
          sx={{ 
            bgcolor: themeMode === 'dark' ? 'rgba(0, 15, 29, 0.8)' : 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(12px)',
            borderBottom: 1,
            borderColor: 'divider',
            color: 'text.primary'
          }}
        >
          <Container maxWidth="lg">
            <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
              <Typography
                variant="h6"
                noWrap
                component={RouterLink}
                to="/"
                sx={{
                  fontWeight: 800,
                  letterSpacing: '-0.04em',
                  color: 'inherit',
                  textDecoration: 'none',
                  fontSize: '1.5rem'
                }}
              >
                Trixma|<Box component="span" sx={{ display: 'inline-block', transform: 'scaleX(-1)' }}>Trixma</Box>
              </Typography>

              {!isMobile && (
                <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }}>
                  <Button
                    onClick={handleOpenMenu}
                    endIcon={<ArrowDownIcon />}
                    sx={{ color: 'inherit', fontSize: '1rem' }}
                  >
                    Menu
                  </Button>
                  <Menu
                    anchorEl={anchorElMenu}
                    open={Boolean(anchorElMenu)}
                    onClose={handleCloseMenu}
                  >
                    <MenuItem component="a" href="#link1" onClick={handleCloseMenu}>Example Link 1</MenuItem>
                    <MenuItem component="a" href="#link2" onClick={handleCloseMenu}>Example Link 2</MenuItem>
                    <MenuItem component="a" href="#link3" onClick={handleCloseMenu}>Example Link 3</MenuItem>
                  </Menu>
                </Box>
              )}

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Tooltip title="Toggle theme">
                  <IconButton onClick={toggleTheme} color="inherit">
                    {themeMode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
                  </IconButton>
                </Tooltip>

                {user ? (
                  <Box sx={{ flexGrow: 0 }}>
                    <Tooltip title="Open settings">
                      <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                        <Avatar alt={user.displayName || ''} src={user.photoURL || undefined} />
                      </IconButton>
                    </Tooltip>
                    <Menu
                      sx={{ mt: '45px' }}
                      id="menu-appbar"
                      anchorEl={anchorElUser}
                      anchorOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                      }}
                      keepMounted
                      transformOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                      }}
                      open={Boolean(anchorElUser)}
                      onClose={handleCloseUserMenu}
                    >
                      <Box sx={{ px: 2, py: 1, textAlign: 'center', minWidth: 200 }}>
                        <Avatar 
                          alt={user.displayName || ''} 
                          src={user.photoURL || undefined} 
                          sx={{ width: 64, height: 64, mx: 'auto', mb: 1, border: 1, borderColor: 'divider' }}
                        />
                        <Typography variant="subtitle1" fontWeight="bold">{user.displayName}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, wordBreak: 'break-all' }}>{user.email}</Typography>
                        <Button 
                          fullWidth 
                          variant="contained" 
                          color="error" 
                          onClick={handleLogout}
                          sx={{ mb: 1 }}
                        >
                          Logout
                        </Button>
                        {import.meta.env.VITE_BUILD_ID && (
                          <Typography 
                            variant="caption" 
                            display="block" 
                            sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider', opacity: 0.7, fontFamily: 'monospace' }}
                          >
                            Build: {import.meta.env.VITE_BUILD_ID.substring(0, 7)}
                          </Typography>
                        )}
                      </Box>
                    </Menu>
                  </Box>
                ) : (
                  <Button variant="contained" onClick={handleLogin}>Login</Button>
                )}
              </Box>
            </Toolbar>
          </Container>
        </AppBar>

        <Container component="main" maxWidth="lg" sx={{ flexGrow: 1, py: { xs: 2, md: 4 }, px: { xs: 1, sm: 2, md: 3 }, display: 'flex', flexDirection: 'column' }}>
          <Routes>
            <Route path="/" element={
              user ? (
                <Dashboard user={user} />
              ) : (
                <Box 
                  sx={{ 
                    flexGrow: 1, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    textAlign: 'center',
                    py: 8
                  }}
                >
                  <Box 
                    sx={{ 
                      maxWidth: 900,
                      px: 2
                    }}
                  >
                    <Button 
                      variant="contained" 
                      size="large" 
                      onClick={handleLogin}
                      sx={{ mb: 3, px: 4, py: 1.5, fontSize: '1.1rem', fontWeight: 700 }}
                    >
                      Sign in with Google
                    </Button>
                    <Typography 
                      variant="h1" 
                      sx={{ 
                        fontSize: { xs: '2.5rem', md: '4.5rem' },
                        background: themeMode === 'dark' 
                          ? 'linear-gradient(to bottom, #ffffff 0%, #00d1ff 100%)'
                          : 'linear-gradient(to bottom, #171717 0%, #7c3aed 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        mb: 2
                      }}
                    >
                      Connecting your ideas to your data
                    </Typography>
                  </Box>
                </Box>
              )
            } />
            <Route path="/systems/new" element={
              user ? <SystemForm /> : <Box sx={{ textAlign: 'center', mt: 8 }}><Typography variant="h4" gutterBottom>Please login to create systems</Typography><Button variant="contained" onClick={handleLogin}>Login</Button></Box>
            } />
            <Route path="/systems/:id/edit" element={
              user ? <SystemForm /> : <Box sx={{ textAlign: 'center', mt: 8 }}><Typography variant="h4" gutterBottom>Please login to edit systems</Typography><Button variant="contained" onClick={handleLogin}>Login</Button></Box>
            } />
            <Route path="/systems/:id" element={
              user ? <SystemDetail /> : <Box sx={{ textAlign: 'center', mt: 8 }}><Typography variant="h4" gutterBottom>Please login to view system details</Typography><Button variant="contained" onClick={handleLogin}>Login</Button></Box>
            } />
            <Route path="/units/:id" element={
              user ? <UnitDetail /> : <Box sx={{ textAlign: 'center', mt: 8 }}><Typography variant="h4" gutterBottom>Please login to view unit details</Typography><Button variant="contained" onClick={handleLogin}>Login</Button></Box>
            } />
          </Routes>
        </Container>
      </Box>
    </ThemeProvider>
  )
}

export default App
