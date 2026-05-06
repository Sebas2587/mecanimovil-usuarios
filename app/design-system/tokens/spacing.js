/**
 * Sistema de Espaciado MecaniMóvil (Coinbase-style)
 * Base unit: 4. Escala editorial: 4, 8, 12, 16, 20, 24, 32, 48, 96.
 */

export const SPACING = {
  // ============================================
  // ESPACIADO BASE
  // ============================================
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  section: 96,

  // ============================================
  // ESPACIADO FIJO (No responsivo)
  // Para casos donde se necesita consistencia absoluta
  // ============================================
  fixed: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    section: 96,
  },

  // ============================================
  // ESPACIADO ESPECÍFICO
  // Valores comunes para casos de uso específicos
  // ============================================
  // Padding de contenedores
  container: {
    horizontal: 16,
    vertical: 16,
  },

  // Espaciado entre secciones
  sectionGap: 24,

  // Espaciado entre elementos en listas
  listItem: 12,

  // Espaciado entre elementos en cards
  cardPadding: 16,
  cardGap: 12,

  // Espaciado para inputs
  inputPadding: 16,
  inputGap: 8,

  // Espaciado para botones
  buttonPadding: {
    horizontal: 20,
    vertical: 12,
  },
  buttonGap: 8,

  // Espaciado para headers
  headerPadding: {
    horizontal: 16,
    vertical: 12,
  },
};

export default SPACING;

