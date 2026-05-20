import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, BORDERS, TYPOGRAPHY } from '../../../design-system/tokens';
import { EXPLORE_MODE_CERCA, EXPLORE_MODE_PARA_TI } from './exploreProvidersConstants';

const SEGMENTS = [
  { id: EXPLORE_MODE_PARA_TI, label: 'Para ti' },
  { id: EXPLORE_MODE_CERCA, label: 'Cerca de ti' },
];

const ExploreModeSegment = ({ value, onChange }) => (
  <View style={styles.track} accessibilityRole="tablist">
    {SEGMENTS.map((seg) => {
      const active = value === seg.id;
      return (
        <TouchableOpacity
          key={seg.id}
          style={[styles.segment, active && styles.segmentActive]}
          onPress={() => onChange(seg.id)}
          activeOpacity={0.85}
          accessibilityRole="tab"
          accessibilityState={{ selected: active }}
        >
          <Text style={[styles.label, active && styles.labelActive]}>{seg.label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: COLORS.neutral.gray[100],
    borderRadius: BORDERS.radius.lg,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: BORDERS.radius.md,
  },
  segmentActive: {
    backgroundColor: COLORS.background.paper,
    ...{
      shadowColor: '#0A0B0D',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.tertiary,
  },
  labelActive: {
    color: COLORS.primary[600],
  },
});

export default React.memo(ExploreModeSegment);
