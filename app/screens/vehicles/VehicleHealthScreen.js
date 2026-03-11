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
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { ROUTES } from '../../utils/constants';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import VehicleHealthService from '../../services/vehicleHealthService';
import { getVehicleById } from '../../services/vehicle';
import { useTheme } from '../../design-system/theme/useTheme';
import { COLORS } from '../../design-system/tokens/colors';
import HealthMetricCard from '../../components/vehicles/HealthMetricCard';
import Skeleton from '../../components/feedback/Skeleton/Skeleton';
import WebSocketService from '../../services/websocketService';
import NotificationService from '../../services/notificationService';

const { width } = Dimensions.get('window');

const VehicleHealthScreen = ({ route }) => {
  const navigation = useNavigation();
  const { vehicleId, vehicle } = route.params;
  const theme = useTheme();
  const styles = createStyles(theme);

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

  /** Sincronizar con backend (recálculo inmediato); luego recarga datos */
  const handleSync = async () => {
    if (!vehicleId || syncing) return;
    setSyncing(true);
    try {
      const syncPayload = await VehicleHealthService.syncVehicleHealth(vehicleId);
      // Backend recalcula en el mismo request; GET fuerza misma forma que siempre usa la pantalla
      const hData =
        (await VehicleHealthService.getVehicleHealth(vehicleId, true)) || syncPayload;
      if (hData) setHealthData(hData);
      const v = await getVehicleById(vehicleId);
      setVehicleData(v);
      // Si porcentajes no cambian: el motor usa km del vehículo y km último servicio; sin cambios en checklist/km, el número es el mismo (es correcto).
      Alert.alert(
        'Sincronización lista',
        'Datos recargados desde el servidor. Con intervalo por tiempo en las reglas, el % puede bajar aunque el km no haya subido.'
      );
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
    const params = {
      vehicle: vehicleData,
      alertas: healthData?.alertas,
      ...extraParams,
    };
    try {
      navigation.navigate('TabNavigator', {
        screen: ROUTES.CREAR_SOLICITUD,
        params,
      });
    } catch (e) {
      navigation.navigate(ROUTES.CREAR_SOLICITUD, params);
    }
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
        <View style={styles.vehicleInfo}>
          <Text style={styles.brand}>{vehicleData?.marca_nombre || 'Marca'} {vehicleData?.modelo_nombre}</Text>
          <Text style={styles.plate}>{vehicleData?.patente} • {vehicleData?.year}</Text>
          <View style={styles.kmBadge}>
            <Ionicons name="speedometer-outline" size={14} color={COLORS.primary[600]} />
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
    const { componentes_optimos = 0, componentes_atencion = 0, componentes_urgentes = 0 } = healthData;

    return (
      <View style={styles.summaryContainer}>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: COLORS.success[500] }]} />
            <Text style={styles.legendText}>{componentes_optimos} Óptimos</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: COLORS.warning[500] }]} />
            <Text style={styles.legendText}>{componentes_atencion} Atención</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: COLORS.error[500] }]} />
            <Text style={styles.legendText}>{componentes_urgentes} Urgentes</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.helpLink} onPress={() => setShowHelpModal(true)}>
          <Ionicons name="help-circle-outline" size={18} color={COLORS.primary[500]} />
          <Text style={styles.helpLinkText}>Ayuda</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCTA = () => {
    if (healthData?.tiene_alertas_activas) {
      return (
        <Animatable.View animation="pulse" iterationCount="infinite" style={styles.ctaContainer}>
          <View>
            <Text style={styles.ctaTitle}>Atención Requerida</Text>
            <Text style={styles.ctaSubtitle}>Se detectaron problemas en tu vehículo.</Text>
          </View>
          <TouchableOpacity style={styles.ctaButton} onPress={handleNavToService}>
            <Text style={styles.ctaButtonText}>Agendar</Text>
            <Ionicons name="arrow-forward" color="white" size={16} />
          </TouchableOpacity>
        </Animatable.View>
      );
    }
    return null;
  };

  // Fuente de la lista: priorizar siempre componentes del endpoint de salud tras cargar
  // (evita health_report embebido en vehículo quedarse obsoleto tras sync)
  const listData =
    healthData && Array.isArray(healthData.componentes)
      ? healthData.componentes
      : vehicleData?.health_report || [];

  return (
    <View style={styles.screen}>
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
            {renderCTA()}
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Estado de Componentes</Text>
              <TouchableOpacity
                style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
                onPress={handleSync}
                disabled={syncing}
                accessibilityLabel="Sincronizar métricas de salud"
              >
                <Ionicons
                  name={syncing ? 'hourglass-outline' : 'sync-outline'}
                  size={18}
                  color={syncing ? COLORS.neutral.gray[400] : COLORS.primary[600]}
                />
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
              <Ionicons name="checkmark-circle-outline" size={64} color={COLORS.neutral.gray[300]} />
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
          <Animatable.View animation="zoomIn" duration={300} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>¿Cómo calculamos la salud de tu vehículo?</Text>
              <TouchableOpacity onPress={() => setShowHelpModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.base.inkBlack} />
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
                <View style={[styles.dot, { backgroundColor: COLORS.success[500] }]} />
                <Text style={styles.helpLevelText}>Óptimo (≥70%): en buen estado.</Text>
              </View>
              <View style={styles.helpLevelRow}>
                <View style={[styles.dot, { backgroundColor: COLORS.warning[500] }]} />
                <Text style={styles.helpLevelText}>Atención (40–70%): planificar revisión pronto.</Text>
              </View>
              <View style={styles.helpLevelRow}>
                <View style={[styles.dot, { backgroundColor: COLORS.error[500] }]} />
                <Text style={styles.helpLevelText}>Urgente (10–40%): revisar a la brevedad.</Text>
              </View>
              <View style={styles.helpLevelRow}>
                <View style={[styles.dot, { backgroundColor: COLORS.error[500] }]} />
                <Text style={styles.helpLevelText}>Crítico ({'<'}10%): atención inmediata.</Text>
              </View>

              <Text style={styles.helpSubtitle}>Ejemplo</Text>
              <Text style={styles.helpSectionText}>
                Si un componente tiene vida útil de 50.000 km y han pasado 25.000 km desde el último cambio, la salud se calcula en aproximadamente 78% (Óptimo). Si han pasado 45.000 km, sería ~45% (Atención). Si supera los 50.000 km, baja más y puede pasar a Urgente o Crítico.
              </Text>
            </ScrollView>

            <TouchableOpacity style={styles.modalButton} onPress={() => setShowHelpModal(false)}>
              <Text style={styles.modalButtonText}>Entendido</Text>
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
          <Animatable.View animation="zoomIn" duration={300} style={styles.modalCardLarge}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={2}>
                {selectedMetric?.name}
              </Text>
              <TouchableOpacity onPress={() => setSelectedMetric(null)} hitSlop={12}>
                <Ionicons name="close" size={24} color={COLORS.base.inkBlack} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.infoRow}>
                <Ionicons name="speedometer-outline" size={20} color={COLORS.text.secondary} />
                <Text style={styles.infoText}>
                  Próx. revisión en:{' '}
                  <Text style={styles.bold}>{selectedMetric?.vida_util}</Text>
                </Text>
              </View>
              {selectedMetric?.salud_porcentaje != null && (
                <View style={styles.infoRow}>
                  <Ionicons name="heart-outline" size={20} color={COLORS.text.secondary} />
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
                        handleNavToService({
                          serviciosPreSeleccionados: [srv.id],
                          descripcionPrellenada: descripcion,
                        });
                      }}
                    >
                      <View style={styles.serviceCardIcon}>
                        <Ionicons name="construct-outline" size={22} color={COLORS.primary[600]} />
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
                      <Ionicons name="chevron-forward" size={20} color={COLORS.neutral.gray[400]} />
                    </TouchableOpacity>
                  ))}
                </>
              ) : null}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalButtonSecondary}
              onPress={() => {
                setSelectedMetric(null);
                handleNavToService();
              }}
            >
              <Text style={styles.modalButtonSecondaryText}>
                {serviciosDelComponente.length > 0
                  ? 'Ver todos los servicios'
                  : 'Cotizar / Nueva solicitud'}
              </Text>
            </TouchableOpacity>
          </Animatable.View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (theme) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background.default, // #F8F9FA
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  vehicleInfo: {
    flex: 1,
  },
  brand: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.base.inkBlack,
    textTransform: 'uppercase',
  },
  plate: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 4,
    fontWeight: '600',
  },
  kmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
    gap: 6,
  },
  kmText: {
    fontSize: 12,
    color: COLORS.primary[600],
    fontWeight: '700',
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  scoreText: {
    fontSize: 22,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: 10,
    color: COLORS.text.tertiary,
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
    backgroundColor: COLORS.primary[50] || '#EEF2FF',
    borderWidth: 1,
    borderColor: COLORS.primary[200] || '#C7D2FE',
    flexShrink: 0,
  },
  syncButtonDisabled: {
    opacity: 0.7,
    backgroundColor: COLORS.neutral.gray[100],
    borderColor: COLORS.neutral.gray[200],
  },
  syncButtonText: {
    fontSize: 14,
    color: COLORS.primary[700] || COLORS.primary[600],
    fontWeight: '600',
  },
  syncButtonTextDisabled: {
    color: COLORS.neutral.gray[500],
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
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  helpLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  helpLinkText: {
    fontSize: 14,
    color: COLORS.primary[500],
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
    color: COLORS.text.primary,
    lineHeight: 22,
    marginBottom: 12,
  },
  helpSubtitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.base.inkBlack,
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
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  ctaContainer: {
    backgroundColor: '#FEF2F2', // Red 50
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  ctaTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991B1B', // Red 800
  },
  ctaSubtitle: {
    fontSize: 12,
    color: '#B91C1C', // Red 700
  },
  ctaButton: {
    backgroundColor: '#DC2626', // Red 600
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 4,
  },
  ctaButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
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
    color: COLORS.base.inkBlack,
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.neutral.gray[500],
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 13,
    color: COLORS.neutral.gray[400],
    textAlign: 'center',
    marginTop: 8,
    maxWidth: '70%',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
  },
  modalCardLarge: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    maxHeight: '85%',
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
    color: COLORS.base.inkBlack,
    marginTop: 8,
    marginBottom: 4,
  },
  modalSectionHint: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  infoBoxLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.tertiary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.default,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.neutral.gray[100],
  },
  serviceCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary[50],
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
    color: COLORS.base.inkBlack,
  },
  serviceCardDesc: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginTop: 4,
    lineHeight: 18,
  },
  serviceCardMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary[600],
    marginTop: 6,
  },
  modalButtonSecondary: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: COLORS.neutral.gray[100],
  },
  modalButtonSecondaryText: {
    color: COLORS.text.primary,
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
    color: COLORS.base.inkBlack,
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
    color: COLORS.text.primary,
  },
  bold: {
    fontWeight: '700',
  },
  infoBox: {
    backgroundColor: COLORS.background.default,
    padding: 16,
    borderRadius: 12,
  },
  infoBoxText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  modalButton: {
    backgroundColor: COLORS.primary[600],
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
