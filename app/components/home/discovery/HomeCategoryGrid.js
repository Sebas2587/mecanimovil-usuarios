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
import { getMainCategories } from '../../../services/categories';
import { COLORS, BORDERS, TYPOGRAPHY } from '../../../design-system/tokens';
import {
  HEALTH_CATEGORY,
  MORE_CATEGORY,
  resolveCategoryVisual,
} from '../shared/homeCategoryIcons';

const VISIBLE_CATEGORIES = 12;
const CELL_WIDTH = 88;

/**
 * Categorías en carrusel horizontal con nombre completo.
 */
const HomeCategoryGrid = ({ disabled, onSelectCategory, onPressMore }) => {
  const { data: categoriesRaw, isLoading } = useQuery({
    queryKey: ['mainCategories'],
    queryFn: getMainCategories,
    staleTime: 1000 * 60 * 60,
  });

  const items = useMemo(() => {
    const list = Array.isArray(categoriesRaw) ? categoriesRaw : [];
    const sliced = list.slice(0, VISIBLE_CATEGORIES);
    return [
      { ...HEALTH_CATEGORY, isHealth: true },
      ...sliced.map((c) => ({ ...c, isHealth: false })),
      { ...MORE_CATEGORY, isMore: true },
    ];
  }, [categoriesRaw]);

  if (isLoading) {
    return <ActivityIndicator color={COLORS.primary[500]} style={styles.loader} />;
  }

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        keyboardShouldPersistTaps="handled"
      >
        {items.map((cat) => {
          const visual = cat.isMore
            ? { Icon: MORE_CATEGORY.Icon, bg: MORE_CATEGORY.bg, color: MORE_CATEGORY.color }
            : resolveCategoryVisual(cat);
          const { Icon } = visual;
          const label = cat.nombre || (cat.isMore ? 'Más' : '');

          return (
            <TouchableOpacity
              key={String(cat.id)}
              style={styles.cell}
              onPress={() => {
                if (cat.isMore) onPressMore?.();
                else onSelectCategory?.(cat);
              }}
              activeOpacity={0.85}
              disabled={disabled && !cat.isMore}
            >
              <View style={[styles.iconCircle, { backgroundColor: visual.bg }]}>
                <Icon size={22} color={visual.color} />
              </View>
              <Text style={styles.label}>{label}</Text>
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
