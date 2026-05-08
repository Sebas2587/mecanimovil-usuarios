import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  FlatList,
  RefreshControl,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { showAlert } from '../../utils/platformAlert';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Car,
  ChevronDown,
  Play,
  Square,
  Gauge,
  Shield,
  TrendingUp,
  Wrench,
  ClipboardList,
  Store,
  MessageCircle,
  Bell,
  User,
  Sparkles,
  X,
  Check,
  Plus,
  Zap,
  CloudRain,
  Disc,
  Wind,
  Droplets,
  Users,
  Navigation,
  MapPin,
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
import { useVehiclesHealth } from '../../hooks/useVehicles';
import { useUserAddresses } from '../../hooks/useAddress';
import { getWeatherPrediction } from '../../services/weatherService';
import { getNearbyProvidersForPanel } from '../../services/providers';
import { getActividadMercadoVehiculo } from '../../services/user';
import { geocodeAddress } from '../../services/location';
import AddressSelectionModal from '../../components/location/AddressSelectionModal';
import { resolveVehicleHealthPct } from '../../utils/healthFormat';
import { solicitudVisibleParaVehiculoDashboard } from '../../utils/solicitudVehicle';
import UserPanelSkeleton from '../../components/utils/UserPanelSkeleton';
import ProviderPreviewCard from '../../components/home/ProviderPreviewCard';
import { formatProviderForCard } from '../../utils/providerUtils';

import { COLORS, SPACING, BORDERS, TYPOGRAPHY, SHADOWS } from '../../design-system/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const H_PAD = SPACING.container.horizontal;
// On web (desktop/tablet), cap the layout reference width so cards don't stretch
// to full browser viewport. 480px matches a large phone; feels natural on desktop too.
const LAYOUT_WIDTH = Platform.OS === 'web' ? Math.min(SCREEN_WIDTH, 480) : SCREEN_WIDTH;
const GRID_CARD_W = (LAYOUT_WIDTH - H_PAD * 2 - CARD_GAP) / 2;
const QUICK_ACTION_CARD_W = GRID_CARD_W;
const QUICK_ACTION_SNAP_INTERVAL = QUICK_ACTION_CARD_W + CARD_GAP;
const TAB_BAR_BASE_HEIGHT = 64;
const SCROLL_BOTTOM_GAP = 10;

