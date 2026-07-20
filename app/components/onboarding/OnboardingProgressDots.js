import React, { useCallback } from 'react';
import { Animated, Pressable, StyleSheet, View, Platform } from 'react-native';
import { SPACING } from '../../design-system/tokens';
import PrimaryGradientFill from '../base/PrimaryGradientFill/PrimaryGradientFill';
import { interpolateDotOpacity, interpolateDotScaleX } from './onboardingMotion';

const webCursor = Platform.OS === 'web' ? { cursor: 'pointer' } : null;
const DOT_BASE = 8;

const Dot = React.memo(function Dot({ index, scrollX, slideWidth, onPress }) {
  const scaleX = interpolateDotScaleX(scrollX, index, slideWidth);
  const opacity = interpolateDotOpacity(scrollX, index, slideWidth);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ir al paso ${index + 1}`}
      hitSlop={10}
      style={({ pressed }) => [styles.hit, pressed && styles.pressed, webCursor]}
    >
      <Animated.View
        style={[
          styles.dot,
          {
            opacity,
            transform: [{ scaleX }],
          },
        ]}
      >
        <PrimaryGradientFill style={StyleSheet.absoluteFillObject} />
      </Animated.View>
    </Pressable>
  );
});

/**
 * Dots con morph suave (scaleX) — native-driver friendly.
 */
const OnboardingProgressDots = ({ count, scrollX, slideWidth, onSelect }) => {
  const handlePress = useCallback(
    (i) => {
      onSelect?.(i);
    },
    [onSelect],
  );

  return (
    <View style={styles.row} accessibilityRole="tablist">
      {Array.from({ length: count }).map((_, i) => (
        <Dot
          key={`ob-dot-${i}`}
          index={i}
          scrollX={scrollX}
          slideWidth={slideWidth}
          onPress={() => handlePress(i)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  hit: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
  dot: {
    width: DOT_BASE,
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
});

export default React.memo(OnboardingProgressDots);
