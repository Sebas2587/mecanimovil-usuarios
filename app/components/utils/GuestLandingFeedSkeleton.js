import React from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Skeleton from '../feedback/Skeleton/Skeleton';
import { COLORS, BORDERS, SPACING, GRADIENTS } from '../../design-system/tokens';
import { H_PAD } from '../home/shared/homeLayoutConstants';
import { HomeProvidersCarouselSkeleton } from './HomePanelSkeletons';

/**
 * Skeleton del feed invitado (servicios + talleres) — Airbnb + acento Tinder.
 */
export const GuestLandingFeedSkeleton = () => {
  const { width } = useWindowDimensions();
  const layoutW = Platform.OS === 'web' ? Math.min(width, 480) : width;
  const cardW = Math.max(148, Math.min(196, Math.floor((layoutW - H_PAD * 2) * 0.42)));

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={GRADIENTS.guestCta}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.accent}
      />
      <Skeleton width="52%" height={18} borderRadius={6} style={{ marginBottom: 14 }} />
      <View style={styles.servicesRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ width: cardW }}>
            <View style={[styles.mediaBox, { width: cardW, height: cardW }]}>
              <Skeleton width="100%" height="100%" borderRadius={BORDERS.radius.lg} />
            </View>
            <Skeleton width="88%" height={14} borderRadius={4} style={{ marginTop: 10 }} />
            <Skeleton width="55%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
            <Skeleton width="40%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
          </View>
        ))}
      </View>

      <Skeleton width="48%" height={18} borderRadius={6} style={{ marginTop: 28, marginBottom: 14 }} />
      <HomeProvidersCarouselSkeleton />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    marginBottom: SPACING.xl,
  },
  accent: {
    height: 3,
    width: 48,
    borderRadius: 2,
    marginBottom: SPACING.md,
  },
  servicesRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  mediaBox: {
    borderRadius: BORDERS.radius.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.neutral.gray[100],
  },
});

export default GuestLandingFeedSkeleton;
