/**
 * Divider Component - MecaniMóvil
 * Componente divisor para separar secciones
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TOKENS } from '../../../design-system/tokens';

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
    // Fallback safe access
    const colors = TOKENS?.colors?.border || { light: '#D7DFE3', main: '#C3CFD5', dark: '#9BAFB9' };

    switch (variant) {
      case 'main':
        return colors.main;
      case 'dark':
        return colors.dark;
      default: // 'light'
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
  divider: {
    // Estilos base definidos inline
  },
  horizontal: {
    marginVertical: TOKENS?.spacing?.sm || 8,
  },
  vertical: {
    marginHorizontal: TOKENS?.spacing?.sm || 8,
  },
});

export default Divider;

