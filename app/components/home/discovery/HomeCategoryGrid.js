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
import { COLORS, BORDERS, TYPOGRAPHY, SPACING } from '../../../design-system/tokens';
import { resolveCategoryVisual } from '../shared/homeCategoryIcons';
import { H_PAD } from '../shared/homeLayoutConstants';

const VISIBLE_CATEGORIES = 6;
/** Airbnb Explore: celda con espacio para nombres largos en 2–3 líneas. */
const CELL_WIDTH = 104;

function vehiclesQueryKey(vehicles) {
  return (Array.isArray(vehicles) ? vehicles : [])
    .map((v) => v?.id)
    .filter(Boolean)
    .sort((a, b) => a - b)
    .join(',');
}

/**
 * Categorías del home — patrón Airbnb Explore (icono outline + círculo neutro + caption).
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
        style={styles.carouselBleed}
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
              accessibilityRole="button"
              accessibilityLabel={cat.nombre || 'Categoría'}
            >
              <View style={[styles.iconCircle, { backgroundColor: visual.bg }]}>
                <Icon size={22} color={visual.color} strokeWidth={1.75} fill="none" />
              </View>
              <Text style={styles.label} numberOfLines={3}>
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
    marginBottom: SPACING.lg,
  },
  refetchIndicator: {
    position: 'absolute',
    right: 4,
    top: 4,
    zIndex: 1,
  },
  emptyHint: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  /** Mismo full-bleed que Destacados: sale del padding del panel y oculta al borde del device. */
  carouselBleed: {
    marginHorizontal: -H_PAD,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.xs,
    paddingHorizontal: H_PAD,
    paddingRight: H_PAD + SPACING.sm,
  },
  cell: {
    width: CELL_WIDTH,
    alignItems: 'center',
    paddingVertical: SPACING.xxs,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: BORDERS.radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    backgroundColor: COLORS.neutral.gray[100],
  },
  label: {
    ...TYPOGRAPHY.styles.caption,
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.primary,
    textAlign: 'center',
    width: '100%',
    lineHeight: 16,
  },
});

export default React.memo(HomeCategoryGrid);
