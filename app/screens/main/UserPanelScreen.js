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
  Alert,
  RefreshControl,
  Dimensions,
  Platform,
  ActivityIndicator
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
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
  Route,
  Timer,
  Plus,
  Activity,
  CircleDot,
  Zap
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const H_PAD = 16;
const GRID_CARD_W = (SCREEN_WIDTH - H_PAD * 2 - CARD_GAP) / 2;

const GLASS_BG = Platform.select({
  ios: 'rgba(255,255,255,0.06)',
  android: 'rgba(255,255,255,0.10)',
  default: 'rgba(255,255,255,0.08)',
});
const BLUR_INTENSITY = Platform.OS === 'ios' ? 30 : 0;

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
const GlassCard = ({ children, style, onPress }) => {
  const inner = (
    <View style={[styles.glassOuter, style]}>
      <BlurView intensity={BLUR_INTENSITY} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[styles.glassInner, { backgroundColor: GLASS_BG }]}>
        {children}
      </View>
    </View>
  );
  if (onPress) {
    return <TouchableOpacity activeOpacity={0.75} onPress={onPress}>{inner}</TouchableOpacity>;
  }
  return inner;
};

// ─────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────
const UserPanelScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { solicitudesActivas, cargarSolicitudesActivas } = useSolicitudes();

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

  const [tripCoords, setTripCoords] = useState({ start: null, end: null });
  const elapsedRef = useRef(null);

  // ── Data queries ──
  const {
    data: vehiclesRaw,
    isLoading: vehiclesLoading,
    refetch: refetchVehicles,
    isRefetching
  } = useQuery({
    queryKey: ['userVehicles'],
    queryFn: getUserVehicles,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: true,
    select: useCallback((d) => (Array.isArray(d) ? d : d?.results || []), []),
  });

  const vehicles = useMemo(() => vehiclesRaw || [], [vehiclesRaw]);

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

  const healthScore = selectedVehicle?.health_score ?? 0;
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
      .sort((a, b) => (a.salud_porcentaje ?? a.salud ?? 100) - (b.salud_porcentaje ?? b.salud ?? 100))
      .slice(0, 3);
  }, [healthReport]);

  const activeSolicitudesCount = solicitudesActivas?.length || 0;

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
        setTripCoords({
          start: snapshot.startCoords || null,
          end: snapshot.endCoords || null,
        });
      }, 2000);
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
      Alert.alert('Sin vehículo', 'Selecciona un vehículo para iniciar el viaje.');
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
      Alert.alert('Error GPS', err?.message || 'No se pudo iniciar el rastreo GPS en segundo plano.');
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

      Alert.alert(
        'Viaje Registrado',
        `Se registraron ${tripKm.toFixed(1)} km. Nuevo odómetro: ${formatKm(nuevoKm)} km.\nLas métricas de salud se actualizarán automáticamente.`,
      );
    } catch (err) {
      const msg = err?.response?.data?.detail
        || err?.response?.data?.km_recorridos?.[0]
        || err?.message
        || 'Error desconocido';
      Alert.alert('Error al registrar', `No se pudo registrar el viaje: ${msg}`);
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
    await Promise.all([refetchVehicles(), cargarSolicitudesActivas()]);
  }, [refetchVehicles, cargarSolicitudesActivas]);

  // ── Helpers ──
  const avgSpeed = tripElapsed > 0 ? (tripKm / (tripElapsed / 3600000)) : 0;

  // ─────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Background layer */}
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={['#030712', '#0a0f1a', '#030712']} style={StyleSheet.absoluteFill} />
        <View style={styles.blobEmerald} />
        <View style={styles.blobIndigo} />
        <View style={styles.blobCyan} />
      </View>

      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#10B981" />}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Hola, {user?.first_name || 'Conductor'}</Text>
            <View style={styles.subtitleRow}>
              <Sparkles size={14} color="#818CF8" />
              <Text style={styles.subtitle}>Dashboard Predictivo</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.navigate(ROUTES.NOTIFICATION_CENTER)}>
            <Bell size={20} color="#E5E7EB" />
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
                  <Car size={22} color="#6366F1" />
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
            <ActivityIndicator color="#818CF8" size="large" />
            <Text style={[styles.emptyText, { marginTop: 12 }]}>Cargando vehículos...</Text>
          </GlassCard>
        ) : (
          /* Empty state: no vehicles */
          <GlassCard style={{ marginBottom: 16 }}>
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <View style={styles.emptyIconWrap}>
                <Car size={32} color="#6366F1" />
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

        {/* ── Valuation + Health Hero ── */}
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

        {/* ── Trip Telemetry ── */}
        {selectedVehicle && (
          <GlassCard style={{ marginBottom: 16 }}>
            <View style={styles.cardHeader}>
              <Route size={18} color="#06B6D4" />
              <Text style={styles.cardTitle}>Telemetría de Viaje</Text>
              {tripActive && <View style={styles.liveDot} />}
            </View>

            {tripActive ? (
              <>
                <View style={styles.telemetryGrid}>
                  <View style={styles.telemetryItem}>
                    <Text style={styles.telemetryValue}>{tripKm.toFixed(1)}</Text>
                    <Text style={styles.telemetryLabel}>km</Text>
                  </View>
                  <View style={styles.telemetrySep} />
                  <View style={styles.telemetryItem}>
                    <Text style={styles.telemetryValue}>{formatDuration(tripElapsed)}</Text>
                    <Text style={styles.telemetryLabel}>duración</Text>
                  </View>
                  <View style={styles.telemetrySep} />
                  <View style={styles.telemetryItem}>
                    <Text style={styles.telemetryValue}>{avgSpeed.toFixed(0)}</Text>
                    <Text style={styles.telemetryLabel}>km/h</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.tripStopBtn} onPress={stopTrip} activeOpacity={0.8}>
                  <Square size={16} color="#FFFFFF" fill="#FFFFFF" />
                  <Text style={styles.tripStopText}>Detener Viaje</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.tripHint}>
                  Rastrea kilómetros en tiempo real vía GPS para actualizar automáticamente la salud de tu vehículo.
                </Text>
                <TouchableOpacity style={styles.tripStartBtn} onPress={startTrip} activeOpacity={0.8}>
                  <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
                  <Text style={styles.tripStartText}>Iniciar Viaje</Text>
                </TouchableOpacity>
              </>
            )}
          </GlassCard>
        )}

        {/* ── Health Predictive ── */}
        {selectedVehicle && (
          <GlassCard style={{ marginBottom: 20 }}>
            <View style={styles.cardHeader}>
              <HeartPulse size={18} color="#F472B6" />
              <Text style={styles.cardTitle}>Salud Predictiva IA</Text>
              <TouchableOpacity
                style={styles.detailLink}
                onPress={() => navigation.navigate(ROUTES.VEHICLE_HEALTH, { vehicleId: selectedVehicle.id, vehicle: selectedVehicle })}
              >
                <Text style={styles.detailLinkText}>Ver detalle</Text>
              </TouchableOpacity>
            </View>

            {/* Progress bar */}
            <View style={styles.progressTrack}>
              <LinearGradient
                colors={[getHealthColor(healthScore), getHealthColor(Math.max(0, healthScore - 20))]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${Math.min(healthScore, 100)}%` }]}
              />
            </View>
            <Text style={styles.progressLabel}>{healthScore}% salud general</Text>

            {/* Critical components */}
            {criticalComponents.length > 0 ? (
              <View style={styles.alertsList}>
                {criticalComponents.map((comp, idx) => {
                  const name = comp.componente?.nombre || comp.componente_nombre || comp.componente || 'Componente';
                  const pct = comp.salud_porcentaje ?? comp.salud ?? 0;
                  const kmRest = comp.km_estimados_restantes ?? comp.km_restantes ?? null;
                  const level = comp.nivel_alerta || comp.status || 'ATENCION';
                  const color = level === 'CRITICO' ? '#EF4444' : level === 'URGENTE' ? '#F97316' : '#F59E0B';

                  return (
                    <View key={idx} style={styles.alertRow}>
                      <TriangleAlert size={14} color={color} />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.alertName}>{name}</Text>
                        {kmRest != null && (
                          <Text style={styles.alertKm}>~{formatKm(kmRest)} km restantes</Text>
                        )}
                      </View>
                      <Text style={[styles.alertPct, { color }]}>{Math.round(pct)}%</Text>
                    </View>
                  );
                })}
              </View>
            ) : healthReport.length > 0 ? (
              <View style={styles.allGoodRow}>
                <Check size={16} color="#10B981" />
                <Text style={styles.allGoodText}>Todos los componentes en estado óptimo</Text>
              </View>
            ) : (
              <Text style={[styles.tripHint, { marginTop: 8 }]}>
                Sincroniza la salud de tu vehículo para ver predicciones de mantenimiento.
              </Text>
            )}
          </GlassCard>
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
              navigation.navigate(ROUTES.MIS_SOLICITUDES, selectedVehicle ? { vehicleId: selectedVehicle.id } : {})
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

          {/* Marketplace */}
          <GlassCard
            style={styles.quickCard}
            onPress={() =>
              navigation.navigate(ROUTES.MARKETPLACE, selectedVehicle ? { vehicleId: selectedVehicle.id } : {})
            }
          >
            <LinearGradient colors={['rgba(245,158,11,0.25)', 'rgba(245,158,11,0.05)']} style={styles.quickIconWrap}>
              <Store size={22} color="#FCD34D" />
            </LinearGradient>
            <Text style={styles.quickTitle}>Marketplace</Text>
            <Text style={styles.quickSub}>Compra y venta</Text>
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
                        <Car size={18} color="#6366F1" />
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
  scroll: {
    paddingHorizontal: H_PAD,
  },

  // Background blobs
  blobEmerald: {
    position: 'absolute',
    top: -60,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(16,185,129,0.12)',
  },
  blobIndigo: {
    position: 'absolute',
    bottom: 120,
    right: -40,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(99,102,241,0.10)',
  },
  blobCyan: {
    position: 'absolute',
    top: 320,
    right: 40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(6,182,212,0.07)',
  },

  // Glass card base
  glassOuter: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  glassInner: {
    padding: 18,
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
    backgroundColor: '#6366F1',
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
    color: '#818CF8',
    fontWeight: '600',
  },

  // Trip telemetry
  telemetryGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  telemetryItem: {
    flex: 1,
    alignItems: 'center',
  },
  telemetryValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F9FAFB',
    letterSpacing: -0.5,
  },
  telemetryLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
    marginTop: 2,
  },
  telemetrySep: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tripHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 19,
    marginBottom: 14,
  },
  tripStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 14,
  },
  tripStartText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  tripStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 14,
  },
  tripStopText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },

  // Health predictive
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
    marginBottom: 12,
  },
  alertsList: {
    gap: 10,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E5E7EB',
  },
  alertKm: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 1,
  },
  alertPct: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  allGoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  allGoodText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
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
    backgroundColor: '#10B981',
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
