/**
 * Sistema de Bordes y Radios MecaniMóvil
 * Bordes y radios consistentes
 */

// Definir valores de radio base primero para evitar problemas de inicialización
const RADIUS_BASE = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 100,
  full: 9999,
};

const WIDTH_BASE = {
  none: 0,
  thin: 1,
  medium: 2,
  thick: 4,
};

// Crear objeto radius con todas las propiedades
const radius = {
  ...RADIUS_BASE,
  // Radios para botones (Coinbase editorial: esquinas suaves, no píldora en CTAs estándar)
  button: {
    sm: RADIUS_BASE.sm,
    md: RADIUS_BASE.md,
    lg: RADIUS_BASE.md,
    full: RADIUS_BASE.full,
  },
  // Radios para inputs
  input: {
    sm: RADIUS_BASE.sm,
    md: RADIUS_BASE.md,
    lg: RADIUS_BASE.lg,
  },
  // Radios para cards
  card: {
    sm: RADIUS_BASE.sm,
    md: RADIUS_BASE.md,
    lg: RADIUS_BASE.lg,
    xl: RADIUS_BASE.xl,
  },
  // Radios para modales
  modal: {
    sm: RADIUS_BASE.md,
    md: RADIUS_BASE.lg,
    lg: RADIUS_BASE.xl,
    xl: RADIUS_BASE.xl,
  },
  // Radios para avatares
  avatar: {
    sm: 16,
    md: 24,
    lg: 32,
    full: 9999,
  },
  // Radios para badges
  badge: {
    sm: RADIUS_BASE.pill,
    md: RADIUS_BASE.pill,
    lg: RADIUS_BASE.pill,
    full: 9999,
  },
};

export const BORDERS = {
  // ============================================
  // RADIOS DE BORDE
  // ============================================
  radius: radius,

  // ============================================
  // ANCHOS DE BORDE
  // ============================================
  width: {
    ...WIDTH_BASE,
  },
};

export default BORDERS;
