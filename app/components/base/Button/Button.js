/**
 * Button Component - MecaniMóvil
 * Componente de botón reutilizable con nueva paleta de colores
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { TOKENS, withOpacity } from '../../../design-system/tokens';

// Fallback values in case tokens are not ready
const SAFE_COLORS = TOKENS?.colors || {
  primary: { 500: '#003459' },
  secondary: { 500: '#007EA7' },
  accent: { 500: '#00A8E8' },
  error: { 500: '#EF4444', 600: '#DC2626', 700: '#B91C1C' },
  success: { 500: '#10B981', 600: '#059669', 700: '#047857' },
  warning: { 500: '#F59E0B', 600: '#D97706', 700: '#B45309' },
  info: { 500: '#007EA7', 600: '#006586', 700: '#004C65' },
  text: { onPrimary: '#FFFFFF', onSecondary: '#FFFFFF', onAccent: '#FFFFFF', onError: '#FFFFFF', onSuccess: '#FFFFFF', onWarning: '#FFFFFF', onInfo: '#FFFFFF' },
  states: {
    hover: { primary: '#006586', secondary: '#006586', accent: '#0086BA' },
    pressed: { primary: '#004C65', secondary: '#004C65', accent: '#00648B' },
    disabled: { background: '#E5E7EB', text: '#9CA3AF', border: '#D1D5DB' }
  },
  gradients: {
    primary: ['#007EA7', '#00A8E8'],
    secondary: ['#003459', '#007EA7'],
    accent: ['#00A8E8', '#00C9A7'],
    button: ['#007EA7', '#00A8E8'],
  },
  opacity: { 10: '#0000001A' }
};

const SAFE_TYPOGRAPHY = TOKENS?.typography || {
  fontSize: { sm: 14, md: 16, lg: 18 },
  fontWeight: { semibold: '600' }
};

const SAFE_SPACING = TOKENS?.spacing || {
  xs: 4,
  buttonPadding: { horizontal: 16, vertical: 12 }
};

const SAFE_BORDERS = TOKENS?.borders || {
  radius: { button: { md: 8 } },
  width: { none: 0, thin: 1, medium: 2 }
};

const SAFE_SHADOWS = TOKENS?.shadows || {
  button: {},
  none: {}
};

/**
 * Button Component
 * ... (docs remain same)
 */
