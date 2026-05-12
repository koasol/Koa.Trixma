import {createTheme, responsiveFontSizes} from "@mui/material/styles";

export const getTheme = (mode: "light" | "dark" | "trixma") => {
  const theme = createTheme({
    palette: {
      mode: mode === "trixma" ? "dark" : mode,
      ...(mode === "trixma"
        ? {
            // Design file theme colors
            primary: {
              main: "#C8841C", // --accent
            },
            background: {
              default: "#F6F5F2", // --paper (light background)
              paper: "#FFFFFF", // --card
            },
            text: {
              primary: "#16181D", // --ink
              secondary: "#3A4049", // --ink-2
            },
            divider: "#E5E3DC", // --line
            success: {
              main: "#4F7A4A", // --ok
            },
            warning: {
              main: "#C8841C", // --warn
            },
            error: {
              main: "#B53F2B", // --crit
            },
          }
        : mode === "dark"
          ? {
              primary: {
                main: "#00d1ff", // --accent-color
              },
              background: {
                default: "#000f1d", // --bg-color
                paper: "#011b2e", // --surface
              },
              text: {
                primary: "#ffffff",
                secondary: "#a3b3c1",
              },
              divider: "#0e2a47", // --border-color
            }
          : {
              primary: {
                main: "#7c3aed", // From .light a in index.css
              },
              background: {
                default: "#ffffff",
                paper: "#f9f9f9",
              },
            }),
    },
    typography: {
      fontFamily: "'Inter', system-ui, Avenir, Helvetica, Arial, sans-serif",
      h1: {
        fontWeight: 800,
        letterSpacing: "-0.04em",
      },
      h2: {
        fontWeight: 800,
        letterSpacing: "-0.04em",
      },
      h3: {
        fontWeight: 700,
      },
      button: {
        textTransform: "none",
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 6,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
        },
      },
    },
  });

  return responsiveFontSizes(theme);
};
