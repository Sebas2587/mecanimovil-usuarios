import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Modal,
  Alert
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

  const handleNavToService = () => {
    // Navigate to Create Request
    try {
      navigation.navigate('TabNavigator', {
        screen: ROUTES.CREAR_SOLICITUD,
        params: { vehicle: vehicleData, alertas: healthData?.alertas },
      });
    } catch (e) {
      navigation.navigate(ROUTES.CREAR_SOLICITUD, { vehicle: vehicleData, alertas: healthData?.alertas });
    }
  };

  // --- RENDERERS ---

  const renderHeader = () => {
    // Health Score
    // Verify source: healthData.salud_general_porcentaje OR vehicleData.health_score
    const score = healthData?.salud_general_porcentaje ?? vehicleData?.health_score ?? 0;
    const scoreColor = score >= 70 ? COLORS.success[500] : score >= 40 ? COLORS.warning[500] : COLORS.error[500];

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

  // Determine list data source
  // healthData.componentes might come from endpoint, OR vehicleData.health_report
  const listData = healthData?.componentes || vehicleData?.health_report || [];

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
            <Text style={styles.sectionTitle}>Estado de Componentes</Text>
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

      {/* Detail Modal */}
      <Modal
        visible={!!selectedMetric}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMetric(null)}
      >
        <View style={styles.modalOverlay}>
          <Animatable.View animation="zoomIn" duration={300} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedMetric?.name}</Text>
              <TouchableOpacity onPress={() => setSelectedMetric(null)}>
                <Ionicons name="close" size={24} color={COLORS.base.inkBlack} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.infoRow}>
                <Ionicons name="speedometer-outline" size={20} color={COLORS.text.secondary} />
                <Text style={styles.infoText}>Próx. revisión en: <Text style={styles.bold}>{selectedMetric?.vida_util}</Text></Text>
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoBoxText}>{selectedMetric?.mensaje}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setSelectedMetric(null);
                handleNavToService();
              }}
            >
              <Text style={styles.modalButtonText}>Cotizar Reparación</Text>
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
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
    paddingHorizontal: 4,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.base.inkBlack,
    marginBottom: 16,
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
