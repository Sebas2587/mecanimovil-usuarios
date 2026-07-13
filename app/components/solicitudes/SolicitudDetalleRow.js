import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';
import Icon from '../base/Icon/Icon';

/** Fila plana label/valor para detalle de solicitud (sin card anidada). */
export default function SolicitudDetalleRow({
  icon,
  label,
  value,
  hint,
  badge,
  isLast = false,
}) {
  if (!value && !badge) return null;

  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <View style={styles.labelRow}>
        {icon ? (
          <Icon name={icon} size={14} color={COLORS.text.tertiary} />
        ) : null}
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.valueBlock}>
        {badge ?? (
          <>
            <Text style={styles.value}>{value}</Text>
            {hint ? (
              <Text style={styles.hint} numberOfLines={2}>
                {hint}
              </Text>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: COLORS.border.light,
    gap: SPACING.xxs,
  },
  rowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xxs,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.tertiary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  valueBlock: {
    paddingLeft: 18,
  },
  value: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.primary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    lineHeight: 20,
    flexWrap: 'wrap',
  },
  hint: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    marginTop: 2,
    lineHeight: 16,
  },
});
