/**
 * Sistema de Sombras y Elevaciones MecaniMóvil
 * Sombras consistentes basadas en Ink Black
 */

export const SHADOWS = {
  // ============================================
  // SIN SOMBRA
  // ============================================
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },

  // ============================================
  // SOMBRA PEQUEÑA
  // Para elementos ligeramente elevados
  // ============================================
  sm: {
    shadowColor: '#00171F', // Ink Black
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  // ============================================
  // SOMBRA MEDIANA
  // Para cards y elementos elevados estándar
  // ============================================
  md: {
    shadowColor: '#00171F', // Ink Black
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // ============================================
  // SOMBRA GRANDE
  // Para modales y elementos muy elevados
  // ============================================
  lg: {
    shadowColor: '#00171F', // Ink Black
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },

  // ============================================
  // SOMBRA EXTRA GRANDE
  // Para overlays y elementos flotantes
  // ============================================
  xl: {
    shadowColor: '#00171F', // Ink Black
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },

  // ============================================
  // SOMBRAS ESPECIALES
  // Para casos de uso específicos
  // ============================================
  // Sombra para inputs enfocados
  inputFocus: {
    shadowColor: '#00A8E8', // Fresh Sky (accent)
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },

  // Sombra para botones
  button: {
    shadowColor: '#00171F', // Ink Black
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  // Sombra para cards elevadas
  cardElevated: {
    shadowColor: '#00171F', // Ink Black
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },

  // Sombra para modales
  modal: {
    shadowColor: '#00171F', // Ink Black
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },

  // Sombra para tooltips
  tooltip: {
    shadowColor: '#00171F', // Ink Black
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
};

export default SHADOWS;

