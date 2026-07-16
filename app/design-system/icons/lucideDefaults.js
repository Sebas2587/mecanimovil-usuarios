/**
 * Lucide defaults — fill transparente (evita fondo negro en web).
 * SVG default fill es black si se pasa fill={undefined}.
 */
import { COLORS } from '../tokens/colors';

export const LUCIDE_FILL_NONE = 'none';
export const LUCIDE_STROKE_WIDTH = 1.75;

/**
 * Props seguras para cualquier icono Lucide (directo o vía Icon wrapper).
 * @param {object} [overrides]
 */
export function lucideSafeProps(overrides = {}) {
  const { fill, strokeWidth, ...rest } = overrides;
  return {
    fill: fill == null ? LUCIDE_FILL_NONE : fill,
    strokeWidth: strokeWidth == null ? LUCIDE_STROKE_WIDTH : strokeWidth,
    ...rest,
  };
}

/**
 * Superficie detrás del icono (Airbnb / Tinder UI):
 * transparente o paper blanco — nunca ink/negro.
 */
export const ICON_SURFACE = {
  transparent: 'transparent',
  paper: COLORS.base.white,
  soft: COLORS.neutral.gray[100],
};
