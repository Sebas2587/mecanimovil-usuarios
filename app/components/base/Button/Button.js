/**
 * Button — design system (primary Tinder / Airbnb surfaces).
 * Tokens only; tipografía Poppins button; iconos Lucide (nunca texto crudo).
 */
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import PrimaryGradientFill from '../PrimaryGradientFill/PrimaryGradientFill';
import { COLORS, TYPOGRAPHY, SPACING, BORDERS } from '../../../design-system/tokens';
import Icon from '../Icon/Icon';

const TYPE_COLORS = {
  primary: {
    bg: COLORS.primary[500],
    text: COLORS.text.onPrimary,
    outline: COLORS.brand.orange,
  },
  secondary: {
    bg: COLORS.buttonSecondary.background,
    text: COLORS.buttonSecondary.text,
    outline: COLORS.buttonSecondary.outline,
  },
  danger: {
    bg: COLORS.error.main,
    text: COLORS.text.onError,
    outline: COLORS.error.main,
  },
  success: {
    bg: COLORS.success.main,
    text: COLORS.text.inverse,
    outline: COLORS.success.main,
  },
  warning: {
    bg: COLORS.warning.main,
    text: COLORS.text.primary,
    outline: COLORS.warning.main,
  },
  info: {
    bg: COLORS.info.main,
    text: COLORS.text.onPrimary,
    outline: COLORS.info.main,
  },
  accent: {
    bg: COLORS.accent[500],
    text: COLORS.text.onAccent,
    outline: COLORS.accent[500],
  },
};

const SIZES = {
  sm: { minHeight: 40, px: 16, py: 10, fontSize: TYPOGRAPHY.styles.button.fontSize },
  md: { minHeight: 48, px: 20, py: 12, fontSize: TYPOGRAPHY.styles.button.fontSize },
  lg: { minHeight: 52, px: 24, py: 14, fontSize: TYPOGRAPHY.fontSize.lg },
};

const LEGACY_ICON_MAP = {
  add: Plus,
  plus: Plus,
  'add-outline': Plus,
  'add-circle': 'add-circle',
  'add-circle-outline': 'add-circle-outline',
};

function resolveIconNode(icon, iconNode, color, size = 18) {
  if (iconNode) return iconNode;
  if (icon == null || icon === false) return null;

  if (typeof icon === 'string') {
    const mapped = LEGACY_ICON_MAP[icon] || icon;
    if (typeof mapped !== 'string') {
      const Cmp = mapped;
      return <Cmp size={size} color={color} strokeWidth={1.75} fill="none" />;
    }
    return <Icon name={mapped} size={size} color={color} strokeWidth={1.75} />;
  }

  if (React.isValidElement(icon)) return icon;
  return null;
}

const Button = ({
  title,
  onPress,
  isLoading = false,
  type = 'primary',
  style,
  disabled = false,
  size = 'md',
  variant = 'solid',
  icon,
  iconNode,
  iconPosition = 'left',
  fullWidth = false,
  children,
  ...props
}) => {
  const palette = TYPE_COLORS[type] || TYPE_COLORS.primary;
  const sizeSpec = SIZES[size] || SIZES.md;
  const label = title ?? children;

  let backgroundColor = palette.bg;
  let textColor = palette.text;
  let borderColor = 'transparent';
  let borderWidth = 0;

  if (disabled) {
    backgroundColor = COLORS.states.disabled.background;
    textColor = COLORS.states.disabled.text;
    borderColor = COLORS.states.disabled.border;
    borderWidth = BORDERS.width.thin;
  } else if (variant === 'outline') {
    backgroundColor =
      type === 'secondary'
        ? COLORS.buttonSecondary.backgroundPaper
        : COLORS.background.paper;
    textColor =
      type === 'secondary' || type === 'primary'
        ? COLORS.buttonSecondary.outlineText
        : palette.outline;
    borderColor =
      type === 'secondary' || type === 'primary'
        ? COLORS.buttonSecondary.outline
        : palette.outline;
    borderWidth = BORDERS.width.thin;
  } else if (variant === 'ghost' || variant === 'text') {
    backgroundColor = 'transparent';
    textColor = palette.outline;
  }

  const usePrimaryGradient =
    type === 'primary' && variant === 'solid' && !disabled;

  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 20 : 18;
  const iconEl = resolveIconNode(icon, iconNode, textColor, iconSize);

  const innerContent = isLoading ? (
    <ActivityIndicator size="small" color={textColor} />
  ) : (
    <View style={styles.row}>
      {iconEl && iconPosition === 'left' ? (
        <View style={styles.iconLeft}>{iconEl}</View>
      ) : null}
      {label ? (
        <Text
          style={[
            TYPOGRAPHY.styles.button,
            {
              color: textColor,
              fontSize: sizeSpec.fontSize,
              fontFamily: TYPOGRAPHY.styles.button.fontFamily,
              fontWeight: TYPOGRAPHY.styles.button.fontWeight,
            },
          ]}
        >
          {label}
        </Text>
      ) : null}
      {iconEl && iconPosition === 'right' ? (
        <View style={styles.iconRight}>{iconEl}</View>
      ) : null}
    </View>
  );

  const borderRadius = usePrimaryGradient ? BORDERS.radius.lg : BORDERS.radius.button.md;
  const fillStyle = {
    minHeight: sizeSpec.minHeight,
    paddingHorizontal: sizeSpec.px,
    paddingVertical: sizeSpec.py,
    alignItems: 'center',
    justifyContent: 'center',
    width: fullWidth ? '100%' : undefined,
  };

  if (usePrimaryGradient) {
    return (
      <TouchableOpacity
        style={[
          styles.button,
          {
            borderRadius,
            width: fullWidth ? '100%' : undefined,
            overflow: 'hidden',
          },
          style,
        ]}
        onPress={onPress}
        disabled={isLoading || disabled}
        activeOpacity={0.85}
        accessibilityRole="button"
        {...props}
      >
        <PrimaryGradientFill style={fillStyle}>
          {innerContent}
        </PrimaryGradientFill>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor,
          borderColor,
          borderWidth,
          minHeight: sizeSpec.minHeight,
          paddingHorizontal: sizeSpec.px,
          paddingVertical: sizeSpec.py,
          borderRadius,
          width: fullWidth ? '100%' : undefined,
        },
        style,
      ]}
      onPress={onPress}
      disabled={isLoading || disabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      {...props}
    >
      {innerContent}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: SPACING.xs,
  },
  iconRight: {
    marginLeft: SPACING.xs,
  },
});

export default Button;
