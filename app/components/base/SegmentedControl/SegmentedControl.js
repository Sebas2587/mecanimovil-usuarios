import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, BORDERS, SHADOWS } from '../../../design-system/tokens';

/**
 * Tabs / filtros — sin track gris (el canvas ya es #F9F9F9).
 * Unselected: solo texto muted · Selected: paper + borde orange.
 * Gradiente CTA solo en botones primarios.
 */
const SegmentedControl = ({ segments = [], value, onChange, scrollable = false, style }) => {
  const content = segments.map((seg) => {
    const active = value === seg.id;
    const { Icon } = seg;
    const label = seg.count != null ? `${seg.label} (${seg.count})` : seg.label;

    return (
      <TouchableOpacity
        key={seg.id}
        style={[styles.pill, active ? styles.pillActive : styles.pillInactive]}
        onPress={() => onChange?.(seg.id)}
        activeOpacity={0.85}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={seg.label}
      >
        {Icon ? (
          <Icon
            size={15}
            color={active ? COLORS.tab.selectedText : COLORS.tab.unselected}
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
        style={[styles.scroll, style]}
        contentContainerStyle={styles.trackScroll}
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
  /** Evita que el ScrollView horizontal se estire en altura dentro de columnas flex (web). */
  scroll: {
    flexGrow: 0,
    flexShrink: 0,
    maxHeight: 44,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flexWrap: 'wrap',
  },
  trackScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flexGrow: 0,
    paddingVertical: 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: SPACING.md,
    minHeight: 36,
    borderRadius: BORDERS.radius.pill,
    borderWidth: BORDERS.width.thin,
    flexShrink: 0,
  },
  pillInactive: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  pillActive: {
    backgroundColor: COLORS.tab.selectedBg,
    borderColor: COLORS.tab.selectedBorder,
    ...SHADOWS.sm,
  },
  label: {
    ...TYPOGRAPHY.styles.caption,
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.tab.unselected,
  },
  labelActive: {
    ...TYPOGRAPHY.styles.captionBold,
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.tab.selectedText,
  },
});

export default React.memo(SegmentedControl);
