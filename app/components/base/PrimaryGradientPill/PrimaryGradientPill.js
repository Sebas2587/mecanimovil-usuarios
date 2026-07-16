import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { COLORS, BORDERS, SHADOWS } from '../../../design-system/tokens';

/**
 * Chip seleccionable (filtros / calendario) — no es CTA.
 * Activo: paper + borde orange. Inactivo: tonal.
 * Gradiente CTA solo en botones primarios.
 */
const PrimaryGradientPill = ({
  selected = false,
  onPress,
  children,
  style,
  fillStyle,
  inactiveStyle,
  disabled = false,
  activeOpacity = 0.85,
  ...touchProps
}) => (
  <TouchableOpacity
    style={[styles.shell, style]}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={activeOpacity}
    {...touchProps}
  >
    <View
      style={[
        styles.fill,
        selected ? styles.selected : styles.inactive,
        selected ? null : inactiveStyle,
        fillStyle,
      ]}
    >
      {children}
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  shell: {
    borderRadius: BORDERS.radius.pill,
    overflow: 'hidden',
  },
  fill: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BORDERS.width.thin,
  },
  inactive: {
    backgroundColor: COLORS.tab.unselectedBg,
    borderColor: COLORS.border.light,
  },
  selected: {
    backgroundColor: COLORS.tab.selectedBg,
    borderColor: COLORS.tab.selectedBorder,
    ...SHADOWS.sm,
  },
});

export default PrimaryGradientPill;
