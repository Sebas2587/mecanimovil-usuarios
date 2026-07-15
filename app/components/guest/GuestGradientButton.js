import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GRADIENTS } from '../../design-system/tokens/gradients';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY, SHADOWS } from '../../design-system/tokens';

const GuestGradientButton = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  style,
  textStyle,
  accessibilityLabel,
}) => {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      style={[styles.touchWrap, style, isDisabled && styles.disabled]}
    >
      <LinearGradient
        colors={GRADIENTS.guestCta}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.base.white} />
        ) : (
          <Text style={[styles.label, textStyle]}>{title}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchWrap: {
    borderRadius: BORDERS.radius.lg,
    overflow: 'hidden',
    ...SHADOWS.button,
  },
  gradient: {
    minHeight: 52,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...TYPOGRAPHY.styles.button,
    color: COLORS.base.white,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.55,
  },
});

export default GuestGradientButton;
