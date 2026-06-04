import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Clock, Zap } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SPACING } from '../../design-system/tokens';

/** Urgencia normal / urgente en tabs compactos. */
export default function SolicitudUrgenciaToggle({ value = 'normal', onChange, disabled = false, compact = false }) {
  const esUrgente = value === 'urgente';

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {!compact ? <Text style={styles.label}>Urgencia</Text> : null}
      <View style={[styles.segments, compact && styles.segmentsCompact]}>
        <TouchableOpacity
          style={[styles.segment, compact && styles.segmentCompact, !esUrgente && styles.segmentActiveNormal]}
          onPress={() => onChange?.('normal')}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{ selected: !esUrgente }}
        >
          <Clock size={compact ? 14 : 16} color={!esUrgente ? COLORS.success[600] : COLORS.text.secondary} />
          <Text style={[styles.segmentText, compact && styles.segmentTextCompact, !esUrgente && styles.segmentTextActiveNormal]}>
            Normal
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, compact && styles.segmentCompact, esUrgente && styles.segmentActiveUrgent]}
          onPress={() => onChange?.('urgente')}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{ selected: esUrgente }}
        >
          <Zap size={compact ? 14 : 16} color={esUrgente ? COLORS.warning[600] : COLORS.text.secondary} />
          <Text style={[styles.segmentText, compact && styles.segmentTextCompact, esUrgente && styles.segmentTextActiveUrgent]}>
            Urgente
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
    marginBottom: 0,
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
  segmentActiveNormal: {
    backgroundColor: COLORS.background.paper,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.success[200],
  },
  segmentActiveUrgent: {
    backgroundColor: COLORS.background.paper,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.warning[200],
  },
  segmentText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.secondary,
  },
  segmentTextCompact: {
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
  segmentTextActiveNormal: {
    color: COLORS.success[700],
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  segmentTextActiveUrgent: {
    color: COLORS.warning[700],
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});
