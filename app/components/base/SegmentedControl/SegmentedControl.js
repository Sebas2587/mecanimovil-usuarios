import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../../../design-system/tokens';

/**
 * Segmento/pills único de la app (patrón Airbnb: pill activa oscura, inactivas grises).
 * Reemplaza cualquier implementación local de tabs/segmentos internos.
 *
 * @param {Array<{id: string, label: string, count?: number, Icon?: React.ComponentType}>} segments
 * @param {string} value id del segmento activo
 * @param {(id: string) => void} onChange
 * @param {boolean} scrollable si hay muchos segmentos, permite scroll horizontal
 */
const SegmentedControl = ({ segments = [], value, onChange, scrollable = false, style }) => {
  const content = segments.map((seg) => {
    const active = value === seg.id;
    const { Icon } = seg;
    const label =
      seg.count != null && seg.count > 0 ? `${seg.label} (${seg.count})` : seg.label;
    return (
      <TouchableOpacity
        key={seg.id}
        style={[styles.pill, active && styles.pillActive]}
        onPress={() => onChange?.(seg.id)}
        activeOpacity={0.85}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={seg.label}
      >
        {Icon ? (
          <Icon
            size={15}
            color={active ? COLORS.text.inverse : COLORS.text.secondary}
            strokeWidth={2}
          />
        ) : null}
        <Text
          style={[styles.label, active && styles.labelActive]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  });

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={style}
        contentContainerStyle={styles.track}
        accessibilityRole="tablist"
        keyboardShouldPersistTaps="handled"
      >
        {content}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.track, style]} accessibilityRole="tablist">
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: SPACING.md,
    borderRadius: 999,
    backgroundColor: COLORS.neutral.gray[100],
    minHeight: 36,
  },
  pillActive: {
    backgroundColor: COLORS.primary[500],
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.secondary,
  },
  labelActive: {
    color: COLORS.text.inverse,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});

export default React.memo(SegmentedControl);
