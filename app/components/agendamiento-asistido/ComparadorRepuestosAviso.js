import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';

export default function ComparadorRepuestosAviso({ mensaje }) {
  if (!mensaje) return null;
  return (
    <View style={styles.box}>
      <Text style={styles.text}>{mensaje}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginBottom: 14,
    padding: 10,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.warning[50],
    borderWidth: 1,
    borderColor: COLORS.warning[200],
  },
  text: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 18,
    color: COLORS.warning[800],
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
});
