/**
 * Constantes de la aplicación MecaniMovil
 * Incluye colores, dimensiones y otras constantes globales
 * 
 * NOTA: Los colores ahora provienen del design-system.
 * Se mantienen propiedades de compatibilidad hacia atrás.
 */

import { Dimensions, Platform } from 'react-native';
import {
  COLORS as DESIGN_COLORS,
  TYPOGRAPHY as DESIGN_TYPOGRAPHY_RAW,
  SPACING as DESIGN_SPACING,
  BORDERS as DESIGN_BORDERS,
  ANIMATIONS as DESIGN_ANIMATIONS,
  SHADOWS as DESIGN_SHADOWS
} from '../design-system/tokens';

// Obtener dimensiones de la pantalla
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Colores principales - Usando nueva paleta del design-system
// Manteniendo compatibilidad hacia atrás con propiedades existentes
// Protección contra acceso a propiedades undefined
const safeColors = DESIGN_COLORS || {};

export const COLORS = {
  // Colores primarios (nueva paleta)
  primary: safeColors.primary?.[500] ?? '#003459',      // Deep Space Blue #003459
  primaryDark: safeColors.primary?.[700] ?? '#002244',
  primaryLight: safeColors.primary?.[300] ?? '#006699',
  secondary: safeColors.secondary?.[500] ?? '#007EA7',    // Cerulean #007EA7
  secondaryDark: safeColors.secondary?.[700] ?? '#005a7a',
  secondaryLight: safeColors.secondary?.[300] ?? '#00a3cc',

  // Colores de fondo
  background: safeColors.background?.default ?? '#FFFFFF',
  white: safeColors.neutral?.white ?? '#FFFFFF',
  black: safeColors.base?.inkBlack ?? '#000000',

  // Colores de texto
  text: safeColors.text?.primary ?? '#000000',
  textLight: safeColors.text?.secondary ?? '#666666',
  textDark: safeColors.text?.primary ?? '#000000',

  // Colores semánticos
  success: safeColors.success?.[500] ?? '#10B981',
  danger: safeColors.error?.[500] ?? '#EF4444',
  warning: safeColors.warning?.[500] ?? '#F59E0B',
  info: safeColors.info?.[500] ?? '#3B82F6',

  // Estados
  disabled: safeColors.states?.disabled?.text ?? '#9CA3AF',
  lightGray: safeColors.neutral?.gray?.[300] ?? '#D1D5DB',
  borderLight: safeColors.border?.light ?? '#E5E7EB',
  inputBackground: safeColors.background?.paper ?? '#FFFFFF',

  // Colores para el efecto glassmórfico (nueva paleta)
  glass: {
    primary: safeColors.glass?.primary?.background ?? 'rgba(0, 52, 89, 0.1)',
    secondary: safeColors.glass?.accent?.background ?? 'rgba(0, 126, 167, 0.1)',
    white: safeColors.glass?.light?.background ?? 'rgba(255, 255, 255, 0.9)',
    dark: safeColors.glass?.dark?.background ?? 'rgba(0, 0, 0, 0.7)',
    overlay: safeColors.background?.overlay ?? 'rgba(0, 0, 0, 0.5)',
    border: safeColors.glass?.light?.border ?? 'rgba(255, 255, 255, 0.2)',
  },
};

// Tamaños de fuente responsivos
// Alineados con design-system pero manteniendo estructura existente
// Protección completa contra problemas de inicialización
let DESIGN_TYPOGRAPHY = null;
try {
  // Intentar acceder a DESIGN_TYPOGRAPHY_RAW de forma segura
  if (DESIGN_TYPOGRAPHY_RAW &&
    DESIGN_TYPOGRAPHY_RAW.fontSize &&
    typeof DESIGN_TYPOGRAPHY_RAW.fontSize === 'object' &&
    DESIGN_TYPOGRAPHY_RAW.fontWeight &&
    typeof DESIGN_TYPOGRAPHY_RAW.fontWeight === 'object' &&
    typeof DESIGN_TYPOGRAPHY_RAW.fontSize.xs !== 'undefined' &&
    typeof DESIGN_TYPOGRAPHY_RAW.fontSize['2xl'] !== 'undefined') {
    DESIGN_TYPOGRAPHY = DESIGN_TYPOGRAPHY_RAW;
  }
} catch (e) {
  console.warn('⚠️ Error accessing DESIGN_TYPOGRAPHY_RAW, using fallback:', e);
}

