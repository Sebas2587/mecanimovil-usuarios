import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SPACING } from '../../design-system/tokens';

/**
 * Card de servicio (paso 1 solicitud) — listing Airbnb:
 * paper + hairline, tipografía Poppins, selección con primary suave.
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
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={servicio.nombre}
    >
      <View style={styles.row}>
        <Text style={[styles.nombre, selected && styles.nombreSelected]} numberOfLines={2}>
          {servicio.nombre}
        </Text>
        {selected ? (
          <View style={styles.checkCircle}>
            <Check size={14} color={COLORS.text.inverse} strokeWidth={2.5} />
          </View>
        ) : (
          <View style={styles.checkIdle} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 64,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border.light,
    justifyContent: 'center',
  },
  cardSelected: {
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.primary[500],
    backgroundColor: COLORS.primary[50],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkIdle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border.light,
    flexShrink: 0,
  },
  nombre: {
    flex: 1,
    ...TYPOGRAPHY.styles.h5,
    color: COLORS.text.primary,
    letterSpacing: -0.15,
  },
  nombreSelected: {
    ...TYPOGRAPHY.styles.h5,
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
});
