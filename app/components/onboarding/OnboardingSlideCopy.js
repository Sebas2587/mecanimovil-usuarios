import React from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { TYPOGRAPHY } from '../../design-system/tokens';
import { ONBOARDING_GLASS } from './onboardingTheme';
import { interpolateFade } from './onboardingMotion';

/**
 * Copy con un solo fade — liviano en scroll.
 */
const OnboardingSlideCopy = ({
  eyebrow,
  title,
  subtitle,
  index,
  scrollX,
  slideWidth,
  titleSize,
  subtitleSize,
}) => {
  const opacity = interpolateFade(scrollX, index, slideWidth);

  return (
    <Animated.View style={[styles.wrap, { opacity }]}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text
        style={[
          styles.title,
          {
            fontSize: titleSize,
            lineHeight: Math.round(titleSize * 1.18),
          },
        ]}
        numberOfLines={2}
      >
        {title}
      </Text>
      <Text
        style={[
          styles.subtitle,
          {
            fontSize: subtitleSize,
            lineHeight: Math.round(subtitleSize * 1.4),
          },
        ]}
        numberOfLines={2}
      >
        {subtitle}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    gap: 4,
    minWidth: 0,
  },
  eyebrow: {
    ...TYPOGRAPHY.styles.captionBold,
    color: '#FF8FB8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    ...TYPOGRAPHY.styles.h2,
    color: ONBOARDING_GLASS.text,
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  subtitle: {
    ...TYPOGRAPHY.styles.body,
    color: ONBOARDING_GLASS.textMuted,
    marginTop: 2,
    maxWidth: 480,
    flexShrink: 1,
  },
});

export default React.memo(OnboardingSlideCopy);
