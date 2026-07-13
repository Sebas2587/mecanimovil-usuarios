import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { ClipboardList, CirclePlus, CircleAlert } from 'lucide-react-native';
import { ROUTES } from '../../utils/constants';
import SolicitudCard from '../../components/solicitudes/SolicitudCard';
import { useSolicitudes } from '../../context/SolicitudesContext';
import { solicitudVisibleParaVehiculoDashboard } from '../../utils/solicitudVehicle';
import MisSolicitudesListSkeleton from '../../components/utils/MisSolicitudesListSkeleton';
import SegmentedControl from '../../components/base/SegmentedControl/SegmentedControl';
import BackButton from '../../components/navigation/BackButton';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';
import { prefetchRequestDetail, refetchSolicitudesListQueries } from '../../hooks/useRequests';
import { useAuth } from '../../context/AuthContext';
import { showAlert } from '../../utils/platformAlert';


const parseRouteToTabs = (route) => {
  const p = route?.params?.initialFiltroEstado;
  if (p === 'historial') return { mainTab: 'historial', filtroSegment: 'canceladas' };
  if (p === 'completada') return { mainTab: 'historial', filtroSegment: 'completada' };
  if (p === 'canceladas') return { mainTab: 'historial', filtroSegment: 'canceladas' };
  if (p === 'activas') return { mainTab: 'solicitudes', filtroSegment: 'activas' };
  if (p === 'en_proceso') return { mainTab: 'solicitudes', filtroSegment: 'en_proceso' };
  if (p === 'todos') return { mainTab: 'solicitudes', filtroSegment: 'todos' };
  return { mainTab: 'solicitudes', filtroSegment: 'todos' };
};

const MisSolicitudesScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  /** RN Web: sin altura acotada al viewport el VirtualizedList no hace scroll interno. */
  const webRootFrame =
    Platform.OS === 'web'
      ? {
          height: windowHeight,
          maxHeight: windowHeight,
          minHeight: 0,
          flex: 1,
          overflow: 'hidden',
        }
      : null;

  const [mainTab, setMainTab] = useState(() => parseRouteToTabs(route).mainTab);
  const [filtroSegment, setFiltroSegment] = useState(() => parseRouteToTabs(route).filtroSegment);

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

  const { user } = useAuth();
  const { solicitudes, requestsIsLoading, error, cargarSolicitudes, cargarSolicitudesActivas } = useSolicitudes();

  const [refreshing, setRefreshing] = useState(false);

  const filtroAEstados = useMemo(() => {
    const activas = [
      'publicada',
      'con_ofertas',
      'pendiente_confirmacion',
      'esperando_creditos_proveedor',
      'adjudicada',
      'pendiente_pago',
      'creada',
      'seleccionando_servicios',
    ];
    // pagada_parcialmente: pago parcial de repuestos confirmado; el usuario aún debe pagar la mano de obra
    const enProceso = ['pagada', 'pagada_parcialmente', 'en_ejecucion'];
    const solicitudesPipeline = [...new Set([...activas, ...enProceso])];
    return {
      solicitudes_pipeline: solicitudesPipeline,
      activas,
      en_proceso: enProceso,
      completada: ['completada'],
      canceladas: ['cancelada', 'expirada'],
      historial_todos: ['completada', 'cancelada', 'expirada'],
    };
  }, []);

  const filtroEstado = useMemo(() => {
    if (mainTab === 'solicitudes') {
      if (filtroSegment === 'todos') return 'solicitudes_pipeline';
      if (filtroSegment === 'activas') return 'activas';
      if (filtroSegment === 'en_proceso') return 'en_proceso';
      return 'solicitudes_pipeline';
    }
    const m = { historial_todos: 'historial_todos', completada: 'completada', canceladas: 'canceladas' };
    return m[filtroSegment] || 'historial_todos';
  }, [mainTab, filtroSegment]);

  const solicitudesSegments = useMemo(
    () => [
      { id: 'todos', label: 'Todas' },
      { id: 'activas', label: 'Activas' },
      { id: 'en_proceso', label: 'En proceso' },
    ],
    [],
  );

  const historialSegments = useMemo(
    () => [
      { id: 'historial_todos', label: 'Todas' },
      { id: 'completada', label: 'Completadas' },
      { id: 'canceladas', label: 'Canceladas' },
    ],
    [],
  );

  const mainTabSegments = useMemo(
    () => [
      { id: 'solicitudes', label: 'Solicitudes' },
      { id: 'historial', label: 'Historial' },
    ],
    [],
  );

  const handleMainTabChange = useCallback((tab) => {
    setMainTab(tab);
    setFiltroSegment(tab === 'solicitudes' ? 'todos' : 'historial_todos');
  }, []);

  const handleSegmentPress = useCallback((key) => {
    setFiltroSegment(key);
  }, []);

  const cargarDatos = useCallback(async () => {
    try {
      await Promise.all([cargarSolicitudes(), cargarSolicitudesActivas()]);
    } catch (e) {
      console.error('Error cargando solicitudes:', e);
    }
  }, [cargarSolicitudes, cargarSolicitudesActivas]);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;

      const forceRefresh = route.params?.refreshList === true;
      if (forceRefresh) {
        navigation.setParams({ refreshList: undefined });
      }

      void refetchSolicitudesListQueries(queryClient, user.id);
    }, [user?.id, route.params?.refreshList, navigation, queryClient]),
  );

  const solicitudesArray = Array.isArray(solicitudes) ? solicitudes : [];

  const solicitudesFiltradasPorEstado = solicitudesArray.filter((s) => {
    if (!s || !s.estado) return false;
    const estadosPermitidos = filtroAEstados[filtroEstado];
    if (!estadosPermitidos) return false;
    const efectivo = s.estado_efectivo ?? s.estado;
    if (efectivo === 'ofertas_adicionales_pendientes') {
      return filtroEstado === 'activas' || filtroEstado === 'solicitudes_pipeline';
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
        showAlert('Error', 'No se pudo identificar la solicitud');
        return;
      }
      void prefetchRequestDetail(queryClient, id);
      navigation.navigate(ROUTES.DETALLE_SOLICITUD, { solicitudId: id });
    },
    [navigation, queryClient],
  );

  const mensajesVacios = useMemo(
    () => ({
      solicitudes_pipeline: {
        titulo: 'No tienes solicitudes en curso',
        subtitulo:
          'Aquí ves las activas y las que ya están pagadas o en ejecución. Las completadas o canceladas están en Historial.',
      },
      activas: {
        titulo: 'No tienes solicitudes activas',
        subtitulo: 'Las solicitudes publicadas y con ofertas aparecerán aquí',
      },
      en_proceso: {
        titulo: 'No tienes servicios en proceso',
        subtitulo: 'Los servicios pagados y en ejecución aparecerán aquí',
      },
      historial_todos: {
        titulo: 'Sin historial aún',
        subtitulo: selectedVehicleId
          ? 'No hay solicitudes completadas ni canceladas para este vehículo.'
          : 'Las solicitudes finalizadas, canceladas o expiradas aparecerán aquí.',
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
    [selectedVehicleId],
  );

  const renderEmptyState = useCallback(() => {
    const mensajeActual = mensajesVacios[filtroEstado] || mensajesVacios.solicitudes_pipeline;
    const showCrear = filtroEstado === 'solicitudes_pipeline';
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrap}>
          <ClipboardList size={40} color={COLORS.neutral.gray[300]} strokeWidth={1.75} />
        </View>
        <Text style={styles.emptyTitle}>{mensajeActual.titulo}</Text>
        <Text style={styles.emptySubtitle}>{mensajeActual.subtitulo}</Text>
        {showCrear && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={() =>
              navigation.navigate(
                ROUTES.CREAR_SOLICITUD,
                vehicleForCrearSolicitud ? { vehicle: vehicleForCrearSolicitud, fromDashboard: true } : {},
              )
            }
            activeOpacity={0.85}
          >
            <CirclePlus size={20} color={COLORS.text.inverse} strokeWidth={2} />
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
    [handleSolicitudPress],
  );

  const renderItemSeparator = useCallback(() => <View style={styles.separator} />, []);

  const renderHeaderChrome = useCallback(() => {
    const segments = mainTab === 'solicitudes' ? solicitudesSegments : historialSegments;
    return (
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <View style={styles.navRow}>
          <BackButton onPress={() => navigation.goBack()} />
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.headerTitle}>Mis solicitudes</Text>
        <SegmentedControl
          segments={mainTabSegments}
          value={mainTab}
          onChange={handleMainTabChange}
          style={styles.tabsContainer}
        />
        <SegmentedControl
          segments={segments}
          value={filtroSegment}
          onChange={handleSegmentPress}
          style={styles.segmentContainer}
        />
      </View>
    );
  }, [
    insets.top,
    navigation,
    mainTab,
    filtroSegment,
    solicitudesSegments,
    historialSegments,
    mainTabSegments,
    handleMainTabChange,
    handleSegmentPress,
  ]);

  const showInitialSkeleton = requestsIsLoading && !refreshing;

  if (showInitialSkeleton) {
    return (
      <View style={[styles.root, webRootFrame]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.mainColumn}>
          {renderHeaderChrome()}
          <MisSolicitudesListSkeleton />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, webRootFrame]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.mainColumn}>
        {renderHeaderChrome()}

        <SafeAreaView style={styles.safeContent} edges={['left', 'right', 'bottom']}>
          <FlatList
            data={solicitudesFiltradas}
            keyExtractor={keyExtractor}
            renderItem={renderSolicitud}
            ItemSeparatorComponent={renderItemSeparator}
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
            style={styles.list}
            {...(Platform.OS === 'web'
              ? { nestedScrollEnabled: true }
              : {})}
          />

          {error && (
            <View style={styles.errorContainer}>
              <CircleAlert size={20} color={COLORS.error[500]} strokeWidth={1.75} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </SafeAreaView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  /** Columna header + lista: en web el FlatList necesita un padre flex con minHeight 0 para scroll interno. */
  mainColumn: {
    flex: 1,
    minHeight: 0,
    ...(Platform.OS === 'web' ? { display: 'flex', flexDirection: 'column' } : null),
  },
  safeContent: {
    flex: 1,
    minHeight: 0,
    ...(Platform.OS === 'web' ? { flex: 1, overflow: 'hidden' } : null),
  },
  list: {
    ...(Platform.OS === 'web'
      ? {
          flexGrow: 1,
          flexShrink: 1,
          flexBasis: 0,
          minHeight: 0,
          overflow: 'scroll',
          WebkitOverflowScrolling: 'touch',
        }
      : { flex: 1 }),
  },
  headerContainer: {
    paddingBottom: 8,
    zIndex: 2,
    backgroundColor: COLORS.background.default,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.container.horizontal,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.styles.h2.fontSize,
    fontWeight: TYPOGRAPHY.styles.h2.fontWeight,
    letterSpacing: TYPOGRAPHY.styles.h2.letterSpacing,
    color: COLORS.text.primary,
    paddingHorizontal: SPACING.container.horizontal,
    marginBottom: 12,
  },
  tabsContainer: {
    marginHorizontal: SPACING.container.horizontal,
    marginBottom: SPACING.sm,
  },
  segmentContainer: {
    marginHorizontal: SPACING.container.horizontal,
    marginBottom: SPACING.sm,
  },
  listContent: {
    paddingTop: 8,
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
