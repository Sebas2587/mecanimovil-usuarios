/**
 * Sistema de Sombras y Elevaciones MecaniMóvil
 * Coinbase-style: sombras muy sutiles (sin “decorative shadows”)
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
    shadowColor: '#0A0B0D',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },

  // ============================================
  // SOMBRA MEDIANA
  // Para cards y elementos elevados estándar
  // ============================================
  md: {
    shadowColor: '#0A0B0D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },

  // ============================================
  // SOMBRA GRANDE
  // Para modales y elementos muy elevados
  // ============================================
  lg: {
    shadowColor: '#0A0B0D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },

  // ============================================
  // SOMBRA EXTRA GRANDE
  // Para overlays y elementos flotantes
  // ============================================
  xl: {
    shadowColor: '#0A0B0D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 4,
  },

  // ============================================
  // SOMBRAS ESPECIALES
  // Para casos de uso específicos
  // ============================================
  // Sombra para inputs enfocados
  inputFocus: {
    shadowColor: '#0052FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },

  // Sombra para botones
  button: {
    shadowColor: '#0A0B0D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },

  // Sombra para cards elevadas
  cardElevated: {
    shadowColor: '#0A0B0D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },

  // Sombra para modales
  modal: {
    shadowColor: '#0A0B0D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 4,
  },

  // Sombra para tooltips
  tooltip: {
    shadowColor: '#0A0B0D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 3,
  },
};

export default SHADOWS;

