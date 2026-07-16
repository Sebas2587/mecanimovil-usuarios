/**
 * Sistema de Colores MecaniMóvil — paleta Tinder oficial + superficies Airbnb.
 * Roles semánticos (https://paletacolorpro.com/en/ui-ux-palette-guide):
 *
 * Brand
 *   Magenta  #FD2B7B  · Orange #FF7158  → gradiente solo en CTAs primarios
 *
 * Secondary buttons (tonal / outlined)
 *   Bg #F3F3F3 o #FFFFFF + borde · Texto #3B3B3B · Acento outline #FF7158
 *
 * Tabs / chips de filtro
 *   Unselected #B8B8B8 · Selected = paper + borde/texto orange (no competir con CTA)
 *
 * Icons
 *   Default #757575 · Active #FF7158 (o gradiente en wells de marca)
 *
 * Soft tags
 *   selection = soft magenta (“Con repuestos”)
 *   badge.especialista = soft orange (diferenciación marca, no CTA)
 *   badge.multimarca = neutral tonal
 *   badge.verified = disco magenta + check blanco (sello Verificado)
 *   badge.meta = tonal quieto (km / facts secundarios Airbnb)
 *   payment.completo|parcial|adicional|aprobado = pills historial de pagos
 *   kpi.elite/master/pro = oro / plata / bronce (niveles KPI)
 *
 * Surfaces
 *   UI #F9F9F9 · Paper #FFFFFF
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
    if (color == null) return '#3B3B3B';
  }
  if (typeof color !== 'string') return '#3B3B3B';
  return withOpacity(color, opacity);
};

/** Magenta Tinder (CTA / brand). */
const MAGENTA = '#FD2B7B';
/** Orange Tinder (gradiente + iconos activos + outline secondary). */
const ORANGE = '#FF7158';
/** Ink / texto principal y botones secundarios. */
const INK = '#3B3B3B';
/** Canvas app (off-white para que el brand destaque). */
const CANVAS = '#F9F9F9';
/** Surface tonal de botones secundarios. */
const TONAL = '#F3F3F3';
/** Tab / chip no seleccionado. */
const TAB_MUTED = '#B8B8B8';
/** Icono default. */
const ICON_DEFAULT = '#757575';
/** Soft tint ~6% magenta. */
const SOFT = '#FFF0F5';

