import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  RefreshControl,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { showAlert } from '../../utils/platformAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Play,
  Square,
  Gauge,
  Shield,
  TrendingUp,
  Wrench,
  ClipboardList,
  Store,
  MessageCircle,
  Check,
  Zap,
  CloudRain,
  Disc,
  Wind,
  Droplets,
} from 'lucide-react-native';

import { ROUTES } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { useSolicitudes } from '../../context/SolicitudesContext';
import { getUserVehicles } from '../../services/vehicle';
import VehicleHealthService from '../../services/vehicleHealthService';
import { registrarViaje } from '../../services/tripService';
import {
  startTripTracking,
  stopTripTracking,
  getTripSnapshot,
  resetTripTracking,
} from '../../services/tripTrackingService';
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
  getHealthLabel,
  resolveVehicleHealthPct,
} from '../../utils/healthFormat';
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
import {
  H_PAD,
  SCREEN_WIDTH,
  TAB_BAR_BASE_HEIGHT,
  SCROLL_BOTTOM_GAP,
} from '../../components/home/shared/homeLayoutConstants';
import { formatCLP, formatDuration, formatKm } from '../../components/home/shared/homeFormatters';
import {
  resolveVehicleMarcaId,
  coordsFromSavedAddress,
} from '../../components/home/shared/homeVehicleUtils';
import { HomePanelCard, HomeSoftButton } from '../../components/home/shared/HomePanelCard';

import { COLORS, SPACING, BORDERS, TYPOGRAPHY, SHADOWS } from '../../design-system/tokens';

