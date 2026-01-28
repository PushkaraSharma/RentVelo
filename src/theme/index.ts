export const colors = {
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

  // Text
  textPrimary: '#111827', // Almost black
  textSecondary: '#6B7280', // Gray text
  textTertiary: '#9CA3AF', // Lighter gray

  // Borders
  border: '#E5E7EB',
};

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
