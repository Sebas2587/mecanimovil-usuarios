import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../../../design-system/tokens';

/**
 * Badge compacto — fill sólido magenta Tinder (`COLORS.badge.verified.fill`).
 * Preferir `VerifiedSeal` para el sello “Verificado” de proveedores/cuenta.
 */
const PrimaryGradientBadge = ({ style, children }) => (
  <View style={[styles.badge, style]}>{children}</View>
);

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: COLORS.badge.verified.fill,
  },
});

export default PrimaryGradientBadge;
