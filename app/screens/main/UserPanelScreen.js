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
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
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
  HeartPulse,
  Shield,
  TrendingUp,
  Wrench,
  ClipboardList,
  Store,
  MessageCircle,
  Bell,
  User,
  Sparkles,
  TriangleAlert,
  X,
  Check,
  Plus,
  Zap,
  CloudRain,
  Disc,
  Wind,
  Droplets,
} from 'lucide-react-native';

import { ROUTES } from '../../utils/constants';

function resolveHealthComponentLabel(comp) {
  if (!comp) return 'Componente';
  if (typeof comp.nombre === 'string' && comp.nombre.trim()) return comp.nombre.trim();
  if (comp.componente_detail?.nombre) return String(comp.componente_detail.nombre).trim();
  const nested = comp.componente;
  if (nested && typeof nested === 'object' && nested.nombre) return String(nested.nombre).trim();
  if (typeof comp.componente_nombre === 'string' && comp.componente_nombre.trim()) {
    return comp.componente_nombre.trim();
  }
  if (typeof nested === 'string' && nested.trim() && Number.isNaN(Number(nested))) {
    return nested.replace(/_/g, ' ');
  }
  if (typeof comp.slug === 'string' && comp.slug.trim()) return comp.slug.replace(/_/g, ' ');
  return 'Componente';
}
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
import { useUserAddresses } from '../../hooks/useAddress';
import { getWeatherPrediction } from '../../services/weatherService';
import { MapPin } from 'lucide-react-native';
import AddressSelectionModal from '../../components/location/AddressSelectionModal';
import { normalizeKmRemaining, normalizePct } from '../../utils/healthFormat';
import { solicitudVisibleParaVehiculoDashboard } from '../../utils/solicitudVehicle';
import UserPanelSkeleton from '../../components/utils/UserPanelSkeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const H_PAD = 16;
const GRID_CARD_W = (SCREEN_WIDTH - H_PAD * 2 - CARD_GAP) / 2;
/** Alineado con GlassTabBar en AppNavigator (altura base 64 + safe area inferior) */
const TAB_BAR_BASE_HEIGHT = 64;
const SCROLL_BOTTOM_GAP = 10;

const GLASS_BG = Platform.select({
  ios: 'rgba(255,255,255,0.06)',
  android: 'rgba(255,255,255,0.10)',
  default: 'rgba(255,255,255,0.08)',
});
const BLUR_INTENSITY = 30;

