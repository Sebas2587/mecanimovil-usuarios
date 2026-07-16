import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { COLORS, BORDERS } from '../../../design-system/tokens';

/**
 * Sello canónico “Verificado”.
 * Colores: COLORS.badge.verified (disco magenta + check blanco).
 */
export default function VerifiedSeal({
  size = 16,
  checkSize,
  strokeWidth = 3,
  style,
  accessibilityLabel = 'Verificado',
  ...rest
}) {
  const iconSize = checkSize ?? Math.max(8, Math.round(size * 0.62));

  return (
    <View
      style={[
        styles.seal,
        {
          width: size,
          height: size,
          borderRadius: BORDERS.radius.full,
          backgroundColor: COLORS.badge.verified.fill,
        },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      {...rest}
    >
      <Check
        size={iconSize}
        color={COLORS.badge.verified.onFill}
        strokeWidth={strokeWidth}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  seal: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
});
