import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { SPACING } from '../../../design-system/tokens';
import SegmentedControl from '../../base/SegmentedControl/SegmentedControl';
import { EXPLORE_FILTER_ALL, shortCategoryLabel } from './exploreProvidersConstants';

/**
 * Filtro Explore: Todos + categorías de servicio (scrollable).
 * No filtra taller vs domicilio — el eje útil es qué ofrecen.
 */
const ExploreProvidersTabs = ({
  activeFilter,
  onFilterChange,
  categories = [],
  allCount = null,
}) => {
  const segments = useMemo(() => {
    const base = [
      {
        id: EXPLORE_FILTER_ALL,
        label: 'Todos',
        count: allCount,
      },
    ];
    const cats = (categories || [])
      .filter((c) => c?.id != null)
      .map((c) => ({
        id: String(c.id),
        label: shortCategoryLabel(c.nombre),
      }));
    return [...base, ...cats];
  }, [categories, allCount]);

  return (
    <SegmentedControl
      scrollable
      segments={segments}
      value={String(activeFilter)}
      onChange={onFilterChange}
      style={styles.control}
    />
  );
};

const styles = StyleSheet.create({
  control: {
    marginBottom: SPACING.sm,
    flexGrow: 0,
    flexShrink: 0,
    maxHeight: 44,
  },
});

export default React.memo(ExploreProvidersTabs);
