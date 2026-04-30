import {Routes, Route} from "react-router-dom";
import {type User} from "firebase/auth";
import {Box, Typography, Button} from "@mui/material";
import Dashboard from "./Dashboard";
import ProvisionUnit from "./ProvisionUnit";
import SystemDetail from "./SystemDetail";
import SystemForm from "./SystemForm";
import UnitForm from "./UnitForm";
import UnitDetail from "./UnitDetail";

interface AppRoutesProps {
  user: User | null;
  themeMode: "light" | "dark";
  onLogin: () => void;
}

const AuthGate = ({
  user,
  onLogin,
  message,
  children,
}: {
  user: User | null;
  onLogin: () => void;
  message: string;
  children: React.ReactNode;
}) =>
  user ? (
    <>{children}</>
  ) : (
    <Box sx={{textAlign: "center", mt: 8}}>
      <Typography variant="h4" gutterBottom>
        {message}
      </Typography>
      <Button variant="contained" onClick={onLogin}>
        Login
      </Button>
    </Box>
  );

const AppRoutes: React.FC<AppRoutesProps> = ({user, themeMode, onLogin}) => (
  <Routes>
    <Route
      path="/"
      element={
        user ? (
          <Dashboard user={user} />
        ) : (
          <Box
            sx={{
              flexGrow: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              py: 8,
            }}
          >
            <Box sx={{maxWidth: 900, px: 2}}>
              <Button
                variant="contained"
                size="large"
                onClick={onLogin}
                sx={{
                  mb: 3,
                  px: 4,
                  py: 1.5,
                  fontSize: "1.1rem",
                  fontWeight: 700,
                }}
              >
                Sign in with Google
              </Button>
              <Typography
                variant="h1"
                sx={{
                  fontSize: {xs: "2.5rem", md: "4.5rem"},
                  background:
                    themeMode === "dark"
                      ? "linear-gradient(to bottom, #ffffff 0%, #00d1ff 100%)"
                      : "linear-gradient(to bottom, #171717 0%, #7c3aed 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  mb: 2,
                }}
              >
                Connecting your ideas to your data
              </Typography>
            </Box>
          </Box>
        )
      }
    />
    <Route
      path="/systems/new"
      element={
        <AuthGate
          user={user}
          onLogin={onLogin}
          message="Please login to create systems"
        >
          <SystemForm />
        </AuthGate>
      }
    />
    <Route
      path="/systems/:id/edit"
      element={
        <AuthGate
          user={user}
          onLogin={onLogin}
          message="Please login to edit systems"
        >
          <SystemForm />
        </AuthGate>
      }
    />
    <Route
      path="/systems/:id"
      element={
        <AuthGate
          user={user}
          onLogin={onLogin}
          message="Please login to view system details"
        >
          <SystemDetail />
        </AuthGate>
      }
    />
    <Route
      path="/units/provision"
      element={
        <AuthGate
          user={user}
          onLogin={onLogin}
          message="Please login to provision units"
        >
          <ProvisionUnit />
        </AuthGate>
      }
    />
    <Route
      path="/units/:id"
      element={
        <AuthGate
          user={user}
          onLogin={onLogin}
          message="Please login to view unit details"
        >
          <UnitDetail />
        </AuthGate>
      }
    />
    <Route
      path="/units/:id/edit"
      element={
        <AuthGate
          user={user}
          onLogin={onLogin}
          message="Please login to edit unit details"
        >
          <UnitForm />
        </AuthGate>
      }
    />
  </Routes>
);

export default AppRoutes;
