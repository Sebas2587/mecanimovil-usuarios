import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { GitCompare } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SHADOWS } from '../../design-system/tokens';

export default function ComparadorCatalogoCompareFooter({
  countSel = 0,
  compareEnabled = false,
  onPress,
  bottomInset = 0,
}) {
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(bottomInset, 12) }]}>
      <Text style={styles.hint}>
        {countSel === 0
          ? 'Selecciona proveedores'
          : `${countSel} seleccionado${countSel === 1 ? '' : 's'}`}
      </Text>
      <TouchableOpacity
        style={[styles.btn, !compareEnabled && styles.btnDisabled]}
        onPress={onPress}
        disabled={!compareEnabled}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Comparar proveedores seleccionados"
      >
        <GitCompare size={18} color={COLORS.text.onPrimary} />
        <Text style={styles.btnText}>Comparar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background.paper,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
    ...SHADOWS.md,
  },
  hint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    flex: 1,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.primary[500],
  },
  btnDisabled: {
    backgroundColor: COLORS.neutral.gray[300],
  },
  btnText: {
    color: COLORS.text.onPrimary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});
