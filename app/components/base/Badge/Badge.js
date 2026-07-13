import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from '../Icon/Icon';
import { COLORS, TOKENS } from '../../../design-system/tokens';

const SAFE_COLORS = COLORS;
const SAFE_TYPOGRAPHY = TOKENS?.typography || {};
const SAFE_SPACING = TOKENS?.spacing || {};
const SAFE_BORDERS = TOKENS?.borders || {};

const Badge = ({
  content,
  icon,
  type = 'primary',
  variant = 'soft',
  size = 'md',
  style,
  textStyle
}) => {
  const colors = SAFE_COLORS;
  const typography = SAFE_TYPOGRAPHY;
  const spacing = SAFE_SPACING;
  const borders = SAFE_BORDERS;

  const getBackgroundColor = () => {
    if (variant === 'solid') {
      switch (type) {
        case 'primary': return colors.primary[500];
        case 'secondary': return colors.secondary[500];
        case 'success': return colors.success[500];
        case 'warning': return colors.warning[500];
        case 'error': return colors.error[500];
        case 'neutral': return colors.neutral.gray[500];
        default: return colors.primary[500];
      }
    } else if (variant === 'outline') {
      return 'transparent';
    } else {
      switch (type) {
        case 'primary': return colors.primary[50];
        case 'secondary': return colors.secondary[50];
        case 'success': return colors.success[50];
        case 'warning': return colors.warning[50];
        case 'error': return colors.error[50];
        case 'neutral': return colors.neutral.gray[100];
        default: return colors.primary[50];
      }
    }
  };

  const getTextColor = () => {
    if (variant === 'solid') {
      return colors.text.inverse;
    } else {
      switch (type) {
        case 'primary': return colors.primary[700];
        case 'secondary': return colors.secondary[700];
        case 'success': return colors.success[700];
        case 'warning': return colors.warning[700];
        case 'error': return colors.error[700];
        case 'neutral': return colors.neutral.gray[700];
        default: return colors.primary[700];
      }
    }
  };

  const getBorderColor = () => {
    if (variant === 'outline') {
      switch (type) {
        case 'primary': return colors.primary[500];
        case 'secondary': return colors.secondary[500];
        case 'success': return colors.success[500];
        case 'warning': return colors.warning[500];
        case 'error': return colors.error[500];
        case 'neutral': return colors.neutral.gray[500];
        default: return colors.primary[500];
      }
    }
    return 'transparent';
  };

  const getPadding = () => {
    switch (size) {
      case 'sm': return { paddingHorizontal: spacing.xs || 4, paddingVertical: 2 };
      case 'lg': return { paddingHorizontal: spacing.md || 16, paddingVertical: spacing.xs || 4 };
      default: return { paddingHorizontal: spacing.sm || 8, paddingVertical: spacing.xs || 4 };
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'sm': return typography.fontSize?.xs || 12;
      case 'lg': return typography.fontSize?.md || 16;
      default: return typography.fontSize?.sm || 14;
    }
  };

  const badgeStyles = [
    styles.container,
    {
      backgroundColor: getBackgroundColor(),
      borderColor: getBorderColor(),
      borderWidth: variant === 'outline' ? (borders.width?.thin || 1) : 0,
      borderRadius: borders.radius?.full || 9999,
    },
    getPadding(),
    style
  ];

  const textStyles = [
    styles.text,
    {
      color: getTextColor(),
      fontSize: getFontSize(),
      fontWeight: typography.fontWeight?.medium || '500',
    },
    textStyle
  ];

  return (
    <View style={badgeStyles}>
      {icon && (
        <Icon
          name={icon}
          size={getFontSize()}
          color={getTextColor()}
          style={{ marginRight: 4 }}
        />
      )}
      <Text style={textStyles}>{content}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  text: {
    textAlign: 'center',
  },
});

export default Badge;
