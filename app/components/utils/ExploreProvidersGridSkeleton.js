import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from '../feedback/Skeleton/Skeleton';
import { COLORS, BORDERS, SPACING } from '../../design-system/tokens';
import { CARD_GAP, GRID_CARD_W } from '../home/shared/homeLayoutConstants';

function ProviderCardPlaceholder() {
  return (
    <Skeleton width={GRID_CARD_W} height={168} borderRadius={BORDERS.radius.card?.lg ?? 16} />
  );
}

function SectionSkeleton({ rows = 2 }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Skeleton width={16} height={16} borderRadius={8} />
        <View style={styles.sectionHeaderText}>
          <Skeleton width="55%" height={16} borderRadius={6} />
          <Skeleton width="88%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
        </View>
      </View>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <View key={rowIdx} style={styles.columnWrap}>
          <ProviderCardPlaceholder />
          <ProviderCardPlaceholder />
        </View>
      ))}
    </View>
  );
}

/**
 * Placeholder de ExploreProvidersGrid (categorías / Ver todos).
 * Alineado con layout 2 columnas + secciones (OpenSpec home-skeleton-loading-ux).
 */
const ExploreProvidersGridSkeleton = ({ sections = 1, rowsPerSection = 3 }) => (
  <View style={styles.root} accessibilityElementsHidden>
    {Array.from({ length: sections }).map((_, i) => (
      <SectionSkeleton key={i} rows={rowsPerSection} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  root: {
    paddingBottom: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  sectionHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  columnWrap: {
    flexDirection: 'row',
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },
});

export default ExploreProvidersGridSkeleton;
