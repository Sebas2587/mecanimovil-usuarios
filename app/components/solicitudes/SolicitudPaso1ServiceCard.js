import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SPACING } from '../../design-system/tokens';

/**
 * Card compacta de servicio (grilla 2 columnas, paso 1 solicitud — estilo Coinbase).
 */
export default function SolicitudPaso1ServiceCard({ servicio, selected, onPress, width }) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        width ? { width } : null,
        selected && styles.cardSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={servicio.nombre}
    >
      <View style={styles.row}>
        <Text style={[styles.nombre, selected && styles.nombreSelected]} numberOfLines={2}>
          {servicio.nombre}
        </Text>
        {selected ? (
          <CheckCircle2 size={16} color={COLORS.primary[600]} style={styles.checkIcon} />
        ) : (
          <View style={styles.checkPlaceholder} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 56,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm + 2,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    justifyContent: 'center',
  },
  cardSelected: {
    borderColor: COLORS.primary[400],
    backgroundColor: COLORS.primary[50],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  checkIcon: {
    flexShrink: 0,
    marginTop: 1,
  },
  checkPlaceholder: {
    width: 16,
    height: 16,
    flexShrink: 0,
  },
  nombre: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    lineHeight: 18,
  },
  nombreSelected: {
    color: COLORS.primary[800],
  },
});
