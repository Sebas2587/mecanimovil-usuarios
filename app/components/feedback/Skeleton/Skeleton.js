/**
 * Skeleton Component - MecaniMóvil
 * Componente de skeleton loading con nueva paleta
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { COLORS, BORDERS, ANIMATIONS } from '../../../design-system/tokens';

/**
 * Skeleton Component
 * 
 * @param {number|string} width - Ancho del skeleton
 * @param {number|string} height - Alto del skeleton
 * @param {number} borderRadius - Radio de borde (default: md)
 * @param {object} style - Estilos adicionales
 */
const Skeleton = ({ 
  width = '100%', 
  height = 20, 
  borderRadius = BORDERS.radius.md,
  style,
  ...props 
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: ANIMATIONS.duration.medium,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: ANIMATIONS.duration.medium,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: COLORS.neutral.gray[300],
          opacity,
        },
        style,
      ]}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  skeleton: {
    // Estilos definidos inline para usar tokens
  },
});

export default Skeleton;

