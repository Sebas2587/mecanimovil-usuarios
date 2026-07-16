import { StyleSheet } from 'react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SHADOWS, SPACING, withOpacity } from '../../design-system/tokens';

/** Agrupa ítems de catálogo en filas de 2 para igualar alturas (web + native). */
export function chunkCatalogServiceRows(items) {
  const rows = [];
  const list = Array.isArray(items) ? items : [];
  for (let i = 0; i < list.length; i += 2) {
    rows.push(list.slice(i, i + 2));
  }
  return rows;
}

/**
 * Cards de catálogo en ficha proveedor — Airbnb listing grid + tintes Tinder en badges.
 */
export const providerServiceCardStyles = StyleSheet.create({
  servicesGrid: {
    gap: SPACING.md,
  },
  servicesRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
    gap: SPACING.md,
  },
  serviceCardSpacer: {
    flex: 1,
    minWidth: 0,
  },
  serviceCardShell: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
    flexDirection: 'column',
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  serviceCardInner: {
    flex: 1,
    alignSelf: 'stretch',
    flexDirection: 'column',
  },
  mediaWrap: {
    position: 'relative',
    width: '100%',
    backgroundColor: COLORS.neutral.gray[100],
    overflow: 'hidden',
  },
  mediaPlaceholder: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neutral.gray[100],
  },
  categoryOverlay: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    maxWidth: '72%',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.full,
    backgroundColor: withOpacity(COLORS.base.white, 0.94),
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    zIndex: 2,
  },
  categoryOverlayText: {
    ...TYPOGRAPHY.styles.small,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
  },
  serviceCardBody: {
    flexGrow: 1,
    flexShrink: 0,
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  bodyTop: {
    minHeight: 40,
  },
  serviceName: {
    ...TYPOGRAPHY.styles.captionBold,
    fontSize: TYPOGRAPHY.fontSize.md,
    lineHeight: 20,
    minHeight: 40,
    letterSpacing: -0.15,
    color: COLORS.text.primary,
  },
  tipoTagRow: {
    minHeight: 22,
    justifyContent: 'flex-start',
  },
  serviceTipoTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDERS.radius.sm,
    borderWidth: BORDERS.width.thin,
  },
  serviceTipoTagCon: {
    backgroundColor: COLORS.selection.background,
    borderColor: COLORS.selection.border,
  },
  serviceTipoTagSin: {
    backgroundColor: COLORS.background.secondary,
    borderColor: COLORS.border.light,
  },
  serviceTipoTagText: {
    ...TYPOGRAPHY.styles.small,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: 0.1,
  },
  serviceTipoTagTextCon: {
    color: COLORS.selection.text,
  },
  serviceTipoTagTextSin: {
    color: COLORS.text.secondary,
  },
  priceBlock: {
    gap: 2,
    minHeight: 54,
    justifyContent: 'flex-start',
  },
  servicePrice: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
    fontVariant: ['tabular-nums'],
    minHeight: 20,
  },
  servicePricePlaceholder: {
    minHeight: 20,
  },
  servicePriceHint: {
    ...TYPOGRAPHY.styles.small,
    color: COLORS.text.tertiary,
    lineHeight: 16,
    minHeight: 32,
  },
  servicePriceHintPlaceholder: {
    minHeight: 32,
  },
  serviceMeta: {
    ...TYPOGRAPHY.styles.small,
    color: COLORS.text.tertiary,
  },
  footerBlock: {
    paddingTop: SPACING.xxs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border.light,
  },
});
