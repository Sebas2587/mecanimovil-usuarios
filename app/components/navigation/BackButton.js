import React from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { COLORS } from '../../design-system/tokens';

/**
 * Retroceso canónico del design system: 40×40 transparente, sin pastilla ni borde.
 * Usar en todos los headers (stack, salud, solicitudes, etc.).
 */
const BackButton = ({
  onPress,
  color = COLORS.text.primary,
  size = 24,
  style,
  accessibilityLabel = 'Volver',
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.btn, style]}
    hitSlop={12}
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
  >
    <ChevronLeft size={size} color={color} strokeWidth={2} fill="none" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : null),
  },
});

export default React.memo(BackButton);
