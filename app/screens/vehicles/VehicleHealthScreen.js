import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Modal,
  Alert,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
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
} from 'lucide-react-native';
import * as Animatable from 'react-native-animatable';
import { ROUTES } from '../../utils/constants';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import VehicleHealthService from '../../services/vehicleHealthService';
import { getVehicleById } from '../../services/vehicle';
import HealthMetricCard from '../../components/vehicles/HealthMetricCard';
import Skeleton from '../../components/feedback/Skeleton/Skeleton';
import WebSocketService from '../../services/websocketService';
import NotificationService from '../../services/notificationService';

const { width } = Dimensions.get('window');

const VehicleHealthScreen = ({ route }) => {
  const navigation = useNavigation();
  const { vehicleId, vehicle } = route.params;
  const insets = useSafeAreaInsets();
  const styles = createStyles(insets);

  // Data State
  // Prefer fresh data from fetch, fallback to route params if available
  const [healthData, setHealthData] = useState(null);
  const [vehicleData, setVehicleData] = useState(vehicle);
  const [loading, setLoading] = useState(!vehicle?.health_report);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState(null); // For Modal
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const pollingIntervalRef = useRef(null);
  const wsHandlerRef = useRef(null);

  // Initial Load
  useEffect(() => {
    loadData();
    return () => clearInterval(pollingIntervalRef.current);
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
    } catch (e) {
      console.error("Error loading health:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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

  /** Sincronizar con backend (recálculo asíncrono); recarga datos tras un breve delay */
  const handleSync = async () => {
    if (!vehicleId || syncing) return;
    setSyncing(true);
    try {
      await VehicleHealthService.syncVehicleHealth(vehicleId);
      // Recálculo corre en Celery; hacer GET inmediato + re-fetch tras 5s para capturar resultado
      const hData = await VehicleHealthService.getVehicleHealth(vehicleId, true);
      if (hData) setHealthData(hData);
      const v = await getVehicleById(vehicleId);
      setVehicleData(v);
      Alert.alert(
        'Sincronización iniciada',
        'Los datos se están recalculando. Se actualizarán automáticamente en unos segundos.'
      );
      // Re-fetch delayed para capturar resultado de Celery si WS no lo entregó
      setTimeout(() => loadData(true), 5000);
    } catch (e) {
      console.error('Sync salud error:', e);
      Alert.alert(
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

  // --- RENDERERS ---

  // Get health color based on score - matches MisVehiculosScreen logic
  const getHealthColor = (score) => {
    if (score >= 80) return '#10B981'; // Green - Excellent
    if (score >= 60) return '#F59E0B'; // Yellow/Amber - Good
    if (score >= 40) return '#F97316'; // Orange - Fair
    return '#EF4444'; // Red - Poor
  };

  const renderHeader = () => {
    // Health Score - Use same source as MisVehiculosScreen for consistency
    // Priority: vehicleData.health_score (from vehicles list) > healthData.salud_general_porcentaje
    const score = vehicleData?.health_score ?? healthData?.salud_general_porcentaje ?? 0;
    const scoreColor = getHealthColor(score);

    return (
      <View style={styles.headerContainer}>
        {Platform.OS === 'ios' && (
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        )}
        <View style={styles.vehicleInfo}>
          <Text style={styles.brand}>{vehicleData?.marca_nombre || 'Marca'} {vehicleData?.modelo_nombre}</Text>
          <Text style={styles.plate}>{vehicleData?.patente} • {vehicleData?.year}</Text>
          <View style={styles.kmBadge}>
            <Gauge size={14} color="#6EE7B7" />
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
    } = healthData;

    return (
      <View style={styles.summaryContainer}>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendText}>{componentes_optimos} Óptimos</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.legendText}>{componentes_atencion} Atención</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.legendText}>{componentes_urgentes} Urgentes</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#7F1D1D' }]} />
            <Text style={styles.legendText}>{componentes_criticos} Críticos</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.helpLink} onPress={() => setShowHelpModal(true)}>
          <HelpCircle size={18} color="#93C5FD" />
          <Text style={styles.helpLinkText}>Ayuda</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Fuente de la lista: priorizar siempre componentes del endpoint de salud tras cargar
  // (evita health_report embebido en vehículo quedarse obsoleto tras sync)
  const listData =
    healthData && Array.isArray(healthData.componentes)
      ? healthData.componentes
      : vehicleData?.health_report || [];

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#030712', '#0a1628', '#030712']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.blob1} />
      <View style={styles.blob2} />
      <View style={styles.blob3} />

      {/* Glass header with back button */}
      <View style={[styles.screenHeader, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Salud del Vehículo</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={listData}
        keyExtractor={(item, index) => item.slug || item.componente || String(index)}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListHeaderComponent={
          <>
            {renderHeader()}
            {renderSummary()}
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Estado de Componentes</Text>
              <TouchableOpacity
                style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
                onPress={handleSync}
                disabled={syncing}
                accessibilityLabel="Sincronizar métricas de salud"
              >
                {syncing ? (
                  <Hourglass size={18} color="rgba(255,255,255,0.35)" />
                ) : (
                  <RefreshCw size={18} color="#6EE7B7" />
                )}
                <Text style={[styles.syncButtonText, syncing && styles.syncButtonTextDisabled]}>
                  {syncing ? '…' : 'Sincronizar'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <HealthMetricCard item={item} onPress={() => handleMetricPress(item)} />
        )}
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: 12 }}>
              <Skeleton height={80} width={'100%'} borderRadius={12} />
              <Skeleton height={80} width={'100%'} borderRadius={12} />
              <Skeleton height={80} width={'100%'} borderRadius={12} />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <CheckCircle size={64} color="rgba(255,255,255,0.2)" />
              <Text style={styles.emptyText}>Sin datos de componentes.</Text>
              <Text style={styles.emptySubText}>Tu vehículo parece estar nuevo en el sistema o no tiene reglas asignadas.</Text>
            </View>
          )
        }
      />

      {/* Help Modal */}
      <Modal
        visible={showHelpModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHelpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={Platform.OS === 'ios' ? 40 : 90} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,23,42,0.7)' }]} />
          <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setShowHelpModal(false)}
          />
          <Animatable.View animation="zoomIn" duration={300} style={styles.modalCard}>
            {Platform.OS === 'ios' && (
              <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
            )}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>¿Cómo calculamos la salud de tu vehículo?</Text>
              <TouchableOpacity onPress={() => setShowHelpModal(false)}>
                <X size={24} color="#FFF" />
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
                <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.helpLevelText}>Óptimo (≥70%): en buen estado.</Text>
              </View>
              <View style={styles.helpLevelRow}>
                <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
                <Text style={styles.helpLevelText}>Atención (40–70%): planificar revisión pronto.</Text>
              </View>
              <View style={styles.helpLevelRow}>
                <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
                <Text style={styles.helpLevelText}>Urgente (10–40%): revisar a la brevedad.</Text>
              </View>
              <View style={styles.helpLevelRow}>
                <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
                <Text style={styles.helpLevelText}>Crítico ({'<'}10%): atención inmediata.</Text>
              </View>

              <Text style={styles.helpSubtitle}>Ejemplo</Text>
              <Text style={styles.helpSectionText}>
                Si un componente tiene vida útil de 50.000 km y han pasado 25.000 km desde el último cambio, la salud se calcula en aproximadamente 78% (Óptimo). Si han pasado 45.000 km, sería ~45% (Atención). Si supera los 50.000 km, baja más y puede pasar a Urgente o Crítico.
              </Text>
            </ScrollView>

            <TouchableOpacity activeOpacity={0.8} onPress={() => setShowHelpModal(false)}>
              <LinearGradient
                colors={['#007EA7', '#00A8E8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.modalButton}
              >
                <Text style={styles.modalButtonText}>Entendido</Text>
              </LinearGradient>
            </TouchableOpacity>
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
          <BlurView intensity={Platform.OS === 'ios' ? 40 : 90} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,23,42,0.7)' }]} />
          <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setSelectedMetric(null)}
          />
          <Animatable.View animation="zoomIn" duration={300} style={styles.modalCardLarge}>
            {Platform.OS === 'ios' && (
              <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
            )}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={2}>
                {selectedMetric?.name}
              </Text>
              <TouchableOpacity onPress={() => setSelectedMetric(null)} hitSlop={12}>
                <X size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.infoRow}>
                <Gauge size={20} color="rgba(255,255,255,0.5)" />
                <Text style={styles.infoText}>
                  Próx. revisión en:{' '}
                  <Text style={styles.bold}>{selectedMetric?.vida_util}</Text>
                </Text>
              </View>
              {selectedMetric?.salud_porcentaje != null && (
                <View style={styles.infoRow}>
                  <Heart size={20} color="rgba(255,255,255,0.5)" />
                  <Text style={styles.infoText}>
                    Salud del componente:{' '}
                    <Text style={styles.bold}>{Math.round(selectedMetric.salud_porcentaje)}%</Text>
                  </Text>
                </View>
              )}

              <View style={styles.infoBox}>
                <Text style={styles.infoBoxLabel}>Observaciones</Text>
                <Text style={styles.infoBoxText}>{selectedMetric?.mensaje}</Text>
              </View>

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
                        <Wrench size={22} color="#6EE7B7" />
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
                      <ChevronRight size={20} color="rgba(255,255,255,0.35)" />
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

