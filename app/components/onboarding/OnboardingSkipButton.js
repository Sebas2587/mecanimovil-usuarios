import React from 'react';
import { Pressable, Text, StyleSheet, Platform, View } from 'react-native';
import { TYPOGRAPHY, SPACING } from '../../design-system/tokens';
import { ONBOARDING_GLASS } from './onboardingTheme';

const webCursor = Platform.OS === 'web' ? { cursor: 'pointer' } : null;

/**
 * Acción textual quieta sobre foto oscura (Saltar / Cerrar / Atrás).
 */
const OnboardingSkipButton = ({ onPress, label = 'Saltar', style, iconNode }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
    hitSlop={10}
    style={({ pressed }) => [
      styles.btn,
      pressed && styles.pressed,
      webCursor,
      style,
    ]}
  >
    <View style={styles.row}>
      {iconNode ? <View style={styles.icon}>{iconNode}</View> : null}
      <Text style={styles.label}>{label}</Text>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  icon: {
    marginTop: 1,
  },
  label: {
    ...TYPOGRAPHY.styles.captionBold,
    color: ONBOARDING_GLASS.textMuted,
  },
});

export default React.memo(OnboardingSkipButton);