const formatCLP = (value) => {
  if (!value || value <= 0) return '--';
  const formatted = Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$${formatted}`;
};

const getHealthColor = (score) => {
  if (score >= 70) return '#10B981';
  if (score >= 40) return '#F59E0B';
  return '#EF4444';
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

// ─────────────────────────────────────────────
// GlassCard — local helper, not a design-system export
// ─────────────────────────────────────────────
const GlassCard = ({ children, style, onPress, innerStyle }) => {
  const inner = (
    <View style={[styles.glassOuter, style]}>
      <BlurView intensity={BLUR_INTENSITY} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[styles.glassInner, { backgroundColor: GLASS_BG }, innerStyle]}>
        {children}
      </View>
    </View>
  );
  if (onPress) {
    return <TouchableOpacity activeOpacity={0.75} onPress={onPress}>{inner}</TouchableOpacity>;
  }
  return inner;
};

const GlassButton = ({ onPress, children, variant }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.glassBtnWrap}>
    <View style={[styles.glassBtnOuter, variant === 'stop' && styles.glassBtnOuterStop]}>
      <BlurView intensity={BLUR_INTENSITY} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[styles.glassBtnInner, variant === 'stop' && styles.glassBtnInnerStop]}>
        {children}
      </View>
    </View>
  </TouchableOpacity>
);

// ─────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────
const UserPanelScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { solicitudesActivas, cargarSolicitudesActivas } = useSolicitudes();
  const { data: unreadData } = useUnreadCount();
  const unreadCount = typeof unreadData === 'number' ? unreadData : (unreadData?.count || 0);

  // Auto-refetch solicitudes activas (y por tanto el contador) cuando volvemos a la pantalla
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
    queryKey: ['userVehicles'],
    queryFn: getUserVehicles,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: true,
    select: useCallback((d) => (Array.isArray(d) ? d : d?.results || []), []),
  });

  const vehicles = useMemo(() => vehiclesRaw || [], [vehiclesRaw]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      refetchVehicles();
    }
  }, [refetchVehicles]);

  const showUserPanelSkeleton = vehiclesLoading || vehiclesFetching;

  // Auto-select first vehicle
  useEffect(() => {
    if (vehicles.length > 0 && !selectedVehicleId) {
      setSelectedVehicleId(vehicles[0].id);
    }
    if (vehicles.length > 0 && selectedVehicleId) {
      const exists = vehicles.some((v) => v.id === selectedVehicleId);
      if (!exists) setSelectedVehicleId(vehicles[0].id);
    }
  }, [vehicles, selectedVehicleId]);

  // ── Derived data ──
  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) || null,
    [vehicles, selectedVehicleId]
  );

  // Prefetch services, categories, and health for selected vehicle so CrearSolicitud loads instantly
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

  const healthScore = normalizePct(selectedVehicle?.health_score ?? 0);
  const healthReport = useMemo(() => selectedVehicle?.health_report || [], [selectedVehicle]);

  const valuation = selectedVehicle?.precio_sugerido_final || selectedVehicle?.precio_mercado_promedio || 0;
  const marketPrice = selectedVehicle?.precio_mercado_promedio || 0;
  const priceDelta = valuation && marketPrice ? valuation - marketPrice : 0;
  const odometer = selectedVehicle?.kilometraje || 0;

  const criticalComponents = useMemo(() => {
    return [...healthReport]
      .filter((c) => {
        const level = c.nivel_alerta || c.status || 'OPTIMO';
        return level !== 'OPTIMO';
      })
      .sort((a, b) => normalizePct(a.salud_porcentaje ?? a.salud ?? 100) - normalizePct(b.salud_porcentaje ?? b.salud ?? 100))
      .slice(0, 3);
  }, [healthReport]);

  const activeSolicitudesCount = useMemo(() => {
    if (!Array.isArray(solicitudesActivas)) return 0;
    const vid = selectedVehicle?.id ?? null;
    return solicitudesActivas.filter((s) => solicitudVisibleParaVehiculoDashboard(s, vid)).length;
  }, [solicitudesActivas, selectedVehicle?.id]);

  // ── User addresses ──
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

  // ── Weather prediction ──
  // Re-fetches immediately when selectedAddressId changes (staleTime: 0).
  // Uses forceRefresh to bypass Django cache when user explicitly switches address.
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
    // Alineado con WEATHER_CACHE_TTL del backend (15 min): no satura Open-Meteo ni la API.
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
        err?.message || 'No se pudo iniciar el rastreo de ubicación. Verifica permisos de ubicación en el navegador.'
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
      const avgSpd = durationSec > 0 ? (tripKm / (durationSec / 3600)) : 0;

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

      const nuevoKm = result?.km_odometro_nuevo ?? result?.kilometraje_actual ?? Math.round(odometer + tripKm);

      showAlert(
        'Viaje Registrado',
        `Se registraron ${tripKm.toFixed(1)} km. Nuevo odómetro: ${formatKm(nuevoKm)} km.\nLas métricas de salud se actualizarán automáticamente.`,
      );
    } catch (err) {
      const isTimeout = err?.code === 'ECONNABORTED' || err?.message?.includes('timeout');
      if (isTimeout) {
        showAlert(
          'Registro lento',
          'El servidor tardó en responder. Es posible que el viaje se haya registrado correctamente. Verifica el odómetro en unos segundos.',
        );
      } else {
        const msg = err?.response?.data?.detail
          || err?.response?.data?.km_recorridos?.[0]
          || err?.message
          || 'Error desconocido';
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
    await Promise.all([refetchVehicles(), cargarSolicitudesActivas(), refetchWeather()]);
  }, [refetchVehicles, cargarSolicitudesActivas, refetchWeather]);

  // ── Helpers ──
  const avgSpeed = tripElapsed > 0 ? (tripKm / (tripElapsed / 3600000)) : 0;

  const weatherAvailable = weatherData?.available === true;
  const weatherComponents = weatherData?.components || [];
  const frenoComp = weatherComponents.find((c) => c.type === 'frenos');
  const neumaComp = weatherComponents.find((c) => c.type === 'neumaticos');
  const bateriaComp = weatherComponents.find((c) => c.type === 'bateria');
  const refrigeranteComp = weatherComponents.find((c) => c.type === 'refrigerante');

  const frenoWearPct = frenoComp?.driving_risk ?? frenoComp?.wear_increase ?? 0;
  const gomaWearPct = neumaComp?.driving_risk ?? neumaComp?.wear_increase ?? 0;
  const climateRiskPct = weatherData?.total_wear_risk ?? 0;
  const overallRiskLevel = weatherData?.risk_level || 'optimo';
  const overallRiskLabel = weatherData?.risk_label || '';

  const riskColorMap = {
    critico: '#EF4444',
    alto: '#F97316',
    moderado: '#F59E0B',
    bajo: '#34D399',
    optimo: '#22D3EE',
  };
  const weatherCondition = weatherData?.weather?.condition || '';
  const weatherTemp = weatherData?.weather?.temperature;
  const weatherHumidity = weatherData?.weather?.humidity;
  const weatherCity = weatherData?.weather?.city || '';
  const weatherFetchedAt = weatherData?.fetched_at || '';
  const weatherReportAgeMin = weatherData?.weather?.report_age_min ?? null;
  const weatherAgeLabel = weatherReportAgeMin != null
    ? weatherReportAgeMin < 60
      ? `hace ${weatherReportAgeMin} min`
      : `hace ${Math.round(weatherReportAgeMin / 60)}h`
    : weatherFetchedAt ? weatherFetchedAt : '';
  const aiInsight = weatherData?.ai_insight || '';
  // ─────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────
  if (showUserPanelSkeleton) {
    return (
      <View style={styles.container}>
        <View style={StyleSheet.absoluteFill}>
          <LinearGradient colors={['#030712', '#020617', '#030712']} style={StyleSheet.absoluteFill} />
        </View>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <UserPanelSkeleton tabBarHeight={TAB_BAR_BASE_HEIGHT + insets.bottom} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Background layer */}
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={['#030712', '#020617', '#030712']} style={StyleSheet.absoluteFill} />
      </View>

      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

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
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#10B981" />}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Hola, {user?.first_name || 'Conductor'}</Text>
            {addressList.length > 0 ? (
              <TouchableOpacity
                style={styles.addressSelectorBtn}
                onPress={() => setAddAddressModalOpen(true)}
                activeOpacity={0.7}
              >
                <MapPin size={13} color="#22D3EE" />
                <Text style={styles.addressSelectorText} numberOfLines={1}>
                  {selectedAddress?.etiqueta || 'Dirección'}: {selectedAddress?.direccion || '—'}
                </Text>
                <ChevronDown size={14} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            ) : (
              <View style={styles.subtitleRow}>
                <Sparkles size={14} color="#00A8E8" />
                <Text style={styles.subtitle}>Dashboard Predictivo</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.navigate(ROUTES.NOTIFICATION_CENTER)}>
            <Bell size={20} color="#E5E7EB" />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerAvatar} onPress={() => navigation.navigate(ROUTES.PROFILE)}>
            {user?.foto_perfil_url || user?.foto_perfil ? (
              <Image source={{ uri: user.foto_perfil_url || user.foto_perfil }} style={styles.avatarImg} contentFit="cover" />
            ) : (
              <View style={[styles.avatarImg, styles.avatarFallback]}>
                <User size={18} color="#A5B4FC" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Vehicle Selector ── */}
        {vehicles.length > 0 ? (
          <GlassCard onPress={() => setSelectorVisible(true)} style={{ marginBottom: 16 }}>
            <View style={styles.selectorRow}>
              {selectedVehicle?.foto ? (
                <Image source={{ uri: selectedVehicle.foto }} style={styles.selectorThumb} contentFit="cover" />
              ) : (
                <View style={[styles.selectorThumb, styles.selectorThumbFallback]}>
                  <Car size={22} color="#007EA7" />
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
              <ChevronDown size={20} color="rgba(255,255,255,0.5)" />
            </View>
          </GlassCard>
        ) : vehiclesLoading ? (
          <GlassCard style={{ marginBottom: 16, alignItems: 'center', paddingVertical: 32 }}>
            <ActivityIndicator color="#00A8E8" size="large" />
            <Text style={[styles.emptyText, { marginTop: 12 }]}>Cargando vehículos...</Text>
          </GlassCard>
        ) : (
          /* Empty state: no vehicles */
          <GlassCard style={{ marginBottom: 16 }}>
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <View style={styles.emptyIconWrap}>
                <Car size={32} color="#007EA7" />
              </View>
              <Text style={styles.emptyTitle}>Sin vehículos registrados</Text>
              <Text style={styles.emptyText}>
                Registra tu primer vehículo para desbloquear el dashboard predictivo, telemetría y salud IA.
              </Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate(ROUTES.CREAR_VEHICULO)}>
                <Plus size={18} color="#FFFFFF" />
                <Text style={styles.emptyBtnText}>Agregar Vehículo</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        )}

        {/* ── Trip Telemetry (pos. 1) ── */}
        {selectedVehicle && (
          <GlassCard style={styles.telemetryCard}>
            <View style={styles.telemetryTopRow}>
              <Text style={styles.telemetryConsoleLabel}>CAPTURA TELEMETRÍA</Text>
            </View>

            <View style={styles.telemetryMainRow}>
              <View style={styles.telemetryKmBlock}>
                <Text style={styles.telemetryKmHuge}>{tripKm.toFixed(1)}</Text>
                <Text style={styles.telemetryKmUnit}>km</Text>
                {tripActive && (
                  <View style={styles.telemetrySubStats}>
                    <Text style={styles.telemetrySubStatText}>{formatDuration(tripElapsed)}</Text>
                    <Text style={styles.telemetrySubStatSep}>·</Text>
                    <Text style={styles.telemetrySubStatText}>{currentSpeed} km/h</Text>
                  </View>
                )}
              </View>
              <View style={styles.telemetryVSep} />
              <View style={styles.telemetryAhorroBlock}>
                <Text style={styles.telemetryAhorroLabel}>Ahorro</Text>
                <Text style={styles.telemetryAhorroValue} numberOfLines={1}>
                  {priceDelta > 0 ? formatCLP(priceDelta) : '—'}
                </Text>
              </View>
            </View>

            {!tripActive && (
              <Text style={styles.tripHint}>
                Rastrea kilómetros en tiempo real vía GPS para actualizar automáticamente la salud de tu vehículo.
              </Text>
            )}

            {tripActive ? (
              <GlassButton onPress={stopTrip} variant="stop">
                <Square size={16} color="#FFFFFF" fill="#FFFFFF" />
                <Text style={styles.glassBtnTextStop}>Detener viaje</Text>
              </GlassButton>
            ) : (
              <GlassButton onPress={startTrip}>
                <Play size={16} color="#E0F2FE" fill="#E0F2FE" />
                <Text style={styles.glassBtnText}>Iniciar viaje</Text>
              </GlassButton>
            )}
          </GlassCard>
        )}

        {/* ── Valuation + Health Hero (debajo de telemetría) ── */}
        {selectedVehicle && (
          <GlassCard style={{ marginBottom: 16 }}>
            <View style={styles.heroRow}>
              {/* Valuation */}
              <View style={{ flex: 1 }}>
                <View style={styles.labelRow}>
                  <TrendingUp size={14} color="#10B981" />
                  <Text style={styles.labelText}>Valor Estimado</Text>
                </View>
                <Text style={styles.heroPrice}>{formatCLP(valuation)}</Text>
                {priceDelta !== 0 && (
                  <Text style={[styles.heroDelta, { color: priceDelta >= 0 ? '#10B981' : '#EF4444' }]}>
                    {priceDelta >= 0 ? '+' : ''}{formatCLP(Math.abs(priceDelta))} vs mercado
                  </Text>
                )}
              </View>

              {/* Health Circle */}
              <TouchableOpacity
                style={styles.healthCircleWrap}
                onPress={() => navigation.navigate(ROUTES.VEHICLE_HEALTH, { vehicleId: selectedVehicle.id, vehicle: selectedVehicle })}
                activeOpacity={0.7}
              >
                <View style={[styles.healthCircle, { borderColor: getHealthColor(healthScore) }]}>
                  <Text style={[styles.healthCircleValue, { color: getHealthColor(healthScore) }]}>
                    {healthScore}
                  </Text>
                  <Text style={styles.healthCircleUnit}>%</Text>
                </View>
                <Text style={[styles.healthCircleLabel, { color: getHealthColor(healthScore) }]}>
                  {getHealthLabel(healthScore)}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Odometer row */}
            <View style={styles.odometerRow}>
              <Gauge size={14} color="rgba(255,255,255,0.4)" />
              <Text style={styles.odometerText}>{formatKm(odometer)} km</Text>
              <View style={styles.odometerDot} />
              <Shield size={14} color="rgba(255,255,255,0.4)" />
              <Text style={styles.odometerText}>{selectedVehicle?.tipo_motor || 'Motor'}</Text>
            </View>
          </GlassCard>
        )}

        {/* ── Grid 50/50: Entorno (clima) + Salud predictiva (donde estaba valor estimado) ── */}
        {selectedVehicle && (
          <View style={styles.predictiveGrid}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setIsWeatherModalOpen(true)}
              style={styles.predictiveColFill}
            >
              <GlassCard style={styles.predictiveHalfGlass} innerStyle={styles.predictiveHalfInner}>
                <View style={styles.predictiveHalfBody}>
                  {weatherLoading ? (
                    <View style={styles.weatherCardLoading}>
                      <ActivityIndicator color="#22D3EE" size="small" />
                      <Text style={styles.weatherCardLoadingText}>Consultando clima...</Text>
                    </View>
                  ) : !weatherAvailable ? (
                    <View style={styles.weatherCardUnavailable}>
                      <CloudRain size={24} color="rgba(255,255,255,0.25)" />
                      <Text style={styles.weatherCardUnavailableText}>
                        {weatherData?.reason || 'Clima no disponible para esta ubicación.'}
                      </Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.entornoHeader}>
                        <CloudRain size={20} color={riskColorMap[overallRiskLevel] || '#22D3EE'} />
                        <Text style={styles.entornoRiskLabel}>Riesgo conducción</Text>
                      </View>
                      <Text style={[styles.entornoRiskPct, { color: riskColorMap[overallRiskLevel] || '#F87171' }]}>
                        {climateRiskPct}%
                      </Text>
                      {overallRiskLabel !== '' && (
                        <Text style={{ color: riskColorMap[overallRiskLevel] || '#F87171', fontSize: 11, fontWeight: '700', marginBottom: 6 }}>
                          {overallRiskLabel}
                        </Text>
                      )}
                      {weatherCity !== '' && (
                        <Text style={styles.entornoWeatherCity}>
                          {weatherCity} · {weatherCondition} · {weatherTemp != null ? `${weatherTemp}°C` : '—'}
                          {weatherAgeLabel ? ` · ${weatherAgeLabel}` : ''}
                        </Text>
                      )}
                      <View style={styles.microBarRow}>
                        <Text style={styles.microBarLabel}>Frenos</Text>
                        <View style={styles.microBarTrack}>
                          <LinearGradient
                            colors={['rgba(248,113,113,0.9)', 'rgba(239,68,68,0.75)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.microBarFill, { width: `${Math.min(frenoWearPct, 100)}%` }]}
                          />
                        </View>
                        <Text style={styles.microBarPct}>{frenoWearPct}%</Text>
                      </View>
                      <View style={styles.microBarRow}>
                        <Text style={styles.microBarLabel}>Gomas</Text>
                        <View style={styles.microBarTrack}>
                          <LinearGradient
                            colors={['rgba(52,211,153,0.85)', 'rgba(16,185,129,0.7)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.microBarFill, { width: `${Math.min(gomaWearPct, 100)}%` }]}
                          />
                        </View>
                        <Text style={styles.microBarPct}>{gomaWearPct}%</Text>
                      </View>
                      <View style={styles.predictiveClimaTapRow}>
                        <Droplets size={12} color="rgba(255,255,255,0.35)" />
                        <Text style={styles.entornoTapText}>Toca para análisis climático para conducir</Text>
                      </View>
                    </>
                  )}
                </View>
              </GlassCard>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate(ROUTES.VEHICLE_HEALTH, {
                  vehicleId: selectedVehicle.id,
                  vehicle: selectedVehicle,
                })
              }
              style={styles.predictiveColFill}
            >
              <GlassCard style={styles.predictiveHalfGlass} innerStyle={styles.predictiveHalfInner}>
                <View style={styles.predictiveHealthColumn}>
                  <View style={styles.compactHealthHeader}>
                    <HeartPulse size={16} color="#F472B6" />
                    <Text style={styles.compactHealthTitle} numberOfLines={1}>
                      Salud predictiva
                    </Text>
                    <View style={styles.compactHealthLink}>
                      <Text style={styles.compactHealthLinkText}>Ver</Text>
                    </View>
                  </View>

                  <View style={styles.predictiveHealthMain}>
                    <View style={styles.predictiveHealthContent}>
                      <View style={styles.compactProgressTrack}>
                        <LinearGradient
                          colors={[getHealthColor(healthScore), getHealthColor(Math.max(0, healthScore - 20))]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[styles.compactProgressFill, { width: `${Math.min(healthScore, 100)}%` }]}
                        />
                      </View>
                      <Text style={styles.compactProgressLabel}>{healthScore}% salud</Text>

                      {criticalComponents.length > 0 ? (
                        <View style={styles.compactAlertsList}>
                          {criticalComponents.slice(0, 2).map((comp, idx) => {
                            const name = resolveHealthComponentLabel(comp);
                            const pct = normalizePct(comp.salud_porcentaje ?? comp.salud ?? 0);
                            const kmRest = normalizeKmRemaining(comp);
                            const level = comp.nivel_alerta || comp.status || 'ATENCION';
                            const color =
                              level === 'CRITICO' ? '#EF4444' : level === 'URGENTE' ? '#F97316' : '#F59E0B';
                            return (
                              <View key={idx} style={styles.compactAlertRow}>
                                <TriangleAlert size={12} color={color} />
                                <View style={{ flex: 1, marginLeft: 6, minWidth: 0 }}>
                                  <Text style={styles.compactAlertName} numberOfLines={1}>
                                    {name}
                                  </Text>
                                  {kmRest != null && (
                                    <Text style={styles.compactAlertKm} numberOfLines={1}>
                                      ~{formatKm(kmRest)} km
                                    </Text>
                                  )}
                                </View>
                                <Text style={[styles.compactAlertPct, { color }]}>{Math.round(pct)}%</Text>
                              </View>
                            );
                          })}
                        </View>
                      ) : healthReport.length > 0 ? (
                        <View style={styles.compactAllGood}>
                          <Check size={14} color="#10B981" />
                          <Text style={styles.compactAllGoodText} numberOfLines={2}>
                            Óptimo
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.compactSyncHint} numberOfLines={3}>
                          Sincroniza salud para predicciones.
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              </GlassCard>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Quick Actions 2×2 ── */}
        <Text style={styles.sectionLabel}>Acciones Rápidas</Text>
        <View style={styles.quickGrid}>
          {/* Servicios */}
          <GlassCard
            style={styles.quickCard}
            onPress={() =>
              navigation.navigate(
                ROUTES.CREAR_SOLICITUD,
                selectedVehicle ? { vehicle: selectedVehicle, fromDashboard: true } : {}
              )
            }
          >
            <LinearGradient colors={['rgba(99,102,241,0.25)', 'rgba(99,102,241,0.05)']} style={styles.quickIconWrap}>
              <Wrench size={22} color="#A5B4FC" />
            </LinearGradient>
            <Text style={styles.quickTitle}>Servicios</Text>
            <Text style={styles.quickSub}>Pedir servicio</Text>
          </GlassCard>

          {/* Mis Solicitudes */}
          <GlassCard
            style={styles.quickCard}
            onPress={() =>
              navigation.navigate(
                ROUTES.MIS_SOLICITUDES,
                selectedVehicle ? { vehicleId: selectedVehicle.id, vehicle: selectedVehicle } : {}
              )
            }
          >
            <LinearGradient colors={['rgba(16,185,129,0.25)', 'rgba(16,185,129,0.05)']} style={styles.quickIconWrap}>
              <ClipboardList size={22} color="#6EE7B7" />
            </LinearGradient>
            <Text style={styles.quickTitle}>Solicitudes</Text>
            <Text style={styles.quickSub}>
              {activeSolicitudesCount > 0 ? `${activeSolicitudesCount} activa${activeSolicitudesCount > 1 ? 's' : ''}` : 'Mis solicitudes'}
            </Text>
          </GlassCard>

          {/* Gestionar venta */}
          <GlassCard
            style={styles.quickCard}
            onPress={() =>
              selectedVehicle
                ? navigation.navigate(ROUTES.SELL_VEHICLE, { vehicle: selectedVehicle, vehicleId: selectedVehicle.id })
                : navigation.navigate(ROUTES.MARKETPLACE)
            }
          >
            <LinearGradient colors={['rgba(245,158,11,0.25)', 'rgba(245,158,11,0.05)']} style={styles.quickIconWrap}>
              <Store size={22} color="#FCD34D" />
            </LinearGradient>
            <Text style={styles.quickTitle}>Gestionar venta</Text>
            <Text style={styles.quickSub}>Vende tu vehículo</Text>
          </GlassCard>

          {/* Mensajes */}
          <GlassCard
            style={styles.quickCard}
            onPress={() => navigation.navigate(ROUTES.CHATS_LIST)}
          >
            <LinearGradient colors={['rgba(236,72,153,0.25)', 'rgba(236,72,153,0.05)']} style={styles.quickIconWrap}>
              <MessageCircle size={22} color="#F9A8D4" />
            </LinearGradient>
            <Text style={styles.quickTitle}>Mensajes</Text>
            <Text style={styles.quickSub}>Chats con proveedores</Text>
          </GlassCard>
        </View>
      </ScrollView>

      {/* ─── Modal análisis clima / entorno ─── */}
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
            <BlurView intensity={BLUR_INTENSITY} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.weatherSheetTint} />
            <View style={styles.weatherSheetHandle} />
            <View style={styles.weatherSheetContent}>
              <View style={styles.weatherSheetHeader}>
                <CloudRain size={40} color="#22D3EE" />
                <Text style={styles.weatherSheetTitle}>Análisis climático para conducir</Text>
                {weatherAvailable && (
                  <Text style={styles.weatherSheetSubtitle}>
                    {weatherCity} · {weatherCondition} · {weatherTemp != null ? `${weatherTemp}°C` : '—'} · Humedad {weatherHumidity ?? '—'}%
                    {weatherAgeLabel ? `\nReporte: ${weatherAgeLabel}` : ''}
                  </Text>
                )}
              </View>

              <View style={styles.weatherWearBlock}>
                {weatherComponents.map((comp) => {
                  const lvl = comp.risk_level || 'optimo';
                  const lvlColor = riskColorMap[lvl] || '#9CA3AF';
                  const barGradient = {
                    critico: ['rgba(239,68,68,0.95)', 'rgba(185,28,28,0.85)'],
                    alto: ['rgba(249,115,22,0.9)', 'rgba(234,88,12,0.8)'],
                    moderado: ['rgba(245,158,11,0.9)', 'rgba(217,119,6,0.8)'],
                    bajo: ['rgba(52,211,153,0.85)', 'rgba(16,185,129,0.7)'],
                    optimo: ['rgba(34,211,238,0.85)', 'rgba(6,182,212,0.7)'],
                  };
                  const iconMap = {
                    frenos: <Disc size={18} color={lvlColor} />,
                    neumaticos: <Wind size={18} color={lvlColor} />,
                    bateria: <Zap size={18} color={lvlColor} />,
                    refrigerante: <Droplets size={18} color={lvlColor} />,
                  };
                  const riskPct = comp.driving_risk ?? comp.wear_increase ?? 0;
                  return (
                    <View key={comp.type} style={styles.weatherWearRow}>
                      {iconMap[comp.type] || <Disc size={18} color="#9CA3AF" />}
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Text style={styles.weatherWearTitle}>{comp.name}</Text>
                          {comp.salud_actual != null && (
                            <Text style={{ fontSize: 11, color: lvlColor, fontWeight: '600', marginLeft: 6 }}>
                              Salud {comp.salud_actual}%
                            </Text>
                          )}
                        </View>
                        <View style={styles.weatherBarTrack}>
                          <LinearGradient
                            colors={barGradient[lvl] || barGradient.optimo}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.weatherBarFill, { width: `${Math.min(riskPct, 100)}%` }]}
                          />
                        </View>
                        <Text style={[styles.weatherWearReason, { color: lvlColor }]} numberOfLines={2}>
                          {comp.risk_label || comp.reason}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', minWidth: 50 }}>
                        <Text style={[styles.weatherWearPct, { color: lvlColor }]}>{riskPct}%</Text>
                        {(comp.wear_increase > 0) && (
                          <Text style={{ color: '#F59E0B', fontSize: 10, fontWeight: '600' }}>
                            +{comp.wear_increase}% clima
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>

              <View style={styles.weatherTipsBox}>
                <Zap size={18} color="#34D399" />
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

      {/* ─── Vehicle Selector Modal ─── */}
      <Modal visible={selectorVisible} transparent animationType="slide" onRequestClose={() => setSelectorVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setSelectorVisible(false)} activeOpacity={1} />
          <View style={styles.selectorModal}>
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,23,42,0.85)' }]} />

            <View style={styles.selectorModalHeader}>
              <Text style={styles.selectorModalTitle}>Seleccionar Vehículo</Text>
              <TouchableOpacity onPress={() => setSelectorVisible(false)} hitSlop={12}>
                <X size={22} color="#9CA3AF" />
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
                    style={[styles.selectorListItem, isActive && styles.selectorListItemActive]}
                    onPress={() => {
                      setSelectedVehicleId(item.id);
                      setSelectorVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    {item.foto ? (
                      <Image source={{ uri: item.foto }} style={styles.selectorListThumb} contentFit="cover" />
                    ) : (
                      <View style={[styles.selectorListThumb, styles.selectorThumbFallback]}>
                        <Car size={18} color="#007EA7" />
                      </View>
                    )}
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.selectorListTitle} numberOfLines={1}>
                        {item.marca_nombre || item.marca || ''} {item.modelo_nombre || item.modelo || ''}
                      </Text>
                      <Text style={styles.selectorListSub}>
                        {item.year || ''} · {formatKm(item.kilometraje)} km · Salud {item.health_score ?? 0}%
                      </Text>
                    </View>
                    {isActive && <Check size={18} color="#10B981" />}
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
              activeOpacity={0.8}
            >
              <Plus size={18} color="#A5B4FC" />
              <Text style={styles.selectorAddText}>Agregar Vehículo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Trip Completion Modal ─── */}
      <Modal visible={tripCompletionVisible} transparent animationType="fade" onRequestClose={dismissTrip}>
        <View style={[styles.modalOverlay, { justifyContent: 'center' }]}>
          <View style={styles.tripModal}>
            <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,23,42,0.9)' }]} />

            <View style={styles.tripModalContent}>
              <View style={styles.tripModalIcon}>
                <Check size={32} color="#10B981" />
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
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Check size={18} color="#FFFFFF" />
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

      {/* ─── Modal agregar nueva dirección (glassmorphism) ─── */}
      <AddressSelectionModal
        visible={addAddressModalOpen}
        onClose={() => setAddAddressModalOpen(false)}
        variant="darkGlass"
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

// ──────────────────────────────────────────
// Styles
// ──────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  scrollViewFlex: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: H_PAD,
  },

  // Glass card base
  glassOuter: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 32,
      },
      android: { elevation: 12 },
    }),
  },
  glassInner: {
    padding: 18,
  },
  glassBtnWrap: {
    marginTop: 4,
  },
  glassBtnOuter: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    position: 'relative',
  },
  glassBtnOuterStop: {
    borderColor: 'rgba(248,113,113,0.45)',
  },
  glassBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  glassBtnInnerStop: {
    backgroundColor: 'rgba(239,68,68,0.35)',
  },
  glassBtnText: {
    color: '#E0F2FE',
    fontWeight: '800',
    fontSize: 15,
  },
  glassBtnTextStop: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '500',
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
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  headerAvatar: {
    marginLeft: 8,
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(99,102,241,0.2)',
  },
  bellBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#030712',
  },
  bellBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
  },

  // Vehicle selector
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectorThumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  selectorThumbFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(99,102,241,0.15)',
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  selectorSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 2,
  },

  // Empty state
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(99,102,241,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#007EA7',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 20,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },

  // Hero card
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
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroPrice: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F9FAFB',
    letterSpacing: -0.5,
  },
  heroDelta: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  healthCircleWrap: {
    alignItems: 'center',
    marginLeft: 16,
  },
  healthCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  healthCircleValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  healthCircleUnit: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
    marginTop: -2,
  },
  healthCircleLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  odometerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    gap: 6,
  },
  odometerText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  odometerDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginHorizontal: 4,
  },

  // Card headers
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F9FAFB',
    flex: 1,
  },
  detailLink: {
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  detailLinkText: {
    fontSize: 12,
    color: '#00A8E8',
    fontWeight: '600',
  },

  // Trip telemetry (glass dashboard)
  telemetryCard: {
    marginBottom: 16,
  },
  telemetryTopRow: {
    marginBottom: 12,
  },
  telemetryConsoleLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.55)',
  },
  telemetryMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  telemetryKmBlock: {
    flex: 1,
    minWidth: 0,
  },
  telemetryKmHuge: {
    fontSize: 38,
    fontWeight: '900',
    color: '#F9FAFB',
    letterSpacing: -1.2,
    lineHeight: 42,
  },
  telemetryKmUnit: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
    marginTop: -2,
  },
  telemetrySubStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  telemetrySubStatText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '500',
  },
  telemetrySubStatSep: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.25)',
  },
  telemetryVSep: {
    width: 1,
    alignSelf: 'stretch',
    minHeight: 56,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 14,
  },
  telemetryAhorroBlock: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    maxWidth: SCREEN_WIDTH * 0.32,
  },
  telemetryAhorroLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  telemetryAhorroValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6EE7B7',
  },
  predictiveGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: CARD_GAP,
    marginBottom: 16,
    width: '100%',
  },
  predictiveColFill: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    alignSelf: 'stretch',
  },
  predictiveHalfGlass: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
    marginBottom: 0,
    minHeight: 0,
  },
  predictiveHalfInner: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  predictiveHalfBody: {
    flex: 1,
  },
  predictiveHealthColumn: {
    flex: 1,
    minHeight: 0,
  },
  predictiveHealthMain: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'center',
    paddingVertical: 6,
  },
  predictiveHealthContent: {
    width: '100%',
  },
  predictiveClimaTapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 'auto',
    paddingTop: 8,
  },
  compactHealthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 0,
    flexShrink: 0,
  },
  compactHealthTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  compactHealthLink: {
    paddingVertical: 2,
    paddingLeft: 4,
  },
  compactHealthLinkText: {
    fontSize: 11,
    color: '#00A8E8',
    fontWeight: '600',
  },
  compactProgressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginBottom: 6,
  },
  compactProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  compactProgressLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '600',
    marginBottom: 10,
  },
  compactAlertsList: {
    gap: 8,
  },
  compactAlertRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactAlertName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E5E7EB',
  },
  compactAlertKm: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 1,
  },
  compactAlertPct: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  compactAllGood: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  compactAllGoodText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
    flex: 1,
  },
  compactSyncHint: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.38)',
    lineHeight: 14,
  },
  weatherCardLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  weatherCardLoadingText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
  },
  weatherCardUnavailable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  weatherCardUnavailableText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 16,
  },
  entornoWeatherCity: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
    marginBottom: 8,
    marginTop: -6,
  },
  entornoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  entornoRiskLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  entornoRiskPct: {
    fontSize: 26,
    fontWeight: '900',
    color: '#F87171',
    marginBottom: 10,
  },
  microBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  microBarLabel: {
    width: 44,
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  microBarTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  microBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  microBarPct: {
    width: 32,
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'right',
  },
  entornoTapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  entornoTapText: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.38)',
    fontStyle: 'italic',
  },
  weatherModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  weatherSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    maxHeight: '78%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.35,
        shadowRadius: 32,
      },
      android: { elevation: 24 },
    }),
  },
  weatherSheetTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3,7,18,0.65)',
  },
  weatherSheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
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
    fontSize: 20,
    fontWeight: '800',
    color: '#F9FAFB',
    marginTop: 10,
  },
  weatherSheetSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
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
    fontSize: 13,
    fontWeight: '700',
    color: '#E5E7EB',
    marginBottom: 6,
  },
  weatherBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  weatherBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  weatherWearReason: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 3,
    lineHeight: 14,
  },
  weatherWearPct: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F9FAFB',
    marginLeft: 8,
    minWidth: 40,
    textAlign: 'right',
  },
  weatherTipsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)',
    marginBottom: 20,
  },
  weatherTipsText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#A7F3D0',
    lineHeight: 20,
  },
  weatherEntendidoBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  weatherEntendidoText: {
    color: '#F9FAFB',
    fontWeight: '800',
    fontSize: 16,
  },
  tripHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 19,
    marginBottom: 14,
  },

  // Quick actions grid
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 12,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  quickCard: {
    width: GRID_CARD_W,
  },
  quickIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 2,
  },
  quickSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },

  // Vehicle selector modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  selectorModal: {
    maxHeight: '70%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
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
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  selectorListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  selectorListItemActive: {
    backgroundColor: 'rgba(99,102,241,0.1)',
  },
  selectorListThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  selectorListTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  selectorListSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  selectorAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  selectorAddText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#A5B4FC',
  },

  // Trip completion modal
  tripModal: {
    marginHorizontal: 20,
    borderRadius: 24,
    overflow: 'hidden',
    alignSelf: 'center',
    width: SCREEN_WIDTH - 40,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
      },
      android: { elevation: 16 },
    }),
  },
  tripModalContent: {
    padding: 28,
    alignItems: 'center',
  },
  tripModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16,185,129,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  tripModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F9FAFB',
    marginBottom: 4,
  },
  tripModalSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 20,
  },
  tripModalStats: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  tripModalStat: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  tripModalStatValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F9FAFB',
  },
  tripModalStatLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  tripModalHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 20,
  },
  tripConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007EA7',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
    marginBottom: 10,
  },
  tripConfirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  tripDismissBtn: {
    paddingVertical: 10,
  },
  tripDismissText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default UserPanelScreen;
