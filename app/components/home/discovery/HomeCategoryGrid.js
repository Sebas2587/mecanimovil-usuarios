import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Skeleton from '../../feedback/Skeleton/Skeleton';
import { HomeCategoryGridSkeleton } from '../../utils/HomePanelSkeletons';
import { useQuery } from '@tanstack/react-query';
import {
  getMainCategories,
  getMainCategoriesForUserVehicles,
} from '../../../services/categories';
import { COLORS, BORDERS, TYPOGRAPHY } from '../../../design-system/tokens';
import { resolveCategoryVisual } from '../shared/homeCategoryIcons';

const VISIBLE_CATEGORIES = 12;
const CELL_WIDTH = 88;

function vehiclesQueryKey(vehicles) {
  return (Array.isArray(vehicles) ? vehicles : [])
    .map((v) => v?.id)
    .filter(Boolean)
    .sort((a, b) => a - b)
    .join(',');
}

/**
 * Categorías del home: prioriza las compatibles con los vehículos del usuario;
 * si no hay match, muestra el catálogo principal (getMainCategories).
 */
const HomeCategoryGrid = ({ disabled, onSelectCategory, vehicles = [] }) => {
  const vehicleIdsKey = useMemo(() => vehiclesQueryKey(vehicles), [vehicles]);
  const hasVehicles = vehicleIdsKey.length > 0;

  const {
    data: categoriesRaw,
    isPending,
    isFetching,
  } = useQuery({
    queryKey: hasVehicles
      ? ['mainCategoriesForVehicles', vehicleIdsKey]
      : ['mainCategories'],
    queryFn: () =>
      hasVehicles ? getMainCategoriesForUserVehicles(vehicles) : getMainCategories(),
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 60,
  });

  const categories = useMemo(() => {
    const list = Array.isArray(categoriesRaw) ? categoriesRaw : [];
    return list.slice(0, VISIBLE_CATEGORIES);
  }, [categoriesRaw]);

  const showInitialLoader = isPending;
  const showInlineRefetch = !isPending && isFetching && categories.length > 0;

  if (showInitialLoader) {
    return <HomeCategoryGridSkeleton />;
  }

  if (categories.length === 0) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.emptyHint}>
          {hasVehicles
            ? 'No hay categorías disponibles en este momento.'
            : 'Registra un vehículo para ver categorías de servicios.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {showInlineRefetch ? (
        <View style={styles.refetchIndicator}>
          <Skeleton width={20} height={20} borderRadius={10} />
        </View>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        keyboardShouldPersistTaps="handled"
      >
        {categories.map((cat) => {
          const visual = resolveCategoryVisual(cat);
          const { Icon } = visual;

          return (
            <TouchableOpacity
              key={String(cat.id)}
              style={styles.cell}
              onPress={() => onSelectCategory?.(cat)}
              activeOpacity={0.85}
              disabled={disabled}
            >
              <View style={[styles.iconCircle, { backgroundColor: visual.bg }]}>
                <Icon size={22} color={visual.color} />
              </View>
              <Text style={styles.label} numberOfLines={2}>
                {cat.nombre || 'Categoría'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 18,
  },
  loader: {
    marginVertical: 16,
  },
  refetchIndicator: {
    position: 'absolute',
    right: 4,
    top: 4,
    zIndex: 1,
  },
  emptyHint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginBottom: 10,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    gap: 4,
    paddingRight: 8,
  },
  cell: {
    width: CELL_WIDTH,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: BORDERS.radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.primary,
    textAlign: 'center',
    lineHeight: 15,
  },
});

export default React.memo(HomeCategoryGrid);
