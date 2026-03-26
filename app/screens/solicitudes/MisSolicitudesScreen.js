import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ArrowLeft, ClipboardList } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { ROUTES } from '../../utils/constants';
import SolicitudCard from '../../components/solicitudes/SolicitudCard';
import { useSolicitudes } from '../../context/SolicitudesContext';
import { useQuery } from '@tanstack/react-query';
import { getUserVehicles } from '../../services/vehicle';

const GLASS_BG = Platform.OS === 'ios' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.10)';
const BLUR_I = Platform.OS === 'ios' ? 30 : 0;

const GlassCard = ({ children, style }) => (
  <View style={[glassStyles.wrap, style]}>
    {Platform.OS === 'ios' && <BlurView intensity={BLUR_I} tint="dark" style={StyleSheet.absoluteFill} />}
    <View style={[StyleSheet.absoluteFill, { backgroundColor: GLASS_BG }]} />
    {children}
  </View>
);

const glassStyles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
});

const MisSolicitudesScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const initialFiltroVehiculo = useMemo(() => {
    const vid = route.params?.vehicleId;
    if (vid != null && vid !== '') return Number(vid);
    return route.params?.initialFiltroVehiculo ?? 'todos';
  }, [route.params?.vehicleId, route.params?.initialFiltroVehiculo]);

  const {
    solicitudes,
    solicitudesActivas,
    loading,
    error,
    cargarSolicitudes,
    cargarSolicitudesActivas,
  } = useSolicitudes();

  const [refreshing, setRefreshing] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState(route?.params?.initialFiltroEstado || 'todos');
  const [filtroVehiculo, setFiltroVehiculo] = useState(initialFiltroVehiculo);
  const [showVehicleOptions, setShowVehicleOptions] = useState(false);

  useEffect(() => {
    const vid = route.params?.vehicleId;
    if (vid != null && vid !== '') {
      setFiltroVehiculo(Number(vid));
    }
  }, [route.params?.vehicleId]);

  const { data: vehiclesData = [] } = useQuery({
    queryKey: ['userVehicles'],
    queryFn: getUserVehicles,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    select: (data) => (Array.isArray(data) ? data : data?.results || []),
  });

  const estadosDisponibles = [
    { key: 'todos', label: 'Todas', icon: 'list-outline' },
    { key: 'activas', label: 'Activas', icon: 'flash-outline' },
    { key: 'en_proceso', label: 'En Proceso', icon: 'construct-outline' },
    { key: 'completada', label: 'Completadas', icon: 'checkmark-done-circle-outline' },
    { key: 'historial', label: 'Historial', icon: 'time-outline' },
  ];

  const filtroAEstados = {
    todos: null,
    activas: ['publicada', 'con_ofertas', 'adjudicada', 'pendiente_pago', 'creada', 'seleccionando_servicios'],
    en_proceso: ['pagada', 'en_ejecucion'],
    completada: ['completada'],
    historial: ['expirada', 'cancelada'],
  };

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [])
  );

  const cargarDatos = async () => {
    try {
      await Promise.all([cargarSolicitudes(), cargarSolicitudesActivas()]);
    } catch (e) {
      console.error('Error cargando solicitudes:', e);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await cargarDatos();
    } catch (e) {
      console.error('Error refrescando:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const solicitudesArray = Array.isArray(solicitudes) ? solicitudes : [];

  const solicitudesFiltradasPorEstado =
    filtroEstado === 'todos'
      ? solicitudesArray
      : solicitudesArray.filter((s) => {
          if (!s || !s.estado) return false;
          const estadosPermitidos = filtroAEstados[filtroEstado];
          if (!estadosPermitidos) return false;
          const efectivo = s.estado_efectivo ?? s.estado;
          if (efectivo === 'ofertas_adicionales_pendientes') {
            return filtroEstado === 'activas';
          }
          return estadosPermitidos.includes(s.estado);
        });

  const solicitudesFiltradas = solicitudesFiltradasPorEstado.filter((s) => {
    if (filtroVehiculo === 'todos') return true;
    const vehiculoId = s?.vehiculo?.id ?? s?.vehiculo_id ?? (typeof s?.vehiculo === 'number' ? s.vehiculo : null);
    const esSinVehiculo = s?.sin_vehiculo_registrado === true || vehiculoId == null;
    if (filtroVehiculo === 'sin_vehiculo') return esSinVehiculo;
    const targetId = typeof filtroVehiculo === 'string' ? parseInt(filtroVehiculo, 10) : filtroVehiculo;
    return vehiculoId === targetId;
  });

  const handleSolicitudPress = (solicitud) => {
    const id = solicitud?.id || solicitud?.properties?.id;
    if (!id) {
      Alert.alert('Error', 'No se pudo identificar la solicitud');
      return;
    }
    navigation.navigate(ROUTES.DETALLE_SOLICITUD, { solicitudId: id });
  };

  const renderFilters = () => (
    <View style={styles.filtersWrapper}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
        {estadosDisponibles.map((item) => {
          const isSelected = filtroEstado === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.tab, isSelected && styles.tabActive]}
              onPress={() => setFiltroEstado(item.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, isSelected && styles.tabTextActive]} numberOfLines={1}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderVehicleSelector = () => (
    <View style={styles.vehicleSelectorWrapper}>
      <Text style={styles.vehicleSelectorLabel}>Vehículo</Text>
      <TouchableOpacity
        style={[styles.vehicleSelect, showVehicleOptions && styles.vehicleSelectOpen]}
        activeOpacity={0.8}
        onPress={() => setShowVehicleOptions((prev) => !prev)}
      >
        <Text
          style={[styles.vehicleSelectText, filtroVehiculo === 'todos' ? styles.vehicleSelectPlaceholder : null]}
          numberOfLines={1}
        >
          {filtroVehiculo === 'todos'
            ? 'Todos los vehículos'
            : filtroVehiculo === 'sin_vehiculo'
              ? 'Sin vehículo registrado'
              : (() => {
                  const v = vehiclesData.find((x) => String(x.id) === String(filtroVehiculo));
                  if (!v) return 'Vehículo';
                  return `${v.marca_nombre || v.marca || ''} ${v.modelo_nombre || v.modelo || ''} ${v.year || ''}`.trim();
                })()}
        </Text>
        <Ionicons name={showVehicleOptions ? 'chevron-up' : 'chevron-down'} size={18} color="rgba(255,255,255,0.45)" />
      </TouchableOpacity>

      {showVehicleOptions && (
        <GlassCard style={styles.vehicleOptionsPanel}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vehicleFilterScroll}>
            <TouchableOpacity
              style={[styles.vehicleChip, filtroVehiculo === 'todos' && styles.vehicleChipActive]}
              onPress={() => {
                setFiltroVehiculo('todos');
                setShowVehicleOptions(false);
              }}
            >
              <Text style={[styles.vehicleChipText, filtroVehiculo === 'todos' && styles.vehicleChipTextActive]}>Todos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.vehicleChip, filtroVehiculo === 'sin_vehiculo' && styles.vehicleChipActive]}
              onPress={() => {
                setFiltroVehiculo('sin_vehiculo');
                setShowVehicleOptions(false);
              }}
            >
              <Text style={[styles.vehicleChipText, filtroVehiculo === 'sin_vehiculo' && styles.vehicleChipTextActive]}>
                Sin vehículo
              </Text>
            </TouchableOpacity>
            {vehiclesData.map((v) => (
              <TouchableOpacity
                key={v.id}
                style={[styles.vehicleChip, String(filtroVehiculo) === String(v.id) && styles.vehicleChipActive]}
                onPress={() => {
                  setFiltroVehiculo(v.id);
                  setShowVehicleOptions(false);
                }}
              >
                <Text
                  style={[styles.vehicleChipText, String(filtroVehiculo) === String(v.id) && styles.vehicleChipTextActive]}
                  numberOfLines={1}
                >
                  {(v.marca_nombre || v.marca || 'Vehículo')} {(v.modelo_nombre || v.modelo || '')}
                  {v.year ? ` ${v.year}` : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </GlassCard>
      )}
    </View>
  );

  const renderListHeader = () => (
    <View>
      <View style={styles.controlsBlock}>
        {renderVehicleSelector()}
        {renderFilters()}
      </View>
      <View style={styles.headerToListSpacer} />
    </View>
  );

  const mensajesVacios = {
    todos: {
      titulo: 'No tienes solicitudes',
      subtitulo: 'Crea una nueva solicitud para recibir ofertas de proveedores',
    },
    activas: {
      titulo: 'No tienes solicitudes activas',
      subtitulo: 'Las solicitudes publicadas y con ofertas aparecerán aquí',
    },
    en_proceso: {
      titulo: 'No tienes servicios en proceso',
      subtitulo: 'Los servicios pagados y en ejecución aparecerán aquí',
    },
    completada: {
      titulo: 'No tienes servicios completados',
      subtitulo: 'Los servicios finalizados exitosamente aparecerán aquí',
    },
    historial: {
      titulo: 'No tienes historial',
      subtitulo: 'Las solicitudes expiradas o canceladas aparecerán aquí',
    },
  };

  const renderEmptyState = () => {
    const mensajeActual = mensajesVacios[filtroEstado] || mensajesVacios.todos;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrap}>
          <ClipboardList size={40} color="rgba(255,255,255,0.25)" />
        </View>
        <Text style={styles.emptyTitle}>{mensajeActual.titulo}</Text>
        <Text style={styles.emptySubtitle}>{mensajeActual.subtitulo}</Text>
        {filtroEstado === 'todos' && (
          <TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate(ROUTES.CREAR_SOLICITUD)} activeOpacity={0.85}>
            <LinearGradient colors={['#6366F1', '#4F46E5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Crear Solicitud</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderSolicitud = ({ item }) => (
    <View style={styles.cardWrapper}>
      <SolicitudCard solicitud={item} onPress={handleSolicitudPress} fullWidth />
    </View>
  );

  const renderItemSeparator = () => <View style={styles.separator} />;

  if (loading && !refreshing) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#030712', '#0a1628', '#030712']} style={StyleSheet.absoluteFill} />
        <View style={styles.blob1} />
        <View style={styles.blob2} />
        <View style={styles.blob3} />
        <SafeAreaView style={styles.safeTop} edges={['top']}>
          <View style={styles.navRow}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
              <ArrowLeft size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.navTitle}>Mis Solicitudes</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6EE7B7" />
          <Text style={styles.loadingText}>Cargando solicitudes...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#030712', '#0a1628', '#030712']} style={StyleSheet.absoluteFill} />
      <View style={styles.blob1} />
      <View style={styles.blob2} />
      <View style={styles.blob3} />

      <SafeAreaView style={styles.safeTop} edges={['top']}>
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Mis Solicitudes</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <SafeAreaView style={styles.safeContent} edges={['left', 'right', 'bottom']}>
        <FlatList
          data={solicitudesFiltradas}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderSolicitud}
          ItemSeparatorComponent={renderItemSeparator}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={!loading && renderEmptyState}
          contentContainerStyle={[
            styles.listContent,
            solicitudesFiltradas.length === 0 && styles.listContentEmpty,
          ]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6EE7B7" />}
          showsVerticalScrollIndicator={false}
        />

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={20} color="#FCA5A5" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#030712' },
  safeTop: { zIndex: 2 },
  safeContent: { flex: 1 },
  blob1: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(16,185,129,0.08)',
  },
  blob2: {
    position: 'absolute',
    top: 320,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(99,102,241,0.06)',
  },
  blob3: {
    position: 'absolute',
    bottom: 80,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(6,182,212,0.05)',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  navTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsBlock: {
    paddingBottom: 8,
  },
  headerToListSpacer: { height: 16 },
  filtersWrapper: {
    paddingTop: 6,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  tabScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tabActive: {
    backgroundColor: 'rgba(110,231,183,0.12)',
    borderColor: 'rgba(110,231,183,0.35)',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
  },
  tabTextActive: {
    color: '#6EE7B7',
    fontWeight: '700',
  },
  vehicleSelectorWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  vehicleSelectorLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '500',
    marginBottom: 6,
  },
  vehicleSelect: {
    height: 44,
    borderRadius: 12,
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vehicleSelectOpen: {
    borderColor: 'rgba(110,231,183,0.35)',
  },
  vehicleSelectText: {
    flex: 1,
    marginRight: 12,
    fontSize: 14,
    color: '#FFF',
    fontWeight: '500',
  },
  vehicleSelectPlaceholder: {
    color: 'rgba(255,255,255,0.4)',
  },
  vehicleOptionsPanel: {
    marginTop: 10,
    padding: 12,
  },
  vehicleFilterScroll: {
    paddingVertical: 2,
    columnGap: 8,
  },
  vehicleChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    maxWidth: 220,
  },
  vehicleChipActive: {
    backgroundColor: 'rgba(110,231,183,0.12)',
    borderColor: 'rgba(110,231,183,0.35)',
  },
  vehicleChipText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '500',
  },
  vehicleChipTextActive: {
    color: '#6EE7B7',
    fontWeight: '600',
  },
  listContent: {
    paddingTop: 0,
    paddingBottom: 32,
  },
  listContentEmpty: { flexGrow: 1 },
  cardWrapper: { width: '100%', paddingHorizontal: 16 },
  separator: { height: 16 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: 'rgba(255,255,255,0.45)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 320,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    overflow: 'hidden',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(239,68,68,0.12)',
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 14,
    flex: 1,
  },
});

export default MisSolicitudesScreen;
