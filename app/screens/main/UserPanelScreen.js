import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, RefreshControl, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { ROUTES } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { useSolicitudes } from '../../context/SolicitudesContext';
import { getUserVehicles } from '../../services/vehicle';
import VehicleHealthService from '../../services/vehicleHealthService';
import { useUnreadCount } from '../../hooks/useNotifications';
import { usePendingReviews } from '../../hooks/usePendingReviews';
import { useVehiclesHealth } from '../../hooks/useVehicles';
import { useUserAddresses } from '../../hooks/useAddress';
import AddressSelectionModal from '../../components/location/AddressSelectionModal';
import {
  getHealthColorToken,
  hasVehicleHealthData,
  resolveVehicleHealthPct,
} from '../../utils/healthFormat';
import { solicitudVisibleParaVehiculoDashboard } from '../../utils/solicitudVehicle';
import UserPanelSkeleton from '../../components/utils/UserPanelSkeleton';
import { useParaTiProviders } from '../../hooks/useParaTiProviders';
import { useMarketActivityForVehicle } from '../../hooks/useMarketActivityForVehicle';
import { navigateCrearSolicitudDesdeHome, navigateCrearSolicitudDesdeTrending } from '../../components/home/shared/homeScheduleNavigation';
import {
  HomeContextHeader,
  HomeCategoryGrid,
  HomeContextualBanner,
  HomePendingReviewBanner,
  HomeHighlightedRow,
  HomeMarketActivitySection,
  HomeVehicleSelectorModal,
} from '../../components/home/discovery';
import VehicleValueTeaserCard from '../../components/vehicle/VehicleValueTeaserCard';
import { EXPLORE_MODE_PARA_TI } from '../../components/providers/explore';
import { useTripTracking } from '../../context/TripTrackingContext';
import { TRIP_ACTIVE_BAR_HEIGHT, TRIP_ACTIVE_BAR_GAP } from '../../components/trip/TripActiveBar';
import { H_PAD, TAB_BAR_BASE_HEIGHT, SCROLL_BOTTOM_GAP } from '../../components/home/shared/homeLayoutConstants';
import { COLORS } from '../../design-system/tokens';

const UserPanelScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { solicitudesActivas, cargarSolicitudesActivas } = useSolicitudes();
  const { data: unreadData } = useUnreadCount();
  const unreadCount = typeof unreadData === 'number' ? unreadData : (unreadData?.count || 0);
  const { data: pendingReviews = [], refetch: refetchPendingReviews } = usePendingReviews();
  const pendingReviewCount = pendingReviews.length;

  useFocusEffect(
    useCallback(() => {
      cargarSolicitudesActivas();
    }, [cargarSolicitudesActivas]),
  );

  useFocusEffect(
    useCallback(() => {
      refetchPendingReviews();
    }, [refetchPendingReviews]),
  );

  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [addAddressModalOpen, setAddAddressModalOpen] = useState(false);

  const {
    data: vehiclesRaw,
    isLoading: vehiclesLoading,
    isPending: vehiclesPending,
    refetch: refetchVehicles,
    isRefetching,
  } = useQuery({
    queryKey: ['userVehicles', user?.id ?? 'anon'],
    queryFn: getUserVehicles,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: true,
    select: useCallback((d) => (Array.isArray(d) ? d : d?.results || []), []),
  });

  const vehicles = useMemo(() => vehiclesRaw || [], [vehiclesRaw]);
  const vehiclesHealth = useVehiclesHealth(vehicles);
  const showUserPanelSkeleton = vehiclesPending;

  useEffect(() => {
    if (Platform.OS === 'web') refetchVehicles();
  }, [refetchVehicles]);

  useEffect(() => {
    if (vehicles.length > 0 && !selectedVehicleId) {
      setSelectedVehicleId(vehicles[0].id);
    }
    if (vehicles.length > 0 && selectedVehicleId) {
      const exists = vehicles.some((v) => v.id === selectedVehicleId);
      if (!exists) setSelectedVehicleId(vehicles[0].id);
    }
  }, [vehicles, selectedVehicleId]);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) || null,
    [vehicles, selectedVehicleId],
  );

  const openNuevaSolicitud = useCallback(() => {
    if (!selectedVehicle) return;
    navigateCrearSolicitudDesdeHome(navigation, { vehicle: selectedVehicle });
  }, [navigation, selectedVehicle]);

  const vehiclesCategoryKey = useMemo(
    () =>
      vehicles
        .map((v) => v?.id)
        .filter(Boolean)
        .sort((a, b) => a - b)
        .join(','),
    [vehicles],
  );

  useEffect(() => {
    if (!selectedVehicle?.id) return;
    const vid = selectedVehicle.id;
    const { getServicesByVehiculo } = require('../../services/service');
    const { getMainCategoriesForUserVehicles } = require('../../services/categories');
    queryClient.prefetchQuery({
      queryKey: ['vehicleServices', vid],
      queryFn: () => getServicesByVehiculo(vid),
      staleTime: 1000 * 60 * 5,
    });
    if (vehiclesCategoryKey) {
      queryClient.prefetchQuery({
        queryKey: ['mainCategoriesForVehicles', vehiclesCategoryKey],
        queryFn: () => getMainCategoriesForUserVehicles(vehicles),
        staleTime: 1000 * 60 * 15,
      });
    }
    queryClient.prefetchQuery({
      queryKey: ['vehicleHealth', vid],
      queryFn: () => VehicleHealthService.getVehicleHealthWithPatches(vid, true),
      staleTime: 1000 * 60 * 2,
    });
  }, [selectedVehicle?.id, vehiclesCategoryKey, vehicles, queryClient]);

  const selectedHealthRow = useMemo(() => {
    if (!selectedVehicleId || !vehiclesHealth.data?.length) return null;
    return vehiclesHealth.data.find((h) => h.vehicleId === selectedVehicleId) ?? null;
  }, [selectedVehicleId, vehiclesHealth.data]);

  const selectedHealthSummary = selectedHealthRow?.health ?? null;

  const healthAvailable = useMemo(
    () => hasVehicleHealthData(selectedVehicle, selectedHealthSummary),
    [selectedVehicle, selectedHealthSummary],
  );

  const healthLoading = useMemo(() => {
    if (!selectedVehicle?.id) return false;
    return selectedHealthRow?.isLoading === true && !healthAvailable;
  }, [selectedVehicle?.id, selectedHealthRow?.isLoading, healthAvailable]);

  const healthScore = useMemo(() => {
    if (!healthAvailable) return null;
    return resolveVehicleHealthPct(selectedVehicle, selectedHealthSummary);
  }, [healthAvailable, selectedVehicle, selectedHealthSummary]);

  const healthScoreColor = useMemo(
    () => (healthScore != null ? getHealthColorToken(COLORS, healthScore) : null),
    [healthScore],
  );

  const openVehicleHealth = useCallback(() => {
    if (!selectedVehicle) return;
    navigation.navigate(ROUTES.VEHICLE_HEALTH, {
      vehicleId: selectedVehicle.id,
      vehicle: selectedVehicle,
    });
  }, [navigation, selectedVehicle]);

  const { setSelectedVehicleId: setTripVehicleId, tripActive } = useTripTracking();

  useEffect(() => {
    if (!selectedVehicleId || !user?.id) return;
    queryClient.setQueryData(['panelSelectedVehicleId', user.id], selectedVehicleId);
    setTripVehicleId(selectedVehicleId);
  }, [selectedVehicleId, user?.id, setTripVehicleId, queryClient]);

  const activeSolicitudesCount = useMemo(() => {
    if (!Array.isArray(solicitudesActivas)) return 0;
    const vid = selectedVehicle?.id ?? null;
    return solicitudesActivas.filter((s) => solicitudVisibleParaVehiculoDashboard(s, vid)).length;
  }, [solicitudesActivas, selectedVehicle?.id]);

  const firstVisibleSolicitud = useMemo(() => {
    if (!Array.isArray(solicitudesActivas) || activeSolicitudesCount === 0) return null;
    const vid = selectedVehicle?.id ?? null;
    return solicitudesActivas.find((s) => solicitudVisibleParaVehiculoDashboard(s, vid)) ?? null;
  }, [solicitudesActivas, activeSolicitudesCount, selectedVehicle?.id]);

  const { data: userAddresses } = useUserAddresses();
  const addressList = useMemo(
    () => (Array.isArray(userAddresses) ? userAddresses : []),
    [userAddresses],
  );

  useEffect(() => {
    if (addressList.length > 0 && !selectedAddressId) {
      const principal = addressList.find((a) => a.es_principal);
      setSelectedAddressId(principal ? principal.id : addressList[0].id);
    }
  }, [addressList, selectedAddressId]);

  const selectedAddress = useMemo(
    () => addressList.find((a) => a.id === selectedAddressId) || null,
    [addressList, selectedAddressId],
  );

  const {
    data: panelParaTiProviders = [],
    isLoading: panelParaTiLoading,
    refetch: refetchPanelParaTi,
  } = useParaTiProviders({
    vehicle: selectedVehicle,
    address: selectedAddress,
    enabled: !!selectedVehicle?.id,
  });

  const {
    data: marketActivity,
    isLoading: marketActivityLoading,
    refetch: refetchMarketActivity,
  } = useMarketActivityForVehicle(selectedVehicle, {
    limit: 12,
    enabled: !!selectedVehicle?.id,
  });

  const openProviderFromPanel = useCallback(
    (item) => {
      if (!item?.id) return;
      const tipo = item._panelKind === 'taller' ? 'taller' : 'mecanico';
      navigation.navigate(ROUTES.PROVIDER_DETAIL, {
        providerId: item.id,
        type: tipo,
        providerType: tipo,
        provider: item,
        vehicle: selectedVehicle ?? undefined,
      });
    },
    [navigation, selectedVehicle],
  );

  const openExplore = useCallback(
    (params = {}) => {
      if (!selectedVehicle) return;
      navigation.navigate(ROUTES.EXPLORE_PROVIDERS, {
        vehicle: selectedVehicle,
        address: selectedAddress ?? undefined,
        initialTab: 'all',
        ...params,
      });
    },
    [navigation, selectedVehicle, selectedAddress],
  );

  const handleSeeAllParaTi = useCallback(() => {
    openExplore({ mode: EXPLORE_MODE_PARA_TI });
  }, [openExplore]);

  const handleMarketServicePress = useCallback(
    (row) => {
      if (!selectedVehicle?.id || !row) return;
      navigateCrearSolicitudDesdeTrending(navigation, {
        vehicle: selectedVehicle,
        row,
      });
    },
    [navigation, selectedVehicle],
  );

  const handleCategorySelect = useCallback(
    (cat) => {
      if (!selectedVehicle || !cat?.id) return;
      openExplore({
        mode: EXPLORE_MODE_PARA_TI,
        categoryId: cat.id,
        categoryName: cat.nombre,
      });
    },
    [selectedVehicle, openExplore],
  );

  const onRefresh = useCallback(async () => {
    const extras = [];
    if (selectedVehicle?.id) {
      extras.push(refetchPanelParaTi());
      extras.push(refetchMarketActivity());
      extras.push(
        queryClient.invalidateQueries({ queryKey: ['vehicleValorReal', selectedVehicle.id] }),
      );
    }
    await Promise.all([
      refetchVehicles(),
      queryClient.invalidateQueries({ queryKey: ['vehicleHealth'] }),
      cargarSolicitudesActivas(),
      ...extras,
    ]);
  }, [
    refetchVehicles,
    queryClient,
    cargarSolicitudesActivas,
    selectedVehicle?.id,
    refetchPanelParaTi,
    refetchMarketActivity,
  ]);

  if (showUserPanelSkeleton) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        <UserPanelSkeleton tabBarHeight={TAB_BAR_BASE_HEIGHT + insets.bottom} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <ScrollView
        style={styles.scrollViewFlex}
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + 12,
            paddingBottom:
              TAB_BAR_BASE_HEIGHT
              + insets.bottom
              + SCROLL_BOTTOM_GAP
              + (tripActive ? TRIP_ACTIVE_BAR_HEIGHT + TRIP_ACTIVE_BAR_GAP : 0),
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={COLORS.primary[500]}
          />
        }
      >
        <HomeContextHeader
          selectedVehicle={selectedVehicle}
          vehiclesLoading={vehiclesLoading}
          healthScore={healthScore}
          healthScoreColor={healthScoreColor}
          healthLoading={healthLoading}
          healthAvailable={healthAvailable}
          onPressHealth={openVehicleHealth}
          onOpenVehicleSelector={() => setSelectorVisible(true)}
          onAddVehicle={() => navigation.navigate(ROUTES.CREAR_VEHICULO)}
          hasAddresses={addressList.length > 0}
          selectedAddress={selectedAddress}
          onPressSelectAddress={() => setAddAddressModalOpen(true)}
          unreadCount={unreadCount}
          onPressNotifications={() => navigation.navigate(ROUTES.NOTIFICATION_CENTER)}
        />

        <HomePendingReviewBanner
          count={pendingReviewCount}
          onPress={() =>
            navigation.navigate(ROUTES.PROFILE, { screen: ROUTES.PENDING_REVIEWS })
          }
        />

        <HomeCategoryGrid
          vehicles={vehicles}
          disabled={!selectedVehicle}
          onSelectCategory={handleCategorySelect}
        />

        <VehicleValueTeaserCard vehicle={selectedVehicle} healthScore={healthScore} />

        <HomeContextualBanner
          solicitud={firstVisibleSolicitud}
          healthScore={healthScore}
          onPressSolicitud={() => navigation.navigate(ROUTES.ACTIVIDAD)}
          onPressAgendar={openNuevaSolicitud}
          onPressHealth={openVehicleHealth}
        />

        <HomeHighlightedRow
          selectedVehicle={selectedVehicle}
          hasSelectedAddress={!!selectedAddress}
          providers={panelParaTiProviders}
          loading={panelParaTiLoading}
          onProviderPress={openProviderFromPanel}
          onSeeAll={handleSeeAllParaTi}
        />

        <HomeMarketActivitySection
          selectedVehicle={selectedVehicle}
          activity={marketActivity}
          loading={marketActivityLoading}
          onSelectService={handleMarketServicePress}
        />
      </ScrollView>

      <HomeVehicleSelectorModal
        visible={selectorVisible}
        vehicles={vehicles}
        selectedVehicleId={selectedVehicleId}
        vehiclesHealthData={vehiclesHealth.data}
        onClose={() => setSelectorVisible(false)}
        onSelectVehicle={(id) => {
          setSelectedVehicleId(id);
          setSelectorVisible(false);
        }}
        onAddVehicle={() => {
          setSelectorVisible(false);
          navigation.navigate(ROUTES.CREAR_VEHICULO);
        }}
        onManageVehicles={() => {
          setSelectorVisible(false);
          navigation.navigate(ROUTES.MY_VEHICLES);
        }}
      />

      <AddressSelectionModal
        visible={addAddressModalOpen}
        onClose={() => setAddAddressModalOpen(false)}
        variant="default"
        heroSubtitle="Elige tu dirección para ver proveedores recomendados cerca."
        currentAddress={selectedAddress}
        onSelectAddress={(savedAddr) => {
          if (savedAddr?.id) setSelectedAddressId(savedAddr.id);
          setAddAddressModalOpen(false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  scrollViewFlex: {
    flex: 1,
    ...(Platform.OS === 'web' ? { overflowX: 'hidden' } : null),
  },
  scroll: {
    paddingHorizontal: H_PAD,
  },
});

export default UserPanelScreen;
