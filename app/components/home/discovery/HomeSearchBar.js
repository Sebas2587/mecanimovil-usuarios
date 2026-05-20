import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Search } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SHADOWS } from '../../../design-system/tokens';

const HomeSearchBar = ({ onPress, disabled = false, placeholder = '¿Qué servicio necesitas?' }) => (
  <TouchableOpacity
    style={[styles.btn, disabled && styles.btnDisabled]}
    onPress={onPress}
    activeOpacity={0.88}
    disabled={disabled}
    accessibilityRole="search"
    accessibilityLabel={placeholder}
  >
    <Search size={20} color={COLORS.text.tertiary} />
    <Text style={styles.placeholder}>{placeholder}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  btnDisabled: {
    opacity: 0.55,
  },
  placeholder: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.tertiary,
  },
});

export default React.memo(HomeSearchBar);
