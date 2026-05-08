import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, ClipboardList } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { ROUTES } from '../../utils/constants';
import SolicitudCard from '../../components/solicitudes/SolicitudCard';
import { useSolicitudes } from '../../context/SolicitudesContext';
import { solicitudVisibleParaVehiculoDashboard } from '../../utils/solicitudVehicle';
import MisSolicitudesListSkeleton from '../../components/utils/MisSolicitudesListSkeleton';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';

const SURFACE_SOFT = COLORS.neutral.gray[100];

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
  const insets = useSafeAreaInsets();

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

  const { solicitudes, requestsIsLoading, error, cargarSolicitudes, cargarSolicitudesActivas } = useSolicitudes();

  const [refreshing, setRefreshing] = useState(false);

  const filtroAEstados = useMemo(() => {
    const activas = [
      'publicada',
      'con_ofertas',
      'esperando_creditos_proveedor',
      'adjudicada',
      'pendiente_pago',
      'creada',
      'seleccionando_servicios',
    ];
    const enProceso = ['pagada', 'en_ejecucion'];
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
      { key: 'todos', label: 'Todas' },
      { key: 'activas', label: 'Activas' },
      { key: 'en_proceso', label: 'En proceso' },
    ],
    [],
  );

  const historialSegments = useMemo(
    () => [
      { key: 'historial_todos', label: 'Todas' },
      { key: 'completada', label: 'Completadas' },
      { key: 'canceladas', label: 'Canceladas' },
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
        Alert.alert('Error', 'No se pudo identificar la solicitud');
        return;
      }
      navigation.navigate(ROUTES.DETALLE_SOLICITUD, { solicitudId: id });
    },
    [navigation],
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
          <ClipboardList size={40} color="rgba(255,255,255,0.25)" />
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
    [handleSolicitudPress],
  );

  const renderItemSeparator = useCallback(() => <View style={styles.separator} />, []);

  const renderHeaderChrome = useCallback(() => {
    const segments = mainTab === 'solicitudes' ? solicitudesSegments : historialSegments;
    return (
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color={COLORS.text.primary} />
          </TouchableOpacity>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.headerTitle}>Mis solicitudes</Text>
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.mainTab, mainTab === 'solicitudes' && styles.activeMainTab]}
            onPress={() => handleMainTabChange('solicitudes')}
            activeOpacity={0.7}
          >
            <Text style={[styles.mainTabText, mainTab === 'solicitudes' && styles.activeMainTabText]}>Solicitudes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mainTab, mainTab === 'historial' && styles.activeMainTab]}
            onPress={() => handleMainTabChange('historial')}
            activeOpacity={0.7}
          >
            <Text style={[styles.mainTabText, mainTab === 'historial' && styles.activeMainTabText]}>Historial</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.segmentContainer}>
          {segments.map((item) => {
            const active = filtroSegment === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.segment, active && styles.activeSegment]}
                onPress={() => handleSegmentPress(item.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.segmentText, active && styles.activeSegmentText]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }, [
    insets.top,
    navigation,
    mainTab,
    filtroSegment,
    solicitudesSegments,
    historialSegments,
    handleMainTabChange,
    handleSegmentPress,
  ]);

  const showInitialSkeleton = requestsIsLoading && !refreshing;

  if (showInitialSkeleton) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" />
        {renderHeaderChrome()}
        <MisSolicitudesListSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

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
  root: {
    flex: 1,
    backgroundColor: COLORS.background.default,
    ...(Platform.OS === 'web' ? { height: '100%' } : null),
  },
  safeContent: {
    flex: 1,
    ...(Platform.OS === 'web' ? { minHeight: 0, overflow: 'hidden' } : null),
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
    flexDirection: 'row',
    backgroundColor: SURFACE_SOFT,
    borderRadius: BORDERS.radius.md,
    marginHorizontal: SPACING.container.horizontal,
    marginBottom: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
  },
  mainTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeMainTab: {
    backgroundColor: COLORS.background.paper,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  mainTabText: {
    fontSize: 14,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.tertiary,
  },
  activeMainTabText: {
    color: COLORS.text.primary,
  },
  segmentContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.container.horizontal,
    paddingBottom: 8,
    gap: 10,
  },
  segment: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: SURFACE_SOFT,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  activeSegment: {
    backgroundColor: COLORS.primary[50],
    borderColor: COLORS.primary[100],
  },
  segmentText: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  activeSegmentText: {
    color: COLORS.primary[500],
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
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
