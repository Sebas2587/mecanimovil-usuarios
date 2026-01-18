/**
 * Sistema de Tipografía MecaniMóvil
 * Escala tipográfica consistente
 * 
 * IMPORTANTE: Este archivo NO debe tener ninguna lógica condicional
 * para evitar problemas con el motor Hermes de React Native
 */

const TYPOGRAPHY = Object.freeze({
  fontFamily: Object.freeze({
    regular: 'System',
    medium: 'System',
    bold: 'System',
  }),
  fontSize: Object.freeze({
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 36,
  }),
  fontWeight: Object.freeze({
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  }),
  lineHeight: Object.freeze({
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  }),
  letterSpacing: Object.freeze({
    tighter: -0.5,
    tight: -0.25,
    normal: 0,
    wide: 0.25,
    wider: 0.5,
  }),
  styles: Object.freeze({
    h1: Object.freeze({
      fontSize: 28,
      fontWeight: '700',
      lineHeight: 1.2,
      letterSpacing: -0.25,
    }),
    h2: Object.freeze({
      fontSize: 24,
      fontWeight: '700',
      lineHeight: 1.2,
      letterSpacing: -0.25,
    }),
    h3: Object.freeze({
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 1.3,
      letterSpacing: -0.25,
    }),
    h4: Object.freeze({
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 1.4,
      letterSpacing: 0,
    }),
    body: Object.freeze({
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 1.5,
      letterSpacing: 0,
    }),
    bodyBold: Object.freeze({
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 1.5,
      letterSpacing: 0,
    }),
    caption: Object.freeze({
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 1.5,
      letterSpacing: 0,
    }),
    captionBold: Object.freeze({
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 1.5,
      letterSpacing: 0,
    }),
    small: Object.freeze({
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 1.5,
      letterSpacing: 0,
    }),
    button: Object.freeze({
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 1.2,
      letterSpacing: 0.25,
    }),
    label: Object.freeze({
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 1.4,
      letterSpacing: 0,
    }),
  }),
});

export { TYPOGRAPHY };
export default TYPOGRAPHY;

