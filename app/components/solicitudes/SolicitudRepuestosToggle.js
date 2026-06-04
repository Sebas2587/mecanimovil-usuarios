import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Package, Wrench } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SPACING } from '../../design-system/tokens';

/**
 * Con / sin repuestos en estilo segmented (Coinbase-light).
 */
export default function SolicitudRepuestosToggle({
  value = true,
  onChange,
  disabled = false,
  catalogoFijo = false,
  fijoConRepuestos = true,
  compact = false,
}) {
  if (catalogoFijo) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.label}>Repuestos</Text>
        <View style={[styles.segment, styles.segmentActivePrimary, styles.segmentFijo]}>
          <Package size={16} color={COLORS.primary[600]} />
          <Text style={[styles.segmentText, styles.segmentTextActivePrimary]}>
            {fijoConRepuestos ? 'Con repuestos (catálogo)' : 'Solo mano de obra (catálogo)'}
          </Text>
        </View>
      </View>
    );
  }

  const conRepuestos = value !== false;

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {!compact ? <Text style={styles.label}>¿Incluir repuestos?</Text> : null}
      <View style={[styles.segments, compact && styles.segmentsCompact]}>
        <TouchableOpacity
          style={[styles.segment, compact && styles.segmentCompact, conRepuestos && styles.segmentActivePrimary]}
          onPress={() => onChange?.(true)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{ selected: conRepuestos }}
        >
          <Package size={compact ? 14 : 16} color={conRepuestos ? COLORS.primary[600] : COLORS.text.secondary} />
          <Text style={[styles.segmentText, compact && styles.segmentTextCompact, conRepuestos && styles.segmentTextActivePrimary]}>
            {compact ? 'Con rep.' : 'Con repuestos'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, compact && styles.segmentCompact, !conRepuestos && styles.segmentActiveNeutral]}
          onPress={() => onChange?.(false)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{ selected: !conRepuestos }}
        >
          <Wrench size={compact ? 14 : 16} color={!conRepuestos ? COLORS.primary[700] : COLORS.text.secondary} />
          <Text style={[styles.segmentText, compact && styles.segmentTextCompact, !conRepuestos && styles.segmentTextActiveNeutral]}>
            {compact ? 'M. de obra' : 'Solo mano de obra'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: SPACING.md,
  },
  wrapCompact: {
    marginBottom: 6,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  segments: {
    flexDirection: 'row',
    gap: SPACING.xs,
    backgroundColor: COLORS.neutral.gray[100],
    borderRadius: BORDERS.radius.md,
    padding: 4,
  },
  segmentsCompact: {
    padding: 3,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: BORDERS.radius.sm,
  },
  segmentCompact: {
    paddingVertical: 7,
    paddingHorizontal: 6,
    gap: 4,
  },
  segmentFijo: {
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
  },
  segmentActivePrimary: {
    backgroundColor: COLORS.background.paper,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.primary[200],
  },
  segmentActiveNeutral: {
    backgroundColor: COLORS.background.paper,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  segmentText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.secondary,
  },
  segmentTextCompact: {
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
  segmentTextActivePrimary: {
    color: COLORS.primary[700],
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  segmentTextActiveNeutral: {
    color: COLORS.text.primary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});
