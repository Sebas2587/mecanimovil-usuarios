import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

import { ROUTES } from '../../utils/constants';
import { H_PAD } from '../../components/home/shared/homeLayoutConstants';
import { navigateCrearSolicitudConProveedor } from '../../components/home/shared/homeScheduleNavigation';
import { useExploreProviders } from '../../hooks/useExploreProviders';
import {
  ExploreProvidersTabs,
  ExploreProvidersGrid,
  ExploreModeSegment,
  ExploreSearchBar,
  EXPLORE_TAB_ALL,
  EXPLORE_MODE_CERCA,
  EXPLORE_MODE_PARA_TI,
  filterProvidersByExploreTab,
} from '../../components/providers/explore';
import {
  EXPLORE_MODE_SEGMENTS_CATEGORY,
  EXPLORE_MODE_SEGMENTS_HOME,
} from '../../components/providers/explore/exploreProvidersConstants';
import { COLORS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';

/**
 * Explorar proveedores: segmento, búsqueda, categoría y agendar desde la card.
 */
const ExploreProvidersScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const vehicle = route.params?.vehicle ?? null;
  const address = route.params?.address ?? null;
  const categoryId = route.params?.categoryId ?? null;
  const categoryName = route.params?.categoryName ?? null;

  const initialMode =
    route.params?.mode === EXPLORE_MODE_PARA_TI ? EXPLORE_MODE_PARA_TI : EXPLORE_MODE_CERCA;
  const [exploreMode, setExploreMode] = useState(initialMode);
  const [activeTab, setActiveTab] = useState(route.params?.initialTab ?? EXPLORE_TAB_ALL);
  const [searchQuery, setSearchQuery] = useState(route.params?.searchQuery ?? '');

  useEffect(() => {
    setExploreMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (route.params?.initialTab) setActiveTab(route.params.initialTab);
  }, [route.params?.initialTab]);

  const isParaTi = exploreMode === EXPLORE_MODE_PARA_TI;
  const needsAddress = !isParaTi && !categoryId;

  const {
    providers,
    isLoading,
    isRefetching,
    refetch,
    hasCategory,
  } = useExploreProviders({
    mode: exploreMode,
    vehicle,
    address,
    categoryId,
    searchQuery,
    enabled: !!vehicle && (!needsAddress || !!address),
  });

  const filteredProviders = useMemo(
    () => filterProvidersByExploreTab(providers, activeTab),
    [providers, activeTab],
  );

  const tabCounts = useMemo(
    () => ({
      all: providers.length,
      taller: providers.filter((p) => p._panelKind === 'taller').length,
      mecanico: providers.filter((p) => p._panelKind === 'mecanico').length,
    }),
    [providers],
  );

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

  const scheduleProvider = useCallback(
    (item) => {
      if (!vehicle?.id || !item?.id) return;
      navigateCrearSolicitudConProveedor(navigation, { vehicle, provider: item });
    },
    [navigation, vehicle],
  );

  const showList = !!vehicle && (isParaTi || !!address || hasCategory);
  const modeSegments = categoryId ? EXPLORE_MODE_SEGMENTS_CATEGORY : EXPLORE_MODE_SEGMENTS_HOME;

  const screenTitle = categoryName
    ? categoryName
    : isParaTi
      ? 'Destacados para ti'
      : 'Cerca de ti';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.body}>
        <Text style={styles.screenTitle}>{screenTitle}</Text>

        <ExploreModeSegment
          value={exploreMode}
          onChange={setExploreMode}
          segments={modeSegments}
          style={styles.segment}
        />

        {needsAddress && !address ? (
          <Text style={styles.hintWarn}>
            Elige una dirección en el inicio para ver proveedores cercanos.
          </Text>
        ) : null}

        {showList ? (
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
              providers={filteredProviders}
              loading={isLoading}
              refreshing={isRefetching}
              onRefresh={refetch}
              onProviderPress={openProvider}
              onSchedulePress={scheduleProvider}
              emptyTitle={searchQuery.trim() ? 'Sin resultados' : 'Sin proveedores'}
              emptyMessage={
                searchQuery.trim()
                  ? 'Prueba otro término.'
                  : 'Amplía la zona o cambia el modo de orden.'
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
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  segment: {
    marginBottom: 12,
  },
  hintWarn: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.warning.dark,
    marginBottom: 12,
    lineHeight: 18,
  },
});

export default ExploreProvidersScreen;
