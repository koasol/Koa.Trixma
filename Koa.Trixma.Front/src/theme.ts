import { createTheme, responsiveFontSizes } from '@mui/material/styles';

export const getTheme = (mode: 'light' | 'dark') => {
  const theme = createTheme({
    palette: {
      mode,
      ...(mode === 'dark'
        ? {
            primary: {
              main: '#00d1ff', // --accent-color
            },
            background: {
              default: '#000f1d', // --bg-color
              paper: '#011b2e',   // --surface
            },
            text: {
              primary: '#ffffff',
              secondary: '#a3b3c1',
            },
            divider: '#0e2a47', // --border-color
          }
        : {
            primary: {
              main: '#7c3aed', // From .light a in index.css
            },
            background: {
              default: '#ffffff',
              paper: '#f9f9f9',
            },
          }),
    },
    typography: {
      fontFamily: "'Inter', system-ui, Avenir, Helvetica, Arial, sans-serif",
      h1: {
        fontWeight: 800,
        letterSpacing: '-0.04em',
      },
      h2: {
        fontWeight: 800,
        letterSpacing: '-0.04em',
      },
      h3: {
        fontWeight: 700,
      },
      button: {
        textTransform: 'none',
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
            backgroundImage: 'none',
          },
        },
      },
    },
  });

  return responsiveFontSizes(theme);
};
