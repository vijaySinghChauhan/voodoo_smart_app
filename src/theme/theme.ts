import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const COLORS = {
  // VooDoo Tech Brand Colors - Teal to Cyan Gradient Palette
  primary: '#0EB8A8',
  primaryDark: '#0A5C5C',
  primaryLight: '#B2EDE6',

  primaryMid: '#06B89F',
  primaryCyan: '#22C8DD',
  accentMint: '#14C0A6',

  // Secondary colors (Soft accent)
  secondary: '#22C8DD',
  secondaryDark: '#1098AC',
  secondaryLight: '#CDEFF6',

  // Accent colors (Mint Infinity)
  accent: '#14C0A6',
  accentDark: '#0D8B7A',
  accentLight: '#C7F1EA',

  // Gradient corner accents
  cornerDark: '#064A48',
  cornerMint: '#06B89F',
  cornerCyan: '#1EB8DA',

  // Watermark infinity light backgrounds
  watermarkMint: '#D5F5EE',
  watermarkCyan: '#D6F2FA',

  // Neutral colors
  white: '#FFFFFF',
  black: '#0B1E2B',
  gray: '#5B7384',
  lightGray: '#EEF4F5',
  border: '#D6E2E6',
  darkGray: '#33505F',

  // Functional colors
  success: '#22A06B',
  warning: '#F0A830',
  error: '#E05252',
  info: '#2B8FD4',

  // Background colors
  background: '#F6FBFA',
  card: '#FFFFFF',
  surface: '#F0FAF9',

  // Text colors - Dark Navy / Charcoal
  textDark: '#0B1E2B',
  textMedium: '#1A3444',
  textLight: '#5B7384',
  textVeryLight: '#9DB0BB',

  // Icon background circles (dark teal)
  iconBg: '#0A5C5C',
  divider: '#0EB8A8',
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
