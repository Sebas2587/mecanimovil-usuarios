/**
 * Tooltip Component - MecaniMóvil
 * Componente de tooltip para información adicional
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, BORDERS, SHADOWS } from '../../../design-system/tokens';

// Safe access to TYPOGRAPHY with fallback values - MUST be before any usage
const getSafeTypography = () => {
  try {
    if (TYPOGRAPHY && TYPOGRAPHY?.fontSize && TYPOGRAPHY?.fontWeight &&
      typeof TYPOGRAPHY?.fontSize?.sm !== 'undefined') {
      return TYPOGRAPHY;
    }
  } catch (e) {
    console.warn('TYPOGRAPHY not ready in Tooltip:', e);
  }
  return {
    fontSize: { xs: 10, sm: 12, base: 14, md: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 28, '4xl': 32, '5xl': 36 },
    fontWeight: { light: '300', regular: '400', medium: '500', semibold: '600', bold: '700' },
  };
};

const SAFE_TYPOGRAPHY = getSafeTypography();

/**
 * Tooltip Component
 * 
 * @param {React.ReactNode} children - Elemento que activa el tooltip
 * @param {string} text - Texto del tooltip
 * @param {string} position - Posición: 'top', 'bottom', 'left', 'right'
 * @param {boolean} visible - Control externo de visibilidad
 * @param {number} delay - Delay antes de mostrar (ms)
 * @param {number} maxWidth - Ancho máximo del tooltip
 * @param {object} style - Estilos adicionales
 */
const Tooltip = ({ 
  children,
  text,
  position = 'top',
  visible: controlledVisible = null,
  delay = 500,
  maxWidth = 200,
  style,
  ...props 
}) => {
  // Obtener estilos según la posición
  const getPositionStyles = () => {
    const baseStyles = {
      position: 'absolute',
      zIndex: 1000,
    };

    switch (position) {
      case 'bottom':
        return {
          ...baseStyles,
          top: '100%',
          left: '50%',
          marginTop: SPACING.xs,
          transform: [{ translateX: -50 }],
        };
      case 'left':
        return {
          ...baseStyles,
          right: '100%',
          top: '50%',
          marginRight: SPACING.xs,
          transform: [{ translateY: -50 }],
        };
      case 'right':
        return {
          ...baseStyles,
          left: '100%',
          top: '50%',
          marginLeft: SPACING.xs,
          transform: [{ translateY: -50 }],
        };
      default: // 'top'
        return {
          ...baseStyles,
          bottom: '100%',
          left: '50%',
          marginBottom: SPACING.xs,
          transform: [{ translateX: -50 }],
        };
    }
  };

  const [internalVisible, setInternalVisible] = useState(false);
  const [showTimeout, setShowTimeout] = useState(null);
  const isControlled = controlledVisible !== null;
  const visible = isControlled ? controlledVisible : internalVisible;

  useEffect(() => {
    return () => {
      if (showTimeout) {
        clearTimeout(showTimeout);
      }
    };
  }, [showTimeout]);

  const handlePressIn = () => {
    if (!isControlled) {
      const timeout = setTimeout(() => {
        setInternalVisible(true);
      }, delay);
      setShowTimeout(timeout);
    }
  };

  const handlePressOut = () => {
    if (showTimeout) {
      clearTimeout(showTimeout);
      setShowTimeout(null);
    }
    if (!isControlled) {
      setInternalVisible(false);
    }
  };

  if (!visible) {
    return (
      <View style={[styles.container, style]} {...props}>
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]} {...props}>
      <TouchableWithoutFeedback onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <View>{children}</View>
      </TouchableWithoutFeedback>
      <View
        style={[
          styles.tooltip,
          {
            backgroundColor: COLORS.neutral.gray[900],
            borderRadius: BORDERS.radius.md,
            paddingHorizontal: SPACING.sm,
            paddingVertical: SPACING.xs,
            maxWidth,
            ...SHADOWS.tooltip,
            ...getPositionStyles(),
          },
        ]}
      >
        <Text
          style={[
            styles.text,
            {
              color: COLORS.text.inverse,
              fontSize: SAFE_TYPOGRAPHY.fontSize.sm,
            },
          ]}
        >
          {text}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  tooltip: {
    // Estilos definidos inline
  },
  text: {
    // Estilos definidos inline
  },
});

export default Tooltip;

