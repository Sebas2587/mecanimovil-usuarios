/**
 * Sistema de Espaciado MecaniMóvil
 * Espaciado consistente y responsivo
 */

import { Dimensions } from 'react-native';

// Obtener dimensiones de la pantalla para responsividad
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const SPACING = {
  // ============================================
  // ESPACIADO BASE (Responsivo)
  // ============================================
  xs: SCREEN_WIDTH < 375 ? 3 : SCREEN_WIDTH >= 414 ? 5 : 4,
  sm: SCREEN_WIDTH < 375 ? 6 : SCREEN_WIDTH >= 414 ? 10 : 8,
  md: SCREEN_WIDTH < 375 ? 12 : SCREEN_WIDTH >= 414 ? 20 : 16,
  lg: SCREEN_WIDTH < 375 ? 18 : SCREEN_WIDTH >= 414 ? 30 : 24,
  xl: SCREEN_WIDTH < 375 ? 24 : SCREEN_WIDTH >= 414 ? 40 : 32,
  '2xl': SCREEN_WIDTH < 375 ? 36 : SCREEN_WIDTH >= 414 ? 60 : 48,
  '3xl': SCREEN_WIDTH < 375 ? 48 : SCREEN_WIDTH >= 414 ? 80 : 64,

  // ============================================
  // ESPACIADO FIJO (No responsivo)
  // Para casos donde se necesita consistencia absoluta
  // ============================================
  fixed: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
  },

  // ============================================
  // ESPACIADO ESPECÍFICO
  // Valores comunes para casos de uso específicos
  // ============================================
  // Padding de contenedores
  container: {
    horizontal: SCREEN_WIDTH < 375 ? 12 : SCREEN_WIDTH >= 414 ? 20 : 16,
    vertical: SCREEN_WIDTH < 375 ? 12 : SCREEN_WIDTH >= 414 ? 20 : 16,
  },

  // Espaciado entre secciones
  section: SCREEN_WIDTH < 375 ? 18 : SCREEN_WIDTH >= 414 ? 30 : 24,

  // Espaciado entre elementos en listas
  listItem: SCREEN_WIDTH < 375 ? 8 : SCREEN_WIDTH >= 414 ? 12 : 10,

  // Espaciado entre elementos en cards
  cardPadding: SCREEN_WIDTH < 375 ? 12 : SCREEN_WIDTH >= 414 ? 20 : 16,
  cardGap: SCREEN_WIDTH < 375 ? 8 : SCREEN_WIDTH >= 414 ? 12 : 10,

  // Espaciado para inputs
  inputPadding: SCREEN_WIDTH < 375 ? 12 : SCREEN_WIDTH >= 414 ? 16 : 14,
  inputGap: 8,

  // Espaciado para botones
  buttonPadding: {
    horizontal: SCREEN_WIDTH < 375 ? 16 : SCREEN_WIDTH >= 414 ? 24 : 20,
    vertical: SCREEN_WIDTH < 375 ? 12 : SCREEN_WIDTH >= 414 ? 16 : 14,
  },
  buttonGap: 8,

  // Espaciado para headers
  headerPadding: {
    horizontal: SCREEN_WIDTH < 375 ? 16 : SCREEN_WIDTH >= 414 ? 20 : 16,
    vertical: SCREEN_WIDTH < 375 ? 12 : SCREEN_WIDTH >= 414 ? 16 : 14,
  },
};

export default SPACING;

