import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, BORDERS } from '../../../design-system/tokens';

/**
 * Círculo de icono brand — surface tonal + icono orange activo (guía Tinder).
 * No usa el gradiente CTA (reservado a botones primarios y tabs seleccionados).
 */
const BrandIconWell = ({ size = 36, style, children }) => {
  const icon = React.isValidElement(children)
    ? React.cloneElement(children, {
        ...(children.props || {}),
        color: COLORS.icon.active,
      })
    : children;

  return (
    <View
      style={[
        styles.well,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: COLORS.background.secondary,
          borderWidth: BORDERS.width.thin,
          borderColor: COLORS.border.light,
        },
        style,
      ]}
    >
      {icon}
    </View>
  );
};

const styles = StyleSheet.create({
  well: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BrandIconWell;
