import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Search, HeartPulse } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY } from '../../../design-system/tokens';
import { getMainCategories } from '../../../services/categories';
import { ROUTES } from '../../../utils/constants';
import {
  EXPLORE_MODE_CERCA,
  EXPLORE_MODE_PARA_TI,
} from '../../providers/explore/exploreProvidersConstants';

const HEALTH_CHIP = { id: '__salud__', nombre: 'Salud del auto', isHealth: true };

/**
 * Buscador + categorías → Explore filtrado (fase 6).
 */
const HomeDiscoveryHub = ({
  navigation,
  selectedVehicle,
  selectedAddress,
  onPressSearch,
}) => {
  const { data: categoriesRaw, isLoading } = useQuery({
    queryKey: ['mainCategories'],
    queryFn: getMainCategories,
    staleTime: 1000 * 60 * 60,
  });

  const categories = useMemo(() => {
    const list = Array.isArray(categoriesRaw) ? categoriesRaw : [];
    return [HEALTH_CHIP, ...list.slice(0, 12)];
  }, [categoriesRaw]);

  const openExplore = (params) => {
    if (!selectedVehicle) return;
    navigation.navigate(ROUTES.EXPLORE_PROVIDERS, {
      vehicle: selectedVehicle,
      address: selectedAddress ?? undefined,
      ...params,
    });
  };

  const handleCategory = (cat) => {
    if (cat.isHealth) {
      navigation.navigate(ROUTES.VEHICLE_HEALTH, {
        vehicleId: selectedVehicle.id,
        vehicle: selectedVehicle,
      });
      return;
    }
    openExplore({
      mode: EXPLORE_MODE_PARA_TI,
      categoryId: cat.id,
      categoryName: cat.nombre,
      initialTab: 'all',
    });
  };

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.searchBtn}
        onPress={() => {
          if (onPressSearch) onPressSearch();
          else
            openExplore({
              mode: EXPLORE_MODE_CERCA,
              focusSearch: true,
              initialTab: 'all',
            });
        }}
        activeOpacity={0.85}
        disabled={!selectedVehicle}
      >
        <Search size={18} color={COLORS.text.tertiary} />
        <Text style={styles.searchPlaceholder}>Buscar servicio o taller…</Text>
      </TouchableOpacity>

      {isLoading ? (
        <ActivityIndicator color={COLORS.primary[500]} style={styles.loader} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
          keyboardShouldPersistTaps="handled"
        >
          {categories.map((cat) => {
            const isHealth = cat.isHealth;
            if (isHealth) {
              return (
                <TouchableOpacity
                  key={String(cat.id)}
                  style={[styles.catChip, styles.catChipHealth]}
                  onPress={() => handleCategory(cat)}
                  activeOpacity={0.85}
                  disabled={!selectedVehicle}
                >
                  <HeartPulse size={14} color={COLORS.icon.active} style={styles.catIcon} />
                  <Text style={styles.catTextHealth} numberOfLines={1}>
                    {cat.nombre}
                  </Text>
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity
                key={String(cat.id)}
                style={styles.catChip}
                onPress={() => handleCategory(cat)}
                activeOpacity={0.85}
                disabled={!selectedVehicle}
              >
                <Text style={styles.catText} numberOfLines={1}>
                  {cat.nombre}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
  },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    marginBottom: 10,
  },
  searchPlaceholder: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.tertiary,
  },
  loader: {
    marginVertical: 8,
  },
  catRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: 1,
    borderColor: COLORS.border.light,
    maxWidth: 160,
    flexDirection: 'row',
    alignItems: 'center',
  },
  catChipHealth: {
    backgroundColor: COLORS.buttonSecondary.background,
    borderColor: COLORS.buttonSecondary.border,
  },
  catIcon: {
    marginRight: 4,
  },
  catText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  catTextHealth: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.buttonSecondary.outlineText,
  },
});

export default React.memo(HomeDiscoveryHub);
