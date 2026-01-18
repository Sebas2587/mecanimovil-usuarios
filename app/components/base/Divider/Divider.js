/**
 * Divider Component - MecaniMóvil
 * Componente divisor para separar secciones
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, BORDERS, SPACING } from '../../../design-system/tokens';

/**
 * Divider Component
 * 
 * @param {string} orientation - Orientación: 'horizontal' o 'vertical'
 * @param {string} variant - Variante: 'light', 'main', 'dark'
 * @param {object} style - Estilos adicionales
 */
const Divider = ({ 
  orientation = 'horizontal',
  variant = 'light',
  style,
  ...props 
}) => {
  // Obtener color según la variante
  const getColor = () => {
    switch (variant) {
      case 'main':
        return COLORS.border.main;
      case 'dark':
        return COLORS.border.dark;
      default: // 'light'
        return COLORS.border.light;
    }
  };

  const color = getColor();
  const isVertical = orientation === 'vertical';

  return (
    <View
      style={[
        styles.divider,
        isVertical ? styles.vertical : styles.horizontal,
        {
          backgroundColor: color,
          [isVertical ? 'width' : 'height']: BORDERS.width.thin,
          [isVertical ? 'height' : 'width']: '100%',
        },
        style,
      ]}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  divider: {
    // Estilos base definidos inline
  },
  horizontal: {
    marginVertical: SPACING.sm,
  },
  vertical: {
    marginHorizontal: SPACING.sm,
  },
});

export default Divider;