const Button = ({
  title,
  onPress,
  isLoading = false,
  type = 'primary',
  style,
  disabled = false,
  useGradient = false,
  gradientColors = null,
  size = 'md',
  variant = 'solid',
  icon,
  iconPosition = 'left',
  fullWidth = false,
  ...props
}) => {
  // Obtener colores según el tipo
  const getTypeColors = () => {
    switch (type) {
      case 'secondary':
        return {
          background: SAFE_COLORS.secondary?.[500] || '#007EA7',
          text: SAFE_COLORS.text?.onSecondary || '#FFF',
          hover: SAFE_COLORS.states?.hover?.secondary || '#006586',
          pressed: SAFE_COLORS.states?.pressed?.secondary || '#004C65',
        };
      case 'accent':
        return {
          background: SAFE_COLORS.accent?.[500] || '#10B981',
          text: SAFE_COLORS.text?.onAccent || '#FFF',
          hover: SAFE_COLORS.states?.hover?.accent || '#059669',
          pressed: SAFE_COLORS.states?.pressed?.accent || '#047857',
        };
      case 'danger':
        return {
          background: SAFE_COLORS.error?.[500] || '#EF4444',
          text: SAFE_COLORS.text?.onError || '#FFF',
          hover: SAFE_COLORS.error?.[600] || '#DC2626',
          pressed: SAFE_COLORS.error?.[700] || '#B91C1C',
        };
      case 'success':
        return {
          background: SAFE_COLORS.success?.[500] || '#10B981',
          text: SAFE_COLORS.text?.onSuccess || '#FFF',
          hover: SAFE_COLORS.success?.[600] || '#059669',
          pressed: SAFE_COLORS.success?.[700] || '#047857',
        };
      case 'warning':
        return {
          background: SAFE_COLORS.warning?.[500] || '#F59E0B',
          text: SAFE_COLORS.text?.onWarning || '#FFF',
          hover: SAFE_COLORS.warning?.[600] || '#D97706',
          pressed: SAFE_COLORS.warning?.[700] || '#B45309',
        };
      case 'info':
        return {
          background: SAFE_COLORS.info?.[500] || '#007EA7',
          text: SAFE_COLORS.text?.onInfo || '#FFF',
          hover: SAFE_COLORS.info?.[600] || '#006586',
          pressed: SAFE_COLORS.info?.[700] || '#004C65',
        };
      default: // primary
        return {
          background: SAFE_COLORS.secondary?.[500] || '#007EA7',
          text: SAFE_COLORS.text?.onPrimary || '#FFF',
          hover: SAFE_COLORS.states?.hover?.primary || '#006586',
          pressed: SAFE_COLORS.states?.pressed?.primary || '#004C65',
        };
    }
  };

  // Obtener estilos según el tamaño
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          paddingHorizontal: (SAFE_SPACING.buttonPadding?.horizontal || 16) * 0.75,
          paddingVertical: (SAFE_SPACING.buttonPadding?.vertical || 12) * 0.75,
          fontSize: SAFE_TYPOGRAPHY.fontSize?.sm || 14,
          minHeight: 36,
        };
      case 'lg':
        return {
          paddingHorizontal: (SAFE_SPACING.buttonPadding?.horizontal || 16) * 1.25,
          paddingVertical: (SAFE_SPACING.buttonPadding?.vertical || 12) * 1.25,
          fontSize: SAFE_TYPOGRAPHY.fontSize?.lg || 18,
          minHeight: 56,
        };
      default: // md
        return {
          paddingHorizontal: SAFE_SPACING.buttonPadding?.horizontal || 16,
          paddingVertical: SAFE_SPACING.buttonPadding?.vertical || 12,
          fontSize: SAFE_TYPOGRAPHY.fontSize?.md || 16,
          minHeight: 48,
        };
    }
  };

  // Colores del gradiente por defecto basados en la nueva paleta
  const getDefaultGradientColors = () => {
    switch (type) {
      case 'primary':
        return SAFE_COLORS.gradients?.button || SAFE_COLORS.gradients?.primary || ['#007EA7', '#00A8E8'];
      case 'secondary':
        return SAFE_COLORS.gradients?.secondary || ['#003459', '#007EA7'];
      case 'accent':
        return SAFE_COLORS.gradients?.accent || ['#00A8E8', '#00C9A7'];
      default:
        return SAFE_COLORS.gradients?.button || [SAFE_COLORS.secondary?.[500] || '#007EA7', SAFE_COLORS.accent?.[500] || '#00A8E8'];
    }
  };

  const typeColors = getTypeColors();
  const sizeStyles = getSizeStyles();
  const defaultGradientColors = useGradient ? getDefaultGradientColors() : null;
  const finalGradientColors = gradientColors || defaultGradientColors;

  // Obtener estilos según la variante
  const getVariantStyles = () => {
    if (disabled) {
      return {
        backgroundColor: SAFE_COLORS.states?.disabled?.background || '#E5E7EB',
        textColor: SAFE_COLORS.states?.disabled?.text || '#9CA3AF',
        borderColor: SAFE_COLORS.states?.disabled?.border || '#D1D5DB',
        borderWidth: SAFE_BORDERS.width?.thin || 1,
      };
    }

    switch (variant) {
      case 'outline':
        return {
          backgroundColor: 'transparent',
          textColor: typeColors.background,
          borderColor: typeColors.background,
          borderWidth: SAFE_BORDERS.width?.medium || 2,
        };
      case 'ghost':
        return {
          backgroundColor: SAFE_COLORS.opacity?.[10] ? withOpacity(typeColors.background, 0.1) : typeColors.background + '1A',
          textColor: typeColors.background,
          borderColor: 'transparent',
          borderWidth: SAFE_BORDERS.width?.none || 0,
        };
      case 'text':
        return {
          backgroundColor: 'transparent',
          textColor: typeColors.background,
          borderColor: 'transparent',
          borderWidth: SAFE_BORDERS.width?.none || 0,
        };
      default: // 'solid'
        return {
          backgroundColor: typeColors.background,
          textColor: typeColors.text,
          borderColor: 'transparent',
          borderWidth: SAFE_BORDERS.width?.none || 0,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const backgroundColor = variantStyles.backgroundColor;
  const textColor = variantStyles.textColor;
  const borderColor = variantStyles.borderColor;
  const borderWidth = variantStyles.borderWidth;

  // Si tiene gradiente, usar LinearGradient
  if (useGradient && finalGradientColors && !disabled) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isLoading || disabled}
        activeOpacity={0.8}
        style={style}
        {...props}
      >
        <LinearGradient
          colors={finalGradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.button,
            styles.buttonGradient,
            {
              paddingHorizontal: sizeStyles.paddingHorizontal,
              paddingVertical: sizeStyles.paddingVertical,
              minHeight: sizeStyles.minHeight,
              borderRadius: SAFE_BORDERS.radius?.button?.md || 8,
            },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={textColor} />
          ) : (
            <View style={styles.buttonContent}>
              {icon && iconPosition === 'left' && (
                <Ionicons
                  name={icon}
                  size={sizeStyles.fontSize}
                  color={textColor}
                  style={styles.iconLeft}
                />
              )}
              <Text
                style={[
                  styles.text,
                  {
                    color: textColor,
                    fontSize: sizeStyles.fontSize,
                    fontWeight: SAFE_TYPOGRAPHY.fontWeight?.semibold || '600',
                  },
                ]}
              >
                {title}
              </Text>
              {icon && iconPosition === 'right' && (
                <Ionicons
                  name={icon}
                  size={sizeStyles.fontSize}
                  color={textColor}
                  style={styles.iconRight}
                />
              )}
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // Botón normal sin gradiente
  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor,
          borderColor,
          borderWidth,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          paddingVertical: sizeStyles.paddingVertical,
          minHeight: sizeStyles.minHeight,
          borderRadius: SAFE_BORDERS.radius?.button?.md || 8,
          width: fullWidth ? '100%' : 'auto',
          ...(variant === 'solid' && !disabled ? (SAFE_SHADOWS.button || {}) : (SAFE_SHADOWS.none || {})),
        },
        disabled && styles.buttonDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={isLoading || disabled}
      activeOpacity={0.8}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <View style={styles.buttonContent}>
          {icon && iconPosition === 'left' && (
            <Ionicons
              name={icon}
              size={sizeStyles.fontSize}
              color={textColor}
              style={styles.iconLeft}
            />
          )}
          <Text
            style={[
              styles.text,
              {
                color: textColor,
                fontSize: sizeStyles.fontSize,
                fontWeight: SAFE_TYPOGRAPHY.fontWeight?.semibold || '600',
              },
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <Ionicons
              name={icon}
              size={sizeStyles.fontSize}
              color={textColor}
              style={styles.iconRight}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonGradient: {
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: SAFE_SPACING.xs || 4,
  },
  iconRight: {
    marginLeft: SAFE_SPACING.xs || 4,
  },
  text: {
    textAlign: 'center',
  },
});

export default Button;

