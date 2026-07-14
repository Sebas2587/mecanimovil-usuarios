import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, BORDERS } from '../../../design-system/tokens';

/**
 * Segmento/pills único de la app (patrón Airbnb Explore filters):
 * - Inactivo: surface soft + tipografía caption medium (Poppins 500)
 * - Activo: primary fill + tipografía captionBold (Poppins 600) en inverso
 *
 * @param {Array<{id: string, label: string, count?: number, Icon?: React.ComponentType}>} segments
 * @param {string|null} value id del segmento activo
 * @param {(id: string) => void} onChange
 * @param {boolean} scrollable si hay muchos segmentos, permite scroll horizontal
 */
const SegmentedControl = ({ segments = [], value, onChange, scrollable = false, style }) => {
  const content = segments.map((seg) => {
    const active = value === seg.id;
    const { Icon } = seg;
    const label =
      seg.count != null ? `${seg.label} (${seg.count})` : seg.label;
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
        <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
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
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.primary[50],
    minHeight: 36,
  },
  pillActive: {
    backgroundColor: COLORS.primary[500],
  },
  label: {
    ...TYPOGRAPHY.styles.caption,
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.secondary,
  },
  labelActive: {
    ...TYPOGRAPHY.styles.captionBold,
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.inverse,
  },
});

export default React.memo(SegmentedControl);
