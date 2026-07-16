/**
 * Visuales de categoría del home — patrón Airbnb Explore (Homes / Experiences / Services):
 * icono outline monocromo + círculo suave neutro. Sin arcoíris semántico (warning/error/success)
 * por categoría: eso rompe la paleta arquitectónica (primary / secondary / accent / ink / canvas).
 */
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
  Sparkles,
} from 'lucide-react-native';
import { COLORS } from '../../../design-system/tokens';

const DEFAULT_ICON = Wrench;

/** Fondo / trazo únicos del sistema (Airbnb Explore: círculo tonal + icono default). */
const CATEGORY_SURFACE = {
  bg: COLORS.background.secondary,
  color: COLORS.icon.default,
};

const RULES = [
  { test: /aceite|lubric|manten|prevent/i, Icon: Droplets },
  { test: /freno|segur/i, Icon: CircleAlert },
  { test: /electr|luces/i, Icon: Zap },
  { test: /diagn|inspec|scanner|escan/i, Icon: ScanLine },
  { test: /suspensi|amortigu/i, Icon: Waves },
  { test: /carroc|pintura|chapa|est[eé]tica|limpie/i, Icon: Sparkles },
  { test: /neum|goma|llanta/i, Icon: Car },
  { test: /motor|mecan/i, Icon: Settings },
  { test: /hammer|golpe/i, Icon: Hammer },
];

export const HEALTH_CATEGORY = {
  id: '__salud__',
  nombre: 'Salud',
  isHealth: true,
  Icon: HeartPulse,
  bg: COLORS.background.secondary,
  color: COLORS.icon.active,
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
      return { Icon: rule.Icon, ...CATEGORY_SURFACE };
    }
  }
  return {
    Icon: DEFAULT_ICON,
    ...CATEGORY_SURFACE,
  };
}

export const MORE_CATEGORY = {
  id: '__more__',
  nombre: 'Más',
  Icon: Grid2x2,
  bg: CATEGORY_SURFACE.bg,
  color: COLORS.text.secondary,
};
