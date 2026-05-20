import {
  Droplets,
  CircleAlert,
  Zap,
  ScanLine,
  Waves,
  Hammer,
  HeartPulse,
  Wrench,
  Car,
  Settings,
  Grid2x2,
} from 'lucide-react-native';
import { COLORS } from '../../../design-system/tokens';

const DEFAULT_ICON = Wrench;

const RULES = [
  { test: /aceite|lubric|mantenimiento/i, Icon: Droplets, bg: COLORS.primary[50], color: COLORS.primary[600] },
  { test: /freno/i, Icon: CircleAlert, bg: COLORS.error.light, color: COLORS.error.main },
  { test: /electr/i, Icon: Zap, bg: COLORS.warning.light, color: COLORS.warning.dark },
  { test: /diagn|scanner|escan/i, Icon: ScanLine, bg: COLORS.neutral.gray[100], color: COLORS.text.primary },
  { test: /suspensi|amortigu/i, Icon: Waves, bg: COLORS.primary[50], color: COLORS.primary[700] },
  { test: /carroc|pintura|chapa/i, Icon: Hammer, bg: COLORS.neutral.gray[200], color: COLORS.text.primary },
  { test: /neum|goma|llanta/i, Icon: Car, bg: COLORS.neutral.gray[100], color: COLORS.text.secondary },
  { test: /motor|mecan/i, Icon: Settings, bg: COLORS.primary[50], color: COLORS.primary[500] },
];

export const HEALTH_CATEGORY = {
  id: '__salud__',
  nombre: 'Salud',
  isHealth: true,
  Icon: HeartPulse,
  bg: COLORS.success.light,
  color: COLORS.success.dark,
};

export function resolveCategoryVisual(category) {
  if (category?.isHealth) {
    return {
      Icon: HEALTH_CATEGORY.Icon,
      bg: HEALTH_CATEGORY.bg,
      color: HEALTH_CATEGORY.color,
    };
  }
  const name = category?.nombre || '';
  for (const rule of RULES) {
    if (rule.test.test(name)) {
      return { Icon: rule.Icon, bg: rule.bg, color: rule.color };
    }
  }
  return {
    Icon: DEFAULT_ICON,
    bg: COLORS.neutral.gray[100],
    color: COLORS.primary[500],
  };
}

export const MORE_CATEGORY = {
  id: '__more__',
  nombre: 'Más',
  Icon: Grid2x2,
  bg: COLORS.neutral.gray[100],
  color: COLORS.text.secondary,
};
