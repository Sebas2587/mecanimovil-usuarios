import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  StatusBar,
  Platform,
  useWindowDimensions,
  RefreshControl,
} from 'react-native';
import { showAlert } from '../../utils/platformAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Gauge,
  HelpCircle,
  RefreshCw,
  CheckCircle,
  X,
  Heart,
  Wrench,
  ChevronRight,
  ArrowLeft,
  Hourglass,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ClipboardEdit,
} from 'lucide-react-native';
import { TextInput, KeyboardAvoidingView } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { ROUTES } from '../../utils/constants';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import VehicleHealthService from '../../services/vehicleHealthService';
import { getVehicleById } from '../../services/vehicle';
import UnifiedComponentCard, { SectionHeader } from '../../components/vehicles/UnifiedComponentCard';
import Skeleton from '../../components/feedback/Skeleton/Skeleton';
import WebSocketService from '../../services/websocketService';
import NotificationService from '../../services/notificationService';
import { getHealthColorToken, getHealthLabel, resolveVehicleHealthPct } from '../../utils/healthFormat';
import { COLORS } from '../../design-system/tokens/colors';
import { SPACING } from '../../design-system/tokens/spacing';
import { BORDERS } from '../../design-system/tokens/borders';
import { SHADOWS } from '../../design-system/tokens/shadows';
import { TYPOGRAPHY } from '../../design-system/tokens/typography';
import Button from '../../components/base/Button/Button';