const createStyles = (insets) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#030712',
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blob1: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(16,185,129,0.08)',
  },
  blob2: {
    position: 'absolute',
    top: 200,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(99,102,241,0.06)',
  },
  blob3: {
    position: 'absolute',
    bottom: 50,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(6,182,212,0.05)',
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.10)',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  vehicleInfo: {
    flex: 1,
  },
  brand: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
    textTransform: 'uppercase',
  },
  plate: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
    fontWeight: '600',
  },
  kmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
    gap: 6,
  },
  kmText: {
    fontSize: 12,
    color: '#6EE7B7',
    fontWeight: '700',
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  scoreText: {
    fontSize: 22,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
    flexWrap: 'wrap',
    gap: 12,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)',
    flexShrink: 0,
  },
  syncButtonDisabled: {
    opacity: 0.5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  syncButtonText: {
    fontSize: 14,
    color: '#6EE7B7',
    fontWeight: '600',
  },
  syncButtonTextDisabled: {
    color: 'rgba(255,255,255,0.35)',
  },
  legendRow: {
    flexDirection: 'row',
    gap: 12,
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
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  helpLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  helpLinkText: {
    fontSize: 14,
    color: '#93C5FD',
    fontWeight: '600',
  },
  helpScrollView: {
    maxHeight: 320,
  },
  helpScrollContent: {
    paddingBottom: 8,
  },
  helpSectionText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 22,
    marginBottom: 12,
  },
  helpSubtitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 16,
    marginBottom: 8,
  },
  helpLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  helpLevelText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: '70%',
  },
  // Modal overlay
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.97)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  modalCardLarge: {
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.97)',
    borderRadius: 24,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  modalScroll: {
    maxHeight: 340,
  },
  modalScrollContent: {
    paddingBottom: 8,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 8,
    marginBottom: 4,
  },
  modalSectionHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 12,
    lineHeight: 18,
  },
  infoBoxLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  serviceCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(16,185,129,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  serviceCardBody: {
    flex: 1,
    minWidth: 0,
  },
  serviceCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  serviceCardDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
    lineHeight: 18,
  },
  serviceCardMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6EE7B7',
    marginTop: 6,
  },
  modalButtonSecondary: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  modalButtonSecondaryText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    flex: 1,
    marginRight: 12,
  },
  modalBody: {
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
  },
  bold: {
    fontWeight: '700',
    color: '#FFF',
  },
  infoBox: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  infoBoxText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 20,
  },
  modalButton: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default VehicleHealthScreen;
