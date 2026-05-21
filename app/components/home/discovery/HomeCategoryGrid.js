import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getMainCategoriesForUserVehicles } from '../../../services/categories';
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
 * Solo categorías de servicio con ofertas compatibles con los vehículos del usuario.
 */
const HomeCategoryGrid = ({ disabled, onSelectCategory, vehicles = [] }) => {
  const vehicleIdsKey = useMemo(() => vehiclesQueryKey(vehicles), [vehicles]);
  const hasVehicles = vehicleIdsKey.length > 0;

  const { data: categoriesRaw, isLoading, isFetching } = useQuery({
    queryKey: ['mainCategoriesForVehicles', vehicleIdsKey],
    queryFn: () => getMainCategoriesForUserVehicles(vehicles),
    enabled: hasVehicles,
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 60,
  });

  const categories = useMemo(() => {
    const list = Array.isArray(categoriesRaw) ? categoriesRaw : [];
    return list.slice(0, VISIBLE_CATEGORIES);
  }, [categoriesRaw]);

  const loading = hasVehicles && (isLoading || isFetching);

  if (loading) {
    return <ActivityIndicator color={COLORS.primary[500]} style={styles.loader} />;
  }

  if (!hasVehicles) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.emptyHint}>
          Registra un vehículo para ver categorías de servicios compatibles.
        </Text>
      </View>
    );
  }

  if (categories.length === 0) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.emptyHint}>
          No hay categorías con servicios para tus vehículos registrados.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
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
