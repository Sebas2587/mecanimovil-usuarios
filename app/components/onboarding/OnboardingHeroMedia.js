import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ONBOARDING_GLASS } from './onboardingTheme';

/**
 * Full-bleed estático + scrim. Sin animaciones de scroll (mejor FPS).
 */
const OnboardingHeroMedia = ({
  source,
  index,
  slideWidth,
  slideHeight,
  transitionKey,
  contentFit = 'cover',
}) => {
  const recycleKey = transitionKey
    ? `onboarding-hero-${index}-${transitionKey}`
    : `onboarding-hero-${index}`;

  return (
    <View style={[styles.frame, { width: slideWidth, height: slideHeight }]} pointerEvents="none">
      <Image
        source={source}
        style={styles.image}
        contentFit={contentFit}
        contentPosition="center"
        cachePolicy="memory-disk"
        transition={transitionKey ? 180 : 0}
        recyclingKey={recycleKey}
      />
      <LinearGradient
        colors={[
          ONBOARDING_GLASS.scrimTop,
          ONBOARDING_GLASS.scrimMid,
          ONBOARDING_GLASS.scrimBottom,
        ]}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    backgroundColor: '#0B0B0B',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

export default React.memo(OnboardingHeroMedia);
