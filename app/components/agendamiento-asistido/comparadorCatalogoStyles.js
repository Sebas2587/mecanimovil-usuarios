import { StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../../design-system/tokens';

/**
 * Tipografía y metadatos compactos del comparador catálogo (Coinbase-light).
 */
export const comparadorCatalogoStyles = StyleSheet.create({
  section: {
    marginBottom: SPACING.lg,
  },
  repuestosBlockSpaced: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.xs,
  },
  groupSpaced: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.xs,
  },
  groupTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: 0.1,
    color: COLORS.text.tertiary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
  },
});
