import { COLORS } from '../../../design-system/tokens';

/** Mapa nivel de riesgo clima → color token (compartido dashboard home). */
export const HOME_RISK_COLOR_MAP = {
  critico: COLORS.error.main,
  alto: COLORS.warning.dark,
  moderado: COLORS.warning.main,
  bajo: COLORS.success.main,
  optimo: COLORS.primary[500],
};

export function riskColorForLevel(level) {
  return HOME_RISK_COLOR_MAP[level] || COLORS.text.tertiary;
}
