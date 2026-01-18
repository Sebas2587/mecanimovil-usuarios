/**
 * Container Component - MecaniMóvil
 * Componente contenedor para layouts consistentes
 */

import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { COLORS, SPACING } from '../../../design-system/tokens';

/**
 * Container Component
 * 
 * @param {React.ReactNode} children - Contenido del contenedor
 * @param {string} variant - Variante: 'default', 'fluid', 'centered'
 * @param {boolean} safeArea - Usar SafeAreaView
 * @param {object} style - Estilos adicionales
 */
const Container = ({ 
  children, 
  variant = 'default',
  safeArea = false,
  style,
  ...props 
}) => {
  // Obtener estilos según la variante
  const getVariantStyles = () => {
    switch (variant) {
      case 'fluid':
        return {
          paddingHorizontal: 0,
        };
      case 'centered':
        return {
          paddingHorizontal: SPACING.container.horizontal,
          alignItems: 'center',
        };
      default: // 'default'
        return {
          paddingHorizontal: SPACING.container.horizontal,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const ContainerComponent = safeArea ? SafeAreaView : View;

  return (
    <ContainerComponent
      style={[
        styles.container,
        {
          backgroundColor: COLORS.background.default,
          paddingVertical: SPACING.container.vertical,
        },
        variantStyles,
        style,
      ]}
      {...props}
    >
      {children}
    </ContainerComponent>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default Container;

