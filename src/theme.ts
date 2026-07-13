import { createTheme, alpha } from "@mui/material/styles";

// Brand palette inspired by the MUI "Dashboard" template.
const brand = {
  50: "hsl(210, 100%, 96%)",
  100: "hsl(210, 100%, 90%)",
  200: "hsl(210, 100%, 80%)",
  300: "hsl(210, 100%, 65%)",
  400: "hsl(210, 98%, 48%)",
  500: "hsl(210, 98%, 42%)",
  600: "hsl(210, 98%, 55%)",
  700: "hsl(210, 100%, 35%)",
  800: "hsl(210, 100%, 16%)",
  900: "hsl(210, 100%, 21%)",
};

const gray = {
  50: "hsl(220, 35%, 97%)",
  100: "hsl(220, 30%, 94%)",
  200: "hsl(220, 20%, 88%)",
  300: "hsl(220, 20%, 80%)",
  400: "hsl(220, 20%, 65%)",
  500: "hsl(220, 20%, 42%)",
  600: "hsl(220, 20%, 35%)",
  700: "hsl(220, 20%, 25%)",
  800: "hsl(220, 30%, 6%)",
  900: "hsl(220, 35%, 3%)",
};

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: "class" },
  colorSchemes: {
    light: {
      palette: {
        primary: {
          light: brand[200],
          main: brand[400],
          dark: brand[700],
          contrastText: "hsl(0, 0%, 100%)",
        },
        background: {
          default: "hsl(0, 0%, 99%)",
          paper: "hsl(220, 35%, 97%)",
        },
        text: {
          primary: gray[800],
          secondary: gray[600],
        },
        divider: alpha(gray[300], 0.4),
        grey: gray,
      },
    },
    dark: {
      palette: {
        primary: {
          light: brand[300],
          main: brand[400],
          dark: brand[700],
          contrastText: "hsl(0, 0%, 100%)",
        },
        background: {
          default: "hsl(220, 30%, 4%)",
          paper: "hsl(220, 30%, 7%)",
        },
        text: {
          primary: "hsl(0, 0%, 100%)",
          secondary: gray[400],
        },
        divider: alpha(gray[700], 0.6),
        grey: gray,
      },
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: "Inter, sans-serif",
    h1: { fontSize: "2.25rem", fontWeight: 600, lineHeight: 1.2 },
    h2: { fontSize: "1.5rem", fontWeight: 600 },
    h3: { fontSize: "1.25rem", fontWeight: 600 },
    h4: { fontSize: "1.125rem", fontWeight: 600 },
    h5: { fontSize: "1rem", fontWeight: 600 },
    h6: { fontSize: "0.9375rem", fontWeight: 600 },
    subtitle1: { fontSize: "0.875rem", fontWeight: 600 },
    subtitle2: { fontSize: "0.8125rem", fontWeight: 500 },
    body1: { fontSize: "0.875rem" },
    body2: { fontSize: "0.8125rem" },
    caption: { fontSize: "0.75rem", fontWeight: 400 },
    overline: { fontSize: "0.8125rem", textTransform: "none" },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: (theme.vars || theme).palette.background.default,
          color: (theme.vars || theme).palette.text.primary,
          boxShadow: "none",
          borderBottom: `1px solid ${(theme.vars || theme).palette.divider}`,
          backgroundImage: "none",
        }),
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: "none",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
  },
});

export default theme;
