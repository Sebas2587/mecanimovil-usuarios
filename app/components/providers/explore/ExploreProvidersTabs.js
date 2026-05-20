import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY } from '../../../design-system/tokens';
import { EXPLORE_TABS } from './exploreProvidersConstants';

/** Pestañas tipo segmento (Todos / Talleres / A domicilio). */
const ExploreProvidersTabs = ({ activeTab, onTabChange, counts = {} }) => (
  <View style={styles.track} accessibilityRole="tablist">
    {EXPLORE_TABS.map((tab) => {
      const active = activeTab === tab.id;
      const count = counts[tab.id];
      const label =
        count != null && count > 0 ? `${tab.label} (${count})` : tab.label;
      return (
        <TouchableOpacity
          key={tab.id}
          style={[styles.tab, active && styles.tabActive]}
          onPress={() => onTabChange(tab.id)}
          activeOpacity={0.85}
          accessibilityRole="tab"
          accessibilityState={{ selected: active }}
        >
          <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>
            {label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  tabActive: {
    borderBottomColor: COLORS.primary[500],
  },
  tabText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.tertiary,
  },
  tabTextActive: {
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.primary[600],
  },
});

export default React.memo(ExploreProvidersTabs);
