/**
 * Safe Typography Helper
 * Función reutilizable para acceder a TYPOGRAPHY de forma segura con fallbacks
 * Previene ReferenceError cuando TYPOGRAPHY no está completamente inicializado
 */

import { TYPOGRAPHY } from '../design-system/tokens';

export const getSafeTypography = () => {
  try {
    if (TYPOGRAPHY && 
        TYPOGRAPHY?.fontSize && 
        TYPOGRAPHY?.fontWeight &&
        typeof TYPOGRAPHY?.fontSize?.xs !== 'undefined' &&
        typeof TYPOGRAPHY?.fontSize?.md !== 'undefined' &&
        typeof TYPOGRAPHY?.fontWeight?.semibold !== 'undefined') {
      return TYPOGRAPHY;
    }
  } catch (e) {
    console.warn('⚠️ TYPOGRAPHY not ready, using fallback:', e);
  }
  return {
    fontSize: { 
      xs: 10, sm: 12, base: 14, md: 16, lg: 18, xl: 20, 
      '2xl': 24, '3xl': 28, '4xl': 32, '5xl': 36 
    },
    fontWeight: { 
      light: '300', regular: '400', medium: '500', 
      semibold: '600', bold: '700' 
    },
    letterSpacing: {
      tighter: -0.5, tight: -0.25, normal: 0,
      wide: 0.25, wider: 0.5
    },
  };
};

export default getSafeTypography;

