/**
 * Sistema de Bordes y Radios MecaniMóvil
 * Bordes y radios consistentes
 */

// Definir valores de radio base primero para evitar problemas de inicialización
const RADIUS_BASE = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999, // Para círculos completos
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
  // Radios para botones
  button: {
    sm: 8,
    md: 12,
    lg: 16,
    full: 9999,
  },
  // Radios para inputs
  input: {
    sm: 8,
    md: 12,
    lg: 16,
  },
  // Radios para cards
  card: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
  },
  // Radios para modales
  modal: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
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
    sm: 4,
    md: 8,
    lg: 12,
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
