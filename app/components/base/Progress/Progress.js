/**
 * Progress Component - MecaniMóvil
 * Componente de barra de progreso
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { TOKENS } from '../../../design-system/tokens';

// Fallback values in case tokens are not ready
const SAFE_COLORS = TOKENS?.colors || {
  primary: { 500: '#3B82F6' },
  secondary: { 500: '#6366F1' },
  accent: { 500: '#10B981' },
  error: { 500: '#EF4444' },
  success: { 500: '#10B981' },
  warning: { 500: '#F59E0B' },
  info: { 500: '#3B82F6' },
  neutral: { gray: { 200: '#E5E7EB' } },
  text: { primary: '#111827', secondary: '#4B5563' }
};

const SAFE_TYPOGRAPHY = TOKENS?.typography || {
  fontSize: { xs: 12, sm: 14 },
  fontWeight: { medium: '500' }
};

const SAFE_SPACING = TOKENS?.spacing || {
  xs: 4, sm: 8
};

const SAFE_BORDERS = TOKENS?.borders || {
  radius: { full: 9999 }
};

/**
 * Progress Component
 * 
 * @param {number} value - Valor del progreso (0-100)
 * @param {string} variant - Variante: 'linear' o 'circular'
 * @param {string} color - Color: 'primary', 'secondary', 'accent', 'success', 'warning', 'error'
 * @param {boolean} showLabel - Mostrar porcentaje
 * @param {string} size - Tamaño para circular: 'sm', 'md', 'lg'
 * @param {object} style - Estilos adicionales
 */
const Progress = ({
  value = 0,
  max = 100,
  type = 'primary', // primary, secondary, accent, danger, success, warning, info
  size = 'md', // sm, md, lg
  showLabel = false,
  label,
  style,
  barStyle,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: Math.min(Math.max(value, 0), max),
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [value, max]);

  // Calcular porcentaje
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const width = animatedValue.interpolate({
    inputRange: [0, max],
    outputRange: ['0%', '100%'],
  });

  // Obtener color según el tipo
  const getColor = () => {
    switch (type) {
      case 'secondary': return SAFE_COLORS.secondary?.[500] || '#6366F1';
      case 'accent': return SAFE_COLORS.accent?.[500] || '#10B981';
      case 'danger': return SAFE_COLORS.error?.[500] || '#EF4444';
      case 'success': return SAFE_COLORS.success?.[500] || '#10B981';
      case 'warning': return SAFE_COLORS.warning?.[500] || '#F59E0B';
      case 'info': return SAFE_COLORS.info?.[500] || '#3B82F6';
      default: return SAFE_COLORS.primary?.[500] || '#3B82F6';
    }
  };

  // Obtener altura según el tamaño
  const getHeight = () => {
    switch (size) {
      case 'sm': return 4;
      case 'lg': return 12;
      default: return 8; // md
    }
  };

  const color = getColor();
  const height = getHeight();
  const borderRadius = SAFE_BORDERS.radius?.full || 9999;

  return (
    <View style={[styles.container, style]}>
      {(showLabel || label) && (
        <View style={styles.labelContainer}>
          {label && (
            <Text
              style={[
                styles.labelText,
                {
                  fontSize: SAFE_TYPOGRAPHY.fontSize?.sm || 14,
                  color: SAFE_COLORS.text?.primary || '#111827',
                },
              ]}
            >
              {label}
            </Text>
          )}
          {showLabel && (
            <Text
              style={[
                styles.percentageText,
                {
                  fontSize: SAFE_TYPOGRAPHY.fontSize?.xs || 12,
                  color: SAFE_COLORS.text?.secondary || '#4B5563',
                },
              ]}
            >
              {Math.round(percentage)}%
            </Text>
          )}
        </View>
      )}

      <View
        style={[
          styles.track,
          {
            height,
            borderRadius,
            backgroundColor: SAFE_COLORS.neutral?.gray?.[200] || '#E5E7EB',
          },
        ]}
      >
        <Animated.View
          style={[
            styles.bar,
            {
              width,
              backgroundColor: color,
              borderRadius,
            },
            barStyle,
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SAFE_SPACING.xs || 4,
  },
  labelText: {
    fontWeight: SAFE_TYPOGRAPHY.fontWeight?.medium || '500',
  },
  percentageText: {
    fontWeight: SAFE_TYPOGRAPHY.fontWeight?.medium || '500',
  },
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
  },
});

export default Progress;
