/**
 * Tipografía MecaniMóvil — Poppins (Airbnb-style)
 */

const POPPINS = 'Poppins_400Regular';
const POPPINS_MEDIUM = 'Poppins_500Medium';
const POPPINS_SEMIBOLD = 'Poppins_600SemiBold';

const TYPOGRAPHY = Object.freeze({
  fontFamily: Object.freeze({
    regular: POPPINS,
    medium: POPPINS_MEDIUM,
    bold: POPPINS_SEMIBOLD,
    semibold: POPPINS_SEMIBOLD,
    mono: 'monospace',
  }),
  fontSize: Object.freeze({
    xs: 10,
    sm: 11,
    base: 13,
    md: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 34,
    '5xl': 40,
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
    normal: 1.45,
    relaxed: 1.6,
    loose: 1.75,
  }),
  letterSpacing: Object.freeze({
    tighter: -0.5,
    tight: -0.25,
    normal: 0,
    wide: 0.25,
    wider: 0.5,
    section: 0.8,
  }),
  styles: Object.freeze({
    h1: Object.freeze({
      fontSize: 30,
      fontFamily: POPPINS_SEMIBOLD,
      fontWeight: '600',
      lineHeight: 36,
      letterSpacing: -0.5,
    }),
    h2: Object.freeze({
      fontSize: 24,
      fontFamily: POPPINS_SEMIBOLD,
      fontWeight: '600',
      lineHeight: 30,
      letterSpacing: -0.25,
    }),
    h3: Object.freeze({
      fontSize: 20,
      fontFamily: POPPINS_SEMIBOLD,
      fontWeight: '600',
      lineHeight: 26,
      letterSpacing: -0.25,
    }),
    h4: Object.freeze({
      fontSize: 17,
      fontFamily: POPPINS_SEMIBOLD,
      fontWeight: '600',
      lineHeight: 22,
      letterSpacing: 0,
    }),
    h5: Object.freeze({
      fontSize: 15,
      fontFamily: POPPINS_MEDIUM,
      fontWeight: '500',
      lineHeight: 20,
      letterSpacing: 0,
    }),
    h6: Object.freeze({
      fontSize: 13,
      fontFamily: POPPINS_MEDIUM,
      fontWeight: '500',
      lineHeight: 16,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    }),
    body: Object.freeze({
      fontSize: 15,
      fontFamily: POPPINS,
      fontWeight: '400',
      lineHeight: 22,
      letterSpacing: 0,
    }),
    bodyBold: Object.freeze({
      fontSize: 15,
      fontFamily: POPPINS_SEMIBOLD,
      fontWeight: '600',
      lineHeight: 22,
      letterSpacing: 0,
    }),
    caption: Object.freeze({
      fontSize: 13,
      fontFamily: POPPINS,
      fontWeight: '400',
      lineHeight: 18,
      letterSpacing: 0,
    }),
    captionBold: Object.freeze({
      fontSize: 13,
      fontFamily: POPPINS_SEMIBOLD,
      fontWeight: '600',
      lineHeight: 18,
      letterSpacing: 0,
    }),
    small: Object.freeze({
      fontSize: 11,
      fontFamily: POPPINS,
      fontWeight: '400',
      lineHeight: 14,
      letterSpacing: 0,
    }),
    button: Object.freeze({
      fontSize: 15,
      fontFamily: POPPINS_SEMIBOLD,
      fontWeight: '600',
      lineHeight: 20,
      letterSpacing: 0,
    }),
    label: Object.freeze({
      fontSize: 13,
      fontFamily: POPPINS_MEDIUM,
      fontWeight: '500',
      lineHeight: 18,
      letterSpacing: 0,
    }),
    numberDisplay: Object.freeze({
      fontSize: 30,
      fontFamily: POPPINS_SEMIBOLD,
      fontWeight: '600',
      lineHeight: 36,
      letterSpacing: -0.5,
    }),
  }),
});

export { TYPOGRAPHY };
export default TYPOGRAPHY;
