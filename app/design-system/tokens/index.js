/**
 * Exportaciones Centralizadas de Tokens
 * Punto único de entrada para todos los tokens del sistema de diseño
 */

export { COLORS, withOpacity, getColorWithOpacity } from './colors';
export { default as COLORS_DEFAULT } from './colors';

export { TYPOGRAPHY } from './typography';
export { default as TYPOGRAPHY_DEFAULT } from './typography';

export { SPACING } from './spacing';
export { default as SPACING_DEFAULT } from './spacing';

export { SHADOWS } from './shadows';
export { default as SHADOWS_DEFAULT } from './shadows';

export { BORDERS } from './borders';
export { default as BORDERS_DEFAULT } from './borders';

export { ANIMATIONS } from './animations';
export { default as ANIMATIONS_DEFAULT } from './animations';

// Exportación de todos los tokens en un objeto único
// Importar con manejo defensivo de errores usando nombres diferentes para evitar conflictos
let COLORS_LOCAL, TYPOGRAPHY_LOCAL, SPACING_LOCAL, SHADOWS_LOCAL, BORDERS_LOCAL, ANIMATIONS_LOCAL;

try {
  const colorsModule = require('./colors');
  COLORS_LOCAL = colorsModule.COLORS || colorsModule.default || {};
} catch (e) {
  console.error('❌ Error importing COLORS:', e);
  COLORS_LOCAL = {};
}

try {
  const typographyModule = require('./typography');
  TYPOGRAPHY_LOCAL = typographyModule.TYPOGRAPHY || typographyModule.default || {};
} catch (e) {
  console.error('❌ Error importing TYPOGRAPHY:', e);
  TYPOGRAPHY_LOCAL = {};
}

try {
  const spacingModule = require('./spacing');
  SPACING_LOCAL = spacingModule.SPACING || spacingModule.default || {};
} catch (e) {
  console.error('❌ Error importing SPACING:', e);
  SPACING_LOCAL = {};
}

try {
  const shadowsModule = require('./shadows');
  SHADOWS_LOCAL = shadowsModule.SHADOWS || shadowsModule.default || {};
} catch (e) {
  console.error('❌ Error importing SHADOWS:', e);
  SHADOWS_LOCAL = {};
}

try {
  const bordersModule = require('./borders');
  BORDERS_LOCAL = bordersModule.BORDERS || bordersModule.default || {};
} catch (e) {
  console.error('❌ Error importing BORDERS:', e);
  BORDERS_LOCAL = {};
}

try {
  const animationsModule = require('./animations');
  ANIMATIONS_LOCAL = animationsModule.ANIMATIONS || animationsModule.default || {};
} catch (e) {
  console.error('❌ Error importing ANIMATIONS:', e);
  ANIMATIONS_LOCAL = {};
}

export const TOKENS = {
  colors: COLORS_LOCAL || {},
  typography: TYPOGRAPHY_LOCAL || {},
  spacing: SPACING_LOCAL || {},
  shadows: SHADOWS_LOCAL || {},
  borders: BORDERS_LOCAL || {},
  animations: ANIMATIONS_LOCAL || {},
};

// Log de inicialización para depuración
console.log('✅ Design System TOKENS initialized:', {
  hasColors: !!(TOKENS?.colors) && Object.keys(TOKENS?.colors || {}).length > 0,
  hasTypography: !!(TOKENS?.typography) && Object.keys(TOKENS?.typography || {}).length > 0,
  hasSpacing: !!(TOKENS?.spacing) && Object.keys(TOKENS?.spacing || {}).length > 0,
  hasShadows: !!(TOKENS?.shadows) && Object.keys(TOKENS?.shadows || {}).length > 0,
  hasBorders: !!(TOKENS?.borders) && Object.keys(TOKENS?.borders || {}).length > 0,
  hasAnimations: !!(TOKENS?.animations) && Object.keys(TOKENS?.animations || {}).length > 0,
});

export default TOKENS;


