/**
 * Sistema de Colores MecaniMóvil (Coinbase-style)
 *
 * Basado en `DESIGN-coinbase.md`:
 * - Canvas: #ffffff
 * - Ink: #0a0b0d (texto principal y “surface dark”)
 * - Brand Blue: #0052ff (único voltaje de marca, usado con moderación)
 * - Hairlines / Surfaces: grises muy suaves (dee1e6 / eef0f3 / f7f7f7)
 */

/**
 * Aplica opacidad a un color hexadecimal
 * @param {string} color - Color en formato hexadecimal (#RRGGBB)
 * @param {number} opacity - Opacidad entre 0 y 1
 * @returns {string} Color en formato rgba
 */
export const withOpacity = (color, opacity) => {
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return color;
};

/**
 * Obtiene un color de la paleta con opacidad
 * @param {string} path - Ruta al color (ej: 'primary.500')
 * @param {number} opacity - Opacidad entre 0 y 1
 * @returns {string} Color con opacidad
 */
export const getColorWithOpacity = (path, opacity) => {
  const keys = path.split('.');
  let color = COLORS;
  for (const key of keys) {
    color = color[key];
    if (!color) return '#000000';
  }
  if (typeof color !== 'string') return '#000000';
  return withOpacity(color, opacity);
};

