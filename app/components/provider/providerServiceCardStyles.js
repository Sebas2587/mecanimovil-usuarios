import { StyleSheet } from 'react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SHADOWS, SPACING } from '../../design-system/tokens';

/**
 * Cards de catálogo en “Servicios Profesionales” (ficha proveedor).
 * Patrón Coinbase: paper + hairline neutro + sombra sm.
 */
export const providerServiceCardStyles = StyleSheet.create({
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  serviceCardShell: {
    width: '48%',
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.card?.lg ?? BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  mediaWrap: {
    position: 'relative',
    width: '100%',
    backgroundColor: COLORS.neutral.gray[100],
  },
  mediaWrapCompact: {
    backgroundColor: COLORS.neutral.gray[50],
  },
  mediaPlaceholder: {
    width: '100%',
    backgroundColor: COLORS.neutral.gray[100],
  },
  categoryOverlay: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    maxWidth: '72%',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    zIndex: 2,
  },
  categoryOverlayText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
  },
  serviceCardBody: {
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    gap: SPACING.xxs,
  },
  serviceName: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.md * TYPOGRAPHY.lineHeight.tight),
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
    marginBottom: 2,
  },
  serviceTipoBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 3,
    borderRadius: BORDERS.radius.sm,
    marginBottom: SPACING.xxs,
  },
  serviceTipoBadgeCon: {
    backgroundColor: COLORS.primary[50],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.primary[100],
  },
  serviceTipoBadgeSin: {
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  serviceTipoBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  serviceTipoBadgeTextCon: {
    color: COLORS.primary[700],
  },
  serviceTipoBadgeTextSin: {
    color: COLORS.text.secondary,
  },
  servicePrice: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  servicePriceHint: {
    color: COLORS.text.tertiary,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    lineHeight: 16,
  },
  serviceMeta: {
    color: COLORS.text.tertiary,
    fontSize: TYPOGRAPHY.fontSize.xs,
    marginTop: 2,
  },
});
