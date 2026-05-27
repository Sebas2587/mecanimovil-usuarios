import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, RefreshControl, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Store, MessageCircle, Navigation } from 'lucide-react-native';

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
import {
  getHealthColorToken,
  hasVehicleHealthData,
  resolveVehicleHealthPct,
} from '../../utils/healthFormat';
import { solicitudVisibleParaVehiculoDashboard } from '../../utils/solicitudVehicle';
import UserPanelSkeleton from '../../components/utils/UserPanelSkeleton';
import {
  HomeContextHeader,
  HomeSearchBar,
  HomeCategoryGrid,
  HomeContextualBanner,
  HomeHighlightedRow,
  HomeNearbyRow,
  HomeMultimarcaRow,
  HomeTrendingServicesRow,
  HomeHealthServicesRow,
  // HomeAgendamientoSheet, // Sheet IA deshabilitado temporalmente
  HomeVehicleSelectorModal,
  HomeQuickActions,
} from '../../components/home/discovery';
import { EXPLORE_MODE_CERCA, EXPLORE_MODE_PARA_TI } from '../../components/providers/explore';
import { shortAddressLabel } from '../../components/home/shared/homeProviderListUtils';
import {
  navigateCrearSolicitudConServicio,
  navigateCrearSolicitudDesdeTrending,
  navigateCrearSolicitudDesdeHome,
} from '../../components/home/shared/homeScheduleNavigation';
import { useParaTiProviders } from '../../hooks/useParaTiProviders';
import { useMultimarcaProviders } from '../../hooks/useMultimarcaProviders';
import { useTripTracking } from '../../context/TripTrackingContext';
import { TRIP_ACTIVE_BAR_HEIGHT } from '../../components/trip/TripActiveBar';
import {
  HomeVehicleDashboardCard,
  HomeWeatherDetailModal,
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

  // No invalidar `vehicleHealth` al enfocar el panel: el refetch suele traer JSON viejo (caché
  // HTTP/Redis) y borra el valor que VehicleHealthScreen ya escribió con setQueryData.
  // La salud del círculo se alinea con la pantalla de salud vía esa caché + pull-to-refresh.

  useEffect(() => {
    if (Platform.OS === 'web') {
      refetchVehicles();
    }
  }, [refetchVehicles]);

  // Solo skeleton en carga inicial; refetch en background no debe ocultar categorías ni el panel.
  const showUserPanelSkeleton = vehiclesPending;

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
      queryKey: ['vehicleHealthComponents', vid],
      queryFn: () => VehicleHealthService.getComponents(vid),
      staleTime: 1000 * 60 * 5,
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
    return (
      selectedHealthRow?.isLoading === true
      && !healthAvailable
    );
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
    if (selectedVehicle?.id) setTripVehicleId(selectedVehicle.id);
  }, [selectedVehicle?.id, setTripVehicleId]);

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

  const openRegistrarViaje = useCallback(() => {
    navigation.navigate(ROUTES.REGISTRAR_VIAJE, {
      vehicleId: selectedVehicle?.id,
      vehicle: selectedVehicle ?? undefined,
    });
  }, [navigation, selectedVehicle]);

  const quickActionItems = useMemo(
    () => [
      {
        key: 'registrar-viaje',
        title: tripActive ? 'Viaje activo' : 'Registrar viaje',
        sub: tripActive
          ? 'Toca para ver el seguimiento GPS'
          : 'Actualiza km con GPS al manejar',
        iconBg: COLORS.primary[50],
        icon: <Navigation size={22} color={COLORS.primary[600]} />,
        onPress: openRegistrarViaje,
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
    [
      navigation,
      selectedVehicle,
      activeSolicitudesCount,
      chatsUnreadTotal,
      tripActive,
      openRegistrarViaje,
    ],
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
    data: panelMultimarcaProviders = [],
    isLoading: panelMultimarcaLoading,
    refetch: refetchPanelMultimarca,
  } = useMultimarcaProviders({
    address: selectedAddress,
    enabled: true,
    limit: 12,
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
      if (!coords) {
        if (__DEV__) {
          console.warn('[Cerca panel] Dirección sin coordenadas; geocodificación falló o no hay ubicacion.');
        }
        return [];
      }
      return getNearbyProvidersForPanel(coords.lat, coords.lng, marcaIdForPanel, {
        limit: 24,
        marcaFallback: true,
        keepUnknownDistance: true,
      });
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
        vehicle: selectedVehicle ?? undefined,
      });
    },
    [navigation],
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

  const handleSeeAllNearby = useCallback(() => {
    openExplore({ mode: EXPLORE_MODE_CERCA });
  }, [openExplore]);

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

  const handleOpenSearch = useCallback(() => {
    if (!selectedVehicle) return;
    openExplore({
      mode: EXPLORE_MODE_CERCA,
      focusSearch: true,
      initialTab: 'all',
    });
  }, [selectedVehicle, openExplore]);

  const addressLabel = useMemo(() => shortAddressLabel(selectedAddress), [selectedAddress]);

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

  // ── Refresh ──
  const onRefresh = useCallback(async () => {
    const extras = [refetchPanelMultimarca()];
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
    refetchPanelMultimarca,
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
            paddingBottom:
              TAB_BAR_BASE_HEIGHT
              + insets.bottom
              + SCROLL_BOTTOM_GAP
              + (tripActive ? TRIP_ACTIVE_BAR_HEIGHT + 12 : 0),
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

        {/* <HomeSearchBar onPress={handleOpenSearch} disabled={!selectedVehicle} /> */}

        <HomeCategoryGrid
          vehicles={vehicles}
          disabled={!selectedVehicle}
          onSelectCategory={handleCategorySelect}
        />

        <HomeQuickActions items={quickActionItems} />

        <HomeContextualBanner
          solicitud={firstVisibleSolicitud}
          healthScore={healthScore}
          climateRiskPct={weatherDerived.climateRiskPct}
          weatherAvailable={weatherDerived.weatherAvailable}
          onPressSolicitud={() =>
            navigation.navigate(
              ROUTES.MIS_SOLICITUDES,
              selectedVehicle ? { vehicleId: selectedVehicle.id, vehicle: selectedVehicle } : {},
            )
          }
          onPressClima={() => setIsWeatherModalOpen(true)}
          onPressAgendar={openNuevaSolicitud}
          onPressHealth={() => {
            if (!selectedVehicle) return;
            navigation.navigate(ROUTES.VEHICLE_HEALTH, {
              vehicleId: selectedVehicle.id,
              vehicle: selectedVehicle,
            });
          }}
        />

        <HomeTrendingServicesRow
          selectedVehicle={selectedVehicle}
          activity={panelMarketActivity}
          loading={panelActivityLoading}
          onSelectService={(_nombre, row) =>
            navigateCrearSolicitudDesdeTrending(navigation, {
              vehicle: selectedVehicle,
              row,
            })
          }
        />

        <HomeHealthServicesRow
          selectedVehicle={selectedVehicle}
          onAgendarServicio={(servicio) => {
            navigateCrearSolicitudConServicio(navigation, {
              vehicle: selectedVehicle,
              servicio,
            });
          }}
        />

        {/* Fase futura: rail de ofertas del día (panel_servicios)
        <HomeOffersRow
          selectedVehicle={selectedVehicle}
          providers={providersWithOffers}
          loading={offersLoading}
          onProviderPress={openProviderFromPanel}
          onSeeAll={handleSeeAllOffers}
        />
        */}

        <HomeHighlightedRow
          selectedVehicle={selectedVehicle}
          hasSelectedAddress={!!selectedAddress}
          providers={panelParaTiProviders}
          loading={panelParaTiLoading}
          onProviderPress={openProviderFromPanel}
          onSeeAll={handleSeeAllParaTi}
        />

        <HomeMultimarcaRow
          providers={panelMultimarcaProviders}
          loading={panelMultimarcaLoading}
          onProviderPress={openProviderFromPanel}
          onSeeAll={() => openExplore({ filterMultimarca: true })}
        />

        <HomeNearbyRow
          selectedVehicle={selectedVehicle}
          title={`Cerca de ${addressLabel}`}
          hasSelectedAddress={!!selectedAddress}
          providers={panelNearbyProviders}
          loading={panelNearbyLoading}
          onProviderPress={openProviderFromPanel}
          onSeeAll={handleSeeAllNearby}
        />

        <HomeVehicleDashboardCard
          selectedVehicle={selectedVehicle}
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

      {/* Sheet IA deshabilitado temporalmente
      <HomeAgendamientoSheet
        visible={agendamientoSheetOpen}
        onClose={() => setAgendamientoSheetOpen(false)}
        vehicle={selectedVehicle}
        navigation={navigation}
      />
      */}

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