export const COLORS = {
  // ============================================
  // COLORES BASE DE LA PALETA
  // ============================================

  base: {
    white: '#FFFFFF',
    inkBlack: '#0A0B0D',      // Coinbase Ink
    deepSpaceBlue: '#0A0B0D', // Mantener alias legacy apuntando a Ink
    cerulean: '#0052FF',      // Legacy alias → Brand Blue
    freshSky: '#0052FF',      // Legacy alias → Brand Blue
  },

  // ============================================
  // COLORES PRIMARIOS (Coinbase Blue)
  // ============================================
  primary: {
    50: '#E6EEFF',
    100: '#CCDDFE',
    200: '#99BBFE',
    300: '#6699FD',
    400: '#3377FD',
    500: '#0052FF',  // Brand Blue
    600: '#0046DD',
    700: '#003ECC',  // primary-active
    800: '#002A88',
    900: '#001544',
  },

  // ============================================
  // COLORES SECUNDARIOS (compatibilidad)
  // ============================================
  secondary: {
    50: '#E6EEFF',
    100: '#CCDDFE',
    200: '#99BBFE',
    300: '#6699FD',
    400: '#3377FD',
    500: '#0052FF',
    600: '#0046DD',
    700: '#003ECC',
    800: '#002A88',
    900: '#001544',
  },

  // ============================================
  // COLORES DE ACENTO (compatibilidad)
  // ============================================
  accent: {
    50: '#E6EEFF',
    100: '#CCDDFE',
    200: '#99BBFE',
    300: '#6699FD',
    400: '#3377FD',
    500: '#0052FF',
    600: '#0046DD',
    700: '#003ECC',
    800: '#002A88',
    900: '#001544',
  },

  // ============================================
  // COLORES NEUTROS (Ink Black + White)
  // ============================================
  neutral: {
    white: '#FFFFFF',
    inkBlack: '#0A0B0D',
    gray: {
      50: '#FFFFFF',   // canvas
      100: '#F7F7F7',  // surface-soft
      200: '#EEF0F3',  // surface-strong / hairline-soft
      300: '#DEE1E6',  // hairline
      400: '#A8ACB3',  // muted-soft
      500: '#7C828A',  // muted
      600: '#5B616E',  // body
      700: '#2B2F38',
      800: '#16181C',  // surface-dark-elevated
      900: '#0A0B0D',  // ink / surface-dark
      950: '#0A0B0D',
    },
  },

  // ============================================
  // COLORES SEMÁNTICOS
  // Diseñados para armonizar con la paleta base
  // ============================================

  // SUCCESS - Verde esmeralda/turquesa que complementa los azules
  success: {
    light: '#E9FBF2',
    main: '#05B169',      // semantic-up
    dark: '#049356',
    darker: '#037446',
    text: '#0A0B0D',
    badge: '#E9FBF2',
    badgeText: '#05B169',
    50: '#E9FBF2',
    100: '#CFF7E3',
    200: '#9FEFC7',
    300: '#6FE7AB',
    400: '#3FDF8F',
    500: '#05B169',
    600: '#049356',
    700: '#037446',
    800: '#025536',
    900: '#013726',
  },

  // WARNING - Amarillo suave con tinte dorado que no rompe la armonía
  warning: {
    light: '#FFF7E6',
    main: '#F4B000',      // accent-yellow
    dark: '#C98F00',
    darker: '#9E6F00',
    text: '#0A0B0D',
    50: '#FFF7E6',
    100: '#FFEDC2',
    200: '#FFDB85',
    300: '#FFC947',
    400: '#FFB709',
    500: '#F4B000',
    600: '#C98F00',
    700: '#9E6F00',
    800: '#734F00',
    900: '#493000',
  },

  // ERROR - Rojo coral suave con toque azulado para armonía
  error: {
    light: '#FFECEE',
    main: '#CF202F',      // semantic-down
    dark: '#A81824',
    darker: '#80111A',
    text: '#0A0B0D',
    50: '#FFECEE',
    100: '#FFD1D6',
    200: '#FFA3AD',
    300: '#FF7485',
    400: '#FF465C',
    500: '#CF202F',
    600: '#A81824',
    700: '#80111A',
    800: '#590B11',
    900: '#310508',
  },

  // INFO - Usa directamente Cerulean para consistencia
  info: {
    light: '#E6F5F9',      // Fondo muy claro
    main: '#007EA7',       // Cerulean - mismo que secondary
    dark: '#006586',       // Cerulean oscuro
    darker: '#004C65',     // Cerulean muy oscuro
    text: '#003344',       // Texto sobre info
    badge: '#DBEAFE',      // Badge background (light blue)
    badgeText: '#1E40AF',  // Badge text (dark blue)
    // Variaciones completas (igual que secondary)
    50: '#E6F5F9',
    100: '#CCEBF3',
    200: '#99D7E7',
    300: '#66C3DB',
    400: '#33AFCF',
    500: '#007EA7',  // Principal
    600: '#006586',
    700: '#004C65',
    800: '#003344',
    900: '#001A23',
  },

  // ============================================
  // COLORES DE TEXTO
  // ============================================
  text: {
    primary: '#0A0B0D',        // ink
    secondary: '#5B616E',      // body
    tertiary: '#7C828A',       // muted
    disabled: '#A8ACB3',       // muted-soft
    inverse: '#FFFFFF',
    hint: '#7C828A',
    // Colores semánticos de texto
    onPrimary: '#FFFFFF',      // Texto sobre primary
    onSecondary: '#FFFFFF',     // Texto sobre secondary
    onAccent: '#FFFFFF',       // Texto sobre accent
    onSuccess: '#0A0B0D',
    onWarning: '#0A0B0D',
    onError: '#FFFFFF',
    onInfo: '#0A0B0D',
  },

  // ============================================
  // COLORES DE FONDO
  // ============================================
  background: {
    default: '#FFFFFF',        // canvas
    paper: '#FFFFFF',
    elevated: '#FFFFFF',
    overlay: 'rgba(10, 11, 13, 0.6)',
    glass: 'rgba(255, 255, 255, 0.7)',
    glassDark: 'rgba(10, 11, 13, 0.7)',
    // Fondos semánticos
    success: '#E9FBF2',
    warning: '#FFF7E6',
    error: '#FFECEE',
    info: '#EEF0F3',
  },

  // ============================================
  // COLORES DE BORDE
  // ============================================
  border: {
    light: '#DEE1E6',          // hairline
    main: '#DEE1E6',
    dark: '#A8ACB3',
    focus: '#0052FF',
    error: '#CF202F',
    success: '#05B169',
  },

  // ============================================
  // OPACIDADES PREDEFINIDAS
  // Para uso con cualquier color
  // ============================================
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

  // ============================================
  // EFECTOS GLASSMÓRFICOS
  // Basados en la paleta para transparencia y calma
  // ============================================
  glass: {
    // Glass claro (sobre fondos oscuros)
    light: {
      background: 'rgba(255, 255, 255, 0.7)',
      border: 'rgba(255, 255, 255, 0.2)',
      shadow: 'rgba(0, 23, 31, 0.1)',
    },
    // Glass oscuro (sobre fondos claros)
    dark: {
      background: 'rgba(0, 52, 89, 0.7)',
      border: 'rgba(0, 168, 232, 0.2)',
      shadow: 'rgba(0, 23, 31, 0.2)',
    },
    // Glass con acento
    accent: {
      background: 'rgba(0, 168, 232, 0.8)',
      border: 'rgba(255, 255, 255, 0.3)',
      shadow: 'rgba(0, 168, 232, 0.3)',
    },
    // Glass primary
    primary: {
      background: 'rgba(0, 52, 89, 0.8)',
      border: 'rgba(0, 168, 232, 0.3)',
      shadow: 'rgba(0, 23, 31, 0.3)',
    },
  },

  // ============================================
  // GRADIENTES
  // Para efectos visuales que mantienen la armonía
  // ============================================
  gradients: {
    // Coinbase: preferir sólidos; se deja por compatibilidad (si algún lugar usa gradient)
    primary: ['#0052FF', '#003ECC'],
    secondary: ['#EEF0F3', '#FFFFFF'],
    accent: ['#0052FF', '#003ECC'],
    ocean: ['#FFFFFF', '#F7F7F7', '#EEF0F3'],
    sunset: ['#FFF7E6', '#FFFFFF'],
    calm: ['#F7F7F7', '#FFFFFF'],
    dark: ['#0A0B0D', '#16181C'],
    button: ['#0052FF', '#003ECC'],
  },

  // ============================================
  // ESTADOS DE INTERACCIÓN
  // ============================================
  states: {
    hover: {
      primary: '#003ECC',
      secondary: '#003ECC',
      accent: '#003ECC',
    },
    pressed: {
      primary: '#003ECC',
      secondary: '#003ECC',
      accent: '#003ECC',
    },
    disabled: {
      background: '#EEF0F3',
      text: '#A8B8CC',        // primary-disabled per spec
      border: '#DEE1E6',
    },
    focus: {
      ring: '#0052FF',
      ringOpacity: 0.3,
    },
  },
};

export default COLORS;

