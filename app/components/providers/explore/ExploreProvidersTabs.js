import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { SPACING } from '../../../design-system/tokens';
import SegmentedControl from '../../base/SegmentedControl/SegmentedControl';
import { EXPLORE_TABS } from './exploreProvidersConstants';

/** Pestañas tipo segmento (Todos / Talleres / A domicilio). */
const ExploreProvidersTabs = ({ activeTab, onTabChange, counts = {} }) => {
  const segments = useMemo(
    () =>
      EXPLORE_TABS.map((tab) => ({
        id: tab.id,
        label: tab.label,
        count: counts[tab.id],
      })),
    [counts],
  );

  return (
    <SegmentedControl
      segments={segments}
      value={activeTab}
      onChange={onTabChange}
      style={styles.control}
    />
  );
};

const styles = StyleSheet.create({
  control: {
    marginBottom: SPACING.sm,
  },
});

export default React.memo(ExploreProvidersTabs);
