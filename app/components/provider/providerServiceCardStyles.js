import { StyleSheet } from 'react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SHADOWS } from '../../design-system/tokens';

/**
 * Cards de catálogo en “Servicios Profesionales” (ficha proveedor).
 * Patrón Coinbase: paper + hairline neutro + sombra sm.
 */
export const providerServiceCardStyles = StyleSheet.create({
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  serviceCardShell: {
    width: '48%',
    marginBottom: 8,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.card?.lg ?? BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  serviceCardBody: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  serviceName: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    marginBottom: 4,
  },
  serviceCategory: {
    color: COLORS.text.tertiary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    marginBottom: 4,
  },
  serviceTipoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.neutral.gray[100],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDERS.radius.sm,
    marginTop: 6,
    marginBottom: 4,
  },
  serviceTipoBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
  },
  servicePrice: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    marginBottom: 4,
  },
  servicePriceHint: {
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.fontSize.xs,
    marginBottom: 4,
  },
  serviceMeta: {
    color: COLORS.text.tertiary,
    fontSize: TYPOGRAPHY.fontSize.xs,
    marginBottom: 0,
  },
});
