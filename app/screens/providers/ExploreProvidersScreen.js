import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';

import { ROUTES } from '../../utils/constants';
import { H_PAD } from '../../components/home/shared/homeLayoutConstants';
import { useExploreProviders } from '../../hooks/useExploreProviders';
import { useExploreProvidersParaTi } from '../../hooks/useExploreProvidersParaTi';
import { useExploreProvidersNearby } from '../../hooks/useExploreProvidersNearby';
import {
  ExploreProvidersTabs,
  ExploreSearchBar,
  ExploreProvidersGrid,
  EXPLORE_FILTER_ALL,
  EXPLORE_MODE_CERCA,
  EXPLORE_MODE_PARA_TI,
} from '../../components/providers/explore';
import {
  filterProvidersBySearchQuery,
  filterProvidersByServicioIds,
  splitProvidersByRadar,
  normalizeDistanceKm,
} from '../../utils/exploreProviderUtils';
import { getMainCategories, getServicesByCategory, normalizeApiList } from '../../services/categories';
import { COLORS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';

/**
 * Explorar proveedores — filtro por categoría de servicio (no taller/domicilio).
 */
const ExploreProvidersScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const vehicle = route.params?.vehicle ?? null;
  const address = route.params?.address ?? null;
  const routeCategoryId = route.params?.categoryId ?? null;
  const categoryName = route.params?.categoryName ?? null;
  const mode = route.params?.mode ?? null;
  const userBrandName = vehicle?.marca_nombre || vehicle?.marca || null;

  const initialFilter =
    routeCategoryId != null
      ? String(routeCategoryId)
      : route.params?.initialTab && route.params.initialTab !== 'taller' && route.params.initialTab !== 'mecanico'
        ? String(route.params.initialTab)
        : EXPLORE_FILTER_ALL;

  const [activeFilter, setActiveFilter] = useState(initialFilter);
  const [searchQuery, setSearchQuery] = useState(route.params?.searchQuery ?? '');

  const isParaTiExplore = mode === EXPLORE_MODE_PARA_TI && !routeCategoryId;
  const isCercaExplore = mode === EXPLORE_MODE_CERCA;
  const isUnifiedExplore = !isParaTiExplore && !isCercaExplore;

  const filterCategoryId =
    activeFilter === EXPLORE_FILTER_ALL ? null : Number(activeFilter) || null;

  useEffect(() => {
    if (routeCategoryId != null) {
      setActiveFilter(String(routeCategoryId));
    }
  }, [routeCategoryId]);

  const categoriesQuery = useQuery({
    queryKey: ['mainCategories'],
    queryFn: getMainCategories,
    staleTime: 1000 * 60 * 60,
  });
  const categories = useMemo(
    () => (Array.isArray(categoriesQuery.data) ? categoriesQuery.data : []).slice(0, 10),
    [categoriesQuery.data],
  );

  const unifiedQuery = useExploreProviders({
    vehicle,
    address,
    categoryId: isUnifiedExplore ? filterCategoryId : null,
    searchQuery: isUnifiedExplore ? searchQuery : '',
    enabled: !!vehicle && isUnifiedExplore,
  });

  const categoryExploreEmpty =
    isUnifiedExplore &&
    !!filterCategoryId &&
    !unifiedQuery.isLoading &&
    (unifiedQuery.categoryHasNoServices || unifiedQuery.providers.length === 0);

  const paraTiQuery = useExploreProvidersParaTi({
    vehicle,
    address,
    enabled: !!vehicle && isParaTiExplore,
  });

  const nearbyQuery = useExploreProvidersNearby({
    vehicle,
    address,
    enabled: !!vehicle && isCercaExplore,
  });

  /** Servicios de la categoría activa — solo para filtrar listados Para ti / Cerca en cliente. */
  const panelCategoryServicesQuery = useQuery({
    queryKey: ['exploreCategoryServices', filterCategoryId],
    queryFn: () => getServicesByCategory(filterCategoryId),
    enabled: !!filterCategoryId && (isParaTiExplore || isCercaExplore),
    staleTime: 1000 * 60 * 30,
  });

  const panelServicioIds = useMemo(() => {
    const list = normalizeApiList(panelCategoryServicesQuery.data);
    return list.map((s) => s.id).filter(Boolean);
  }, [panelCategoryServicesQuery.data]);

  const rawProviders = useMemo(() => {
    if (isParaTiExplore) {
      const data = paraTiQuery.data ?? [];
      let list = filterProvidersBySearchQuery(Array.isArray(data) ? data : [], searchQuery);
      if (filterCategoryId && panelServicioIds.length) {
        list = filterProvidersByServicioIds(list, panelServicioIds);
      }
      return list;
    }
    if (isCercaExplore) {
      const data = nearbyQuery.data ?? [];
      let list = filterProvidersBySearchQuery(Array.isArray(data) ? data : [], searchQuery);
      if (filterCategoryId && panelServicioIds.length) {
        list = filterProvidersByServicioIds(list, panelServicioIds);
      }
      return list;
    }
    return unifiedQuery.providers;
  }, [
    isParaTiExplore,
    isCercaExplore,
    paraTiQuery.data,
    nearbyQuery.data,
    unifiedQuery.providers,
    searchQuery,
    filterCategoryId,
    panelServicioIds,
  ]);

  const isLoading = isParaTiExplore
    ? paraTiQuery.isLoading || (!!filterCategoryId && panelCategoryServicesQuery.isLoading)
    : isCercaExplore
      ? nearbyQuery.isLoading || (!!filterCategoryId && panelCategoryServicesQuery.isLoading)
      : unifiedQuery.isLoading;

  const isRefetching = isParaTiExplore
    ? paraTiQuery.isRefetching
    : isCercaExplore
      ? nearbyQuery.isRefetching
      : unifiedQuery.isRefetching;

  const refetch = isParaTiExplore
    ? paraTiQuery.refetch
    : isCercaExplore
      ? nearbyQuery.refetch
      : unifiedQuery.refetch;

  const hasAddress = isParaTiExplore || isCercaExplore ? !!address : unifiedQuery.hasAddress;

  const { inRadar, outOfRadar, noLocation } = useMemo(() => {
    if (isCercaExplore) {
      const withKm = rawProviders.filter((p) => normalizeDistanceKm(p) != null);
      return { inRadar: withKm, outOfRadar: [], noLocation: [] };
    }
    return splitProvidersByRadar(rawProviders);
  }, [rawProviders, isCercaExplore]);

  const openProvider = useCallback(
    (item) => {
      if (!item?.id) return;
      const tipo = item._panelKind === 'taller' ? 'taller' : 'mecanico';
      navigation.navigate(ROUTES.PROVIDER_DETAIL, {
        providerId: item.id,
        type: tipo,
        providerType: tipo,
        provider: item,
        vehicle: vehicle ?? undefined,
      });
    },
    [navigation, vehicle],
  );

  const activeCategoryName = useMemo(() => {
    if (!filterCategoryId) return categoryName;
    const cat = categories.find((c) => String(c.id) === String(filterCategoryId));
    return cat?.nombre || categoryName;
  }, [filterCategoryId, categories, categoryName]);

  const emptyTitle = searchQuery.trim() ? 'Sin resultados' : 'Sin proveedores';
  const emptyMessage = searchQuery.trim()
    ? 'Prueba otro término.'
    : isParaTiExplore
      ? filterCategoryId
        ? 'Ningún destacado ofrece servicios de esta categoría para tu vehículo.'
        : 'Aún no hay talleres destacados para tu marca.'
      : isCercaExplore
        ? filterCategoryId
          ? 'No hay talleres cercanos con esta categoría. Prueba otra o cambia de dirección.'
          : 'No hay talleres compatibles en tu radio. Prueba otra dirección.'
        : categoryExploreEmpty
          ? unifiedQuery.categoryHasNoServices
            ? 'No hay servicios catalogados para esta categoría.'
            : 'Ningún proveedor cercano ofrece servicios de esta categoría para tu vehículo.'
          : 'Amplía la zona o cambia de categoría.';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.body}>
        {!hasAddress ? (
          <Text style={styles.hintWarn}>
            Agrega una dirección en el inicio para ordenar por cercanía y ver quién está en tu zona.
          </Text>
        ) : null}

        {vehicle ? (
          <>
            <ExploreSearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={
                activeCategoryName
                  ? `Buscar en ${activeCategoryName}…`
                  : 'Buscar taller…'
              }
            />
            <ExploreProvidersTabs
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              categories={categories}
              allCount={
                activeFilter === EXPLORE_FILTER_ALL && !isLoading
                  ? rawProviders.length
                  : null
              }
            />
            <ExploreProvidersGrid
              inRadar={inRadar}
              outOfRadar={outOfRadar}
              noLocation={noLocation}
              loading={isLoading}
              refreshing={isRefetching}
              onRefresh={refetch}
              onProviderPress={openProvider}
              userBrandName={userBrandName}
              emptyTitle={emptyTitle}
              emptyMessage={emptyMessage}
            />
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  body: {
    flex: 1,
    paddingHorizontal: H_PAD,
    paddingTop: SPACING.sm,
  },
  hintWarn: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.warning.dark,
    marginBottom: SPACING.sm,
    lineHeight: 18,
  },
});

export default ExploreProvidersScreen;
