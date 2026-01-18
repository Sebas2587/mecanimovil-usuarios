/**
 * Theme Provider - MecaniMóvil
 * Provee todos los tokens del sistema de diseño globalmente
 */

import React, { createContext, useMemo } from 'react';
import { TOKENS } from '../tokens';

// Fallback completo para TOKENS si no está disponible
const FALLBACK_TOKENS = {
  colors: {},
  typography: {
    fontSize: { xs: 10, sm: 12, base: 14, md: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 28, '4xl': 32, '5xl': 36 },
    fontWeight: { light: '300', regular: '400', medium: '500', semibold: '600', bold: '700' },
    fontFamily: { regular: 'System', medium: 'System', bold: 'System' },
  },
  spacing: {},
  shadows: {},
  animations: {},
  borders: {
    radius: { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
    width: { none: 0, thin: 1, medium: 2, thick: 4 },
  },
};

// Validar que TOKENS esté completo
const validateTokens = (tokens) => {
  // Protección contra tokens undefined/null
  if (!tokens || typeof tokens !== 'object') {
    console.error('❌ TOKENS is not a valid object, using fallback');
    return TOKENS || FALLBACK_TOKENS;
  }

  const hasValidBorders = tokens?.borders && tokens?.borders?.radius && typeof tokens?.borders?.radius?.full !== 'undefined';
  const hasValidTypography = tokens?.typography &&
    tokens?.typography?.fontSize &&
    typeof tokens?.typography?.fontSize === 'object' &&
    tokens?.typography?.fontWeight &&
    typeof tokens?.typography?.fontWeight === 'object' &&
    typeof tokens?.typography?.fontSize?.xs !== 'undefined' &&
    typeof tokens?.typography?.fontSize?.['2xl'] !== 'undefined';
  const hasValidColors = tokens?.colors && typeof tokens?.colors === 'object';
  const hasValidSpacing = tokens?.spacing && typeof tokens?.spacing === 'object';

  if (!hasValidBorders || !hasValidTypography || !hasValidColors || !hasValidSpacing) {
    console.error('❌ TOKENS validation failed in ThemeProvider:', {
      hasTokens: !!tokens,
      hasValidBorders,
      hasValidTypography,
      hasValidColors,
      hasValidSpacing,
      hasTypography: !!(tokens && tokens?.typography),
      hasTypographyFontSize: !!(tokens && tokens?.typography && tokens?.typography?.fontSize),
      typographyType: tokens?.typography ? typeof tokens?.typography : 'undefined',
    });
    // Retornar TOKENS si está disponible, si no usar fallback
    return (TOKENS && typeof TOKENS === 'object') ? TOKENS : FALLBACK_TOKENS;
  }
  return tokens;
};

// Obtener TOKENS de forma segura
let safeTOKENS;
try {
  safeTOKENS = TOKENS || FALLBACK_TOKENS;
} catch (e) {
  console.error('❌ Error accessing TOKENS in ThemeProvider:', e);
  safeTOKENS = FALLBACK_TOKENS;
}

// Crear el contexto del tema con TOKENS validado
export const ThemeContext = createContext(validateTokens(safeTOKENS));

/**
 * ThemeProvider Component
 * Envuelve la aplicación para proveer acceso a los tokens del tema
 * 
 * @param {React.ReactNode} children - Componentes hijos
 */
export const ThemeProvider = ({ children }) => {
  // Memorizar los tokens validados
  // Obtener TOKENS de forma segura dentro del componente
  let tokensToValidate;
  try {
    tokensToValidate = TOKENS || safeTOKENS || FALLBACK_TOKENS;
  } catch (e) {
    console.error('❌ Error accessing TOKENS in ThemeProvider component:', e);
    tokensToValidate = FALLBACK_TOKENS;
  }

  const validatedTokens = useMemo(() => validateTokens(tokensToValidate), []);

  return (
    <ThemeContext.Provider value={validatedTokens}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;

