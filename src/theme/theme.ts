'use client';
import { createTheme, ThemeOptions } from '@mui/material/styles';
import { Poppins } from 'next/font/google';

export const poppins = Poppins({
  weight: ['300', '400', '500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
});

const themeOptions: ThemeOptions = {
  palette: {
    primary:   { main: '#C62828', light: '#EF5350', dark: '#8E0000', contrastText: '#ffffff' },
    secondary: { main: '#FF9800', light: '#FFB74D', dark: '#E65100', contrastText: '#ffffff' },
    success:   { main: '#2E7D32', light: '#4CAF50', dark: '#1B5E20', contrastText: '#ffffff' },
    background: { default: '#FFF8F2', paper: '#FFFFFF' },
    text:      { primary: '#212121', secondary: '#616161' },
    divider:   '#FFCCBC',
  },
  typography: {
    fontFamily: poppins.style?.fontFamily ?? 'Poppins, sans-serif',
    h1: { fontWeight: 800 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  shape: { borderRadius: 16 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 24px',
          boxShadow: 'none',
          '&:hover': { boxShadow: '0 4px 20px rgba(198,40,40,0.3)' },
        },
        contained: ({ ownerState }) => ({
          ...(ownerState.color === 'primary' && {
            background: 'linear-gradient(135deg, #C62828 0%, #EF5350 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #8E0000 0%, #C62828 100%)' },
          }),
          ...(ownerState.color === 'secondary' && {
            background: 'linear-gradient(135deg, #FF9800 0%, #FFB74D 100%)',
          }),
        }),
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 2px 20px rgba(0,0,0,0.08)',
          '&:hover': { boxShadow: '0 8px 40px rgba(0,0,0,0.12)', transform: 'translateY(-2px)' },
          transition: 'all 0.3s ease',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 600 },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          '& fieldset': {
            borderColor: '#E2E8F0',
            transition: 'all 0.2s ease',
          },
          '&:hover fieldset': {
            borderColor: '#C62828',
          },
          '&.Mui-focused fieldset': {
            borderColor: '#C62828',
            borderWidth: '2px',
          },
          '& .MuiInputBase-input': {
            backgroundColor: 'transparent !important',
            colorScheme: 'light !important',
            color: '#212121 !important',
          },
          '& input:-webkit-autofill': {
            WebkitBoxShadow: '0 0 0 1000px #FFFFFF inset !important',
            WebkitTextFillColor: '#212121 !important',
            caretColor: '#212121 !important',
            backgroundColor: 'transparent !important',
            transition: 'background-color 50000s ease-in-out 0s !important',
          },
          '& .MuiInputAdornment-root': {
            maxHeight: '100%',
            height: '100%',
            alignSelf: 'center',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 0,
            marginBottom: 0,
          },
          '& .MuiSvgIcon-root': {
            verticalAlign: 'middle',
          },
        },
      },
    },
    MuiInputAdornment: {
      styleOverrides: {
        root: {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'center',
          maxHeight: '100%',
          marginTop: 0,
          marginBottom: 0,
          '& .MuiSvgIcon-root': {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: { borderRadius: 16 },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 20 },
      },
    },
  },
};

export const theme = createTheme(themeOptions);