// Si DESIGN_TYPOGRAPHY no está disponible, usar fallback
const safeTypography = DESIGN_TYPOGRAPHY || {
  fontSize: { xs: 10, sm: 12, base: 14, md: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 28, '4xl': 32, '5xl': 36 },
  fontWeight: { light: '300', regular: '400', medium: '500', semibold: '600', bold: '700' },
};

export const FONT_SIZES = {
  h1: safeTypography.fontSize?.['3xl'] ?? 28,
  h2: safeTypography.fontSize?.['2xl'] ?? 24,
  h3: safeTypography.fontSize?.xl ?? 20,
  h4: safeTypography.fontSize?.lg ?? 18,
  body: safeTypography.fontSize?.md ?? 16,
  caption: safeTypography.fontSize?.sm ?? 12,
  small: safeTypography.fontSize?.xs ?? 10,
};

// Espaciado responsivo
// Alineado con design-system pero manteniendo estructura existente
// Protección contra acceso a propiedades undefined
const safeSpacing = DESIGN_SPACING || {};

export const SPACING = {
  xs: safeSpacing.xs ?? 4,
  sm: safeSpacing.sm ?? 8,
  md: safeSpacing.md ?? 16,
  lg: safeSpacing.lg ?? 24,
  xl: safeSpacing.xl ?? 32,
  xxl: safeSpacing['2xl'] ?? 48,
};

// Bordes y espaciado
// Alineado con design-system pero manteniendo estructura existente
// Protección contra acceso a propiedades undefined
const safeBorders = DESIGN_BORDERS?.radius ? DESIGN_BORDERS : {
  radius: { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 }
};

export const BORDERS = {
  radius: {
    sm: safeBorders.radius?.sm ?? 4,
    md: safeBorders.radius?.md ?? 8,
    lg: safeBorders.radius?.lg ?? 12,
    xl: safeBorders.radius?.xl ?? 16,
    round: safeBorders.radius?.full ?? 9999,
  },
};

// Dimensiones de la pantalla y breakpoints
export const SCREEN = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  padding: SPACING.md,

  // Breakpoints para diseño responsivo
  breakpoints: {
    small: 375,    // iPhone SE, iPhone 8
    medium: 414,   // iPhone 11, iPhone 12
    large: 768,    // iPad mini
    xlarge: 1024,  // iPad
  },

  // Helpers para detectar tamaño de pantalla
  isSmall: SCREEN_WIDTH < 375,
  isMedium: SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414,
  isLarge: SCREEN_WIDTH >= 414 && SCREEN_WIDTH < 768,
  isTablet: SCREEN_WIDTH >= 768,

  // Configuraciones específicas por plataforma
  statusBarHeight: Platform.OS === 'ios' ? 44 : 24,
  headerHeight: Platform.OS === 'ios' ? 88 : 64,
  tabBarHeight: Platform.OS === 'ios' ? 83 : 56,
};

// Duraciones para animaciones
// Alineado con design-system pero manteniendo estructura existente
export const DURATIONS = {
  short: DESIGN_ANIMATIONS.duration.short,
  medium: DESIGN_ANIMATIONS.duration.medium,
  long: DESIGN_ANIMATIONS.duration.long,
};

// Sombras responsivas
// Alineado con design-system pero manteniendo estructura existente
export const SHADOWS = {
  light: DESIGN_SHADOWS.sm,
  medium: DESIGN_SHADOWS.md,
  strong: DESIGN_SHADOWS.lg,
};

