import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ClipboardList } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { ROUTES } from '../../utils/constants';
import SolicitudCard from '../../components/solicitudes/SolicitudCard';
import { useSolicitudes } from '../../context/SolicitudesContext';

const MisSolicitudesScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const selectedVehicleId = useMemo(() => {
    const vid = route.params?.vehicleId;
    if (vid == null || vid === '') return null;
    const n = Number(vid);
    return Number.isFinite(n) ? n : null;
  }, [route.params?.vehicleId]);

  /** Vehículo del panel (mismo id que vehicleId) para prellenar Crear solicitud */
  const vehicleForCrearSolicitud = useMemo(() => {
    const v = route.params?.vehicle;
    if (!v || v.id == null) return null;
    if (selectedVehicleId != null && Number(v.id) !== selectedVehicleId) return null;
    return v;
  }, [route.params?.vehicle, selectedVehicleId]);

  const {
    solicitudes,
    solicitudesActivas,
    loading,
    error,
    cargarSolicitudes,
    cargarSolicitudesActivas,
  } = useSolicitudes();

  const [refreshing, setRefreshing] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState(() => {
    const p = route?.params?.initialFiltroEstado;
    if (p === 'historial') return 'canceladas';
    return p || 'todos';
  });

  const estadosDisponibles = [
    { key: 'todos', label: 'Todas', icon: 'list-outline' },
    { key: 'activas', label: 'Activas', icon: 'flash-outline' },
    { key: 'en_proceso', label: 'En Proceso', icon: 'construct-outline' },
    { key: 'completada', label: 'Completadas', icon: 'checkmark-done-circle-outline' },
    { key: 'canceladas', label: 'Canceladas', icon: 'close-circle-outline' },
  ];

  const filtroAEstados = {
    todos: null,
    activas: ['publicada', 'con_ofertas', 'adjudicada', 'pendiente_pago', 'creada', 'seleccionando_servicios'],
    en_proceso: ['pagada', 'en_ejecucion'],
    completada: ['completada'],
    canceladas: ['cancelada', 'expirada'],
  };

  useEffect(() => {
    if (filtroEstado === 'historial') setFiltroEstado('canceladas');
  }, [filtroEstado]);

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
    if (!selectedVehicleId) return true;
    const vehiculoId = s?.vehiculo?.id ?? s?.vehiculo_id ?? (typeof s?.vehiculo === 'number' ? s.vehiculo : null);
    return vehiculoId === selectedVehicleId;
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

  const renderListHeader = () => (
    <View>
      <View style={styles.controlsBlock}>
        {renderFilters()}
      </View>
      <View style={styles.headerToListSpacer} />
    </View>
  );

  const mensajesVacios = useMemo(
    () => ({
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
        titulo: 'Sin solicitudes completadas',
        subtitulo: selectedVehicleId
          ? 'No hay solicitudes completadas para este vehículo aquí. El historial de servicios del auto (transferible al venderlo) está en Perfil del vehículo → Historial.'
          : 'Las solicitudes finalizadas aparecerán aquí con servicios y proveedores.',
      },
      canceladas: {
        titulo: 'Sin solicitudes canceladas',
        subtitulo: selectedVehicleId
          ? 'No hay solicitudes canceladas o expiradas para este vehículo.'
          : 'Las que canceles o que venzan sin oferta aparecerán aquí.',
      },
    }),
    [selectedVehicleId]
  );

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
          <TouchableOpacity
            style={styles.createButton}
            onPress={() =>
              navigation.navigate(
                ROUTES.CREAR_SOLICITUD,
                vehicleForCrearSolicitud
                  ? { vehicle: vehicleForCrearSolicitud, fromDashboard: true }
                  : {}
              )
            }
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#007EA7', '#00A8E8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
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
          keyExtractor={(item, index) => `sol-${item.id ?? index}`}
          renderItem={renderSolicitud}
          ItemSeparatorComponent={renderItemSeparator}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={!loading && renderEmptyState}
          contentContainerStyle={[
            styles.listContent,
            solicitudesFiltradas.length === 0 && styles.listContentEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                try {
                  await cargarDatos();
                } catch (e) {
                  console.error('Error refrescando:', e);
                } finally {
                  setRefreshing(false);
                }
              }}
              tintColor="#6EE7B7"
            />
          }
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
