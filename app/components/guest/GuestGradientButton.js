import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import PrimaryGradientFill from '../base/PrimaryGradientFill/PrimaryGradientFill';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY, SHADOWS } from '../../design-system/tokens';

/**
 * CTA primario — degradado Tinder (rosa → naranja).
 * Solo acciones principales (Agendar, Guardar, Continuar, Crear cuenta).
 * Tabs / chips / filtros / sync → COLORS.selection o Button outline (no este componente).
 */
const GuestGradientButton = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  size = 'default',
  style,
  textStyle,
  accessibilityLabel,
  iconNode,
  iconPosition = 'left',
  fullWidth = false,
}) => {
  const isDisabled = disabled || loading;
  const isCompact = size === 'compact';

  const labelContent = loading ? (
    <ActivityIndicator color={COLORS.base.white} size="small" />
  ) : (
    <View style={styles.row}>
      {iconNode && iconPosition === 'left' ? (
        <View style={styles.iconLeft}>{iconNode}</View>
      ) : null}
      {title ? (
        <Text style={[styles.label, isCompact && styles.labelCompact, textStyle]}>{title}</Text>
      ) : null}
      {iconNode && iconPosition === 'right' ? (
        <View style={styles.iconRight}>{iconNode}</View>
      ) : null}
    </View>
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      style={[
        styles.touchWrap,
        isCompact && styles.touchWrapCompact,
        fullWidth && styles.fullWidth,
        style,
        isDisabled && styles.disabled,
      ]}
    >
      <PrimaryGradientFill style={[styles.gradient, isCompact && styles.gradientCompact]}>
        {labelContent}
      </PrimaryGradientFill>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchWrap: {
    borderRadius: BORDERS.radius.lg,
    overflow: 'hidden',
    ...SHADOWS.button,
  },
  touchWrapCompact: {
    borderRadius: BORDERS.radius.full,
    ...SHADOWS.none,
  },
  fullWidth: {
    width: '100%',
    alignSelf: 'stretch',
  },
  gradient: {
    minHeight: 52,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientCompact: {
    minHeight: 36,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: 6,
  },
  iconRight: {
    marginLeft: 6,
  },
  label: {
    ...TYPOGRAPHY.styles.button,
    color: COLORS.base.white,
    textAlign: 'center',
  },
  labelCompact: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.base.white,
    letterSpacing: 0.2,
  },
  disabled: {
    opacity: 0.55,
  },
});

export default GuestGradientButton;
