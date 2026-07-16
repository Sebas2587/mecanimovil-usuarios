import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clock, Zap } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../../design-system/tokens';
import SegmentedControl from '../base/SegmentedControl/SegmentedControl';

/**
 * Urgencia — mismo SegmentedControl Airbnb / Tinder tabs
 * (paper + orange selected). No verde/ámbar distintos por opción.
 */
export default function SolicitudUrgenciaToggle({
  value = 'normal',
  onChange,
  disabled = false,
  compact = false,
}) {
  const segments = useMemo(
    () => [
      { id: 'normal', label: 'Normal', Icon: Clock },
      { id: 'urgente', label: 'Urgente', Icon: Zap },
    ],
    [],
  );

  return (
    <View
      style={[styles.wrap, compact && styles.wrapCompact]}
      pointerEvents={disabled ? 'none' : 'auto'}
    >
      {!compact ? <Text style={styles.label}>Urgencia</Text> : null}
      <SegmentedControl
        segments={segments}
        value={value === 'urgente' ? 'urgente' : 'normal'}
        onChange={(id) => {
          if (disabled) return;
          onChange?.(id);
        }}
        style={styles.control}
      />
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
  control: {
    alignSelf: 'stretch',
  },
});
