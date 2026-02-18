import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const COLORS = {
  // Primary colors (Matte Indigo)
  primary: '#5C6BC0',
  primaryDark: '#3949AB',
  primaryLight: '#C5CAE9',

  // Secondary colors (Matte Deep Orange)
  secondary: '#FF7043',
  secondaryDark: '#F4511E',
  secondaryLight: '#FFCCBC',

  // Accent colors (Matte Teal)
  accent: '#26A69A',
  accentDark: '#00897B',
  accentLight: '#B2DFDB',

  // Neutral colors
  white: '#FFFFFF',
  black: '#263238',       // Blue Grey 900
  gray: '#78909C',        // Blue Grey 400
  lightGray: '#ECEFF1',   // Blue Grey 50
  border: '#E0E0E0',
  darkGray: '#455A64',    // Blue Grey 700

  // Functional colors
  success: '#66BB6A',     // Matte Green
  warning: '#FFA726',     // Matte Orange
  error: '#EF5350',       // Matte Red
  info: '#42A5F5',        // Matte Blue

  // Background colors
  background: '#F5F7FA',  // Very light cool grey
  card: '#FFFFFF',

  // Text colors
  textDark: '#37474F',    // Blue Grey 800
  textMedium: '#546E7A',  // Blue Grey 600
  textLight: '#90A4AE',   // Blue Grey 300
  textVeryLight: '#CFD8DC',// Blue Grey 100
};

export const SIZES = {
  // Global sizes
  base: 8,
  font: 14,
  radius: 12,
  padding: 24,
  margin: 20,
  
  // Font sizes
  largeTitle: 40,
  h1: 30,
  h2: 22,
  h3: 18,
  h4: 16,
  body1: 16,
  body2: 14,
  body3: 12,
  small: 10,
  
  // App dimensions
  width,
  height,
};

export const FONTS = {
    largeTitle: { fontFamily: 'Poppins-Bold', fontSize: SIZES.largeTitle },
    h1: { fontFamily: 'Poppins-Bold', fontSize: SIZES.h1 },
    h2: { fontFamily: 'Poppins-SemiBold', fontSize: SIZES.h2 },
    h3: { fontFamily: 'Poppins-SemiBold', fontSize: SIZES.h3 },
    h4: { fontFamily: 'Poppins-SemiBold', fontSize: SIZES.h4 },
    body1: { fontFamily: 'Poppins-Regular', fontSize: SIZES.body1 },
    body2: { fontFamily: 'Poppins-Regular', fontSize: SIZES.body2 },
    body3: { fontFamily: 'Poppins-Regular', fontSize: SIZES.body3 },
    caption: { fontFamily: 'Poppins-Regular', fontSize: SIZES.body3 },
    small: { fontFamily: 'Poppins-Regular', fontSize: SIZES.small },
};

export const SHADOWS = {
  small: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  large: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};

const appTheme = { COLORS, SIZES, FONTS, SHADOWS };

export default appTheme;
