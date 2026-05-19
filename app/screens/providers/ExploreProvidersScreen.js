import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MapPin } from 'lucide-react-native';

import { ROUTES } from '../../utils/constants';
import { COLORS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';
import { H_PAD } from '../../components/home/shared/homeLayoutConstants';
import { useExploreProviders } from '../../hooks/useExploreProviders';
import AddressSelectionModal from '../../components/location/AddressSelectionModal';
import {
  ExploreProvidersTabs,
  ExploreProvidersLocationBar,
  ExploreProvidersGrid,
  EXPLORE_TAB_ALL,
  EXPLORE_MODE_CERCA,
  EXPLORE_MODE_PARA_TI,
  filterProvidersByExploreTab,
} from '../../components/providers/explore';

/**
 * Listado completo de proveedores: modo cerca (distancia) o para_ti (KPI + marca).
 */
const ExploreProvidersScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const vehicle = route.params?.vehicle ?? null;
  const mode = route.params?.mode === EXPLORE_MODE_PARA_TI ? EXPLORE_MODE_PARA_TI : EXPLORE_MODE_CERCA;
  const isParaTi = mode === EXPLORE_MODE_PARA_TI;
  const initialTab = route.params?.initialTab ?? EXPLORE_TAB_ALL;

  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedAddress, setSelectedAddress] = useState(route.params?.address ?? null);
  const [addressModalOpen, setAddressModalOpen] = useState(false);

  useEffect(() => {
    if (route.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route.params?.initialTab]);

  useEffect(() => {
    if (route.params?.address) {
      setSelectedAddress(route.params.address);
    }
  }, [route.params?.address]);

  const needsAddress = !isParaTi;

  const {
    providers,
    isLoading,
    isRefetching,
    refetch,
  } = useExploreProviders({
    mode,
    vehicle,
    address: selectedAddress,
    enabled: !!vehicle && (!needsAddress || !!selectedAddress),
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

  const handleSelectAddress = useCallback((addr) => {
    if (addr) setSelectedAddress(addr);
    setAddressModalOpen(false);
  }, []);

  const showLocationBar = isParaTi ? !!selectedAddress : true;
  const showMainList = isParaTi ? !!vehicle : !!selectedAddress;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.body}>
        {showLocationBar && selectedAddress ? (
          <ExploreProvidersLocationBar
            selectedAddress={selectedAddress}
            vehicleLabel={vehicleLabel}
            onPressChangeAddress={() => setAddressModalOpen(true)}
          />
        ) : needsAddress && !selectedAddress ? (
          <View style={styles.noAddressBox}>
            <MapPin size={28} color={COLORS.primary[500]} />
            <Text style={styles.noAddressTitle}>Elige dónde necesitas el servicio</Text>
            <Text style={styles.noAddressText}>
              Selecciona una dirección para ordenar proveedores por cercanía.
            </Text>
            <TouchableOpacity
              style={styles.noAddressBtn}
              onPress={() => setAddressModalOpen(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.noAddressBtnText}>Seleccionar dirección</Text>
            </TouchableOpacity>
          </View>
        ) : isParaTi && vehicle ? (
          <Text style={styles.paraTiBanner}>
            Especialistas destacados para tu vehículo · ordenados por desempeño
          </Text>
        ) : null}

        {showMainList ? (
          <>
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
                activeTab === EXPLORE_TAB_ALL
                  ? isParaTi
                    ? 'Sin destacados para tu marca'
                    : 'No hay proveedores en esta zona'
                  : 'Nada en esta categoría'
              }
              emptyMessage={
                isParaTi
                  ? 'Cuando haya talleres o mecánicos con buen desempeño para tu marca, aparecerán aquí.'
                  : 'Prueba otra dirección o crea una solicitud desde el inicio.'
              }
            />
          </>
        ) : null}
      </View>

      <AddressSelectionModal
        visible={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        variant="default"
        heroSubtitle={
          isParaTi
            ? 'Opcional: muestra distancia aproximada en las fichas.'
            : 'Usamos tu ubicación para ordenar proveedores de más cercano a más lejano.'
        }
        currentAddress={selectedAddress}
        onSelectAddress={handleSelectAddress}
      />
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
  paraTiBanner: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  noAddressBox: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    gap: 10,
  },
  noAddressTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  noAddressText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  noAddressBtn: {
    marginTop: 8,
    backgroundColor: COLORS.primary[500],
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
  },
  noAddressBtnText: {
    color: COLORS.text.inverse,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontSize: TYPOGRAPHY.fontSize.base,
  },
});

export default ExploreProvidersScreen;
