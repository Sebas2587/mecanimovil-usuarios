import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

import { ROUTES } from '../../utils/constants';
import { H_PAD } from '../../components/home/shared/homeLayoutConstants';
import { useExploreProviders } from '../../hooks/useExploreProviders';
import {
  ExploreProvidersTabs,
  ExploreProvidersGrid,
  ExploreSearchBar,
  EXPLORE_TAB_ALL,
  EXPLORE_TAB_TALLER,
  EXPLORE_TAB_MECANICO,
  filterProvidersByExploreTab,
} from '../../components/providers/explore';
import { splitProvidersByRadar } from '../../utils/exploreProviderUtils';
import { COLORS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';

/**
 * Explorar proveedores: búsqueda, tabs underline y dos bloques (zona / fuera del radar).
 */
const ExploreProvidersScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const vehicle = route.params?.vehicle ?? null;
  const address = route.params?.address ?? null;
  const categoryId = route.params?.categoryId ?? null;
  const categoryName = route.params?.categoryName ?? null;

  const [activeTab, setActiveTab] = useState(route.params?.initialTab ?? EXPLORE_TAB_ALL);
  const [searchQuery, setSearchQuery] = useState(route.params?.searchQuery ?? '');

  useEffect(() => {
    if (route.params?.initialTab) setActiveTab(route.params.initialTab);
  }, [route.params?.initialTab]);

  const {
    providers,
    isLoading,
    isRefetching,
    refetch,
    hasAddress,
  } = useExploreProviders({
    vehicle,
    address,
    categoryId,
    searchQuery,
    enabled: !!vehicle,
  });

  const tabProviders = useMemo(
    () => filterProvidersByExploreTab(providers, activeTab),
    [providers, activeTab],
  );

  const { inRadar, outOfRadar } = useMemo(
    () => splitProvidersByRadar(tabProviders),
    [tabProviders],
  );

  const tabCounts = useMemo(() => {
    const countForTab = (tabId) => {
      const list = filterProvidersByExploreTab(providers, tabId);
      return list.length;
    };
    return {
      all: countForTab(EXPLORE_TAB_ALL),
      taller: countForTab(EXPLORE_TAB_TALLER),
      mecanico: countForTab(EXPLORE_TAB_MECANICO),
    };
  }, [providers]);

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
  hintWarn: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.warning.dark,
    marginBottom: 12,
    lineHeight: 18,
  },
});

export default ExploreProvidersScreen;