// Risk colors → tokens
const riskColorMap = {
  critico: COLORS.error.main,
  alto: COLORS.warning.dark,
  moderado: COLORS.warning.main,
  bajo: COLORS.success.main,
  optimo: COLORS.primary[500],
};

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

  // ── Trip tracking ──
  const [tripActive, setTripActive] = useState(false);
  const [tripKm, setTripKm] = useState(0);
  const [tripStartTime, setTripStartTime] = useState(null);
  const [tripElapsed, setTripElapsed] = useState(0);
  const [tripCompletionVisible, setTripCompletionVisible] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);

  const [tripCoords, setTripCoords] = useState({ start: null, end: null });
  const elapsedRef = useRef(null);
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

  // ── Trip elapsed timer ──
  useEffect(() => {
    if (tripActive && tripStartTime) {
      elapsedRef.current = setInterval(() => {
        setTripElapsed(Date.now() - tripStartTime);
      }, 1000);
    }
    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
  }, [tripActive, tripStartTime]);

  useEffect(() => {
    let poller = null;
    if (tripActive) {
      poller = setInterval(async () => {
        const snapshot = await getTripSnapshot();
        setTripKm(snapshot.km || 0);
        setCurrentSpeed(snapshot.currentSpeed || 0);
        setTripCoords({
          start: snapshot.startCoords || null,
          end: snapshot.endCoords || null,
        });
      }, 2000);
    } else {
      setCurrentSpeed(0);
    }
    return () => {
      if (poller) clearInterval(poller);
    };
  }, [tripActive]);

  useEffect(() => {
    return () => {
      if (elapsedRef.current) {
        clearInterval(elapsedRef.current);
        elapsedRef.current = null;
      }
    };
  }, []);

  // ── Trip functions ──
  const startTrip = useCallback(async () => {
    if (!selectedVehicle) {
      showAlert('Sin vehículo', 'Selecciona un vehículo para iniciar el viaje.');
      return;
    }
    try {
      await resetTripTracking();
      const snapshot = await startTripTracking(selectedVehicle.id);
      setTripKm(0);
      setTripElapsed(0);
      setTripStartTime(snapshot.startTime || Date.now());
      setTripCoords({ start: null, end: null });
      setTripActive(true);
    } catch (err) {
      showAlert(
        'Error GPS',
        err?.message ||
          'No se pudo iniciar el rastreo de ubicación. Verifica permisos de ubicación en el navegador.'
      );
      setTripActive(false);
    }
  }, [selectedVehicle]);

  const stopTrip = useCallback(async () => {
    const snapshot = await stopTripTracking();
    const km = snapshot.km || 0;

    if (elapsedRef.current) {
      clearInterval(elapsedRef.current);
      elapsedRef.current = null;
    }

    setTripKm(km);
    setTripCoords({
      start: snapshot.startCoords || null,
      end: snapshot.endCoords || null,
    });
    if (snapshot.startTime) {
      setTripStartTime(snapshot.startTime);
    }
    if (snapshot.startTime && snapshot.endTime) {
      setTripElapsed(snapshot.endTime - snapshot.startTime);
    }

    setTripActive(false);
    if (km > 0.01) {
      setTripCompletionVisible(true);
    }
  }, []);

  const confirmTrip = useCallback(async () => {
    if (!selectedVehicle || tripKm <= 0) return;
    setRegistering(true);
    try {
      const durationSec = tripElapsed ? Math.round(tripElapsed / 1000) : 0;
      const avgSpd = durationSec > 0 ? tripKm / (durationSec / 3600) : 0;

      const result = await registrarViaje(selectedVehicle.id, {
        km_recorridos: parseFloat(tripKm.toFixed(2)),
        duracion_segundos: durationSec,
        coordenadas_inicio: tripCoords.start || null,
        coordenadas_fin: tripCoords.end || null,
        velocidad_promedio_kmh: parseFloat(avgSpd.toFixed(1)),
        fecha_inicio: tripStartTime ? new Date(tripStartTime).toISOString() : null,
      });

      queryClient.invalidateQueries({ queryKey: ['userVehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleHealth', selectedVehicle.id] });
      queryClient.invalidateQueries({ queryKey: ['vehicleHealthComponents', selectedVehicle.id] });

      const nuevoKm =
        result?.km_odometro_nuevo ?? result?.kilometraje_actual ?? Math.round(odometer + tripKm);

      showAlert(
        'Viaje Registrado',
        `Se registraron ${tripKm.toFixed(1)} km. Nuevo odómetro: ${formatKm(
          nuevoKm
        )} km.\nLas métricas de salud se actualizarán automáticamente.`,
      );
    } catch (err) {
      const isTimeout = err?.code === 'ECONNABORTED' || err?.message?.includes('timeout');
      if (isTimeout) {
        showAlert(
          'Registro lento',
          'El servidor tardó en responder. Es posible que el viaje se haya registrado correctamente. Verifica el odómetro en unos segundos.'
        );
      } else {
        const msg =
          err?.response?.data?.detail ||
          err?.response?.data?.km_recorridos?.[0] ||
          err?.message ||
          'Error desconocido';
        showAlert('Error al registrar', `No se pudo registrar el viaje: ${msg}`);
      }
    } finally {
      setRegistering(false);
      setTripCompletionVisible(false);
      setTripKm(0);
      setTripElapsed(0);
      setTripStartTime(null);
      setTripCoords({ start: null, end: null });
      await resetTripTracking();
    }
  }, [selectedVehicle, tripKm, tripElapsed, tripStartTime, odometer, queryClient, tripCoords]);

  const dismissTrip = useCallback(() => {
    setTripCompletionVisible(false);
    setTripKm(0);
    setTripElapsed(0);
    setTripStartTime(null);
    setTripCoords({ start: null, end: null });
    resetTripTracking();
  }, []);

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

  const avgSpeed = tripElapsed > 0 ? tripKm / (tripElapsed / 3600000) : 0;

  const weatherAvailable = weatherData?.available === true;
  const weatherComponents = weatherData?.components || [];
  const frenoComp = weatherComponents.find((c) => c.type === 'frenos');
  const neumaComp = weatherComponents.find((c) => c.type === 'neumaticos');

  const frenoWearPct = frenoComp?.driving_risk ?? frenoComp?.wear_increase ?? 0;
  const gomaWearPct = neumaComp?.driving_risk ?? neumaComp?.wear_increase ?? 0;
  const climateRiskPct = weatherData?.total_wear_risk ?? 0;
  const overallRiskLevel = weatherData?.risk_level || 'optimo';
  const overallRiskLabel = weatherData?.risk_label || '';

  const weatherCondition = weatherData?.weather?.condition || '';
  const weatherTemp = weatherData?.weather?.temperature;
  const weatherHumidity = weatherData?.weather?.humidity;
  const weatherCity = weatherData?.weather?.city || '';
  const weatherFetchedAt = weatherData?.fetched_at || '';
  const weatherReportAgeMin = weatherData?.weather?.report_age_min ?? null;
  const weatherAgeLabel =
    weatherReportAgeMin != null
      ? weatherReportAgeMin < 60
        ? `hace ${weatherReportAgeMin} min`
        : `hace ${Math.round(weatherReportAgeMin / 60)}h`
      : weatherFetchedAt
      ? weatherFetchedAt
      : '';
  const aiInsight = weatherData?.ai_insight || '';

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
          onOpenSelector={() => setSelectorVisible(true)}
          onAddVehicle={() => navigation.navigate(ROUTES.CREAR_VEHICULO)}
        />

        <HomeQuickActions items={quickActionItems} />

        {/* Hero (valuation + health) */}
        {selectedVehicle && (
          <HomePanelCard style={{ marginBottom: 16 }}>
            <View style={styles.heroRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.labelRow}>
                  <TrendingUp size={14} color={COLORS.success.main} />
                  <Text style={styles.labelText}>Valor Estimado</Text>
                </View>
                <Text style={styles.heroPriceDisplay}>{formatCLP(valuation)}</Text>
                {priceDelta !== 0 && (
                  <Text
                    style={[
                      styles.heroDelta,
                      { color: priceDelta >= 0 ? COLORS.success.main : COLORS.error.main },
                    ]}
                  >
                    {priceDelta >= 0 ? '+' : ''}
                    {formatCLP(Math.abs(priceDelta))} vs mercado
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.healthCircleWrap}
                onPress={() =>
                  navigation.navigate(ROUTES.VEHICLE_HEALTH, {
                    vehicleId: selectedVehicle.id,
                    vehicle: selectedVehicle,
                  })
                }
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Salud del vehículo ${Math.round(healthScore)} por ciento, ${getHealthLabel(healthScore)}`}
              >
                <View style={[styles.healthCircle, { borderColor: healthScoreColor }]}>
                  <Text style={[styles.healthCirclePct, { color: healthScoreColor }]}>
                    {Math.round(healthScore)}%
                  </Text>
                  <Text style={styles.healthCircleSaludLabel}>Salud</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.odometerRow}>
              <Gauge size={14} color={COLORS.text.tertiary} />
              <Text style={styles.odometerText}>{formatKm(odometer)} km</Text>
              <View style={styles.odometerDot} />
              <Shield size={14} color={COLORS.text.tertiary} />
              <Text style={styles.odometerText}>{selectedVehicle?.tipo_motor || 'Motor'}</Text>
            </View>
          </HomePanelCard>
        )}

        {/* Telemetry */}
        {selectedVehicle && (
          <HomePanelCard style={styles.telemetryCard}>
            <View style={styles.telemetryStack}>
              <View style={styles.telemetryTopRow}>
                <Text style={styles.telemetryConsoleLabel}>Viaje y telemetría</Text>
              </View>

              <View style={styles.telemetryMainRow}>
                <View style={styles.telemetryKmBlock}>
                  <View style={styles.telemetryKmRow}>
                    <Text
                      style={[styles.telemetryKmHuge, tripActive && styles.telemetryKmHugeLive]}
                    >
                      {tripKm.toFixed(1)}
                    </Text>
                    <Text style={styles.telemetryKmUnit}>km</Text>
                  </View>
                  {tripActive && (
                    <View style={styles.telemetryLiveMetrics}>
                      <View style={styles.telemetryLiveMetric}>
                        <Text style={styles.telemetryLiveMetricLabel}>Tiempo</Text>
                        <Text style={styles.telemetryLiveMetricValue}>
                          {formatDuration(tripElapsed)}
                        </Text>
                      </View>
                      <View style={styles.telemetryLiveDivider} />
                      <View style={styles.telemetryLiveMetric}>
                        <Text style={styles.telemetryLiveMetricLabel}>Velocidad</Text>
                        <Text style={styles.telemetryLiveMetricValue}>
                          {Math.round(currentSpeed)} km/h
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {!tripActive && (
                <Text style={styles.tripHint}>
                  Registra un viaje con GPS y actualiza los kilómetros recorridos en tiempo real.
                </Text>
              )}

              <View style={styles.telemetryCtaWrap}>
                {tripActive ? (
                  <HomeSoftButton onPress={stopTrip} variant="stop">
                    <Square size={16} color={COLORS.text.inverse} fill={COLORS.text.inverse} />
                    <Text style={styles.softBtnTextStop}>Detener viaje</Text>
                  </HomeSoftButton>
                ) : (
                  <HomeSoftButton onPress={startTrip}>
                    <Play size={16} color={COLORS.text.inverse} fill={COLORS.text.inverse} />
                    <Text style={styles.softBtnTextPrimary}>Iniciar viaje</Text>
                  </HomeSoftButton>
                )}
              </View>
            </View>
          </HomePanelCard>
        )}

        {/* Weather */}
        {selectedVehicle && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setIsWeatherModalOpen(true)}
            style={styles.weatherCardWrap}
          >
            <HomePanelCard style={styles.weatherFullGlass} innerStyle={styles.weatherFullInner}>
              <View style={styles.weatherFullBody}>
                {weatherLoading ? (
                  <View style={styles.weatherCardLoading}>
                    <ActivityIndicator color={COLORS.primary[500]} size="small" />
                    <Text style={styles.weatherCardLoadingText}>Consultando clima...</Text>
                  </View>
                ) : !weatherAvailable ? (
                  <View style={styles.weatherCardUnavailable}>
                    <CloudRain size={24} color={COLORS.text.tertiary} />
                    <Text style={styles.weatherCardUnavailableText}>
                      {weatherData?.reason || 'Clima no disponible para esta ubicación.'}
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.entornoHeader}>
                      <CloudRain
                        size={20}
                        color={riskColorMap[overallRiskLevel] || COLORS.primary[500]}
                      />
                      <Text style={styles.entornoRiskLabel}>Riesgo de desgaste (clima)</Text>
                    </View>
                    <Text
                      style={[
                        styles.entornoRiskPct,
                        { color: riskColorMap[overallRiskLevel] || COLORS.text.primary },
                      ]}
                    >
                      {climateRiskPct}%
                    </Text>
                    {overallRiskLabel !== '' && (
                      <Text
                        style={[
                          styles.entornoRiskBandLabel,
                          { color: riskColorMap[overallRiskLevel] || COLORS.text.primary },
                        ]}
                      >
                        {overallRiskLabel}
                      </Text>
                    )}
                    {weatherCity !== '' && (
                      <Text style={styles.entornoWeatherCity}>
                        {weatherCity} · {weatherCondition} ·{' '}
                        {weatherTemp != null ? `${weatherTemp}°C` : '—'}
                        {weatherAgeLabel ? ` · ${weatherAgeLabel}` : ''}
                      </Text>
                    )}
                    <View style={styles.weatherBarsGroup}>
                      <View style={styles.microBarRow}>
                        <Text style={styles.microBarLabel}>Frenos</Text>
                        <View style={styles.microBarTrack}>
                          <View
                            style={[
                              styles.microBarFill,
                              {
                                width: `${Math.min(frenoWearPct, 100)}%`,
                                backgroundColor: COLORS.error.main,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.microBarPct}>{frenoWearPct}%</Text>
                      </View>
                      <View style={styles.microBarRow}>
                        <Text style={styles.microBarLabel}>Gomas</Text>
                        <View style={styles.microBarTrack}>
                          <View
                            style={[
                              styles.microBarFill,
                              {
                                width: `${Math.min(gomaWearPct, 100)}%`,
                                backgroundColor: COLORS.success.main,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.microBarPct}>{gomaWearPct}%</Text>
                      </View>
                    </View>
                    <View style={styles.weatherTapFooter}>
                      <Droplets size={12} color={COLORS.text.tertiary} />
                      <Text style={styles.entornoTapText}>
                        Toca para análisis climático para conducir
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </HomePanelCard>
          </TouchableOpacity>
        )}

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
      </ScrollView>

      {/* ─── Weather modal ─── */}
      <Modal
        visible={isWeatherModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsWeatherModalOpen(false)}
      >
        <View style={styles.weatherModalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setIsWeatherModalOpen(false)}
          />
          <View style={styles.weatherSheet}>
            <View style={styles.weatherSheetHandle} />
            <View style={styles.weatherSheetContent}>
              <View style={styles.weatherSheetHeader}>
                <CloudRain size={32} color={COLORS.primary[500]} />
                <Text style={styles.weatherSheetTitle}>Análisis climático para conducir</Text>
                {weatherAvailable && (
                  <Text style={styles.weatherSheetSubtitle}>
                    {weatherCity} · {weatherCondition} ·{' '}
                    {weatherTemp != null ? `${weatherTemp}°C` : '—'} · Humedad{' '}
                    {weatherHumidity ?? '—'}%
                    {weatherAgeLabel ? `\nReporte: ${weatherAgeLabel}` : ''}
                  </Text>
                )}
              </View>

              <View style={styles.weatherWearBlock}>
                {weatherComponents.map((comp) => {
                  const lvl = comp.risk_level || 'optimo';
                  const lvlColor = riskColorMap[lvl] || COLORS.text.tertiary;
                  const iconMap = {
                    frenos: <Disc size={18} color={lvlColor} />,
                    neumaticos: <Wind size={18} color={lvlColor} />,
                    bateria: <Zap size={18} color={lvlColor} />,
                    refrigerante: <Droplets size={18} color={lvlColor} />,
                  };
                  const riskPct = comp.driving_risk ?? comp.wear_increase ?? 0;
                  return (
                    <View key={comp.type} style={styles.weatherWearRow}>
                      {iconMap[comp.type] || <Disc size={18} color={COLORS.text.tertiary} />}
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginBottom: 4,
                          }}
                        >
                          <Text style={styles.weatherWearTitle}>{comp.name}</Text>
                          {comp.salud_actual != null && (
                            <Text
                              style={{
                                fontSize: TYPOGRAPHY.fontSize.sm,
                                color: lvlColor,
                                fontWeight: TYPOGRAPHY.fontWeight.semibold,
                                marginLeft: 6,
                              }}
                            >
                              Salud {comp.salud_actual}%
                            </Text>
                          )}
                        </View>
                        <View style={styles.weatherBarTrack}>
                          <View
                            style={[
                              styles.weatherBarFill,
                              { width: `${Math.min(riskPct, 100)}%`, backgroundColor: lvlColor },
                            ]}
                          />
                        </View>
                        <Text
                          style={[styles.weatherWearReason, { color: COLORS.text.secondary }]}
                          numberOfLines={2}
                        >
                          {comp.risk_label || comp.reason}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', minWidth: 50 }}>
                        <Text style={[styles.weatherWearPct, { color: lvlColor }]}>{riskPct}%</Text>
                        {comp.wear_increase > 0 && (
                          <Text
                            style={{
                              color: COLORS.warning.main,
                              fontSize: TYPOGRAPHY.fontSize.sm,
                              fontWeight: TYPOGRAPHY.fontWeight.semibold,
                            }}
                          >
                            +{comp.wear_increase}% clima
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>

              <View style={styles.weatherTipsBox}>
                <Zap size={18} color={COLORS.success.main} />
                <Text style={styles.weatherTipsText}>
                  {aiInsight || 'Condiciones óptimas para conducir.'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.weatherEntendidoBtn}
                onPress={() => setIsWeatherModalOpen(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.weatherEntendidoText}>Entendido</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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

      {/* ─── Trip completion modal ─── */}
      <Modal visible={tripCompletionVisible} transparent animationType="fade" onRequestClose={dismissTrip}>
        <View style={[styles.modalOverlay, { justifyContent: 'center' }]}>
          <View style={styles.tripModal}>
            <View style={styles.tripModalContent}>
              <View style={styles.tripModalIcon}>
                <Check size={32} color={COLORS.success.main} />
              </View>
              <Text style={styles.tripModalTitle}>Viaje Completado</Text>
              <Text style={styles.tripModalSub}>
                {selectedVehicle?.marca_nombre || ''} {selectedVehicle?.modelo_nombre || ''}
              </Text>

              <View style={styles.tripModalStats}>
                <View style={styles.tripModalStat}>
                  <Text style={styles.tripModalStatValue}>{tripKm.toFixed(1)}</Text>
                  <Text style={styles.tripModalStatLabel}>km recorridos</Text>
                </View>
                <View style={styles.tripModalStat}>
                  <Text style={styles.tripModalStatValue}>{formatDuration(tripElapsed)}</Text>
                  <Text style={styles.tripModalStatLabel}>duración</Text>
                </View>
                <View style={styles.tripModalStat}>
                  <Text style={styles.tripModalStatValue}>{avgSpeed.toFixed(0)}</Text>
                  <Text style={styles.tripModalStatLabel}>km/h prom.</Text>
                </View>
              </View>

              <Text style={styles.tripModalHint}>
                Nuevo odómetro: {formatKm(Math.round(odometer + tripKm))} km
              </Text>

              <TouchableOpacity
                style={styles.tripConfirmBtn}
                onPress={confirmTrip}
                activeOpacity={0.85}
                disabled={registering}
              >
                {registering ? (
                  <ActivityIndicator color={COLORS.text.inverse} size="small" />
                ) : (
                  <>
                    <Check size={18} color={COLORS.text.inverse} />
                    <Text style={styles.tripConfirmText}>Registrar Kilometraje</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.tripDismissBtn} onPress={dismissTrip}>
                <Text style={styles.tripDismissText}>Descartar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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

  softBtnTextPrimary: {
    color: COLORS.text.inverse,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontSize: TYPOGRAPHY.fontSize.base,
  },
  softBtnTextStop: {
    color: COLORS.text.inverse,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontSize: TYPOGRAPHY.fontSize.base,
  },

  // Hero (patrimonio / salud — Fase 4 puede extraerse)
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  labelText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
  },
  heroPriceDisplay: {
    ...TYPOGRAPHY.styles.numberDisplay,
    color: COLORS.text.primary,
    marginTop: 4,
  },
  heroDelta: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    marginTop: 2,
  },
  healthCircleWrap: {
    alignItems: 'center',
    marginLeft: 16,
  },
  /** Alineado con `VehicleHealthScreen` (`scoreCircle` / `scoreText` / `scoreLabel`). */
  healthCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.gray[100],
  },
  healthCirclePct: {
    fontSize: 22,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  healthCircleSaludLabel: {
    fontSize: 10,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  odometerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
    gap: 6,
  },
  odometerText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  odometerDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.text.tertiary,
    marginHorizontal: 4,
  },

  // Telemetry — mismo inset que el resto de cards (`cardInner` = 16px); sin padding extra en el shell.
  telemetryCard: {
    marginBottom: 16,
  },
  telemetryStack: {
    width: '100%',
    gap: SPACING.sm,
  },
  telemetryTopRow: {
    marginBottom: 0,
  },
  telemetryConsoleLabel: {
    ...TYPOGRAPHY.styles.label,
    fontSize: TYPOGRAPHY.fontSize.xs,
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
  },
  telemetryMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 0,
  },
  telemetryKmBlock: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.xs,
  },
  telemetryKmRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  telemetryKmHuge: {
    ...TYPOGRAPHY.styles.numberDisplay,
    fontSize: TYPOGRAPHY.fontSize['3xl'],
    lineHeight: 34,
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
    color: COLORS.text.primary,
    ...(Platform.OS === 'web' ? { fontFeatureSettings: '"tnum"' } : {}),
  },
  /** Viaje activo: km principal al tamaño estándar numberDisplay (spec / KPI legible). */
  telemetryKmHugeLive: {
    fontSize: TYPOGRAPHY.styles.numberDisplay.fontSize,
    lineHeight: TYPOGRAPHY.styles.numberDisplay.lineHeight,
    letterSpacing: TYPOGRAPHY.styles.numberDisplay.letterSpacing,
  },
  telemetryKmUnit: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    color: COLORS.text.tertiary,
  },
  telemetryLiveMetrics: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: COLORS.border.light,
    gap: SPACING.md,
  },
  telemetryLiveMetric: {
    flex: 1,
    minWidth: 0,
  },
  telemetryLiveDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: COLORS.border.light,
    marginVertical: 2,
  },
  telemetryLiveMetricLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    marginBottom: 4,
  },
  telemetryLiveMetricValue: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    color: COLORS.text.primary,
    ...(Platform.OS === 'web' ? { fontFeatureSettings: '"tnum"' } : {}),
  },

  weatherCardWrap: {
    width: '100%',
    marginBottom: 16,
  },
  weatherFullGlass: {
    width: '100%',
  },
  weatherFullInner: {
    padding: SPACING.cardPadding,
  },
  weatherFullBody: {
    width: '100%',
  },
  weatherBarsGroup: {
    gap: 10,
    marginTop: 6,
    marginBottom: 4,
  },
  weatherTapFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  weatherCardLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
    minHeight: 100,
  },
  weatherCardLoadingText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  weatherCardUnavailable: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
    minHeight: 100,
  },
  weatherCardUnavailableText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    lineHeight: 16,
  },
  entornoWeatherCity: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    lineHeight: 15,
    marginTop: 2,
    marginBottom: 10,
  },
  entornoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  entornoRiskLabel: {
    flexShrink: 1,
    ...TYPOGRAPHY.styles.label,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
  },
  entornoRiskPct: {
    ...TYPOGRAPHY.styles.numberDisplay,
    fontSize: TYPOGRAPHY.fontSize['3xl'],
    lineHeight: 34,
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
    marginBottom: 4,
    ...(Platform.OS === 'web' ? { fontFeatureSettings: '"tnum"' } : {}),
  },
  entornoRiskBandLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    marginBottom: 6,
  },
  microBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
    gap: 6,
  },
  microBarLabel: {
    width: 44,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
  },
  microBarTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.neutral.gray[200],
    overflow: 'hidden',
  },
  microBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  microBarPct: {
    width: 36,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    color: COLORS.text.tertiary,
    textAlign: 'right',
    ...(Platform.OS === 'web' ? { fontFeatureSettings: '"tnum"' } : {}),
  },
  entornoTapText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.tertiary,
    fontStyle: 'italic',
    lineHeight: 15,
  },

  // Weather modal
  weatherModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,11,13,0.45)',
    justifyContent: 'flex-end',
  },
  weatherSheet: {
    borderTopLeftRadius: BORDERS.radius.xl,
    borderTopRightRadius: BORDERS.radius.xl,
    overflow: 'hidden',
    maxHeight: '78%',
    backgroundColor: COLORS.background.paper,
    ...SHADOWS.lg,
  },
  weatherSheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.neutral.gray[300],
    marginTop: 10,
    marginBottom: 4,
  },
  weatherSheetContent: {
    paddingHorizontal: 22,
    paddingBottom: 28,
    paddingTop: 8,
  },
  weatherSheetHeader: {
    alignItems: 'center',
    marginBottom: 22,
  },
  weatherSheetTitle: {
    fontSize: TYPOGRAPHY.styles.h3.fontSize,
    fontWeight: TYPOGRAPHY.styles.h3.fontWeight,
    letterSpacing: TYPOGRAPHY.styles.h3.letterSpacing,
    color: COLORS.text.primary,
    marginTop: 10,
    textAlign: 'center',
  },
  weatherSheetSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    marginTop: 6,
    textAlign: 'center',
  },
  weatherWearBlock: {
    gap: 16,
    marginBottom: 20,
  },
  weatherWearRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weatherWearTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: 6,
  },
  weatherBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.neutral.gray[200],
    overflow: 'hidden',
  },
  weatherBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  weatherWearReason: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    marginTop: 3,
    lineHeight: 14,
  },
  weatherWearPct: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    marginLeft: 8,
    minWidth: 40,
    textAlign: 'right',
  },
  weatherTipsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: BORDERS.radius.card?.lg ?? BORDERS.radius.lg,
    backgroundColor: COLORS.success.light,
    borderWidth: 1,
    borderColor: COLORS.success.main,
    marginBottom: 20,
  },
  weatherTipsText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  weatherEntendidoBtn: {
    backgroundColor: COLORS.primary[500],
    borderRadius: BORDERS.radius.button?.md ?? BORDERS.radius.full,
    paddingVertical: 14,
    alignItems: 'center',
  },
  weatherEntendidoText: {
    color: COLORS.text.inverse,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontSize: TYPOGRAPHY.fontSize.md,
  },

  tripHint: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    lineHeight: 21,
    marginTop: 0,
    marginBottom: 0,
  },
  telemetryCtaWrap: {
    width: '100%',
    marginTop: SPACING.xs,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,11,13,0.45)',
    justifyContent: 'flex-end',
  },

  // Trip completion modal
  tripModal: {
    marginHorizontal: 20,
    borderRadius: BORDERS.radius.xl,
    overflow: 'hidden',
    alignSelf: 'center',
    width: SCREEN_WIDTH - 40,
    backgroundColor: COLORS.background.paper,
    ...SHADOWS.lg,
  },
  tripModalContent: {
    padding: 28,
    alignItems: 'center',
  },
  tripModalIcon: {
    width: 64,
    height: 64,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.success.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  tripModalTitle: {
    fontSize: TYPOGRAPHY.styles.h3.fontSize,
    fontWeight: TYPOGRAPHY.styles.h3.fontWeight,
    letterSpacing: TYPOGRAPHY.styles.h3.letterSpacing,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  tripModalSub: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    marginBottom: 20,
  },
  tripModalStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  tripModalStat: {
    alignItems: 'center',
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: 1,
    borderColor: COLORS.border.light,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: BORDERS.radius.md,
    minWidth: 92,
  },
  tripModalStatValue: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  tripModalStatLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  tripModalHint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginBottom: 20,
  },
  tripConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary[500],
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: BORDERS.radius.button?.md ?? BORDERS.radius.full,
    width: '100%',
    marginBottom: 10,
  },
  tripConfirmText: {
    color: COLORS.text.inverse,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  tripDismissBtn: {
    paddingVertical: 10,
  },
  tripDismissText: {
    color: COLORS.text.tertiary,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
});

export default UserPanelScreen;
