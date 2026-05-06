import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, ClipboardList } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { ROUTES } from '../../utils/constants';
import SolicitudCard from '../../components/solicitudes/SolicitudCard';
import { useSolicitudes } from '../../context/SolicitudesContext';
import { solicitudVisibleParaVehiculoDashboard } from '../../utils/solicitudVehicle';
import MisSolicitudesListSkeleton from '../../components/utils/MisSolicitudesListSkeleton';
import { COLORS, SPACING, BORDERS } from '../../design-system/tokens';

const MisSolicitudesScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const selectedVehicleId = useMemo(() => {
    const vid = route.params?.vehicleId;
    if (vid == null || vid === '') return null;
    const n = Number(vid);
    return Number.isFinite(n) ? n : null;
  }, [route.params?.vehicleId]);

  const vehicleForCrearSolicitud = useMemo(() => {
    const v = route.params?.vehicle;
    if (!v || v.id == null) return null;
    if (selectedVehicleId != null && Number(v.id) !== selectedVehicleId) return null;
    return v;
  }, [route.params?.vehicle, selectedVehicleId]);

  const { solicitudes, requestsIsLoading, error, cargarSolicitudes, cargarSolicitudesActivas } = useSolicitudes();

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
    activas: [
      'publicada',
      'con_ofertas',
      'esperando_creditos_proveedor',
      'adjudicada',
      'pendiente_pago',
      'creada',
      'seleccionando_servicios',
    ],
    en_proceso: ['pagada', 'en_ejecucion'],
    completada: ['completada'],
    canceladas: ['cancelada', 'expirada'],
  };

  useEffect(() => {
    if (filtroEstado === 'historial') setFiltroEstado('canceladas');
  }, [filtroEstado]);

  const cargarDatos = useCallback(async () => {
    try {
      await Promise.all([cargarSolicitudes(), cargarSolicitudesActivas()]);
    } catch (e) {
      console.error('Error cargando solicitudes:', e);
    }
  }, [cargarSolicitudes, cargarSolicitudesActivas]);

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
    return solicitudVisibleParaVehiculoDashboard(s, selectedVehicleId);
  });

  const handleSolicitudPress = useCallback(
    (solicitud) => {
      const id = solicitud?.id || solicitud?.properties?.id;
      if (!id) {
        Alert.alert('Error', 'No se pudo identificar la solicitud');
        return;
      }
      navigation.navigate(ROUTES.DETALLE_SOLICITUD, { solicitudId: id });
    },
    [navigation]
  );

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

  const renderListHeader = useCallback(
    () => (
      <View>
        <View style={styles.controlsBlock}>{renderFilters()}</View>
        <View style={styles.headerToListSpacer} />
      </View>
    ),
    [filtroEstado]
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

  const renderEmptyState = useCallback(() => {
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
                vehicleForCrearSolicitud ? { vehicle: vehicleForCrearSolicitud, fromDashboard: true } : {}
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
  }, [filtroEstado, mensajesVacios, navigation, vehicleForCrearSolicitud]);

  const keyExtractor = useCallback((item, index) => `sol-${item.id ?? index}`, []);

  const renderSolicitud = useCallback(
    ({ item }) => (
      <View style={styles.cardWrapper}>
        <SolicitudCard solicitud={item} onPress={handleSolicitudPress} fullWidth />
      </View>
    ),
    [handleSolicitudPress]
  );

  const renderItemSeparator = useCallback(() => <View style={styles.separator} />, []);

  const showInitialSkeleton = requestsIsLoading && !refreshing;

  if (showInitialSkeleton) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" />
        <SafeAreaView style={styles.safeTop} edges={['top']}>
          <View style={styles.navRow}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
              <ArrowLeft size={22} color={COLORS.text.primary} />
            </TouchableOpacity>
            <Text style={styles.navTitle}>Mis Solicitudes</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
        <MisSolicitudesListSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView style={styles.safeTop} edges={['top']}>
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Mis Solicitudes</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <SafeAreaView style={styles.safeContent} edges={['left', 'right', 'bottom']}>
        <FlatList
          data={solicitudesFiltradas}
          keyExtractor={keyExtractor}
          renderItem={renderSolicitud}
          ItemSeparatorComponent={renderItemSeparator}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={renderEmptyState}
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
              tintColor={COLORS.primary[500]}
            />
          }
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS !== 'web'}
        />

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={20} color={COLORS.error[500]} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background.default },
  safeTop: { zIndex: 2 },
  safeContent: { flex: 1 },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.container.horizontal,
    paddingBottom: 12,
  },
  navTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text.primary },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: 1,
    borderColor: COLORS.border.light,
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
    paddingHorizontal: SPACING.container.horizontal,
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
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  tabActive: {
    backgroundColor: COLORS.primary[50],
    borderColor: COLORS.primary[100],
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.tertiary,
  },
  tabTextActive: {
    color: COLORS.primary[500],
    fontWeight: '700',
  },
  listContent: {
    paddingTop: 0,
    paddingBottom: 32,
  },
  listContentEmpty: { flexGrow: 1 },
  cardWrapper: { width: '100%', paddingHorizontal: SPACING.container.horizontal },
  separator: { height: 16 },
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
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: 1,
    borderColor: COLORS.border.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: BORDERS.radius.button?.md ?? BORDERS.radius.full,
    gap: 8,
    overflow: 'hidden',
    backgroundColor: COLORS.primary[500],
  },
  createButtonText: {
    color: COLORS.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    position: 'absolute',
    bottom: 24,
    left: SPACING.container.horizontal,
    right: SPACING.container.horizontal,
    backgroundColor: COLORS.error.light,
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.error[500],
  },
  errorText: {
    color: COLORS.text.primary,
    fontSize: 14,
    flex: 1,
  },
});

export default MisSolicitudesScreen;
