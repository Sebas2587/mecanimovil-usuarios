import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Skeleton from '../feedback/Skeleton/Skeleton';
import { COLORS, SPACING, BORDERS } from '../../design-system/tokens';
import { H_PAD } from '../home/shared/homeLayoutConstants';
import {
  HomeContextHeaderSkeleton,
  HomeCategoryGridSkeleton,
  HomeQuickActionsSkeleton,
  HomeTrendingChipsSkeleton,
  HomeHealthCardsSkeleton,
  HomeProvidersCarouselSkeleton,
  HomeWeatherCardSkeleton,
} from './HomePanelSkeletons';

/**
 * Skeleton de carga inicial del UserPanelScreen (vehículos pendientes).
 * Replica la jerarquía visual del home actual: header, categorías, acciones, rails y clima.
 */
const UserPanelSkeleton = ({ tabBarHeight = 0 }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 12,
            paddingBottom: tabBarHeight + SPACING.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
        accessibilityElementsHidden
      >
        <View style={styles.headerRow}>
          <HomeContextHeaderSkeleton />
          <Skeleton width={40} height={40} borderRadius={20} />
        </View>

        <View style={styles.addressRow}>
          <Skeleton width={16} height={16} borderRadius={8} />
          <Skeleton width="78%" height={16} borderRadius={6} />
          <Skeleton width={16} height={16} borderRadius={8} />
        </View>

        <HomeCategoryGridSkeleton count={6} />

        <HomeQuickActionsSkeleton />

        <View style={styles.section}>
          <Skeleton width={200} height={18} borderRadius={6} style={{ marginBottom: 12 }} />
          <Skeleton width="100%" height={88} borderRadius={BORDERS.radius.lg} />
        </View>

        <View style={styles.section}>
          <Skeleton width={220} height={18} borderRadius={6} style={{ marginBottom: 12 }} />
          <HomeTrendingChipsSkeleton count={3} />
        </View>

        <View style={styles.section}>
          <Skeleton width={180} height={18} borderRadius={6} style={{ marginBottom: 12 }} />
          <HomeHealthCardsSkeleton count={2} />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Skeleton width={160} height={18} borderRadius={6} />
            <Skeleton width={64} height={14} borderRadius={6} />
          </View>
          <HomeProvidersCarouselSkeleton />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Skeleton width={140} height={18} borderRadius={6} />
            <Skeleton width={64} height={14} borderRadius={6} />
          </View>
          <HomeProvidersCarouselSkeleton />
        </View>

        <View style={styles.weatherWrap}>
          <HomeWeatherCardSkeleton />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: H_PAD,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingVertical: 4,
  },
  section: {
    marginBottom: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  weatherWrap: {
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
  },
});

export default UserPanelSkeleton;
