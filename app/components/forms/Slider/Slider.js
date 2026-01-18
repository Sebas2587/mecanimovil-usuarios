/**
 * Slider Component - MecaniMóvil
 * Componente slider con nueva paleta
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, PanResponder, Animated } from 'react-native';
import { COLORS, TYPOGRAPHY, BORDERS, SPACING, SHADOWS } from '../../../design-system/tokens';

// Safe access to TYPOGRAPHY with fallback values - MUST be before any usage
const getSafeTypography = () => {
  try {
    if (TYPOGRAPHY && TYPOGRAPHY?.fontSize && TYPOGRAPHY?.fontWeight &&
      typeof TYPOGRAPHY?.fontSize?.sm !== 'undefined') {
      return TYPOGRAPHY;
    }
  } catch (e) {
    console.warn('TYPOGRAPHY not ready in Slider:', e);
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
 * Slider Component
 * 
 * @param {number} value - Valor actual (0-100)
 * @param {function} onValueChange - Función a ejecutar al cambiar el valor
 * @param {number} minimumValue - Valor mínimo (default: 0)
 * @param {number} maximumValue - Valor máximo (default: 100)
 * @param {number} step - Paso del slider (default: 1)
 * @param {string} color - Color del track activo: 'primary', 'secondary', 'accent', 'success', 'warning', 'error' (default: accent)
 * @param {string} size - Tamaño: 'sm', 'md', 'lg' (default: md)
 * @param {boolean} disabled - Si el slider está deshabilitado
 * @param {boolean} showValue - Mostrar valor actual
 * @param {object} style - Estilos adicionales
 */
const Slider = ({ 
  value = 0,
  onValueChange,
  minimumValue = 0,
  maximumValue = 100,
  step = 1,
  color = 'accent',
  size = 'md',
  disabled = false,
  showValue = false,
  style,
  ...props 
}) => {
  // Obtener color según la variante
  const getColor = () => {
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

  const trackColor = getColor();

  // Obtener tamaños
  const getSizes = () => {
    switch (size) {
      case 'sm':
        return { height: 2, thumb: 16 };
      case 'lg':
        return { height: 6, thumb: 24 };
      default: // 'md'
        return { height: 4, thumb: 20 };
    }
  };

  const sizes = getSizes();
  const [sliderWidth, setSliderWidth] = useState(0);
  const pan = React.useRef(new Animated.ValueXY()).current;

  // Calcular posición inicial basada en value
  React.useEffect(() => {
    const percentage = ((value - minimumValue) / (maximumValue - minimumValue)) * 100;
    const x = (sliderWidth * percentage) / 100;
    pan.setValue({ x, y: 0 });
  }, [value, sliderWidth, minimumValue, maximumValue]);

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: pan.x._value,
          y: 0,
        });
      },
      onPanResponderMove: (evt, gestureState) => {
        const newX = Math.max(0, Math.min(sliderWidth, gestureState.moveX - gestureState.x0 + pan.x._offset));
        pan.x.setValue(newX);
        
        const percentage = (newX / sliderWidth) * 100;
        const newValue = minimumValue + ((maximumValue - minimumValue) * percentage) / 100;
        const steppedValue = Math.round(newValue / step) * step;
        
        if (onValueChange) {
          onValueChange(Math.max(minimumValue, Math.min(maximumValue, steppedValue)));
        }
      },
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
    })
  ).current;

  const percentage = ((value - minimumValue) / (maximumValue - minimumValue)) * 100;

  return (
    <View
      style={[styles.container, style]}
      onLayout={(event) => {
        setSliderWidth(event.nativeEvent.layout.width);
      }}
      {...props}
    >
      {showValue && (
        <View style={styles.valueContainer}>
          <Text
            style={[
              styles.valueText,
              {
                color: COLORS.text.secondary,
                fontSize: SAFE_TYPOGRAPHY.fontSize.sm,
                marginBottom: SPACING.xs,
              },
            ]}
          >
            {Math.round(value)}
          </Text>
        </View>
      )}
      <View
        style={[
          styles.track,
          {
            backgroundColor: COLORS.neutral.gray[300],
            height: sizes.height,
            borderRadius: safeBordersRadius.full,
          },
        ]}
      >
        <View
          style={[
            styles.trackActive,
            {
              width: `${percentage}%`,
              backgroundColor: trackColor,
              height: sizes.height,
              borderRadius: safeBordersRadius.full,
            },
          ]}
        />
      </View>
      <Animated.View
        style={[
          styles.thumb,
          {
            width: sizes.thumb,
            height: sizes.thumb,
            borderRadius: safeBordersRadius.full,
            backgroundColor: trackColor,
            transform: [{ translateX: pan.x }],
            opacity: disabled ? 0.5 : 1,
            ...SHADOWS.sm,
          },
        ]}
        {...panResponder.panHandlers}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  valueContainer: {
    alignItems: 'flex-end',
    marginBottom: SPACING.xs,
  },
  valueText: {
    // Estilos definidos inline
  },
  track: {
    width: '100%',
    position: 'absolute',
  },
  trackActive: {
    // Estilos definidos inline
  },
  thumb: {
    position: 'absolute',
    // Estilos definidos inline
  },
});

export default Slider;

