/**
 * Divider Component - MecaniMóvil
 * Componente divisor para separar secciones
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, TOKENS } from '../../../design-system/tokens';

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
  const getColor = () => {
    const colors = COLORS.border;

    switch (variant) {
      case 'main':
        return colors.main;
      case 'dark':
        return colors.dark;
      default:
        return colors.light;
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
          [isVertical ? 'width' : 'height']: TOKENS?.borders?.width?.thin || 1,
          [isVertical ? 'height' : 'width']: '100%',
        },
        style,
      ]}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  divider: {},
  horizontal: {
    marginVertical: TOKENS?.spacing?.sm || 8,
  },
  vertical: {
    marginHorizontal: TOKENS?.spacing?.sm || 8,
  },
});

export default Divider;
