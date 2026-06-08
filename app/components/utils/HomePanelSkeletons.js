import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Skeleton from '../feedback/Skeleton/Skeleton';
import { COLORS, BORDERS, SPACING } from '../../design-system/tokens';
import { GRID_CARD_W, H_PAD } from '../home/shared/homeLayoutConstants';

/** Pill de vehículo en HomeContextHeader */
export const HomeContextHeaderSkeleton = () => (
  <View style={headerStyles.vehiclePill}>
    <Skeleton width={36} height={36} borderRadius={BORDERS.radius.md} />
    <View style={{ flex: 1, gap: 6 }}>
      <Skeleton width="72%" height={14} borderRadius={6} />
      <Skeleton width="48%" height={12} borderRadius={6} />
    </View>
    <Skeleton width={44} height={44} borderRadius={22} />
    <Skeleton width={18} height={18} borderRadius={9} />
  </View>
);

/** Grilla horizontal de categorías (HomeCategoryGrid) */
export const HomeCategoryGridSkeleton = ({ count = 6 }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={sharedStyles.categoryRow}
    accessibilityElementsHidden
  >
    {Array.from({ length: count }).map((_, i) => (
      <View key={i} style={sharedStyles.categoryCell}>
        <Skeleton width={56} height={56} borderRadius={BORDERS.radius.full} />
        <Skeleton width={72} height={12} borderRadius={4} style={{ marginTop: 8 }} />
      </View>
    ))}
  </ScrollView>
);

/** Chips horizontales (HomeTrendingServicesRow) */
export const HomeTrendingChipsSkeleton = ({ count = 3 }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={sharedStyles.chipRow}
    accessibilityElementsHidden
  >
    {Array.from({ length: count }).map((_, i) => (
      <View key={i} style={sharedStyles.chip}>
        <Skeleton width="85%" height={14} borderRadius={6} />
        <Skeleton width="60%" height={12} borderRadius={6} style={{ marginTop: 10 }} />
      </View>
    ))}
  </ScrollView>
);

/** Cards de mantenimiento por desgaste (HomeHealthServicesRow) */
export const HomeHealthCardsSkeleton = ({ count = 4 }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={sharedStyles.healthRow}
    accessibilityElementsHidden
  >
    {Array.from({ length: count }).map((_, i) => (
      <View key={i} style={sharedStyles.healthCard}>
        <Skeleton width="70%" height={10} borderRadius={4} />
        <Skeleton width="100%" height={4} borderRadius={2} style={{ marginTop: 10 }} />
        <Skeleton width="90%" height={16} borderRadius={6} style={{ marginTop: 12 }} />
        <Skeleton width="55%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
        <Skeleton width={72} height={14} borderRadius={4} style={{ marginTop: 10 }} />
      </View>
    ))}
  </ScrollView>
);

/** Carrusel 2×N de proveedores (HomeProvidersCarouselSection) */
export const HomeProvidersCarouselSkeleton = () => (
  <View style={sharedStyles.providerPage} accessibilityElementsHidden>
    <Skeleton width={GRID_CARD_W} height={168} borderRadius={BORDERS.radius.card?.lg ?? 16} />
    <Skeleton width={GRID_CARD_W} height={168} borderRadius={BORDERS.radius.card?.lg ?? 16} />
  </View>
);

/** Tarjeta de clima (HomeWeatherPreviewSection) */
export const HomeWeatherCardSkeleton = ({ compact = false }) => (
  <View style={[sharedStyles.weatherInner, compact && sharedStyles.weatherInnerCompact]} accessibilityElementsHidden>
    <View style={sharedStyles.weatherHeaderRow}>
      <Skeleton width={20} height={20} borderRadius={10} />
      <Skeleton width="65%" height={12} borderRadius={4} />
    </View>
    <Skeleton width={64} height={compact ? 28 : 34} borderRadius={6} style={{ marginTop: 10 }} />
    <Skeleton width="80%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
    <Skeleton width="100%" height={4} borderRadius={2} style={{ marginTop: 14 }} />
    <Skeleton width="100%" height={4} borderRadius={2} style={{ marginTop: 8 }} />
  </View>
);

/** Acciones rápidas del home (4 tiles) */
export const HomeQuickActionsSkeleton = () => (
  <View style={sharedStyles.quickActionsRow} accessibilityElementsHidden>
    {[0, 1, 2, 3].map((i) => (
      <View key={i} style={sharedStyles.quickActionCell}>
        <Skeleton width={44} height={44} borderRadius={22} />
        <Skeleton width={72} height={12} borderRadius={4} style={{ marginTop: 8 }} />
        <Skeleton width={56} height={10} borderRadius={4} style={{ marginTop: 4 }} />
      </View>
    ))}
  </View>
);

const headerStyles = StyleSheet.create({
  vehiclePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    minWidth: 0,
  },
});

const sharedStyles = StyleSheet.create({
  categoryRow: {
    flexDirection: 'row',
    gap: 4,
    paddingRight: 8,
    marginBottom: 18,
  },
  categoryCell: {
    width: 88,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 8,
  },
  chip: {
    width: 148,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  healthRow: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 8,
  },
  healthCard: {
    width: 172,
    padding: 14,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  providerPage: {
    paddingHorizontal: H_PAD,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 4,
  },
  weatherInner: {
    padding: SPACING.cardPadding,
    minHeight: 100,
  },
  weatherInnerCompact: {
    padding: SPACING.sm,
    minHeight: 72,
  },
  weatherHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quickActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
  },
  quickActionCell: {
    width: GRID_CARD_W,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
});
