import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { GitCompare } from 'lucide-react-native';
import Button from '../base/Button/Button';
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
      <Button
        title="Comparar"
        onPress={onPress}
        disabled={!compareEnabled}
        iconNode={<GitCompare size={18} color={COLORS.text.onPrimary} />}
        style={styles.btn}
        size="sm"
      />
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
    minWidth: 120,
  },
});
