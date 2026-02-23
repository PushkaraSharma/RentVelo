export const lightColors = {
  // Core
  background: '#F5F7FA', // Very light gray for app background
  surface: '#FFFFFF', // White for cards
  primary: '#111827', // Black (Dark Gray) for primary actions
  primaryForeground: '#FFFFFF', // Text on primary

  // Accents
  accent: '#3B82F6', // Blue shade
  accentLight: '#EFF6FF', // Light blue for backgrounds/highlights

  // Status
  success: '#10B981', // Green
  warning: '#F59E0B', // Amber/Orange
  danger: '#EF4444', // Red
  dangerLight: '#FEF2F2',
  successLight: '#ECFDF5',
  warningLight: '#FFFBEB',

  // Text
  textPrimary: '#111827', // Almost black
  textSecondary: '#6B7280', // Gray text
  textTertiary: '#9CA3AF', // Lighter gray

  // Borders
  border: '#E5E7EB',
};

export const darkColors: ThemeColors = {
  // Core
  background: '#121212', // Deep dark for app background
  surface: '#1E1E1E', // Slightly lighter for cards
  primary: '#FFFFFF', // White for primary actions
  primaryForeground: '#111827', // Dark on primary

  // Accents
  accent: '#60A5FA', // Lighter blue shade for dark mode
  accentLight: '#1E3A8A', // Dark blue for backgrounds/highlights

  // Status
  success: '#34D399', // Lighter Green
  warning: '#FBBF24', // Lighter Amber
  danger: '#F87171', // Lighter Red
  dangerLight: '#480d0dff', // Dark red background
  successLight: '#064E3B', // Dark green background
  warningLight: '#391906ff', // Dark amber background

  // Text
  textPrimary: '#F9FAFB', // Almost white
  textSecondary: '#9CA3AF', // Gray text
  textTertiary: '#6B7280', // Darker gray

  // Borders
  border: '#374151',
};

export type ThemeColors = typeof lightColors;

// Maintain backward compatibility during refactoring
export const colors = lightColors;

export const spacing = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  s: 8,
  m: 12,
  l: 16,
  xl: 24,
  round: 9999,
};

export const typography = {
  // Sizes
  xxs: 10,
  xs: 12,
  s: 14,
  m: 16,
  l: 18,
  xl: 24,
  xxl: 32,

  // Weights
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
} as const;

export const shadows = {
  small: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.18,
    shadowRadius: 1.00,
    elevation: 1,
  },
  medium: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
};

export const theme = {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
};
