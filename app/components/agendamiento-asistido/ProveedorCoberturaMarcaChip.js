import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Car, Globe } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';

/**
 * Etiqueta compacta: especialista vs multimarca.
 * Colores canónicos: COLORS.badge.especialista | COLORS.badge.multimarca.
 */
export default function ProveedorCoberturaMarcaChip({ badge, compact = false }) {
  if (!badge?.label) return null;

  const esMultimarca = badge.variant === 'multimarca';
  const Icon = esMultimarca ? Globe : Car;
  const iconColor = esMultimarca
    ? COLORS.badge.multimarca.icon
    : COLORS.badge.especialista.icon;

  return (
    <View
      style={[
        styles.chip,
        esMultimarca ? styles.chipMultimarca : styles.chipEspecialista,
        compact && styles.chipCompact,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`${badge.label}. ${badge.hint || ''}`}
    >
      <Icon size={compact ? 9 : 10} color={iconColor} />
      <Text
        style={[
          styles.label,
          esMultimarca ? styles.labelMultimarca : styles.labelEspecialista,
          compact && styles.labelCompact,
        ]}
        numberOfLines={1}
      >
        {badge.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDERS.radius.full,
    borderWidth: 1,
  },
  chipCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  chipMultimarca: {
    backgroundColor: COLORS.badge.multimarca.background,
    borderColor: COLORS.badge.multimarca.border,
  },
  chipEspecialista: {
    backgroundColor: COLORS.badge.especialista.background,
    borderColor: COLORS.badge.especialista.border,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    flexShrink: 1,
  },
  labelCompact: {
    fontSize: 10,
  },
  labelMultimarca: {
    color: COLORS.badge.multimarca.text,
  },
  labelEspecialista: {
    color: COLORS.badge.especialista.text,
  },
});
