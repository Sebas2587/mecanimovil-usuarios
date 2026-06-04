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
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    lineHeight: 26,
    letterSpacing: 0.2,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
  },
});
