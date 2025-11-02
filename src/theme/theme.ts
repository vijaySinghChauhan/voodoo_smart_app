import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const COLORS = {
  // Primary colors
  primary: '#3c469f',     // A vibrant blue that stands out
  primaryDark: '#3A56D4', // Darker shade for pressed states
  primaryLight: '#ECF0FF', // Light shade for backgrounds
  
  // Secondary colors
  secondary: '#FF6B6B',   // Vibrant coral for accents
  secondaryDark: '#E55C5C',
  secondaryLight: '#FFE8E8',
  
  // Accent colors
  accent: '#06D6A0',      // Mint green for success states
  accentDark: '#05C091',
  accentLight: '#E0FFF7',
  
  // Neutral colors
  white: '#FFFFFF',
  black: '#000000',
  gray: '#8D9091',
  lightGray: '#E8E8E8',
  darkGray: '#4D4D4D',
  
  // Functional colors
  success: '#06D6A0',
  warning: '#FFBE0B',
  error: '#EF476F',
  info: '#118AB2',
  
  // Background colors
  background: '#99a3f8',
  card: '#FFFFFF',
  
  // Text colors
  textDark: '#212529',
  textMedium: '#495057',
  textLight: '#6C757D',
  textVeryLight: '#ADB5BD',
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