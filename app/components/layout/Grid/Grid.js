/**
 * Grid Component - MecaniMóvil
 * Sistema de grillas responsivo
 */

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { SPACING } from '../../../design-system/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Grid Component
 * 
 * @param {React.ReactNode} children - Elementos hijos del grid
 * @param {number} columns - Número de columnas (default: responsivo)
 * @param {number} spacing - Espaciado entre items
 * @param {object} style - Estilos adicionales
 */
const Grid = ({ 
  children, 
  columns = null,
  spacing = SPACING.sm,
  style,
  ...props 
}) => {
  // Calcular columnas responsivas si no se especifica
  const getColumns = () => {
    if (columns) return columns;
    
    if (SCREEN_WIDTH < 375) return 2;
    if (SCREEN_WIDTH >= 768) return 4;
    return 3;
  };

  const numColumns = getColumns();
  const childrenArray = React.Children.toArray(children);

  return (
    <View
      style={[
        styles.grid,
        {
          marginHorizontal: -spacing / 2,
        },
        style,
      ]}
      {...props}
    >
      {childrenArray.map((child, index) => (
        <View
          key={index}
          style={[
            styles.item,
            {
              width: `${100 / numColumns}%`,
              paddingHorizontal: spacing / 2,
              marginBottom: spacing,
            },
          ]}
        >
          {child}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  item: {
    // Estilos definidos inline
  },
});

export default Grid;

