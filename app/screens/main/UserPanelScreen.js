import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, RefreshControl, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Wrench, ClipboardList, Store, MessageCircle } from 'lucide-react-native';

import { ROUTES } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { useSolicitudes } from '../../context/SolicitudesContext';
import { getUserVehicles } from '../../services/vehicle';
import VehicleHealthService from '../../services/vehicleHealthService';
import { useUnreadCount } from '../../hooks/useNotifications';
import { useConversationsList } from '../../hooks/useChats';
import { useVehiclesHealth } from '../../hooks/useVehicles';
import { useUserAddresses } from '../../hooks/useAddress';
import { getWeatherPrediction } from '../../services/weatherService';
import { getNearbyProvidersForPanel } from '../../services/providers';
import { getActividadMercadoVehiculo } from '../../services/user';
import { geocodeAddress } from '../../services/location';
import AddressSelectionModal from '../../components/location/AddressSelectionModal';
import { getHealthColorToken, resolveVehicleHealthPct } from '../../utils/healthFormat';
import { solicitudVisibleParaVehiculoDashboard } from '../../utils/solicitudVehicle';
import UserPanelSkeleton from '../../components/utils/UserPanelSkeleton';
import {
  HomeTopBar,
  HomeVehicleSelector,
  HomeVehicleSelectorModal,
  HomeQuickActions,
  HomeParaTiSection,
  HomeNearbySection,
  HomeMarketActivitySection,
} from '../../components/home/discovery';
import { EXPLORE_MODE_CERCA, EXPLORE_MODE_PARA_TI } from '../../components/providers/explore';
import { useParaTiProviders } from '../../hooks/useParaTiProviders';
import { useHomeTripTracking } from '../../hooks/useHomeTripTracking';
import {
  HomeVehicleDashboardFold,
  HomeWeatherDetailModal,
  HomeTripCompletionModal,
} from '../../components/home/dashboard';
import { H_PAD, TAB_BAR_BASE_HEIGHT, SCROLL_BOTTOM_GAP } from '../../components/home/shared/homeLayoutConstants';
import {
  resolveVehicleMarcaId,
  coordsFromSavedAddress,
} from '../../components/home/shared/homeVehicleUtils';
import { COLORS } from '../../design-system/tokens';

const UserPanelScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { solicitudesActivas, cargarSolicitudesActivas } = useSolicitudes();
  const { data: unreadData } = useUnreadCount();
  const unreadCount = typeof unreadData === 'number' ? unreadData : (unreadData?.count || 0);

  const {
    data: serviceConversations = [],
    refetch: refetchServiceConversations,
  } = useConversationsList('service');
  const {
    data: marketplaceConversations = [],
    refetch: refetchMarketplaceConversations,
  } = useConversationsList('marketplace');

  const chatsUnreadTotal = useMemo(() => {
    const sum = (list) =>
      (Array.isArray(list) ? list : []).reduce(
        (acc, c) => acc + (Number(c?.unread_count) || 0),
        0,
      );
    return sum(serviceConversations) + sum(marketplaceConversations);
  }, [serviceConversations, marketplaceConversations]);

  useFocusEffect(
    useCallback(() => {
      cargarSolicitudesActivas();
    }, [cargarSolicitudesActivas])
  );

  useFocusEffect(
    useCallback(() => {
      refetchServiceConversations();
      refetchMarketplaceConversations();
    }, [refetchServiceConversations, refetchMarketplaceConversations]),
  );

  // ── Vehicle selection ──
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [selectorVisible, setSelectorVisible] = useState(false);

  const [isWeatherModalOpen, setIsWeatherModalOpen] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [addAddressModalOpen, setAddAddressModalOpen] = useState(false);
  const weatherForceRefreshRef = useRef(false);

  // ── Data queries ──
  const {
    data: vehiclesRaw,
    isLoading: vehiclesLoading,
    isFetching: vehiclesFetching,
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

  // No invalidar `vehicleHealth` al enfocar el panel: el refetch suele traer JSON viejo (caché
  // HTTP/Redis) y borra el valor que VehicleHealthScreen ya escribió con setQueryData.
  // La salud del círculo se alinea con la pantalla de salud vía esa caché + pull-to-refresh.

  useEffect(() => {
    if (Platform.OS === 'web') {
      refetchVehicles();
    }
  }, [refetchVehicles]);

  const showUserPanelSkeleton = vehiclesLoading || vehiclesFetching;

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
    [vehicles, selectedVehicleId]
  );

  useEffect(() => {
    if (!selectedVehicle?.id) return;
    const vid = selectedVehicle.id;
    queryClient.prefetchQuery({
      queryKey: ['vehicleServices', vid],
      queryFn: () => require('../../services/service').getServicesByVehiculo(vid),
      staleTime: 1000 * 60 * 5,
    });
    queryClient.prefetchQuery({
      queryKey: ['mainCategories'],
      queryFn: () => require('../../services/categories').getMainCategories(),
      staleTime: 1000 * 60 * 60,
    });
    queryClient.prefetchQuery({
      queryKey: ['vehicleHealthComponents', vid],
      queryFn: () => VehicleHealthService.getComponents(vid),
      staleTime: 1000 * 60 * 5,
    });
  }, [selectedVehicle?.id]);

  const selectedHealthSummary = useMemo(() => {
    if (!selectedVehicleId || !vehiclesHealth.data?.length) return null;
    return vehiclesHealth.data.find((h) => h.vehicleId === selectedVehicleId)?.health ?? null;
  }, [selectedVehicleId, vehiclesHealth.data]);

  const healthScore = resolveVehicleHealthPct(selectedVehicle, selectedHealthSummary);
  const healthScoreColor = getHealthColorToken(COLORS, healthScore);

  const valuation =
    selectedVehicle?.precio_sugerido_final || selectedVehicle?.precio_mercado_promedio || 0;
  const marketPrice = selectedVehicle?.precio_mercado_promedio || 0;
  const priceDelta = valuation && marketPrice ? valuation - marketPrice : 0;
  const odometer = selectedVehicle?.kilometraje || 0;

  const activeSolicitudesCount = useMemo(() => {
    if (!Array.isArray(solicitudesActivas)) return 0;
    const vid = selectedVehicle?.id ?? null;
    return solicitudesActivas.filter((s) => solicitudVisibleParaVehiculoDashboard(s, vid)).length;
  }, [solicitudesActivas, selectedVehicle?.id]);

  const quickActionItems = useMemo(
    () => [
      {
        key: 'servicios',
        title: 'Servicios',
        sub: 'Pedir servicio',
        iconBg: COLORS.primary[50],
        icon: <Wrench size={22} color={COLORS.primary[500]} />,
        onPress: () =>
          navigation.navigate(
            ROUTES.CREAR_SOLICITUD,
            selectedVehicle ? { vehicle: selectedVehicle, fromDashboard: true } : {},
          ),
      },
      {
        key: 'solicitudes',
        title: 'Solicitudes',
        sub:
          activeSolicitudesCount > 0
            ? `${activeSolicitudesCount} activa${activeSolicitudesCount > 1 ? 's' : ''}`
            : 'Mis solicitudes',
        iconBg: COLORS.success.light,
        icon: <ClipboardList size={22} color={COLORS.success.main} />,
        onPress: () =>
          navigation.navigate(
            ROUTES.MIS_SOLICITUDES,
            selectedVehicle ? { vehicleId: selectedVehicle.id, vehicle: selectedVehicle } : {},
          ),
      },
      {
        key: 'venta',
        title: 'Gestionar venta',
        sub: 'Vende tu vehículo',
        iconBg: COLORS.warning.light,
        icon: <Store size={22} color={COLORS.warning.main} />,
        onPress: () =>
          selectedVehicle
            ? navigation.navigate(ROUTES.SELL_VEHICLE, {
                vehicle: selectedVehicle,
                vehicleId: selectedVehicle.id,
              })
            : navigation.navigate(ROUTES.MARKETPLACE),
      },
      {
        key: 'mensajes',
        title: 'Mensajes',
        sub:
          chatsUnreadTotal > 0
            ? `${chatsUnreadTotal} mensaje${chatsUnreadTotal > 1 ? 's' : ''} sin leer`
            : 'Chats con proveedores',
        iconBg: COLORS.neutral.gray[200],
        icon: <MessageCircle size={22} color={COLORS.text.primary} />,
        onPress: () => navigation.navigate(ROUTES.CHATS_LIST),
        badgeCount: chatsUnreadTotal,
      },
    ],
    [navigation, selectedVehicle, activeSolicitudesCount, chatsUnreadTotal],
  );

  const { data: userAddresses } = useUserAddresses();
  const addressList = useMemo(() => (Array.isArray(userAddresses) ? userAddresses : []), [userAddresses]);

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

  const marcaIdForPanel = resolveVehicleMarcaId(selectedVehicle);

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
    data: panelNearbyProviders = [],
    isLoading: panelNearbyLoading,
    refetch: refetchPanelNearby,
  } = useQuery({
    queryKey: ['userPanelNearbyProviders', selectedVehicle?.id, selectedAddressId, marcaIdForPanel],
    enabled: !!selectedVehicle?.id && !!selectedAddress,
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 15,
    queryFn: async () => {
      let coords = coordsFromSavedAddress(selectedAddress);
      if (!coords && selectedAddress?.direccion) {
        const g = await geocodeAddress(selectedAddress.direccion);
        if (g?.latitude != null && g?.longitude != null) {
          coords = { lat: g.latitude, lng: g.longitude };
        }
      }
      if (!coords) return [];
      return getNearbyProvidersForPanel(coords.lat, coords.lng, marcaIdForPanel);
    },
  });

  const {
    data: panelMarketActivity,
    isLoading: panelActivityLoading,
    refetch: refetchPanelActivity,
  } = useQuery({
    queryKey: ['userPanelMarketActivity', selectedVehicle?.id],
    enabled: !!selectedVehicle?.id,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 15,
    queryFn: () => getActividadMercadoVehiculo(selectedVehicle.id, 20),
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
      });
    },
    [navigation],
  );

  const handleSeeAllParaTi = useCallback(() => {
    if (!selectedVehicle) return;
    navigation.navigate(ROUTES.EXPLORE_PROVIDERS, {
      vehicle: selectedVehicle,
      address: selectedAddress ?? undefined,
      mode: EXPLORE_MODE_PARA_TI,
      initialTab: 'all',
    });
  }, [navigation, selectedVehicle, selectedAddress]);

  const handleSeeAllNearby = useCallback(() => {
    if (!selectedVehicle) return;
    navigation.navigate(ROUTES.EXPLORE_PROVIDERS, {
      vehicle: selectedVehicle,
      address: selectedAddress ?? undefined,
      mode: EXPLORE_MODE_CERCA,
      initialTab: 'all',
    });
  }, [navigation, selectedVehicle, selectedAddress]);

  // ── Weather ──
  const {
    data: weatherData,
    isLoading: weatherLoading,
    refetch: refetchWeather,
  } = useQuery({
    queryKey: ['weatherPrediction', selectedAddressId, selectedVehicle?.id],
    queryFn: () => {
      const shouldForce = weatherForceRefreshRef.current;
      weatherForceRefreshRef.current = false;
      return getWeatherPrediction({
        addressId: selectedAddressId,
        vehicleId: selectedVehicle?.id,
        useGps: !selectedAddressId,
        forceRefresh: shouldForce,
      });
    },
    enabled: true,
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 30,
    refetchInterval: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
  });

  const trip = useHomeTripTracking(selectedVehicle, odometer);

  // ── Refresh ──
  const onRefresh = useCallback(async () => {
    const extras = [];
    if (selectedVehicle?.id) {
      extras.push(refetchPanelParaTi(), refetchPanelNearby(), refetchPanelActivity());
    }
    await Promise.all([
      refetchVehicles(),
      queryClient.invalidateQueries({ queryKey: ['vehicleHealth'] }),
      cargarSolicitudesActivas(),
      refetchWeather(),
      ...extras,
    ]);
  }, [
    refetchVehicles,
    queryClient,
    cargarSolicitudesActivas,
    refetchWeather,
    selectedVehicle?.id,
    refetchPanelParaTi,
    refetchPanelNearby,
    refetchPanelActivity,
  ]);

  const weatherDerived = useMemo(() => {
    const weatherComponents = weatherData?.components || [];
    const frenoComp = weatherComponents.find((c) => c.type === 'frenos');
    const neumaComp = weatherComponents.find((c) => c.type === 'neumaticos');
    const weatherReportAgeMin = weatherData?.weather?.report_age_min ?? null;
    const weatherFetchedAt = weatherData?.fetched_at || '';
    return {
      weatherAvailable: weatherData?.available === true,
      weatherComponents,
      frenoWearPct: frenoComp?.driving_risk ?? frenoComp?.wear_increase ?? 0,
      gomaWearPct: neumaComp?.driving_risk ?? neumaComp?.wear_increase ?? 0,
      climateRiskPct: weatherData?.total_wear_risk ?? 0,
      overallRiskLevel: weatherData?.risk_level || 'optimo',
      overallRiskLabel: weatherData?.risk_label || '',
      weatherCondition: weatherData?.weather?.condition || '',
      weatherTemp: weatherData?.weather?.temperature,
      weatherHumidity: weatherData?.weather?.humidity,
      weatherCity: weatherData?.weather?.city || '',
      weatherAgeLabel:
        weatherReportAgeMin != null
          ? weatherReportAgeMin < 60
            ? `hace ${weatherReportAgeMin} min`
            : `hace ${Math.round(weatherReportAgeMin / 60)}h`
          : weatherFetchedAt || '',
      aiInsight: weatherData?.ai_insight || '',
      unavailableReason: weatherData?.reason,
    };
  }, [weatherData]);

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
            paddingBottom: TAB_BAR_BASE_HEIGHT + insets.bottom + SCROLL_BOTTOM_GAP,
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
        <HomeTopBar
          firstName={user?.first_name}
          unreadCount={unreadCount}
          user={user}
          hasAddresses={addressList.length > 0}
          selectedAddress={selectedAddress}
          onPressSelectAddress={() => setAddAddressModalOpen(true)}
          onPressNotifications={() => navigation.navigate(ROUTES.NOTIFICATION_CENTER)}
          onPressProfile={() => navigation.navigate(ROUTES.PROFILE)}
        />

        <HomeVehicleSelector
          vehicles={vehicles}
          vehiclesLoading={vehiclesLoading}
          selectedVehicle={selectedVehicle}
          healthScore={selectedVehicle ? healthScore : null}
          healthScoreColor={healthScoreColor}
          onOpenSelector={() => setSelectorVisible(true)}
          onAddVehicle={() => navigation.navigate(ROUTES.CREAR_VEHICULO)}
        />

        <HomeQuickActions items={quickActionItems} />

        <HomeParaTiSection
          selectedVehicle={selectedVehicle}
          providers={panelParaTiProviders}
          loading={panelParaTiLoading}
          onProviderPress={openProviderFromPanel}
          onSeeAll={handleSeeAllParaTi}
        />

        <HomeNearbySection
          selectedVehicle={selectedVehicle}
          hasSelectedAddress={!!selectedAddress}
          providers={panelNearbyProviders}
          loading={panelNearbyLoading}
          onProviderPress={openProviderFromPanel}
          onSeeAll={handleSeeAllNearby}
        />

        <HomeMarketActivitySection
          selectedVehicle={selectedVehicle}
          activity={panelMarketActivity}
          loading={panelActivityLoading}
        />

        <HomeVehicleDashboardFold
          visible={!!selectedVehicle}
          tripActive={trip.tripActive}
          valuation={valuation}
          priceDelta={priceDelta}
          healthScore={healthScore}
          healthScoreColor={healthScoreColor}
          odometer={odometer}
          motorType={selectedVehicle?.tipo_motor}
          onPressHealth={() =>
            navigation.navigate(ROUTES.VEHICLE_HEALTH, {
              vehicleId: selectedVehicle.id,
              vehicle: selectedVehicle,
            })
          }
          telemetry={{
            tripActive: trip.tripActive,
            tripKm: trip.tripKm,
            tripElapsed: trip.tripElapsed,
            currentSpeed: trip.currentSpeed,
            onStartTrip: trip.startTrip,
            onStopTrip: trip.stopTrip,
          }}
          weather={{
            loading: weatherLoading,
            available: weatherDerived.weatherAvailable,
            unavailableReason: weatherDerived.unavailableReason,
            overallRiskLevel: weatherDerived.overallRiskLevel,
            overallRiskLabel: weatherDerived.overallRiskLabel,
            climateRiskPct: weatherDerived.climateRiskPct,
            weatherCity: weatherDerived.weatherCity,
            weatherCondition: weatherDerived.weatherCondition,
            weatherTemp: weatherDerived.weatherTemp,
            weatherAgeLabel: weatherDerived.weatherAgeLabel,
            frenoWearPct: weatherDerived.frenoWearPct,
            gomaWearPct: weatherDerived.gomaWearPct,
            onPressOpenDetail: () => setIsWeatherModalOpen(true),
          }}
        />
      </ScrollView>

      <HomeWeatherDetailModal
        visible={isWeatherModalOpen}
        onClose={() => setIsWeatherModalOpen(false)}
        available={weatherDerived.weatherAvailable}
        weatherCity={weatherDerived.weatherCity}
        weatherCondition={weatherDerived.weatherCondition}
        weatherTemp={weatherDerived.weatherTemp}
        weatherHumidity={weatherDerived.weatherHumidity}
        weatherAgeLabel={weatherDerived.weatherAgeLabel}
        weatherComponents={weatherDerived.weatherComponents}
        aiInsight={weatherDerived.aiInsight}
      />

      <HomeTripCompletionModal
        visible={trip.tripCompletionVisible}
        vehicleLabel={`${selectedVehicle?.marca_nombre || ''} ${selectedVehicle?.modelo_nombre || ''}`.trim()}
        tripKm={trip.tripKm}
        tripElapsed={trip.tripElapsed}
        avgSpeed={trip.avgSpeed}
        projectedOdometer={Math.round(odometer + trip.tripKm)}
        registering={trip.registering}
        onConfirm={trip.confirmTrip}
        onDismiss={trip.dismissTrip}
      />

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
      />

      {/* Modal agregar nueva dirección */}
      <AddressSelectionModal
        visible={addAddressModalOpen}
        onClose={() => setAddAddressModalOpen(false)}
        variant="default"
        heroSubtitle="Detecta tu ubicación para ver el clima y riesgo de desgaste."
        currentAddress={selectedAddress}
        onSelectAddress={(savedAddr) => {
          if (savedAddr?.id) {
            const isNewAddress = savedAddr.id !== selectedAddressId;
            if (isNewAddress) {
              weatherForceRefreshRef.current = true;
              queryClient.removeQueries({ queryKey: ['weatherPrediction'] });
            }
            setSelectedAddressId(savedAddr.id);
          }
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
  },
  scroll: {
    paddingHorizontal: H_PAD,
  },
});

export default UserPanelScreen;
