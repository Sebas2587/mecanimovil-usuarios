/**
 * Switch Component - MecaniMóvil
 * Componente switch con nueva paleta
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, BORDERS, ANIMATIONS, SHADOWS } from '../../../design-system/tokens';

// Safe access to TYPOGRAPHY with fallback values - MUST be before any usage
const getSafeTypography = () => {
  try {
    if (TYPOGRAPHY && TYPOGRAPHY?.fontSize && TYPOGRAPHY?.fontWeight &&
      typeof TYPOGRAPHY?.fontSize?.md !== 'undefined') {
      return TYPOGRAPHY;
    }
  } catch (e) {
    console.warn('TYPOGRAPHY not ready in Switch:', e);
  }
  return {
    fontSize: { xs: 10, sm: 12, base: 14, md: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 28, '4xl': 32, '5xl': 36 },
    fontWeight: { light: '300', regular: '400', medium: '500', semibold: '600', bold: '700' },
  };
};

const SAFE_TYPOGRAPHY = getSafeTypography();

// Safe access to BORDERS with fallback values
const safeBordersRadius = BORDERS?.radius || { full: 9999, sm: 4, md: 8, lg: 12, xl: 16 };

/**
 * Switch Component
 * 
 * @param {boolean} value - Valor del switch (on/off)
 * @param {function} onValueChange - Función a ejecutar al cambiar el valor
 * @param {boolean} disabled - Si el switch está deshabilitado
 * @param {string} color - Color cuando está activo: 'primary', 'secondary', 'accent', 'success', 'warning', 'error' (default: accent)
 * @param {string} size - Tamaño: 'sm', 'md', 'lg' (default: md)
 * @param {string} label - Label opcional del switch
 * @param {object} style - Estilos adicionales
 */
const Switch = ({ 
  value = false,
  onValueChange,
  disabled = false,
  color = 'accent',
  size = 'md',
  label,
  style,
  ...props 
}) => {
  // Obtener color según la variante
  const getActiveColor = () => {
    switch (color) {
      case 'primary':
        return COLORS.primary[500];
      case 'secondary':
        return COLORS.secondary[500];
      case 'success':
        return COLORS.success[500];
      case 'warning':
        return COLORS.warning[500];
      case 'error':
        return COLORS.error[500];
      default: // 'accent'
        return COLORS.accent[500];
    }
  };

  const activeColor = getActiveColor();

  // Obtener tamaños
  const getSizes = () => {
    switch (size) {
      case 'sm':
        return { width: 40, height: 24, thumb: 20, translateX: 20 };
      case 'lg':
        return { width: 56, height: 32, thumb: 28, translateX: 28 };
      default: // 'md'
        return { width: 48, height: 28, thumb: 24, translateX: 22 };
    }
  };

  const sizes = getSizes();
  const animatedValue = React.useRef(new Animated.Value(value ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value ? 1 : 0,
      duration: ANIMATIONS.duration.short,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, sizes.translateX],
  });

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.neutral.gray[300], activeColor],
  });

  const handlePress = () => {
    if (!disabled && onValueChange) {
      onValueChange(!value);
    }
  };

  return (
    <View style={[styles.wrapper, style]}>
      {label && (
        <Text
          style={[
            styles.label,
            {
              color: disabled ? COLORS.text.disabled : COLORS.text.primary,
              fontSize: SAFE_TYPOGRAPHY.fontSize.md,
              marginRight: SPACING.sm,
            },
          ]}
        >
          {label}
        </Text>
      )}
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.7}
        style={styles.container}
        {...props}
      >
        <Animated.View
          style={[
            styles.track,
            {
              backgroundColor,
              opacity: disabled ? 0.5 : 1,
              width: sizes.width,
              height: sizes.height,
              borderRadius: safeBordersRadius.full,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.thumb,
              {
                transform: [{ translateX }],
                width: sizes.thumb,
                height: sizes.thumb,
                borderRadius: safeBordersRadius.full,
                backgroundColor: COLORS.background.paper,
                ...SHADOWS.sm,
              },
            ]}
          />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    // Estilos definidos inline
  },
  container: {
    // Estilos definidos inline
  },
  track: {
    justifyContent: 'center',
    // Estilos definidos inline
  },
  thumb: {
    // Estilos definidos inline
  },
});

export default Switch;