const formatCLP = (value) => {
  if (!value || value <= 0) return '--';
  const formatted = Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$${formatted}`;
};

const getHealthColor = (score) => {
  if (score >= 70) return COLORS.success.main;
  if (score >= 40) return COLORS.warning.main;
  return COLORS.error.main;
};

const getHealthLabel = (score) => {
  if (score >= 70) return 'Óptimo';
  if (score >= 40) return 'Atención';
  return 'Crítico';
};

const formatDuration = (ms) => {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const formatKm = (km) => {
  if (km == null) return '0';
  return Math.round(km).toLocaleString('es-CL');
};

function resolveVehicleMarcaId(vehicle) {
  if (!vehicle) return null;
  if (typeof vehicle.marca === 'number') return vehicle.marca;
  if (vehicle.marca && typeof vehicle.marca === 'object' && vehicle.marca.id != null) {
    return Number(vehicle.marca.id);
  }
  if (vehicle.marca_id != null) return Number(vehicle.marca_id);
  return null;
}

function coordsFromSavedAddress(addr) {
  if (!addr?.ubicacion?.coordinates || addr.ubicacion.coordinates.length < 2) return null;
  const [lng, lat] = addr.ubicacion.coordinates;
  const la = Number(lat);
  const lo = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
  return { lat: la, lng: lo };
}

// ─────────────────────────────────────────────
// Card local (paper + hairline + sm shadow)
// ─────────────────────────────────────────────
const Card = ({ children, style, onPress, innerStyle }) => {
  const inner = (
    <View style={[styles.card, style]}>
      <View style={[styles.cardInner, innerStyle]}>{children}</View>
    </View>
  );
  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
};

const SoftButton = ({ onPress, children, variant }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.softBtnWrap}>
    <View
      style={[
        styles.softBtnInner,
        variant === 'stop' ? styles.softBtnInnerStop : styles.softBtnInnerPrimary,
      ]}
    >
      {children}
    </View>
  </TouchableOpacity>
);

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

  useFocusEffect(
    useCallback(() => {
      cargarSolicitudesActivas();
    }, [cargarSolicitudesActivas])
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
        sub: 'Chats con proveedores',
        iconBg: COLORS.neutral.gray[200],
        icon: <MessageCircle size={22} color={COLORS.text.primary} />,
        onPress: () => navigation.navigate(ROUTES.CHATS_LIST),
      },
    ],
    [navigation, selectedVehicle, activeSolicitudesCount],
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

  const nearbyPageWidth = SCREEN_WIDTH;
  const nearbyCardW = GRID_CARD_W;
  const nearbyPages = useMemo(() => {
    const list = panelNearbyProviders;
    const pages = [];
    for (let i = 0; i < list.length; i += 2) {
      pages.push(list.slice(i, i + 2));
    }
    return pages;
  }, [panelNearbyProviders]);

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
      extras.push(refetchPanelNearby(), refetchPanelActivity());
    }
    await Promise.all([
      refetchVehicles(),
      cargarSolicitudesActivas(),
      refetchWeather(),
      ...extras,
    ]);
  }, [
    refetchVehicles,
    cargarSolicitudesActivas,
    refetchWeather,
    selectedVehicle?.id,
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
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Hola, {user?.first_name || 'Conductor'}</Text>
            {addressList.length > 0 ? (
              <TouchableOpacity
                style={styles.addressSelectorBtn}
                onPress={() => setAddAddressModalOpen(true)}
                activeOpacity={0.7}
              >
                <MapPin size={13} color={COLORS.primary[500]} />
                <Text style={styles.addressSelectorText} numberOfLines={1}>
                  {selectedAddress?.etiqueta || 'Dirección'}: {selectedAddress?.direccion || '—'}
                </Text>
                <ChevronDown size={14} color={COLORS.text.tertiary} />
              </TouchableOpacity>
            ) : (
              <View style={styles.subtitleRow}>
                <Sparkles size={14} color={COLORS.primary[500]} />
                <Text style={styles.subtitle}>Dashboard Predictivo</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => navigation.navigate(ROUTES.NOTIFICATION_CENTER)}
            activeOpacity={0.85}
          >
            <Bell size={20} color={COLORS.text.primary} />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerAvatar}
            onPress={() => navigation.navigate(ROUTES.PROFILE)}
            activeOpacity={0.85}
          >
            {user?.foto_perfil_url || user?.foto_perfil ? (
              <Image
                source={{ uri: user.foto_perfil_url || user.foto_perfil }}
                style={styles.avatarImg}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.avatarImg, styles.avatarFallback]}>
                <User size={18} color={COLORS.primary[500]} />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Vehicle Selector */}
        {vehicles.length > 0 ? (
          <Card onPress={() => setSelectorVisible(true)} style={{ marginBottom: 16 }}>
            <View style={styles.selectorRow}>
              {selectedVehicle?.foto ? (
                <Image
                  source={{ uri: selectedVehicle.foto }}
                  style={styles.selectorThumb}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.selectorThumb, styles.selectorThumbFallback]}>
                  <Car size={22} color={COLORS.primary[500]} />
                </View>
              )}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.selectorTitle} numberOfLines={1}>
                  {selectedVehicle?.marca_nombre || selectedVehicle?.marca || '—'}{' '}
                  {selectedVehicle?.modelo_nombre || selectedVehicle?.modelo || ''}
                </Text>
                <Text style={styles.selectorSub}>
                  {selectedVehicle?.year || ''} · {selectedVehicle?.patente || ''}
                </Text>
              </View>
              <ChevronDown size={20} color={COLORS.text.tertiary} />
            </View>
          </Card>
        ) : vehiclesLoading ? (
          <Card style={{ marginBottom: 16, alignItems: 'center', paddingVertical: 32 }}>
            <ActivityIndicator color={COLORS.primary[500]} size="large" />
            <Text style={[styles.emptyText, { marginTop: 12 }]}>Cargando vehículos...</Text>
          </Card>
        ) : (
          <Card style={{ marginBottom: 16 }}>
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <View style={styles.emptyIconWrap}>
                <Car size={32} color={COLORS.primary[500]} />
              </View>
              <Text style={styles.emptyTitle}>Sin vehículos registrados</Text>
              <Text style={styles.emptyText}>
                Registra tu primer vehículo para desbloquear el dashboard predictivo, telemetría y
                salud IA.
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => navigation.navigate(ROUTES.CREAR_VEHICULO)}
                activeOpacity={0.85}
              >
                <Plus size={18} color={COLORS.text.inverse} />
                <Text style={styles.emptyBtnText}>Agregar Vehículo</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Quick Actions */}
        <ScrollView
          horizontal
          nestedScrollEnabled={Platform.OS !== 'web'}
          showsHorizontalScrollIndicator={Platform.OS === 'web'}
          decelerationRate={Platform.OS === 'web' ? undefined : 'fast'}
          snapToInterval={Platform.OS === 'web' ? undefined : QUICK_ACTION_SNAP_INTERVAL}
          snapToAlignment={Platform.OS === 'web' ? undefined : 'start'}
          disableIntervalMomentum={Platform.OS === 'web' ? undefined : true}
          contentContainerStyle={styles.quickScrollContent}
          style={[styles.quickScrollOuter, Platform.OS === 'web' && { overflow: 'scroll' }]}
          keyboardShouldPersistTaps="handled"
        >
          {quickActionItems.map((it) => (
            <Card
              key={it.key}
              style={[styles.quickMgmtCardScroll, { width: QUICK_ACTION_CARD_W }]}
              innerStyle={styles.quickMgmtInner}
              onPress={it.onPress}
            >
              <View style={[styles.quickMgmtIconBox, { backgroundColor: it.iconBg }]}>
                {it.icon}
              </View>
              <View style={styles.quickMgmtTextCol}>
                <Text style={styles.quickMgmtTitle} numberOfLines={1}>
                  {it.title}
                </Text>
                <Text style={styles.quickMgmtSub} numberOfLines={2}>
                  {it.sub}
                </Text>
              </View>
            </Card>
          ))}
        </ScrollView>

        {/* Hero (valuation + health) */}
        {selectedVehicle && (
          <Card style={{ marginBottom: 16 }}>
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
              >
                <View
                  style={[styles.healthCircle, { borderColor: getHealthColor(healthScore) }]}
                >
                  <Text
                    style={[styles.healthCircleValue, { color: getHealthColor(healthScore) }]}
                  >
                    {Math.round(healthScore)}
                  </Text>
                  <Text style={styles.healthCircleUnit}>%</Text>
                </View>
                <Text
                  style={[styles.healthCircleLabel, { color: getHealthColor(healthScore) }]}
                >
                  {getHealthLabel(healthScore)}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.odometerRow}>
              <Gauge size={14} color={COLORS.text.tertiary} />
              <Text style={styles.odometerText}>{formatKm(odometer)} km</Text>
              <View style={styles.odometerDot} />
              <Shield size={14} color={COLORS.text.tertiary} />
              <Text style={styles.odometerText}>{selectedVehicle?.tipo_motor || 'Motor'}</Text>
            </View>
          </Card>
        )}

        {/* Telemetry */}
        {selectedVehicle && (
          <Card style={styles.telemetryCard}>
            <View style={styles.telemetryTopRow}>
              <Text style={styles.telemetryConsoleLabel}>CAPTURA TELEMETRÍA</Text>
            </View>

            <View style={styles.telemetryMainRow}>
              <View style={styles.telemetryKmBlock}>
                <Text style={styles.telemetryKmHuge}>{tripKm.toFixed(1)}</Text>
                <Text style={styles.telemetryKmUnit}>km</Text>
                {tripActive && (
                  <View style={styles.telemetrySubStats}>
                    <Text style={styles.telemetrySubStatText}>
                      {formatDuration(tripElapsed)}
                    </Text>
                    <Text style={styles.telemetrySubStatSep}>·</Text>
                    <Text style={styles.telemetrySubStatText}>{currentSpeed} km/h</Text>
                  </View>
                )}
              </View>
            </View>

            {!tripActive && (
              <Text style={styles.tripHint}>
                Rastrea kilómetros en tiempo real vía GPS para actualizar automáticamente la salud
                de tu vehículo.
              </Text>
            )}

            {tripActive ? (
              <SoftButton onPress={stopTrip} variant="stop">
                <Square size={16} color={COLORS.text.inverse} fill={COLORS.text.inverse} />
                <Text style={styles.softBtnTextStop}>Detener viaje</Text>
              </SoftButton>
            ) : (
              <SoftButton onPress={startTrip}>
                <Play size={16} color={COLORS.text.inverse} fill={COLORS.text.inverse} />
                <Text style={styles.softBtnTextPrimary}>Iniciar viaje</Text>
              </SoftButton>
            )}
          </Card>
        )}

        {/* Weather */}
        {selectedVehicle && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setIsWeatherModalOpen(true)}
            style={styles.weatherCardWrap}
          >
            <Card style={styles.weatherFullGlass} innerStyle={styles.weatherFullInner}>
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
                      <Text style={styles.entornoRiskLabel}>Riesgo conducción</Text>
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
            </Card>
          </TouchableOpacity>
        )}

        {/* Cerca de ti */}
        {selectedVehicle && (
          <View style={{ marginBottom: 18 }}>
            <View style={styles.panelSectionHeader}>
              <Navigation size={16} color={COLORS.primary[500]} />
              <Text style={styles.sectionLabelInline}>Cerca de ti</Text>
            </View>
            <Text style={styles.panelSectionHint}>
              Talleres y mecánicos compatibles con tu {selectedVehicle.marca_nombre || 'marca'}{' '}
              {selectedVehicle.modelo_nombre || ''}, ordenados por distancia desde tu dirección.
            </Text>
            {!selectedAddress ? (
              <Card style={{ paddingVertical: 16 }}>
                <Text style={styles.panelEmptyText}>
                  Agrega y selecciona una dirección para ver proveedores cercanos.
                </Text>
              </Card>
            ) : panelNearbyLoading ? (
              <Card style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator color={COLORS.primary[500]} />
              </Card>
            ) : panelNearbyProviders.length === 0 ? (
              <Card style={{ paddingVertical: 16 }}>
                <Text style={styles.panelEmptyText}>
                  No hay proveedores verificados en este radio para tu marca. Prueba ampliar
                  dirección o crear una solicitud desde Servicios.
                </Text>
              </Card>
            ) : (
              <ScrollView
                horizontal
                pagingEnabled={Platform.OS !== 'web'}
                decelerationRate={Platform.OS === 'web' ? undefined : 'fast'}
                snapToInterval={Platform.OS === 'web' ? undefined : nearbyPageWidth}
                snapToAlignment={Platform.OS === 'web' ? undefined : 'start'}
                showsHorizontalScrollIndicator
                keyboardShouldPersistTaps="handled"
                style={Platform.OS === 'web' ? { overflow: 'scroll' } : undefined}
              >
                {nearbyPages.map((pair, pageIdx) => (
                  <View
                    key={`nearby-page-${pageIdx}`}
                    style={{
                      width: nearbyPageWidth,
                      paddingHorizontal: H_PAD,
                      flexDirection: 'row',
                      gap: CARD_GAP,
                    }}
                  >
                    {pair.map((p) => {
                      const { id: _pid, ...card } = formatProviderForCard(p);
                      const kindLabel = p._panelKind === 'taller' ? 'Taller' : 'A domicilio';
                      return (
                        <ProviderPreviewCard
                          key={`${p._panelKind}-${p.id}`}
                          {...card}
                          provider={p}
                          typeLabel={kindLabel}
                          specialty={card.specialty || 'Servicios y diagnóstico'}
                          kpiBadge={p.kpi_badge || null}
                          appearance="light"
                          width={nearbyCardW}
                          omitRightMargin
                          onPress={() => openProviderFromPanel(p)}
                        />
                      );
                    })}
                    {pair.length === 1 ? <View style={{ width: nearbyCardW }} /> : null}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Demanda */}
        {selectedVehicle && (
          <View style={{ marginBottom: 18 }}>
            <View style={styles.panelSectionHeader}>
              <Users size={16} color={COLORS.primary[500]} />
              <Text style={styles.sectionLabelInline}>Qué piden otros con tu mismo auto</Text>
            </View>
            <Text style={styles.panelSectionHint}>
              Misma marca y modelo ({selectedVehicle.marca_nombre || '—'}{' '}
              {selectedVehicle.modelo_nombre || ''}). A la derecha: personas distintas que pidieron
              cada servicio.
            </Text>
            {panelActivityLoading ? (
              <Card style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator color={COLORS.primary[500]} />
              </Card>
            ) : !panelMarketActivity?.items?.length ? (
              <Card style={{ paddingVertical: 16 }}>
                <Text style={styles.panelEmptyText}>
                  Aún no hay datos para esta marca y modelo. Cuando otros usuarios soliciten
                  servicios con un auto como el tuyo, aparecerán aquí.
                </Text>
              </Card>
            ) : (
              <Card innerStyle={{ paddingVertical: 6, paddingHorizontal: 0 }}>
                {panelMarketActivity.items.map((row, idx) => (
                  <View
                    key={`svc-${row.servicio_id ?? idx}`}
                    style={[
                      styles.marketServicioRow,
                      idx < panelMarketActivity.items.length - 1 && styles.marketServicioRowBorder,
                    ]}
                  >
                    <Text style={styles.marketServicioName} numberOfLines={2}>
                      {row.servicio_nombre || 'Servicio'}
                    </Text>
                    <View style={styles.marketPersonasCol}>
                      <Text style={styles.marketPersonasNum}>
                        {Number(row.personas ?? 0)}
                      </Text>
                      <Text style={styles.marketPersonasLbl}>personas</Text>
                    </View>
                  </View>
                ))}
              </Card>
            )}
          </View>
        )}
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

      {/* ─── Vehicle Selector modal ─── */}
      <Modal
        visible={selectorVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectorVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setSelectorVisible(false)}
            activeOpacity={1}
          />
          <View style={styles.selectorModal}>
            <View style={styles.selectorModalHeader}>
              <Text style={styles.selectorModalTitle}>Seleccionar Vehículo</Text>
              <TouchableOpacity onPress={() => setSelectorVisible(false)} hitSlop={12}>
                <X size={22} color={COLORS.text.tertiary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={vehicles}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingBottom: 16 }}
              renderItem={({ item }) => {
                const isActive = item.id === selectedVehicleId;
                return (
                  <TouchableOpacity
                    style={[
                      styles.selectorListItem,
                      isActive && styles.selectorListItemActive,
                    ]}
                    onPress={() => {
                      setSelectedVehicleId(item.id);
                      setSelectorVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    {item.foto ? (
                      <Image
                        source={{ uri: item.foto }}
                        style={styles.selectorListThumb}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[styles.selectorListThumb, styles.selectorThumbFallback]}>
                        <Car size={18} color={COLORS.primary[500]} />
                      </View>
                    )}
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.selectorListTitle} numberOfLines={1}>
                        {item.marca_nombre || item.marca || ''}{' '}
                        {item.modelo_nombre || item.modelo || ''}
                      </Text>
                      <Text style={styles.selectorListSub}>
                        {item.year || ''} · {formatKm(item.kilometraje)} km · Salud{' '}
                        {Math.round(
                          resolveVehicleHealthPct(
                            item,
                            vehiclesHealth.data?.find((h) => h.vehicleId === item.id)?.health ?? null,
                          ),
                        )}
                        %
                      </Text>
                    </View>
                    {isActive && <Check size={18} color={COLORS.success.main} />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={{ padding: 32, alignItems: 'center' }}>
                  <Text style={styles.emptyText}>No hay vehículos disponibles</Text>
                </View>
              }
            />

            <TouchableOpacity
              style={styles.selectorAddBtn}
              onPress={() => {
                setSelectorVisible(false);
                navigation.navigate(ROUTES.CREAR_VEHICULO);
              }}
              activeOpacity={0.85}
            >
              <Plus size={18} color={COLORS.text.inverse} />
              <Text style={styles.selectorAddText}>Agregar Vehículo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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

  // Card base
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.card?.lg ?? BORDERS.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  cardInner: {
    padding: 16,
  },

  // Soft button (filled, in cards)
  softBtnWrap: {
    marginTop: 6,
  },
  softBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: BORDERS.radius.button?.md ?? BORDERS.radius.full,
  },
  softBtnInnerPrimary: {
    backgroundColor: COLORS.primary[500],
  },
  softBtnInnerStop: {
    backgroundColor: COLORS.error.main,
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: TYPOGRAPHY.styles.h3.fontSize,
    fontWeight: TYPOGRAPHY.styles.h3.fontWeight,
    letterSpacing: TYPOGRAPHY.styles.h3.letterSpacing,
    color: COLORS.text.primary,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  addressSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 5,
    paddingVertical: 3,
  },
  addressSelectorText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.background.paper,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    ...SHADOWS.sm,
  },
  headerAvatar: {
    marginLeft: 8,
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.neutral.gray[100],
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary[50],
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORS.error.main,
    borderRadius: BORDERS.radius.full,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.background.paper,
  },
  bellBadgeText: {
    color: COLORS.text.inverse,
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },

  // Vehicle selector
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectorThumb: {
    width: 48,
    height: 48,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.neutral.gray[100],
  },
  selectorThumbFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary[50],
  },
  selectorTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  selectorSub: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginTop: 2,
  },

  // Empty state
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary[500],
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: BORDERS.radius.button?.md ?? BORDERS.radius.full,
    marginTop: 20,
  },
  emptyBtnText: {
    color: COLORS.text.inverse,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontSize: TYPOGRAPHY.fontSize.base,
  },

  // Hero
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
  healthCircle: {
    width: 72,
    height: 72,
    borderRadius: BORDERS.radius.full,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.gray[100],
  },
  healthCircleValue: {
    fontSize: 22,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  healthCircleUnit: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    marginTop: -2,
  },
  healthCircleLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    marginTop: 4,
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

  // Telemetry
  telemetryCard: {
    marginBottom: 12,
  },
  telemetryTopRow: {
    marginBottom: 6,
  },
  telemetryConsoleLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: 1,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
  },
  telemetryMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  telemetryKmBlock: {
    flex: 1,
    minWidth: 0,
  },
  telemetryKmHuge: {
    fontSize: 30,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    letterSpacing: -1,
    lineHeight: 32,
  },
  telemetryKmUnit: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.tertiary,
    marginTop: -4,
  },
  telemetrySubStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  telemetrySubStatText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  telemetrySubStatSep: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
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
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  entornoRiskPct: {
    fontSize: 28,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    marginBottom: 4,
    letterSpacing: -0.5,
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
    width: 32,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.tertiary,
    textAlign: 'right',
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
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    lineHeight: 17,
    marginBottom: 8,
  },

  panelSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sectionLabelInline: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: -0.25,
    color: COLORS.text.primary,
  },
  panelSectionHint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    lineHeight: 17,
    marginBottom: 12,
  },
  panelEmptyText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  marketServicioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  marketServicioRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  marketServicioName: {
    flex: 1,
    marginRight: 12,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  marketPersonasCol: {
    alignItems: 'flex-end',
    flexShrink: 0,
    minWidth: 56,
  },
  marketPersonasNum: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.primary[500],
  },
  marketPersonasLbl: {
    marginTop: 2,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Quick actions
  quickScrollOuter: {
    marginBottom: 16,
    marginHorizontal: -2,
    ...(Platform.OS === 'web'
      ? {
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
        }
      : null),
  },
  quickScrollContent: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: CARD_GAP,
    paddingVertical: 2,
    paddingRight: 12,
  },
  quickMgmtCardScroll: {
    borderRadius: BORDERS.radius.card?.lg ?? BORDERS.radius.lg,
  },
  quickMgmtInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    minHeight: 76,
  },
  quickMgmtIconBox: {
    width: 44,
    height: 44,
    borderRadius: BORDERS.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickMgmtTextCol: {
    flex: 1,
    minWidth: 0,
  },
  quickMgmtTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  quickMgmtSub: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginTop: 1,
  },

  // Vehicle selector modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,11,13,0.45)',
    justifyContent: 'flex-end',
  },
  selectorModal: {
    maxHeight: '70%',
    borderTopLeftRadius: BORDERS.radius.xl,
    borderTopRightRadius: BORDERS.radius.xl,
    overflow: 'hidden',
    backgroundColor: COLORS.background.paper,
    ...SHADOWS.lg,
  },
  selectorModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  selectorModalTitle: {
    fontSize: TYPOGRAPHY.styles.h3.fontSize,
    fontWeight: TYPOGRAPHY.styles.h3.fontWeight,
    letterSpacing: TYPOGRAPHY.styles.h3.letterSpacing,
    color: COLORS.text.primary,
  },
  selectorListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  selectorListItemActive: {
    backgroundColor: COLORS.primary[50],
  },
  selectorListThumb: {
    width: 44,
    height: 44,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.neutral.gray[100],
  },
  selectorListTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  selectorListSub: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  selectorAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
    backgroundColor: COLORS.primary[500],
  },
  selectorAddText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.inverse,
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
