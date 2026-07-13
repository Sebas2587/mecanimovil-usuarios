/**
 * Sistema de Colores MecaniMóvil (Tinder-like + Airbnb surfaces)
 * Brand: rosa/magenta energético en CTA; gris neutro en texto; blanco en superficies.
 * Patrón design tokens: https://paletacolorpro.com/en/ui-ux-palette-guide
 *
 * Primary   #fe3c72  CTA, tab activo, badge verificado, focus
 * Secondary #fd5564  acentos secundarios, chips
 * Accent    #ef4a75  highlights
 * Ink       #424242  títulos y cuerpo
 * Canvas    #ffffff  fondo de app y cards
 */

export const withOpacity = (color, opacity) => {
  if (typeof color !== 'string' || !color.startsWith('#')) return color;
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export const getColorWithOpacity = (path, opacity) => {
  const keys = path.split('.');
  let color = COLORS;
  for (const key of keys) {
    color = color?.[key];
    if (color == null) return '#424242';
  }
  if (typeof color !== 'string') return '#424242';
  return withOpacity(color, opacity);
};

const INK = '#424242';
const CANVAS = '#ffffff';
/** Tinte suave ~6% primary para pills inactivas y superficies secundarias. */
const SOFT = '#fff0f4';
const PRIMARY = '#fe3c72';
const SECONDARY = '#fd5564';
const ACCENT = '#ef4a75';

export const COLORS = {
  base: {
    white: '#FFFFFF',
    inkBlack: INK,
    deepSpaceBlue: INK,
    canvas: CANVAS,
    soft: SOFT,
  },

  primary: {
    50: '#fff0f4',
    100: '#ffe0e9',
    200: '#ffc2d4',
    300: '#ff94b3',
    400: '#fe5c8d',
    500: PRIMARY,
    600: '#e82d62',
    700: '#c41f4f',
    800: '#a01a42',
    900: '#7a1533',
  },

  secondary: {
    50: '#fff1f2',
    100: '#ffe2e5',
    200: '#ffc5cb',
    300: '#ff9aa5',
    400: '#fd6f7d',
    500: SECONDARY,
    600: '#e63d4f',
    700: '#c22d3d',
    800: '#9e2432',
    900: '#7a1c27',
  },

  accent: {
    50: '#fdf0f5',
    100: '#fce0eb',
    200: '#f9c2d7',
    300: '#f494b8',
    400: '#ef5f8f',
    500: ACCENT,
    600: '#d93a68',
    700: '#b52d55',
    800: '#912444',
    900: '#6d1b34',
  },

  neutral: {
    white: '#FFFFFF',
    inkBlack: INK,
    gray: {
      50: '#f7f7f7',
      100: '#eeeeee',
      200: '#e0e0e0',
      300: '#bdbdbd',
      400: '#9e9e9e',
      500: '#757575',
      600: '#616161',
      700: '#424242',
      800: '#303030',
      900: '#212121',
      950: INK,
    },
  },

  success: {
    light: '#e6f7ef',
    main: '#0d9f6e',
    dark: '#0a7f58',
    darker: '#075f42',
    text: INK,
    badge: '#e6f7ef',
    badgeText: '#0d9f6e',
    50: '#e6f7ef',
    100: '#ccefdf',
    200: '#99dfbf',
    300: '#66cf9f',
    400: '#33bf7f',
    500: '#0d9f6e',
    600: '#0a7f58',
    700: '#075f42',
    800: '#05402c',
    900: '#032016',
  },

  warning: {
    light: '#fff8e6',
    main: '#e6a817',
    dark: '#b88612',
    darker: '#8a650d',
    text: INK,
    50: '#fff8e6',
    100: '#fff1cc',
    200: '#ffe399',
    300: '#ffd566',
    400: '#ffc733',
    500: '#e6a817',
    600: '#b88612',
    700: '#8a650d',
    800: '#5c4309',
    900: '#2e2104',
  },

  error: {
    light: '#fde8ea',
    main: '#d93049',
    dark: '#ae263a',
    darker: '#831c2b',
    text: INK,
    50: '#fde8ea',
    100: '#fbd1d5',
    200: '#f7a3ab',
    300: '#f37581',
    400: '#ef4757',
    500: '#d93049',
    600: '#ae263a',
    700: '#831c2b',
    800: '#58121c',
    900: '#2d090e',
  },

  info: {
    light: '#fff0f4',
    main: PRIMARY,
    dark: '#c41f4f',
    darker: '#a01a42',
    text: INK,
    badge: '#fff0f4',
    badgeText: PRIMARY,
    50: '#fff0f4',
    100: '#ffe0e9',
    200: '#ffc2d4',
    300: '#ff94b3',
    400: '#fe5c8d',
    500: PRIMARY,
    600: '#e82d62',
    700: '#c41f4f',
    800: '#a01a42',
    900: '#7a1533',
  },

  text: {
    primary: INK,
    secondary: '#616161',
    tertiary: '#9e9e9e',
    disabled: '#bdbdbd',
    inverse: '#FFFFFF',
    hint: '#9e9e9e',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onAccent: '#FFFFFF',
    onSuccess: INK,
    onWarning: INK,
    onError: '#FFFFFF',
    onInfo: INK,
  },

  background: {
    default: CANVAS,
    paper: '#FFFFFF',
    elevated: '#FFFFFF',
    overlay: withOpacity(INK, 0.45),
    success: '#e6f7ef',
    warning: '#fff8e6',
    error: '#fde8ea',
    info: '#fff0f4',
  },

  border: {
    light: '#eeeeee',
    main: '#e0e0e0',
    dark: '#bdbdbd',
    focus: PRIMARY,
    error: '#d93049',
    success: '#0d9f6e',
  },

  opacity: {
    5: 0.05,
    10: 0.1,
    20: 0.2,
    30: 0.3,
    40: 0.4,
    50: 0.5,
    60: 0.6,
    70: 0.7,
    80: 0.8,
    90: 0.9,
    95: 0.95,
  },

  states: {
    hover: { primary: '#e82d62', secondary: '#e63d4f', accent: '#d93a68' },
    pressed: { primary: '#c41f4f', secondary: '#c22d3d', accent: '#b52d55' },
    disabled: {
      background: '#eeeeee',
      text: '#bdbdbd',
      border: '#e0e0e0',
    },
    focus: { ring: PRIMARY, ringOpacity: 0.25 },
  },
};

export default COLORS;