// Constantes para imágenes de fondo
export const BACKGROUNDS = {
  main: require('../../assets/images/background.jpg'),
};

// Configuraciones de layout responsivo
export const LAYOUT = {
  // Padding horizontal por defecto
  horizontalPadding: SPACING.md,

  // Altura mínima para botones
  buttonHeight: SCREEN_WIDTH < 375 ? 44 : SCREEN_WIDTH >= 414 ? 52 : 48,

  // Altura para inputs
  inputHeight: SCREEN_WIDTH < 375 ? 40 : SCREEN_WIDTH >= 414 ? 48 : 44,

  // Espaciado entre secciones
  sectionSpacing: SPACING.lg,

  // Ancho máximo para contenido en tablets
  maxContentWidth: 600,

  // Grid responsivo
  grid: {
    columns: SCREEN_WIDTH < 375 ? 2 : SCREEN_WIDTH >= 768 ? 4 : 3,
    spacing: SPACING.sm,
  },
};

// Rutas de navegación
export const ROUTES = {
  // Rutas de autenticación
  LOGIN: 'Login',
  REGISTER: 'Register',

  // Rutas principales de la aplicación
  HOME: 'Home',
  PROFILE: 'Profile',
  SERVICES: 'Services',
  SERVICE_LIST: 'ServiceList',
  SERVICE_DETAIL: 'ServiceDetail',
  ORDER_HISTORY: 'OrderHistory',
  ORDER_DETAIL: 'OrderDetail',
  ADD_ADDRESS: 'AddAddress',
  MY_VEHICLES: 'MyVehicles',
  VEHICLE_PROVIDERS: 'VehicleProviders',
  VEHICLE_HISTORY: 'VehicleHistory',
  AGENDAMIENTO: 'Agendamiento',
  AGENDAMIENTO_FLOW: 'AgendamientoFlow',

  // Nuevas rutas para categorías de proveedores
  TALLERES: 'Talleres',
  MECANICOS: 'Mecanicos',
  PROVIDER_DETAIL: 'ProviderDetail',

  // Rutas del perfil
  APPOINTMENT_DETAIL: 'AppointmentDetail',
  ACTIVE_APPOINTMENTS: 'ActiveAppointments',
  SERVICES_HISTORY: 'ServicesHistory',
  VEHICLES_LIST: 'VehiclesList',
  EDIT_PROFILE: 'EditProfile',
  SUPPORT: 'Support',
  TERMS: 'Terms',
  HISTORIAL_PAGOS: 'HistorialPagos',

  // Rutas para reviews de proveedores
  PROVIDER_REVIEWS: 'ProviderReviewsScreen',

  // Ruta para detalle de servicio
  SERVICE_DETAIL: 'ServiceDetail',

  // Ruta para categorías de servicios
  CATEGORY_SERVICES: 'CategoryServices', // OBSOLETO - Usar CATEGORY_SERVICES_LIST
  CATEGORY_SERVICES_LIST: 'CategoryServicesList', // Nueva pantalla simple de lista

  // Rutas de solicitudes públicas
  CREAR_SOLICITUD: 'CrearSolicitud',
  MIS_SOLICITUDES: 'MisSolicitudes',
  DETALLE_SOLICITUD: 'DetalleSolicitud',
  SELECCIONAR_SERVICIOS: 'SeleccionarServicios',
  SELECCIONAR_PROVEEDORES: 'SeleccionarProveedores',
  COMPARADOR_OFERTAS: 'ComparadorOfertas',
  CHAT_OFERTA: 'ChatOferta',
  CHATS_LIST: 'ChatsList',

  // Rutas de salud vehicular
  VEHICLE_HEALTH: 'VehicleHealth',
  MIS_VEHICULOS: 'MisVehiculos',
  VEHICLE_PROFILE: 'VehicleProfile',

  // Notificaciones
  NOTIFICATION_CENTER: 'NotificationCenter',
}; 