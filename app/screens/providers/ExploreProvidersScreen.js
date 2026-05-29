import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

import { ROUTES } from '../../utils/constants';
import { H_PAD } from '../../components/home/shared/homeLayoutConstants';
import { useExploreProviders } from '../../hooks/useExploreProviders';
import { useExploreProvidersParaTi } from '../../hooks/useExploreProvidersParaTi';
import { useExploreProvidersNearby } from '../../hooks/useExploreProvidersNearby';
import {
  ExploreProvidersTabs,
  ExploreProvidersGrid,
  ExploreSearchBar,
  EXPLORE_TAB_ALL,
  EXPLORE_TAB_TALLER,
  EXPLORE_TAB_MECANICO,
  filterProvidersByExploreTab,
  EXPLORE_MODE_CERCA,
  EXPLORE_MODE_PARA_TI,
} from '../../components/providers/explore';
import { filterProvidersBySearchQuery, splitProvidersByRadar } from '../../utils/exploreProviderUtils';
import { COLORS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';

/**
 * Explorar proveedores según modo (OpenSpec fase 3):
 * - para_ti: especialistas en la marca por KPI (Ver todos Destacados)
 * - cerca: especialistas + multimarca por distancia (Ver todos Cerca)
 * - con categoría: listado unificado filtrado por servicios
 */
const ExploreProvidersScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const vehicle = route.params?.vehicle ?? null;
  const address = route.params?.address ?? null;
  const categoryId = route.params?.categoryId ?? null;
  const categoryName = route.params?.categoryName ?? null;
  const mode = route.params?.mode ?? null;

  const [activeTab, setActiveTab] = useState(route.params?.initialTab ?? EXPLORE_TAB_ALL);
  const [searchQuery, setSearchQuery] = useState(route.params?.searchQuery ?? '');

  const isParaTiExplore = mode === EXPLORE_MODE_PARA_TI && !categoryId;
  const isCercaExplore = mode === EXPLORE_MODE_CERCA;
  const isUnifiedExplore = !isParaTiExplore && !isCercaExplore;

  useEffect(() => {
    if (route.params?.initialTab) setActiveTab(route.params.initialTab);
  }, [route.params?.initialTab]);

  const unifiedQuery = useExploreProviders({
    vehicle,
    address,
    categoryId,
    searchQuery: isUnifiedExplore ? searchQuery : '',
    enabled: !!vehicle && isUnifiedExplore,
  });

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

  const rawProviders = useMemo(() => {
    if (isParaTiExplore) {
      const data = paraTiQuery.data ?? [];
      return filterProvidersBySearchQuery(Array.isArray(data) ? data : [], searchQuery);
    }
    if (isCercaExplore) {
      const data = nearbyQuery.data ?? [];
      return filterProvidersBySearchQuery(Array.isArray(data) ? data : [], searchQuery);
    }
    return unifiedQuery.providers;
  }, [
    isParaTiExplore,
    isCercaExplore,
    paraTiQuery.data,
    nearbyQuery.data,
    unifiedQuery.providers,
    searchQuery,
  ]);

  const isLoading = isParaTiExplore
    ? paraTiQuery.isLoading
    : isCercaExplore
      ? nearbyQuery.isLoading
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

  const tabProviders = useMemo(
    () => filterProvidersByExploreTab(rawProviders, activeTab),
    [rawProviders, activeTab],
  );

  const { inRadar, outOfRadar } = useMemo(() => {
    if (isCercaExplore) {
      return { inRadar: tabProviders, outOfRadar: [] };
    }
    return splitProvidersByRadar(tabProviders);
  }, [tabProviders, isCercaExplore]);

  const tabCounts = useMemo(() => {
    const countForTab = (tabId) => {
      const list = filterProvidersByExploreTab(rawProviders, tabId);
      return list.length;
    };
    return {
      all: countForTab(EXPLORE_TAB_ALL),
      taller: countForTab(EXPLORE_TAB_TALLER),
      mecanico: countForTab(EXPLORE_TAB_MECANICO),
    };
  }, [rawProviders]);

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

  const screenTitle = useMemo(() => {
    if (isParaTiExplore) return 'Destacados';
    if (isCercaExplore) return 'Cerca de ti';
    if (categoryName) return categoryName;
    return 'Explorar';
  }, [isParaTiExplore, isCercaExplore, categoryName]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.body}>
        <Text style={styles.screenTitle}>{screenTitle}</Text>
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
              placeholder={categoryName ? `Buscar en ${categoryName}…` : 'Buscar taller…'}
            />
            <ExploreProvidersTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              counts={tabCounts}
            />
            <ExploreProvidersGrid
              inRadar={inRadar}
              outOfRadar={outOfRadar}
              loading={isLoading}
              refreshing={isRefetching}
              onRefresh={refetch}
              onProviderPress={openProvider}
              emptyTitle={searchQuery.trim() ? 'Sin resultados' : 'Sin proveedores'}
              emptyMessage={
                searchQuery.trim()
                  ? 'Prueba otro término.'
                  : isParaTiExplore
                    ? 'No hay especialistas en la marca de tu vehículo.'
                    : isCercaExplore
                      ? 'No hay especialistas ni multimarca compatibles en tu radio.'
                      : 'Amplía la zona o cambia de pestaña.'
              }
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
  screenTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  hintWarn: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.warning.dark,
    marginBottom: 12,
    lineHeight: 18,
  },
});

export default ExploreProvidersScreen;
