/**
 * Sistema de Animaciones MecaniMóvil
 * Duraciones y funciones de easing consistentes
 */

export const ANIMATIONS = {
  // ============================================
  // DURACIONES
  // ============================================
  duration: {
    instant: 0,
    fast: 100,
    short: 150,
    medium: 300,
    long: 500,
    veryLong: 800,
  },

  // ============================================
  // FUNCIONES DE EASING
  // ============================================
  easing: {
    // Easing estándar
    easeInOut: 'ease-in-out',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    linear: 'linear',
    
    // Easing para React Native (usando strings que se mapean a funciones)
    // Estos se usarán con Animated API de React Native
    standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',
    sharp: 'cubic-bezier(0.4, 0.0, 0.6, 1)',
  },

  // ============================================
  // CONFIGURACIONES PREDEFINIDAS
  // Combinaciones comunes de duración y easing
  // ============================================
  presets: {
    // Animación rápida para interacciones
    quick: {
      duration: 150,
      easing: 'ease-out',
    },
    // Animación estándar para transiciones
    standard: {
      duration: 300,
      easing: 'ease-in-out',
    },
    // Animación lenta para efectos dramáticos
    slow: {
      duration: 500,
      easing: 'ease-in-out',
    },
    // Animación para modales
    modal: {
      duration: 300,
      easing: 'ease-out',
    },
    // Animación para tooltips
    tooltip: {
      duration: 200,
      easing: 'ease-out',
    },
    // Animación para botones
    button: {
      duration: 150,
      easing: 'ease-out',
    },
    // Animación para cards
    card: {
      duration: 300,
      easing: 'ease-in-out',
    },
  },
};

export default ANIMATIONS;

