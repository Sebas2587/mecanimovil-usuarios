import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TOKENS } from '../../../design-system/tokens';

// Fallback values in case tokens are not ready
const SAFE_COLORS = TOKENS?.colors || {
  primary: { 50: '#EFF6FF', 100: '#DBEAFE', 500: '#3B82F6', 700: '#1D4ED8' },
  secondary: { 50: '#EEF2FF', 100: '#E0E7FF', 500: '#6366F1', 700: '#4338CA' },
  success: { 50: '#ECFDF5', 100: '#D1FAE5', 500: '#10B981', 700: '#047857' },
  warning: { 50: '#FFFBEB', 100: '#FEF3C7', 500: '#F59E0B', 700: '#B45309' },
  error: { 50: '#FEF2F2', 100: '#FEE2E2', 500: '#EF4444', 700: '#B91C1C' },
  neutral: { gray: { 50: '#F9FAFB', 100: '#F3F4F6', 500: '#6B7280', 700: '#374151' } },
  text: { primary: '#111827', inverse: '#FFFFFF' }
};

const SAFE_TYPOGRAPHY = TOKENS?.typography || {
  fontSize: { xs: 12, sm: 14, md: 16 },
  fontWeight: { medium: '500', bold: '700' }
};

const SAFE_SPACING = TOKENS?.spacing || {
  xs: 4, sm: 8, md: 16
};

const SAFE_BORDERS = TOKENS?.borders || {
  radius: { sm: 4, md: 8, full: 9999 },
  width: { thin: 1 }
};

const Badge = ({
  content,
  icon,
  type = 'primary',
  variant = 'soft',
  size = 'md',
  style,
  textStyle
}) => {
  // Usar valores seguros directamente
  const colors = SAFE_COLORS;
  const typography = SAFE_TYPOGRAPHY;
  const spacing = SAFE_SPACING;
  const borders = SAFE_BORDERS;

  const getBackgroundColor = () => {
    if (variant === 'solid') {
      switch (type) {
        case 'primary': return colors.primary?.[500] || '#3B82F6';
        case 'secondary': return colors.secondary?.[500] || '#6366F1';
        case 'success': return colors.success?.[500] || '#10B981';
        case 'warning': return colors.warning?.[500] || '#F59E0B';
        case 'error': return colors.error?.[500] || '#EF4444';
        case 'neutral': return colors.neutral?.gray?.[500] || '#6B7280';
        default: return colors.primary?.[500] || '#3B82F6';
      }
    } else if (variant === 'outline') {
      return 'transparent';
    } else { // soft (default)
      switch (type) {
        case 'primary': return colors.primary?.[50] || '#EFF6FF';
        case 'secondary': return colors.secondary?.[50] || '#EEF2FF';
        case 'success': return colors.success?.[50] || '#ECFDF5';
        case 'warning': return colors.warning?.[50] || '#FFFBEB';
        case 'error': return colors.error?.[50] || '#FEF2F2';
        case 'neutral': return colors.neutral?.gray?.[100] || '#F3F4F6';
        default: return colors.primary?.[50] || '#EFF6FF';
      }
    }
  };

  const getTextColor = () => {
    if (variant === 'solid') {
      return colors.text?.inverse || '#FFFFFF';
    } else {
      switch (type) {
        case 'primary': return colors.primary?.[700] || '#1D4ED8';
        case 'secondary': return colors.secondary?.[700] || '#4338CA';
        case 'success': return colors.success?.[700] || '#047857';
        case 'warning': return colors.warning?.[700] || '#B45309';
        case 'error': return colors.error?.[700] || '#B91C1C';
        case 'neutral': return colors.neutral?.gray?.[700] || '#374151';
        default: return colors.primary?.[700] || '#1D4ED8';
      }
    }
  };

  const getBorderColor = () => {
    if (variant === 'outline') {
      switch (type) {
        case 'primary': return colors.primary?.[500] || '#3B82F6';
        case 'secondary': return colors.secondary?.[500] || '#6366F1';
        case 'success': return colors.success?.[500] || '#10B981';
        case 'warning': return colors.warning?.[500] || '#F59E0B';
        case 'error': return colors.error?.[500] || '#EF4444';
        case 'neutral': return colors.neutral?.gray?.[500] || '#6B7280';
        default: return colors.primary?.[500] || '#3B82F6';
      }
    }
    return 'transparent';
  };

  const getPadding = () => {
    switch (size) {
      case 'sm': return { paddingHorizontal: spacing.xs || 4, paddingVertical: 2 };
      case 'lg': return { paddingHorizontal: spacing.md || 16, paddingVertical: spacing.xs || 4 };
      default: return { paddingHorizontal: spacing.sm || 8, paddingVertical: spacing.xs || 4 }; // md
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'sm': return typography.fontSize?.xs || 12;
      case 'lg': return typography.fontSize?.md || 16;
      default: return typography.fontSize?.sm || 14; // md
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
        <Ionicons
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
