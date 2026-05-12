import {useState, useEffect, useMemo} from "react";
import {useNavigate, useLocation, Link as RouterLink} from "react-router-dom";
import {
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth";
import {
  ThemeProvider,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Avatar,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Menu,
  MenuItem,
  Box,
  Container,
  Tooltip,
  CircularProgress,
  useMediaQuery,
} from "@mui/material";
import {alpha} from "@mui/material/styles";
import {useRightPanel} from "./contexts/RightPanelContext";
import {RightPanelProvider} from "./contexts/RightPanelProvider";
import {ToastContainer} from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  SpaceDashboard as OverviewIcon,
  Hub as SystemsIcon,
  Memory as UnitsIcon,
  NotificationsActive as AlarmsIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import {auth, googleProvider} from "./assets/firebase";
import {getTheme} from "./theme";
import AppRoutes from "./AppRoutes";

const DRAWER_WIDTH = 250;
const DRAWER_COLLAPSED_WIDTH = 76;

const navItems = [
  {
    id: "overview",
    label: "Overview",
    to: "/?view=overview",
    icon: <OverviewIcon />,
  },
  {
    id: "systems",
    label: "Systems",
    to: "/?view=systems",
    icon: <SystemsIcon />,
  },
  {id: "units", label: "Units", to: "/?view=units", icon: <UnitsIcon />},
  {id: "alarms", label: "Alarms", to: "/?view=alarms", icon: <AlarmsIcon />},
  {
    id: "settings",
    label: "Settings",
    to: "/?view=settings",
    icon: <SettingsIcon />,
  },
] as const;

function AppInner() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
  const [anchorElTheme, setAnchorElTheme] = useState<null | HTMLElement>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [desktopNavCollapsed, setDesktopNavCollapsed] = useState(false);
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "trixma">(
    () => {
      if (typeof window !== "undefined") {
        const savedTheme = localStorage.getItem("theme");
        if (
          savedTheme === "light" ||
          savedTheme === "dark" ||
          savedTheme === "trixma"
        )
          return savedTheme;
        return window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark";
      }
      return "dark";
    },
  );

  const theme = useMemo(() => getTheme(themeMode), [themeMode]);
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const {panelContent, panelWidth} = useRightPanel();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    localStorage.setItem("theme", themeMode);
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode((prev) => {
      if (prev === "light") return "dark";
      if (prev === "dark") return "trixma";
      return "light";
    });
  };

  const handleSetTheme = (theme: "light" | "dark" | "trixma") => {
    setThemeMode(theme);
    setAnchorElTheme(null);
  };

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleOpenThemeMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElTheme(event.currentTarget);
  };

  const handleCloseThemeMenu = () => {
    setAnchorElTheme(null);
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      console.log("User logged in:", result.user);
    } catch (error) {
      console.error("Login failed:", error);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      handleCloseUserMenu();
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
      setLoading(false);
    }
  };

  const handleNavToggle = () => {
    if (!user) return;
    if (isMobile) {
      setMobileDrawerOpen(true);
      return;
    }
    setDesktopNavCollapsed((prev) => !prev);
  };

  const closeMobileDrawer = () => {
    setMobileDrawerOpen(false);
  };

  const selectedHomeView =
    new URLSearchParams(location.search).get("view") || "overview";

  const isNavItemActive = (itemId: string) => {
    if (itemId === "systems") {
      return (
        location.pathname.startsWith("/systems") ||
        (location.pathname === "/" && selectedHomeView === "systems")
      );
    }
    if (itemId === "units") {
      return (
        location.pathname.startsWith("/units") ||
        (location.pathname === "/" && selectedHomeView === "units")
      );
    }
    if (itemId === "alarms") {
      return (
        location.pathname.includes("/alarms") ||
        location.pathname.includes("/events") ||
        (location.pathname === "/" && selectedHomeView === "alarms")
      );
    }
    if (itemId === "settings") {
      return location.pathname === "/" && selectedHomeView === "settings";
    }
    return location.pathname === "/" && selectedHomeView === "overview";
  };

  const drawerContent = (
    <Box sx={{height: "100%", display: "flex", flexDirection: "column"}}>
      <Toolbar
        sx={{
          minHeight: "64px !important",
          px: 1,
          justifyContent:
            desktopNavCollapsed && !isMobile ? "center" : "space-between",
        }}
      >
        {(!desktopNavCollapsed || isMobile) && (
          <Typography variant="subtitle2" sx={{fontWeight: 700, pl: 1}}>
            Navigation
          </Typography>
        )}
        {!isMobile && (
          <IconButton onClick={() => setDesktopNavCollapsed((prev) => !prev)}>
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Toolbar>
      <Divider />
      <List sx={{pt: 1}}>
        {navItems.map((item) => (
          <ListItemButton
            key={item.id}
            component={RouterLink}
            to={item.to}
            selected={isNavItemActive(item.id)}
            onClick={closeMobileDrawer}
            sx={{
              mx: 1,
              mb: 0.5,
              borderRadius: 1.5,
              minHeight: 46,
              justifyContent:
                desktopNavCollapsed && !isMobile ? "center" : "flex-start",
              px: 1.5,
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: desktopNavCollapsed && !isMobile ? 0 : 36,
                mr: desktopNavCollapsed && !isMobile ? 0 : 1,
                justifyContent: "center",
                color: "inherit",
              }}
            >
              {item.icon}
            </ListItemIcon>
            {(!desktopNavCollapsed || isMobile) && (
              <ListItemText primary={item.label} />
            )}
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            bgcolor: "background.default",
            color: "text.primary",
          }}
        >
          <CircularProgress color="primary" sx={{mb: 2}} />
          <Typography variant="body1">Loading...</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{display: "flex", minHeight: "100vh"}}>
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            zIndex: (t) => t.zIndex.drawer + 1,
            bgcolor:
              themeMode === "dark"
                ? "rgba(0, 15, 29, 0.8)"
                : "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(12px)",
            borderBottom: 1,
            borderColor: "divider",
            color: "text.primary",
          }}
        >
          <Toolbar sx={{justifyContent: "space-between", px: {xs: 1, sm: 2}}}>
            {user && (
              <IconButton
                color="inherit"
                onClick={handleNavToggle}
                sx={{mr: 1}}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                minWidth: 0,
                flexGrow: 1,
              }}
            >
              <Typography
                variant="h6"
                noWrap
                component={RouterLink}
                to="/"
                sx={{
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                  color: "inherit",
                  textDecoration: "none",
                  fontSize: "1.5rem",
                }}
              >
                Trixma|
                <Box
                  component="span"
                  sx={{display: "inline-block", transform: "scaleX(-1)"}}
                >
                  Trixma
                </Box>
              </Typography>
            </Box>

            <Box sx={{display: "flex", alignItems: "center", gap: 1}}>
              <Tooltip title="Toggle theme">
                <IconButton onClick={toggleTheme} color="inherit">
                  {themeMode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
                </IconButton>
              </Tooltip>

              {user ? (
                <Box
                  sx={{
                    flexGrow: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Tooltip title="Change theme">
                    <IconButton onClick={handleOpenThemeMenu} color="inherit">
                      {themeMode === "light" ? (
                        <LightModeIcon />
                      ) : themeMode === "dark" ? (
                        <DarkModeIcon />
                      ) : (
                        <LightModeIcon />
                      )}
                    </IconButton>
                  </Tooltip>
                  <Menu
                    sx={{mt: "45px"}}
                    id="menu-theme"
                    anchorEl={anchorElTheme}
                    anchorOrigin={{
                      vertical: "top",
                      horizontal: "right",
                    }}
                    keepMounted
                    transformOrigin={{
                      vertical: "top",
                      horizontal: "right",
                    }}
                    open={Boolean(anchorElTheme)}
                    onClose={handleCloseThemeMenu}
                  >
                    <MenuItem
                      selected={themeMode === "light"}
                      onClick={() => handleSetTheme("light")}
                    >
                      <LightModeIcon sx={{mr: 1}} fontSize="small" />
                      Light
                    </MenuItem>
                    <MenuItem
                      selected={themeMode === "dark"}
                      onClick={() => handleSetTheme("dark")}
                    >
                      <DarkModeIcon sx={{mr: 1}} fontSize="small" />
                      Dark
                    </MenuItem>
                    <MenuItem
                      selected={themeMode === "trixma"}
                      onClick={() => handleSetTheme("trixma")}
                    >
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: "2px",
                          background:
                            "linear-gradient(135deg, #C8841C 0%, #16181D 100%)",
                          mr: 1,
                        }}
                      />
                      Trixma
                    </MenuItem>
                    <Divider />
                    <MenuItem
                      onClick={() =>
                        handleSetTheme(
                          themeMode === "light"
                            ? "dark"
                            : themeMode === "dark"
                              ? "trixma"
                              : "light",
                        )
                      }
                    >
                      Cycle Theme
                    </MenuItem>
                  </Menu>

                  <Tooltip title="Account menu">
                    <IconButton onClick={handleOpenUserMenu} sx={{p: 0}}>
                      <Avatar
                        alt={user.displayName || ""}
                        src={user.photoURL || undefined}
                      />
                    </IconButton>
                  </Tooltip>
                </Box>
              ) : (
                <Button variant="contained" onClick={handleLogin}>
                  Login
                </Button>
              )}
            </Box>
          </Toolbar>
        </AppBar>

        {/* User Account Menu */}
        <Menu
          sx={{mt: "45px"}}
          id="menu-appbar"
          anchorEl={anchorElUser}
          anchorOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
          keepMounted
          transformOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
          open={Boolean(anchorElUser)}
          onClose={handleCloseUserMenu}
        >
          {user && (
            <Box sx={{px: 2, py: 1, textAlign: "center", minWidth: 200}}>
              <Avatar
                alt={user.displayName || ""}
                src={user.photoURL || undefined}
                sx={{
                  width: 64,
                  height: 64,
                  mx: "auto",
                  mb: 1,
                  border: 1,
                  borderColor: "divider",
                }}
              />
              <Typography variant="subtitle1" fontWeight="bold">
                {user.displayName}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{mb: 2, wordBreak: "break-all"}}
              >
                {user.email}
              </Typography>
              <Button
                fullWidth
                variant="contained"
                color="error"
                onClick={handleLogout}
                sx={{mb: 1}}
              >
                Logout
              </Button>
              {import.meta.env.VITE_BUILD_ID && (
                <Typography
                  variant="caption"
                  display="block"
                  sx={{
                    mt: 1,
                    pt: 1,
                    borderTop: 1,
                    borderColor: "divider",
                    opacity: 0.7,
                    fontFamily: "monospace",
                  }}
                >
                  Build: {import.meta.env.VITE_BUILD_ID.substring(0, 7)}
                </Typography>
              )}
            </Box>
          )}
        </Menu>

        {user && (
          <>
            <Drawer
              variant="temporary"
              open={mobileDrawerOpen}
              onClose={closeMobileDrawer}
              ModalProps={{keepMounted: true}}
              sx={{
                display: {xs: "block", md: "none"},
                "& .MuiDrawer-paper": {
                  width: DRAWER_WIDTH,
                  boxSizing: "border-box",
                },
              }}
            >
              {drawerContent}
            </Drawer>

            <Drawer
              variant="permanent"
              open
              sx={{
                display: {xs: "none", md: "block"},
                width: desktopNavCollapsed
                  ? DRAWER_COLLAPSED_WIDTH
                  : DRAWER_WIDTH,
                flexShrink: 0,
                "& .MuiDrawer-paper": {
                  width: desktopNavCollapsed
                    ? DRAWER_COLLAPSED_WIDTH
                    : DRAWER_WIDTH,
                  boxSizing: "border-box",
                  transition: "width 180ms ease",
                },
              }}
            >
              {drawerContent}
            </Drawer>
          </>
        )}

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          <Toolbar />
          <Container
            maxWidth="lg"
            sx={{
              flexGrow: 1,
              py: {xs: 2, md: 4},
              px: {xs: 1, sm: 2, md: 3},
              display: "flex",
              flexDirection: "column",
            }}
          >
            <AppRoutes
              user={user}
              themeMode={themeMode}
              onLogin={handleLogin}
            />
          </Container>
        </Box>

        {panelContent && (
          <Drawer
            variant="permanent"
            anchor="right"
            open
            sx={{
              display: {xs: "none", lg: "block"},
              width: panelWidth,
              flexShrink: 0,
              "& .MuiDrawer-paper": {
                width: panelWidth,
                boxSizing: "border-box",
                top: {xs: 56, sm: 64},
                height: {xs: "calc(100% - 56px)", sm: "calc(100% - 64px)"},
                p: 1.5,
                bgcolor: (t) =>
                  alpha(
                    t.palette.primary.main,
                    t.palette.mode === "dark" ? 0.24 : 0.12,
                  ),
                borderLeft: 1,
                borderColor: "divider",
              },
            }}
          >
            {panelContent}
          </Drawer>
        )}
      </Box>
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        theme={themeMode}
      />
    </ThemeProvider>
  );
}

function App() {
  return (
    <RightPanelProvider>
      <AppInner />
    </RightPanelProvider>
  );
}

export default App;