const VehicleHealthScreen = ({ route }) => {
  const navigation = useNavigation();
  const { vehicleId, vehicle } = route.params;
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const styles = createStyles(insets);

  /** Web: sin header del stack; altura explícita al viewport para que FlatList tenga scroll (como MarketplaceVehicleDetail). */
  const webRootStyle =
    Platform.OS === 'web'
      ? {
          minHeight: 0,
          height: windowHeight,
          maxHeight: windowHeight,
          overflow: 'hidden',
        }
      : null;

  // Data State
  // Prefer fresh data from fetch, fallback to route params if available
  const [healthData, setHealthData] = useState(null);
  const [vehicleData, setVehicleData] = useState(vehicle);
  const [loading, setLoading] = useState(!vehicle?.health_report);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState(null); // For Modal
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  // Predicciones inteligentes (scikit-learn + bootstrap + similares)
  const [predictionsData, setPredictionsData] = useState(null);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  // Modal de declaración retroactiva de mantenimiento
  const [declarationTarget, setDeclarationTarget] = useState(null); // componente seleccionado
  const [declKm, setDeclKm] = useState('');
  const [declNota, setDeclNota] = useState('');
  const [declarando, setDeclarando] = useState(false);
  /** Aviso in-app (web no ejecuta `Alert.alert` de RN). */
  const [healthBanner, setHealthBanner] = useState(null);

  const pollingIntervalRef = useRef(null);
  const wsHandlerRef = useRef(null);
  const syncTimerRef = useRef(null);
  const healthPollTimersRef = useRef([]);
  const loadDataRef = useRef(() => {});

  const clearHealthPollTimers = useCallback(() => {
    healthPollTimersRef.current.forEach(clearTimeout);
    healthPollTimersRef.current = [];
  }, []);

  // Initial Load
  useEffect(() => {
    loadData();
    return () => {
      clearInterval(pollingIntervalRef.current);
      clearTimeout(syncTimerRef.current);
      clearHealthPollTimers();
    };
  }, [vehicleId, clearHealthPollTimers]);

  const loadPredictions = useCallback(async (force = false) => {
    if (!vehicleId) return;
    setPredictionsLoading(true);
    try {
      const data = await VehicleHealthService.getVehiclePredictions(vehicleId, force);
      setPredictionsData(data);
    } catch (e) {
      // No bloquear la pantalla por error de predicciones (feature opcional).
      console.warn('No se pudieron cargar predicciones:', e?.message);
    } finally {
      setPredictionsLoading(false);
    }
  }, [vehicleId]);

  const loadData = async (force = false) => {
    if (!vehicleId) return;
    try {
      if (!vehicleData || force) {
        // Refresh full vehicle to get updated health_report
        const v = await getVehicleById(vehicleId);
        setVehicleData(v);
      }
      // Also fetch specific health summary (legacy support or extra details)
      // Since backend now puts report in vehicle, maybe fetchVehicleHealth is redundant?
      // But we keep it if it returns 'alertas' or 'costo_estimado'.
      const hData = await VehicleHealthService.getVehicleHealth(vehicleId, force);
      setHealthData(hData);
      // Predicciones inteligentes en paralelo (no bloquea la UI principal)
      loadPredictions(force);
    } catch (e) {
      console.error("Error loading health:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  loadDataRef.current = loadData;

  /** Tras declarar mantenimiento el recálculo suele ir por Celery: varios GET forzan UI al día. */
  const scheduleHealthRefetchBurst = useCallback(() => {
    clearHealthPollTimers();
    const delays = [0, 2000, 5000, 10000, 20000];
    delays.forEach((ms) => {
      const id = setTimeout(() => {
        loadDataRef.current?.(true);
      }, ms);
      healthPollTimersRef.current.push(id);
    });
  }, [clearHealthPollTimers]);

  // WebSocket & Polling Logic (Kep existing logic)
  useEffect(() => {
    if (!WebSocketService.getConnectionStatus()) WebSocketService.connect();

    const handleUpdate = (data) => {
      if (data.vehicle_id && String(data.vehicle_id) === String(vehicleId)) {
        console.log('🔔 Health Update Received');
        NotificationService.notificarSaludVehiculoActualizada(
          data.vehiculo_info || 'Vehículo',
          data.componentes_actualizados || 0
        );
        loadData(true);
      }
    };

    WebSocketService.onMessage('salud_vehiculo_actualizada', handleUpdate);
    wsHandlerRef.current = handleUpdate;

    pollingIntervalRef.current = setInterval(() => loadData(true), 30000);

    return () => {
      if (wsHandlerRef.current) WebSocketService.offMessage('salud_vehiculo_actualizada', wsHandlerRef.current);
    };
  }, [vehicleId]);

  useFocusEffect(
    useCallback(() => {
      loadData(true);
    }, [vehicleId])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  /**
   * Sincronizar con backend (recálculo asíncrono vía Celery).
   * Flujo:
   *  1. POST /sync/ → invalida cache Redis + encola tarea Celery
   *  2. El WebSocket 'salud_vehiculo_actualizada' dispara loadData(true) cuando el worker termina
   *  3. Como fallback, re-fetch progresivo a los 4 s y 10 s por si el WS no llega
   */
  const handleSync = async () => {
    if (!vehicleId || syncing) return;
    setSyncing(true);
    try {
      await VehicleHealthService.syncVehicleHealth(vehicleId);

      // Re-fetch progresivo: Celery suele completar en 2-5 s
      syncTimerRef.current = setTimeout(() => loadData(true), 4000);
      const fallbackTimer = setTimeout(() => loadData(true), 10000);

      // Limpiar fallback si el WS ya actualizó antes
      const originalRef = wsHandlerRef.current;
      const onceHandler = (data) => {
        if (data.vehicle_id && String(data.vehicle_id) === String(vehicleId)) {
          clearTimeout(fallbackTimer);
        }
        if (originalRef) originalRef(data);
      };
      wsHandlerRef.current = onceHandler;
      WebSocketService.onMessage('salud_vehiculo_actualizada', onceHandler);

      // Liberar handler extra después de 12 s (tiempo máximo razonable)
      setTimeout(() => {
        WebSocketService.offMessage('salud_vehiculo_actualizada', onceHandler);
        if (wsHandlerRef.current === onceHandler) wsHandlerRef.current = originalRef;
        clearTimeout(fallbackTimer);
      }, 12000);

    } catch (e) {
      console.error('Sync salud error:', e);
      showAlert(
        'No se pudo sincronizar',
        e?.response?.data?.error || e?.message || 'Intenta de nuevo en unos segundos.'
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleMetricPress = (item) => {
    // Show modal with details
    // Ensure we send semantic fields
    const name = item.nombre || (typeof item.componente === 'string' ? item.componente : item.name) || 'Componente';
    const remaining = item.km_estimados_restantes ?? item.vida_util_restante_km ?? item.remaining_km;
    const vidaUtil = remaining !== undefined ? `${remaining.toLocaleString()} km` : 'N/A';

    setSelectedMetric({
      ...item,
      // Map legacy/new fields
      name: name,
      vida_util: vidaUtil,
      mensaje: item.mensaje_alerta || 'Sin observaciones.',
    });
  };

  const handleNavToService = (extraParams = {}) => {
    navigation.navigate(ROUTES.CREAR_SOLICITUD, {
      vehicle: vehicleData,
      alertas: healthData?.alertas,
      ...extraParams,
    });
  };

  /**
   * Servicios para el modal: primero los asociados al componente maestro (Admin),
   * luego los de alertas del mismo componente. Así Bujías puede mostrar "Cambio de bujías"
   * sin depender de alertas manuales.
   */
  const serviciosDelComponente = useMemo(() => {
    if (!selectedMetric) return [];
    const byId = new Map();
    const add = (s) => {
      if (s?.id != null && !byId.has(s.id)) byId.set(s.id, s);
    };
    // 1) Backend: ComponenteSalud.servicios_asociados → cada ítem de lista trae servicios_asociados
    const desdeComponente = selectedMetric.servicios_asociados;
    if (Array.isArray(desdeComponente)) desdeComponente.forEach(add);
    // 2) Fallback: alertas con servicios_recomendados para este ComponenteSaludVehiculo
    const compSaludVehiculoId = selectedMetric.id;
    if (compSaludVehiculoId && healthData?.alertas?.length) {
      for (const alerta of healthData.alertas) {
        const match =
          alerta.componente_salud === compSaludVehiculoId ||
          alerta.componente_salud_detail?.id === compSaludVehiculoId;
        if (!match || !alerta.servicios_recomendados_detail?.length) continue;
        alerta.servicios_recomendados_detail.forEach(add);
      }
    }
    return Array.from(byId.values());
  }, [selectedMetric, healthData?.alertas]);

  const openDeclaration = (componente) => {
    setDeclKm('');
    setDeclNota('');
    setDeclarationTarget(componente);
    setSelectedMetric(null);
  };

  const handleDeclararMantenimiento = async () => {
    const km = parseInt(declKm, 10);
    if (!km || km <= 0) {
      showAlert('Kilometraje inválido', 'Ingresa los km en los que realizaste el servicio.');
      return;
    }
    const slug = declarationTarget?.slug || declarationTarget?.componente_detail?.slug;
    if (!slug) {
      showAlert('Error', 'No se pudo identificar el componente.');
      return;
    }
    setDeclarando(true);
    try {
      const result = await VehicleHealthService.registrarMantenimiento(vehicleId, {
        componente_slug: slug,
        km_en_el_que_se_hizo: km,
        nota: declNota.trim() || undefined,
      });
      setDeclarationTarget(null);
      const msg =
        result?.mensaje ||
        'Mantenimiento registrado. El historial se actualizó; la salud puede tardar unos segundos en reflejarse.';
      setHealthBanner({ type: 'success', message: msg });
      scheduleHealthRefetchBurst();
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'No se pudo registrar.';
      showAlert('No se pudo registrar', msg);
    } finally {
      setDeclarando(false);
    }
  };

  // --- RENDERERS ---

  const getHealthColor = (score) => getHealthColorToken(COLORS, score);

  const renderHeader = () => {
    // Fuente única: healthData.salud_general_porcentaje (endpoint /health/, snapshot del Engine)
    // Fallback: vehicleData.health_score (ahora también usa el mismo snapshot vía serializer)
    const score = resolveVehicleHealthPct(vehicleData, healthData);
    const scoreColor = getHealthColor(score);

    return (
      <View style={styles.headerContainer}>
        <View style={styles.vehicleInfo}>
          <Text style={styles.brand}>{vehicleData?.marca_nombre || 'Marca'} {vehicleData?.modelo_nombre}</Text>
          <Text style={styles.plate}>{vehicleData?.patente} • {vehicleData?.year}</Text>
          <View style={styles.kmBadge}>
            <Gauge size={14} color={COLORS.primary[500]} />
            <Text style={styles.kmText}>{vehicleData?.kilometraje?.toLocaleString()} km</Text>
          </View>
        </View>

        <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
          <Text style={[styles.scoreText, { color: scoreColor }]}>{Math.round(score)}%</Text>
          <Text style={styles.scoreLabel}>Salud</Text>
        </View>
      </View>
    );
  };

  const renderSummary = () => {
    if (!healthData) return null;
    const {
      componentes_optimos = 0,
      componentes_atencion = 0,
      componentes_urgentes = 0,
      componentes_criticos = 0,
      integridad_datos,
    } = healthData;

    const pctVerif = integridad_datos?.porcentaje_verificado ?? null;
    const integridadColor =
      pctVerif == null ? COLORS.neutral.gray[400]
      : pctVerif >= 70  ? COLORS.success[600]
      : pctVerif >= 40  ? COLORS.warning[600]
      : COLORS.error[500];

    return (
      <View>
        <View style={styles.summaryContainer}>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: COLORS.success[600] }]} />
              <Text style={styles.legendText}>{componentes_optimos} Óptimos</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: COLORS.warning[600] }]} />
              <Text style={styles.legendText}>{componentes_atencion} Atención</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: COLORS.error[500] }]} />
              <Text style={styles.legendText}>{componentes_urgentes} Urgentes</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: COLORS.error[800] }]} />
              <Text style={styles.legendText}>{componentes_criticos} Críticos</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.helpLink} onPress={() => setShowHelpModal(true)}>
            <HelpCircle size={18} color={COLORS.primary[500]} />
            <Text style={styles.helpLinkText}>Ayuda</Text>
          </TouchableOpacity>
        </View>

        {/* Bloque de integridad de datos */}
        {integridad_datos && (
          <View style={styles.integridadCard}>
            <View style={styles.integridadHeader}>
              {pctVerif >= 70
                ? <ShieldCheck size={16} color={integridadColor} />
                : <ShieldAlert size={16} color={integridadColor} />
              }
              <Text style={[styles.integridadTitle, { color: integridadColor }]}>
                Confiabilidad de datos: {Math.round(pctVerif ?? 0)}% verificado
              </Text>
            </View>

            {/* Barra de composición */}
            <View style={styles.integridadBarTrack}>
              {integridad_datos.total > 0 && (
                <>
                  <View style={[
                    styles.integridadBarSegment,
                    { flex: integridad_datos.verificados_taller, backgroundColor: COLORS.success[500] },
                  ]} />
                  <View style={[
                    styles.integridadBarSegment,
                    { flex: integridad_datos.declarados_usuario, backgroundColor: COLORS.warning[400] },
                  ]} />
                  <View style={[
                    styles.integridadBarSegment,
                    { flex: integridad_datos.estimados_engine, backgroundColor: COLORS.neutral.gray[300] },
                  ]} />
                </>
              )}
            </View>

            <View style={styles.integridadLegend}>
              <View style={styles.integridadLegendItem}>
                <View style={[styles.dot, { backgroundColor: COLORS.success[500] }]} />
                <Text style={styles.integridadLegendText}>{integridad_datos.verificados_taller} Verificados</Text>
              </View>
              <View style={styles.integridadLegendItem}>
                <View style={[styles.dot, { backgroundColor: COLORS.warning[400] }]} />
                <Text style={styles.integridadLegendText}>{integridad_datos.declarados_usuario} Declarados</Text>
              </View>
              <View style={styles.integridadLegendItem}>
                <View style={[styles.dot, { backgroundColor: COLORS.neutral.gray[400] }]} />
                <Text style={styles.integridadLegendText}>{integridad_datos.estimados_engine} Estimados</Text>
              </View>
            </View>

            {!!integridad_datos.advertencia && (
              <Text style={styles.integridadAdvertencia}>{integridad_datos.advertencia}</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  /**
   * Fusión health + predicciones → array listo para FlatList con secciones.
   * Cada item de componente lleva `_prediction` con los datos del predictor.
   * Se añaden items `{ type: 'section', ... }` como cabeceras de sección.
   */
  const flatListData = useMemo(() => {
    const rawComponents =
      healthData && Array.isArray(healthData.componentes)
        ? healthData.componentes
        : vehicleData?.health_report || [];

    // Mapa slug → predicción para O(1) lookup
    const predMap = new Map();
    if (predictionsData?.predicciones) {
      for (const p of predictionsData.predicciones) {
        const key = p.slug || p.componente_slug || p.componente_id;
        if (key) predMap.set(String(key), p);
      }
    }

    // Fusionar y enriquecer
    const merged = rawComponents.map((c) => {
      const slug = c.slug || c.componente_detail?.slug || c.icon_slug || '';
      const pred = predMap.get(slug) || null;
      return { ...c, _prediction: pred };
    });

    // Ordenar por urgencia (salud asc) dentro de cada sección
    const urgentes = merged
      .filter((c) => (c.salud_porcentaje ?? 0) < 70)
      .sort((a, b) => (a.salud_porcentaje ?? 0) - (b.salud_porcentaje ?? 0));

    const optimos = merged
      .filter((c) => (c.salud_porcentaje ?? 0) >= 70)
      .sort((a, b) => (a.salud_porcentaje ?? 0) - (b.salud_porcentaje ?? 0));

    const result = [];
    if (urgentes.length > 0) {
      result.push({ type: 'section', title: 'Requieren atención', count: urgentes.length, key: 'sec_urgent' });
      result.push(...urgentes.map((c) => ({ ...c, type: 'component' })));
    }
    if (optimos.length > 0) {
      result.push({ type: 'section', title: 'En buen estado', count: optimos.length, key: 'sec_ok' });
      result.push(...optimos.map((c) => ({ ...c, type: 'component' })));
    }
    return result;
  }, [healthData, vehicleData, predictionsData]);

  return (
    <View style={[styles.screen, webRootStyle]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />

      <View style={[styles.screenHeader, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Salud del Vehículo</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        style={styles.mainList}
        removeClippedSubviews={Platform.OS !== 'web'}
        data={flatListData}
        extraData={healthData}
        keyExtractor={(item, index) =>
          item.type === 'section' ? item.key : (item.slug || item.componente || String(index))
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary[500]}
            colors={[COLORS.primary[500]]}
          />
        }
        ListHeaderComponent={
          <>
            {healthBanner?.message ? (
              <View style={styles.healthBanner} accessibilityRole="alert">
                <CheckCircle size={20} color={COLORS.success[600]} style={{ flexShrink: 0 }} />
                <Text style={styles.healthBannerText}>{healthBanner.message}</Text>
                <TouchableOpacity
                  onPress={() => setHealthBanner(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Cerrar aviso"
                >
                  <X size={18} color={COLORS.text.tertiary} />
                </TouchableOpacity>
              </View>
            ) : null}
            {renderHeader()}
            {renderSummary()}
            {/* Barra de acciones: título + botón sincronizar */}
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Componentes</Text>
              <TouchableOpacity
                style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
                onPress={handleSync}
                disabled={syncing}
                accessibilityLabel="Sincronizar métricas de salud"
              >
                {syncing ? (
                  <Hourglass size={18} color={COLORS.text.tertiary} />
                ) : (
                  <RefreshCw size={18} color={COLORS.primary[500]} />
                )}
                <Text style={[styles.syncButtonText, syncing && styles.syncButtonTextDisabled]}>
                  {syncing ? 'Actualizando…' : 'Sincronizar'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        }
        renderItem={({ item }) => {
          if (item.type === 'section') {
            return <SectionHeader title={item.title} count={item.count} />;
          }
          return (
            <UnifiedComponentCard
              item={item}
              onPress={() => handleMetricPress(item)}
            />
          );
        }}
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: 12 }}>
              <Skeleton height={90} width={'100%'} borderRadius={12} />
              <Skeleton height={90} width={'100%'} borderRadius={12} />
              <Skeleton height={90} width={'100%'} borderRadius={12} />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <CheckCircle size={64} color={COLORS.neutral.gray[300]} />
              <Text style={styles.emptyText}>Sin datos de componentes.</Text>
              <Text style={styles.emptySubText}>Tu vehículo parece estar nuevo en el sistema o no tiene reglas asignadas.</Text>
            </View>
          )
        }
      />

      {/* Modal de declaración retroactiva de mantenimiento */}
      <Modal
        visible={!!declarationTarget}
        transparent
        animationType="slide"
        onRequestClose={() => !declarando && setDeclarationTarget(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => !declarando && setDeclarationTarget(null)}
          />
          <Animatable.View animation="slideInUp" duration={280} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <ClipboardEdit size={20} color={COLORS.primary[500]} />
              <Text style={[styles.modalTitle, { flex: 1, marginLeft: 8 }]}>
                Declarar mantenimiento
              </Text>
              <TouchableOpacity onPress={() => !declarando && setDeclarationTarget(null)}>
                <X size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.declModalComponent}>
              Componente: <Text style={{ fontWeight: '700' }}>
                {declarationTarget?.nombre || declarationTarget?.name || 'Componente'}
              </Text>
            </Text>
            <Text style={styles.declModalHint}>
              Indica los kilómetros del vehículo cuando realizaste este servicio. Quedará marcado
              como "Declarado por ti" y el sistema recalculará la salud con un tope máximo de 65%.
              Un taller puede verificarlo y subirlo a 100%.
            </Text>

            <Text style={styles.declLabel}>Kilómetros en los que se realizó *</Text>
            <TextInput
              style={styles.declInput}
              placeholder="Ej: 120000"
              placeholderTextColor={COLORS.text.tertiary}
              keyboardType="numeric"
              value={declKm}
              onChangeText={setDeclKm}
              editable={!declarando}
            />

            <Text style={styles.declLabel}>Nota (opcional)</Text>
            <TextInput
              style={[styles.declInput, styles.declInputMulti]}
              placeholder="Ej: Cambio de correa en taller Novauto"
              placeholderTextColor={COLORS.text.tertiary}
              multiline
              numberOfLines={3}
              value={declNota}
              onChangeText={setDeclNota}
              editable={!declarando}
            />

            <Button
              title={declarando ? 'Registrando…' : 'Registrar mantenimiento'}
              onPress={handleDeclararMantenimiento}
              disabled={declarando || !declKm}
            />
          </Animatable.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Help Modal */}
      <Modal
        visible={showHelpModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHelpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setShowHelpModal(false)}
          />
          <Animatable.View animation="zoomIn" duration={300} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>¿Cómo calculamos la salud de tu vehículo?</Text>
              <TouchableOpacity onPress={() => setShowHelpModal(false)}>
                <X size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.helpScrollView}
              contentContainerStyle={styles.helpScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.helpSectionText}>
                Evaluamos cada componente (aceite, filtros, frenos, etc.) según los kilómetros desde su último cambio o servicio.
              </Text>
              <Text style={styles.helpSectionText}>
                Usamos un modelo de confiabilidad que relaciona el kilometraje con la vida útil recomendada de cada pieza.
              </Text>
              <Text style={styles.helpSectionText}>
                La salud es un porcentaje: a más km desde el último mantenimiento, menor porcentaje.
              </Text>

              <Text style={styles.helpSubtitle}>Niveles de estado</Text>
              <View style={styles.helpLevelRow}>
                <View style={[styles.dot, { backgroundColor: COLORS.success[600] }]} />
                <Text style={styles.helpLevelText}>Óptimo (≥70%): en buen estado.</Text>
              </View>
              <View style={styles.helpLevelRow}>
                <View style={[styles.dot, { backgroundColor: COLORS.warning[600] }]} />
                <Text style={styles.helpLevelText}>Atención (40–70%): planificar revisión pronto.</Text>
              </View>
              <View style={styles.helpLevelRow}>
                <View style={[styles.dot, { backgroundColor: COLORS.error[500] }]} />
                <Text style={styles.helpLevelText}>Urgente (10–40%): revisar a la brevedad.</Text>
              </View>
              <View style={styles.helpLevelRow}>
                <View style={[styles.dot, { backgroundColor: COLORS.error[700] }]} />
                <Text style={styles.helpLevelText}>Crítico ({'<'}10%): atención inmediata.</Text>
              </View>

              <Text style={styles.helpSubtitle}>Ejemplo</Text>
              <Text style={styles.helpSectionText}>
                Si un componente tiene vida útil de 50.000 km y han pasado 25.000 km desde el último cambio, la salud se calcula en aproximadamente 78% (Óptimo). Si han pasado 45.000 km, sería ~45% (Atención). Si supera los 50.000 km, baja más y puede pasar a Urgente o Crítico.
              </Text>

              <Text style={styles.helpSubtitle}>Confiabilidad de los datos</Text>
              <View style={styles.helpLevelRow}>
                <ShieldCheck size={14} color={COLORS.success[600]} />
                <Text style={styles.helpLevelText}>
                  <Text style={{ fontWeight: '700' }}>Verificado</Text>: el taller registró el servicio o fue incluido al registrar el vehículo. Máxima precisión.
                </Text>
              </View>
              <View style={styles.helpLevelRow}>
                <ShieldAlert size={14} color={COLORS.warning[600]} />
                <Text style={styles.helpLevelText}>
                  <Text style={{ fontWeight: '700' }}>Declarado</Text>: tú indicaste cuándo se realizó el servicio. El sistema acepta el dato pero limita la salud a 65% hasta que un taller lo confirme.
                </Text>
              </View>
              <View style={styles.helpLevelRow}>
                <ShieldAlert size={14} color={COLORS.neutral.gray[400]} />
                <Text style={styles.helpLevelText}>
                  <Text style={{ fontWeight: '700' }}>Estimado</Text>: no hay registro del último servicio; el algoritmo estima la salud según edad y km del vehículo. Puedes declarar el km de servicio para mejorar la precisión.
                </Text>
              </View>
            </ScrollView>

            <Button title="Entendido" onPress={() => setShowHelpModal(false)} />
          </Animatable.View>
        </View>
      </Modal>

      {/* Detail Modal: métricas + servicios sugeridos (saltan paso 2 en nueva solicitud) */}
      <Modal
        visible={!!selectedMetric}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMetric(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setSelectedMetric(null)}
          />
          <Animatable.View animation="zoomIn" duration={300} style={styles.modalCardLarge}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={2}>
                {selectedMetric?.name}
              </Text>
              <TouchableOpacity onPress={() => setSelectedMetric(null)} hitSlop={12}>
                <X size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* ── 1. Estado de salud ──────────────────────────── */}
              {selectedMetric?.salud_porcentaje != null && (() => {
                const pct   = Math.round(selectedMetric.salud_porcentaje);
                const hc    = getHealthColor(pct);
                const nivel = selectedMetric.nivel_alerta_display || selectedMetric.nivel_alerta || '';
                return (
                  <View style={styles.healthBlock}>
                    <View style={styles.healthBlockRow}>
                      <Text style={styles.healthBlockLabel}>Estado actual</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {selectedMetric.historial_conocido === false && (
                          <Text style={styles.estimadoInline}>Estimado</Text>
                        )}
                        <Text style={[styles.healthBlockPct, { color: hc }]}>{pct}%</Text>
                      </View>
                    </View>
                    <View style={styles.modalBarTrack}>
                      <View style={[styles.modalBarFill, { width: `${pct}%`, backgroundColor: hc }]} />
                    </View>
                    {!!nivel && (
                      <Text style={[styles.healthBlockNivel, { color: hc }]}>{nivel}</Text>
                    )}
                  </View>
                );
              })()}

              {/* ── 2. Cuándo actuar ────────────────────────────── */}
              {(() => {
                const pred      = selectedMetric?._prediction;
                const km        = pred?.km_hasta_servicio ?? null;
                const dias      = pred?.dias_hasta_atencion ?? null;
                const fallback  = selectedMetric?.vida_util;
                const immediate = km != null && km <= 0;
                const clima     = pred?.factor_clima ?? 1.0;

                if (!km && !fallback) return null;
                return (
                  <View style={styles.actionBlock}>
                    <Text style={styles.actionBlockLabel}>Cuándo actuar</Text>
                    {immediate ? (
                      <Text style={[styles.actionBlockValue, { color: COLORS.error[600] }]}>
                        Atención inmediata requerida
                      </Text>
                    ) : (
                      <Text style={styles.actionBlockValue}>
                        {km != null
                          ? `~${Math.round(km).toLocaleString('es-CL')} km`
                          : fallback}
                        {dias != null && dias > 0 && (
                          ` · ~${dias < 30 ? `${dias} días` : `${Math.round(dias / 30)} ${Math.round(dias / 30) === 1 ? 'mes' : 'meses'}`}`
                        )}
                      </Text>
                    )}
                    {clima > 1.08 && (
                      <Text style={styles.actionBlockClima}>
                        El clima en tu zona acelera el desgaste un {Math.round((clima - 1) * 100)}%,
                        considera adelantar la revisión.
                      </Text>
                    )}
                  </View>
                );
              })()}

              {/* ── 3. Riesgo (solo si es relevante ≥ 25 %) ──────── */}
              {selectedMetric?._prediction?.probabilidad_falla_30 >= 25 && (() => {
                const r  = Math.round(selectedMetric._prediction.probabilidad_falla_30);
                const rc = r >= 50 ? COLORS.error[600] : COLORS.warning[700];
                const rb = r >= 50 ? COLORS.error[50]  : COLORS.warning[50];
                return (
                  <View style={[styles.riskBlock, { backgroundColor: rb }]}>
                    <AlertTriangle size={16} color={rc} />
                    <Text style={[styles.riskBlockText, { color: rc }]}>
                      {r >= 50
                        ? `Alta probabilidad de falla en los próximos 30 días (${r}%)`
                        : `Probabilidad de falla en 30 días: ${r}%`}
                    </Text>
                  </View>
                );
              })()}

              {/* ── 4. Confianza del historial ──────────────────── */}
              {(() => {
                const confianza = selectedMetric?.confianza_historial
                  || (selectedMetric?.historial_fuente === 'CHECKLIST' || selectedMetric?.historial_fuente === 'REGISTRO_INICIAL' ? 'alta'
                    : selectedMetric?.historial_fuente === 'USUARIO_DECLARADO' ? 'media'
                    : selectedMetric?.historial_conocido === false ? 'baja' : 'alta');
                const fuenteDisplay = selectedMetric?.historial_fuente_display;
                const showDeclareBtn = confianza === 'baja' || confianza === 'media';
                const badgeColor = confianza === 'alta' ? COLORS.success[600]
                  : confianza === 'media' ? COLORS.warning[600]
                  : COLORS.neutral.gray[500];
                const badgeBg = confianza === 'alta' ? COLORS.success[50]
                  : confianza === 'media' ? COLORS.warning[50]
                  : COLORS.neutral.gray[100];
                const badgeLabel = confianza === 'alta' ? 'Verificado por taller'
                  : confianza === 'media' ? (fuenteDisplay || 'Declarado por ti')
                  : 'Estimado (sin historial)';
                return (
                  <View style={[styles.confianzaRow, { backgroundColor: badgeBg }]}>
                    {confianza === 'alta'
                      ? <ShieldCheck size={14} color={badgeColor} />
                      : <ShieldAlert size={14} color={badgeColor} />
                    }
                    <Text style={[styles.confianzaText, { color: badgeColor }]}>{badgeLabel}</Text>
                    {showDeclareBtn && (
                      <TouchableOpacity
                        style={styles.declararBtn}
                        onPress={() => openDeclaration(selectedMetric)}
                      >
                        <ClipboardEdit size={13} color={COLORS.primary[600]} />
                        <Text style={styles.declararBtnText}>
                          {confianza === 'baja' ? 'Declarar km de servicio' : 'Actualizar km'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })()}

              {/* ── 5. Diagnóstico del motor ────────────────────── */}
              {!!selectedMetric?.mensaje && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoBoxLabel}>Diagnóstico</Text>
                  <Text style={styles.infoBoxText}>{selectedMetric.mensaje}</Text>
                </View>
              )}

              {serviciosDelComponente.length > 0 ? (
                <>
                  <Text style={styles.modalSectionTitle}>Servicios sugeridos</Text>
                  <Text style={styles.modalSectionHint}>
                    Elige uno para agendar y continuar sin elegir de nuevo el tipo de servicio.
                  </Text>
                  {serviciosDelComponente.map((srv) => (
                    <TouchableOpacity
                      key={srv.id}
                      style={styles.serviceCard}
                      activeOpacity={0.85}
                      onPress={() => {
                        const descripcion =
                          selectedMetric?.mensaje &&
                          selectedMetric.mensaje !== 'Sin observaciones.'
                            ? `[${selectedMetric.name}] ${selectedMetric.mensaje}`
                            : '';
                        setSelectedMetric(null);
                        // Objeto completo evita async getServicioDetalle y asegura salto paso 2
                        const servicioPreseleccionado = {
                          id: Number(srv.id) || srv.id,
                          nombre: srv.nombre || 'Servicio',
                          descripcion: srv.descripcion || '',
                          precio_referencia:
                            srv.precio_referencia != null
                              ? Number(srv.precio_referencia)
                              : undefined,
                        };
                        handleNavToService({
                          servicioPreseleccionado,
                          descripcionPrellenada: descripcion,
                        });
                      }}
                    >
                      <View style={styles.serviceCardIcon}>
                        <Wrench size={22} color={COLORS.primary[500]} />
                      </View>
                      <View style={styles.serviceCardBody}>
                        <Text style={styles.serviceCardTitle} numberOfLines={2}>
                          {srv.nombre}
                        </Text>
                        {srv.descripcion ? (
                          <Text style={styles.serviceCardDesc} numberOfLines={2}>
                            {srv.descripcion}
                          </Text>
                        ) : null}
                        {srv.precio_referencia != null ? (
                          <Text style={styles.serviceCardMeta}>
                            Desde ${Number(srv.precio_referencia).toLocaleString()}
                          </Text>
                        ) : null}
                      </View>
                      <ChevronRight size={20} color={COLORS.text.tertiary} />
                    </TouchableOpacity>
                  ))}
                </>
              ) : null}
            </ScrollView>

            {serviciosDelComponente.length === 0 ? (
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => {
                  setSelectedMetric(null);
                  handleNavToService();
                }}
              >
                <Text style={styles.modalButtonSecondaryText}>Cotizar / Nueva solicitud</Text>
              </TouchableOpacity>
            ) : null}
          </Animatable.View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (_insets) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background.default,
    ...(Platform.OS === 'web' ? { minHeight: 0 } : {}),
  },
  mainList: {
    flex: 1,
    ...(Platform.OS === 'web' ? { minHeight: 0 } : {}),
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.container.horizontal,
    paddingBottom: SPACING.sm,
    zIndex: 10,
    backgroundColor: COLORS.background.default,
  },
  screenTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: SPACING.container.horizontal,
    paddingBottom: 40,
  },
  healthBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.success[50],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.success[200],
    borderRadius: BORDERS.radius.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  healthBannerText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background.paper,
    padding: SPACING.lg,
    borderRadius: BORDERS.radius.card.lg,
    marginBottom: SPACING.md,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  vehicleInfo: {
    flex: 1,
  },
  brand: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    textTransform: 'uppercase',
  },
  plate: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    marginTop: SPACING.xxs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  kmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary[50],
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xxs,
    borderRadius: BORDERS.radius.sm,
    alignSelf: 'flex-start',
    marginTop: SPACING.xs,
    gap: 6,
  },
  kmText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.primary[600],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.gray[100],
  },
  scoreText: {
    fontSize: 22,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  scoreLabel: {
    fontSize: 10,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.xxs,
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDERS.radius.sm,
    backgroundColor: COLORS.primary[50],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.primary[100],
    flexShrink: 0,
  },
  syncButtonDisabled: {
    opacity: 0.5,
    backgroundColor: COLORS.neutral.gray[100],
    borderColor: COLORS.border.light,
  },
  syncButtonText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.primary[600],
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  syncButtonTextDisabled: {
    color: COLORS.text.tertiary,
  },
  legendRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  helpLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xxs,
  },
  helpLinkText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.primary[600],
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  helpScrollView: {
    maxHeight: 320,
    ...(Platform.OS === 'web' ? { minHeight: 0 } : {}),
  },
  helpScrollContent: {
    paddingBottom: SPACING.xs,
  },
  helpSectionText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    lineHeight: 22,
    marginBottom: SPACING.sm,
  },
  helpSubtitle: {
    fontSize: 15,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  helpLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: 6,
  },
  helpLevelText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    flex: 1,
  },
  // Bloque de integridad de datos
  integridadCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.card.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  integridadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.sm,
  },
  integridadTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  integridadBarTrack: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: COLORS.neutral.gray[200],
    marginBottom: SPACING.xs,
  },
  integridadBarSegment: {
    height: '100%',
  },
  integridadLegend: {
    flexDirection: 'row',
    gap: SPACING.md,
    flexWrap: 'wrap',
  },
  integridadLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  integridadLegendText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
  },
  integridadAdvertencia: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.warning[700],
    marginTop: SPACING.xs,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  // Confianza historial en modal detalle
  confianzaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: BORDERS.radius.card.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    flexWrap: 'wrap',
  },
  confianzaText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    flex: 1,
  },
  declararBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary[50],
    borderRadius: BORDERS.radius.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.primary[100],
  },
  declararBtnText: {
    fontSize: 11,
    color: COLORS.primary[600],
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  // Modal de declaración retroactiva
  declModalComponent: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  declModalHint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
    lineHeight: 18,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.warning[50],
    borderRadius: BORDERS.radius.input.sm,
    padding: SPACING.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning[400],
  },
  declLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
    marginBottom: 4,
    marginTop: SPACING.xs,
  },
  declInput: {
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.default,
    borderRadius: BORDERS.radius.input.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.primary,
    backgroundColor: COLORS.background.default,
    marginBottom: SPACING.xs,
  },
  declInputMulti: {
    minHeight: 72,
    textAlignVertical: 'top',
    marginBottom: SPACING.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
    marginTop: SPACING.md,
  },
  emptySubText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    maxWidth: '70%',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.background.overlay,
    ...(Platform.OS === 'web' ? { minHeight: 0 } : {}),
  },
  modalCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.modal.lg,
    padding: SPACING.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
    ...SHADOWS.lg,
    ...(Platform.OS === 'web' ? { maxHeight: '90vh', minHeight: 0 } : {}),
  },
  modalCardLarge: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.modal.lg,
    padding: SPACING.lg,
    maxHeight: '85%',
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
    ...SHADOWS.lg,
    ...(Platform.OS === 'web' ? { maxHeight: '85vh', minHeight: 0 } : {}),
  },
  modalScroll: {
    maxHeight: 340,
    ...(Platform.OS === 'web' ? { minHeight: 0 } : {}),
  },
  modalScrollContent: {
    paddingBottom: SPACING.xs,
  },
  modalSectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xxs,
  },
  modalSectionHint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
    lineHeight: 18,
  },
  infoBoxLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.tertiary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.gray[100],
    borderRadius: BORDERS.radius.card.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  serviceCardIcon: {
    width: 44,
    height: 44,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  serviceCardBody: {
    flex: 1,
    minWidth: 0,
  },
  serviceCardTitle: {
    fontSize: 15,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  serviceCardDesc: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginTop: SPACING.xxs,
    lineHeight: 18,
  },
  serviceCardMeta: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.primary[600],
    marginTop: 6,
  },
  modalButtonSecondary: {
    marginTop: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: BORDERS.radius.button.md,
    alignItems: 'center',
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  modalButtonSecondaryText: {
    color: COLORS.text.primary,
    fontSize: 15,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    flex: 1,
    marginRight: SPACING.sm,
  },
  modalBody: {
    marginBottom: SPACING.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  infoText: {
    fontSize: 15,
    color: COLORS.text.secondary,
  },
  bold: {
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  infoBox: {
    backgroundColor: COLORS.neutral.gray[100],
    padding: SPACING.md,
    borderRadius: BORDERS.radius.input.md,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    marginBottom: SPACING.sm,
  },
  infoBoxText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  infoTextMuted: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.tertiary,
  },
  estimadoInline: {
    fontSize: 10,
    color: COLORS.neutral.gray[400],
    fontStyle: 'italic',
  },
  // Modal: bloque de salud visual
  healthBlock: {
    backgroundColor: COLORS.neutral.gray[100],
    borderRadius: BORDERS.radius.card.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  healthBlockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  healthBlockLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  healthBlockPct: {
    fontSize: 22,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  healthBlockNivel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    marginTop: 4,
  },
  modalBarTrack: {
    height: 6,
    backgroundColor: COLORS.neutral.gray[300],
    borderRadius: 3,
    overflow: 'hidden',
  },
  modalBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  // Modal: bloque "Cuándo actuar"
  actionBlock: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.card.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  actionBlockLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  actionBlockValue: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  actionBlockClima: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.warning[700],
    marginTop: 6,
    lineHeight: 18,
  },
  // Modal: bloque de riesgo
  riskBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
    borderRadius: BORDERS.radius.card.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  riskBlockText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    flex: 1,
    lineHeight: 20,
  },
});

export default VehicleHealthScreen;
