import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { COLORS, BORDERS, TYPOGRAPHY } from '../../../design-system/tokens';
import { EXPLORE_TABS } from './exploreProvidersConstants';

const ExploreProvidersTabs = ({ activeTab, onTabChange, counts = {} }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.row}
    keyboardShouldPersistTaps="handled"
  >
    {EXPLORE_TABS.map((tab) => {
      const active = activeTab === tab.id;
      const count = counts[tab.id];
      const label =
        count != null && count > 0 ? `${tab.label} (${count})` : tab.label;
      return (
        <TouchableOpacity
          key={tab.id}
          style={[styles.chip, active && styles.chipActive]}
          onPress={() => onTabChange(tab.id)}
          activeOpacity={0.85}
          accessibilityRole="tab"
          accessibilityState={{ selected: active }}
        >
          <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  chipActive: {
    backgroundColor: COLORS.primary[500],
    borderColor: COLORS.primary[500],
  },
  chipText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
  },
  chipTextActive: {
    color: COLORS.text.inverse,
  },
});

export default React.memo(ExploreProvidersTabs);