export const COLORS = {
  base: {
    white: '#FFFFFF',
    inkBlack: INK,
    deepSpaceBlue: INK,
    canvas: CANVAS,
    soft: SOFT,
  },

  /** Brand pair canónico Tinder. */
  brand: {
    magenta: MAGENTA,
    orange: ORANGE,
  },

  /** Extremo naranja del gradiente CTA. */
  warm: ORANGE,

  primary: {
    50: SOFT,
    100: '#FFE0EC',
    200: '#FFB8D4',
    300: '#FF85B4',
    400: '#FE528F',
    500: MAGENTA,
    600: '#E01A66',
    700: '#C2185B',
    800: '#9C1449',
    900: '#701035',
  },

  secondary: {
    50: '#FFF1F2',
    100: '#FFE2E5',
    200: '#FFC5CB',
    300: '#FF9AA5',
    400: '#FD6F7D',
    500: '#FD5564',
    600: '#E63D4F',
    700: '#C22D3D',
    800: '#9E2432',
    900: '#7A1C27',
  },

  accent: {
    50: '#FFF5F2',
    100: '#FFE8E2',
    200: '#FFD0C4',
    300: '#FFB09A',
    400: '#FF8F72',
    500: ORANGE,
    600: '#E85A40',
    700: '#C44832',
    800: '#9E3928',
    900: '#782B1E',
  },

  neutral: {
    white: '#FFFFFF',
    inkBlack: INK,
    gray: {
      50: CANVAS,
      100: TONAL,
      200: '#E8E8E8',
      300: TAB_MUTED,
      400: '#9E9E9E',
      500: ICON_DEFAULT,
      600: '#616161',
      700: INK,
      800: '#2A2A2A',
      900: '#1A1A1A',
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
    light: SOFT,
    main: MAGENTA,
    dark: '#C2185B',
    darker: '#9C1449',
    text: INK,
    badge: SOFT,
    badgeText: MAGENTA,
    50: SOFT,
    100: '#FFE0EC',
    200: '#FFB8D4',
    300: '#FF85B4',
    400: '#FE528F',
    500: MAGENTA,
    600: '#E01A66',
    700: '#C2185B',
    800: '#9C1449',
    900: '#701035',
  },

  text: {
    primary: INK,
    secondary: ICON_DEFAULT,
    tertiary: TAB_MUTED,
    disabled: '#C4C4C4',
    inverse: '#FFFFFF',
    hint: TAB_MUTED,
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
    secondary: TONAL,
    overlay: withOpacity(INK, 0.45),
    success: '#e6f7ef',
    warning: '#fff8e6',
    error: '#fde8ea',
    info: SOFT,
  },

  border: {
    light: '#E8E8E8',
    main: '#E0E0E0',
    dark: TAB_MUTED,
    focus: MAGENTA,
    error: '#d93049',
    success: '#0d9f6e',
  },

  /**
   * Iconos stateful (guía Tinder).
   * default = unselected · active = seleccionado / énfasis (sólido orange).
   */
  icon: {
    default: ICON_DEFAULT,
    active: ORANGE,
    muted: TAB_MUTED,
  },

  /**
   * Tabs / chips de filtro (no son CTAs).
   * Selected: paper + orange — jerarquía quieta frente al gradiente del botón primario.
   */
  tab: {
    unselected: TAB_MUTED,
    unselectedBg: TONAL,
    selectedBg: '#FFFFFF',
    selectedText: ORANGE,
    selectedBorder: ORANGE,
    /** Texto sobre gradiente CTA real (botones), no tabs. */
    selectedOnFill: '#FFFFFF',
  },

  /**
   * Botón secundario tonal / outlined (no CTA).
   */
  buttonSecondary: {
    background: TONAL,
    backgroundPaper: '#FFFFFF',
    text: INK,
    border: '#E8E8E8',
    outline: ORANGE,
    outlineText: ORANGE,
  },

  /**
   * Tags / badges suaves (p. ej. “Con repuestos”) — tinte brand, no gradiente CTA.
   */
  selection: {
    background: SOFT,
    backgroundStrong: '#FFE0EC',
    border: '#FFB8D4',
    text: '#C2185B',
    icon: ORANGE,
    fill: MAGENTA,
    onFill: '#FFFFFF',
  },

  /**
   * Badges de cobertura de marca (chips / pills).
   * especialista = soft orange Tinder (diferenciador, no success ni CTA).
   * multimarca = neutro informativo.
   */
  badge: {
    especialista: {
      background: '#FFF5F2',
      border: '#FFD0C4',
      text: '#C44832',
      icon: ORANGE,
    },
    multimarca: {
      background: TONAL,
      border: '#E8E8E8',
      text: INK,
      icon: ICON_DEFAULT,
    },
    /**
     * Sello “Verificado” (proveedor / cuenta).
     * Disco magenta + check blanco — no gradiente CTA.
     */
    verified: {
      fill: MAGENTA,
      onFill: '#FFFFFF',
      icon: MAGENTA,
      text: MAGENTA,
      border: '#FFE0EC',
    },
    /**
     * Meta quieta Airbnb (km, facts secundarios) — tonal, no soft pink.
     */
    meta: {
      background: TONAL,
      border: '#E8E8E8',
      text: '#616161',
      icon: ICON_DEFAULT,
    },
  },

  /**
   * Pills de historial de pagos.
   * Tipo (completo/parcial/adicional) ≠ estado (aprobado).
   * Solo `aprobado` usa success verde — el tipo no compite con el estado.
   */
  payment: {
    /** Tipo: servicio completo — soft orange Tinder (informativo). */
    completo: {
      background: '#FFF5F2',
      border: '#FFD0C4',
      text: '#C44832',
      icon: ORANGE,
    },
    /** Tipo: pago parcial — ámbar. */
    parcial: {
      background: '#fff8e6',
      border: '#ffe399',
      text: '#5c4309',
      icon: '#e6a817',
    },
    /** Tipo: servicio adicional — tonal meta (más quieto que completo). */
    adicional: {
      background: TONAL,
      border: '#E8E8E8',
      text: '#616161',
      icon: ICON_DEFAULT,
    },
    /** Estado MP: aprobado — único verde success. */
    aprobado: {
      background: '#e6f7ef',
      border: '#99dfbf',
      text: '#075f42',
      icon: '#0d9f6e',
    },
  },

  /**
   * Niveles KPI del proveedor (progresión tipo medalla).
   * Elite = oro brillante · Máster = plata · Pro = bronce · Ascenso = cobre · base = neutro.
   */
  kpi: {
    elite: {
      background: '#FFF3C4',
      border: '#E8B923',
      text: '#7A5C00',
      icon: '#C9A227',
      highlight: '#FFD700',
    },
    master: {
      background: '#EEF1F5',
      border: '#B8C0CC',
      text: '#3D4A5C',
      icon: '#8A96A8',
    },
    pro: {
      background: '#F6E8DC',
      border: '#C9956C',
      text: '#6B3E1F',
      icon: '#A66B3D',
    },
    ascenso: {
      background: '#FBF1E8',
      border: '#DDB892',
      text: '#8B5E3C',
      icon: '#B8875A',
    },
    enProgreso: {
      background: TONAL,
      border: '#E0E0E0',
      text: '#616161',
      icon: ICON_DEFAULT,
    },
    sinActividad: {
      background: CANVAS,
      border: '#E8E8E8',
      text: TAB_MUTED,
      icon: TAB_MUTED,
    },
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
    hover: { primary: '#E01A66', secondary: '#E63D4F', accent: '#E85A40' },
    pressed: { primary: '#C2185B', secondary: '#C22D3D', accent: '#C44832' },
    disabled: {
      background: TONAL,
      text: '#C4C4C4',
      border: '#E8E8E8',
    },
    focus: { ring: MAGENTA, ringOpacity: 0.25 },
  },
};

export default COLORS;
