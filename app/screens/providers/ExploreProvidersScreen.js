import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

import { ROUTES } from '../../utils/constants';
import { COLORS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';
import { H_PAD } from '../../components/home/shared/homeLayoutConstants';
import { useExploreProviders } from '../../hooks/useExploreProviders';
import {
  ExploreProvidersTabs,
  ExploreProvidersGrid,
  ExploreModeSegment,
  ExploreAddressHint,
  ExploreSearchBar,
  EXPLORE_TAB_ALL,
  EXPLORE_MODE_CERCA,
  EXPLORE_MODE_PARA_TI,
  filterProvidersByExploreTab,
} from '../../components/providers/explore';

/**
 * Explorar proveedores: segmento Para ti / Cerca, búsqueda, categoría y tipo.
 * La dirección se define solo en el inicio (sin selector duplicado).
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

  const vehicleLabel = vehicle
    ? `${vehicle.marca_nombre || vehicle.marca || ''} ${vehicle.modelo_nombre || vehicle.modelo || ''}`.trim()
    : null;

  const openProvider = useCallback(
    (item) => {
      if (!item?.id) return;
      const tipo = item._panelKind === 'taller' ? 'taller' : 'mecanico';
      navigation.navigate(ROUTES.PROVIDER_DETAIL, {
        providerId: item.id,
        type: tipo,
        providerType: tipo,
        provider: item,
      });
    },
    [navigation],
  );

  const showList = !!vehicle && (isParaTi || !!address || hasCategory);
  const modeHint = isParaTi
    ? 'Ordenados por desempeño y compatibilidad con tu marca'
    : 'Ordenados por distancia desde tu dirección del inicio';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.body}>
        {categoryName ? (
          <Text style={styles.categoryBanner}>
            Categoría: {categoryName}
          </Text>
        ) : null}

        <ExploreModeSegment value={exploreMode} onChange={setExploreMode} />

        <Text style={styles.modeHint}>{modeHint}</Text>

        {address ? (
          <ExploreAddressHint address={address} vehicleLabel={vehicleLabel} />
        ) : needsAddress ? (
          <View style={styles.noAddressBox}>
            <Text style={styles.noAddressTitle}>Falta dirección de servicio</Text>
            <Text style={styles.noAddressText}>
              En «Cerca de ti» usamos la dirección que eliges en el inicio. Vuelve al panel y tócala en la barra superior.
            </Text>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.backBtnText}>Volver al inicio</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {showList ? (
          <>
            <ExploreSearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={
                categoryName
                  ? `Buscar en ${categoryName}…`
                  : 'Buscar taller o servicio…'
              }
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
              emptyTitle={
                searchQuery.trim()
                  ? 'Sin resultados'
                  : isParaTi
                    ? 'Sin destacados'
                    : 'Nada en esta zona'
              }
              emptyMessage={
                searchQuery.trim()
                  ? 'Prueba otro término o cambia entre Para ti y Cerca de ti.'
                  : isParaTi
                    ? 'Aún no hay especialistas con buen desempeño para tu marca en esta búsqueda.'
                    : 'Prueba otra categoría o vuelve al inicio para cambiar la dirección.'
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
  categoryBanner: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  modeHint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginBottom: 8,
    lineHeight: 18,
  },
  noAddressBox: {
    paddingVertical: 24,
    gap: 10,
  },
  noAddressTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  noAddressText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    lineHeight: 22,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: COLORS.primary[500],
  },
  backBtnText: {
    color: COLORS.text.inverse,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});

export default ExploreProvidersScreen;
