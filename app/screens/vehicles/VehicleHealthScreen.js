import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { ROUTES } from '../../utils/constants';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import VehicleHealthService from '../../services/vehicleHealthService';
import ScrollContainer from '../../components/base/ScrollContainer';
import * as userService from '../../services/user';
import { useTheme } from '../../design-system/theme/useTheme';
import WebSocketService from '../../services/websocketService';
import NotificationService from '../../services/notificationService';
import { getVehicleById } from '../../services/vehicle';

const { width } = Dimensions.get('window');

const VehicleHealthScreen = ({ route }) => {
  const navigation = useNavigation();
  const { vehicleId, vehicle } = route.params;
  const theme = useTheme();

  // Extraer valores del tema de forma segura
  const colors = theme?.colors || {};
  const typography = theme?.typography || {};
  const spacing = theme?.spacing || {};
  const borders = theme?.borders || {};

  // Asegurar que typography tenga todas las propiedades necesarias
  const safeTypography = typography?.fontSize && typography?.fontWeight
    ? typography
    : {
      fontSize: { xs: 10, sm: 12, base: 14, md: 16, lg: 18, xl: 20, '2xl': 24 },
      fontWeight: { light: '300', regular: '400', medium: '500', semibold: '600', bold: '700' },
    };

  // Validar que borders esté completamente inicializado
  const safeBorders = (borders?.radius && typeof borders.radius.full !== 'undefined')
    ? borders
    : {
      radius: {
        none: 0, sm: 4, md: 8, lg: 12, xl: 16, '2xl': 20, '3xl': 24,
        full: 9999,
        button: { sm: 8, md: 12, lg: 16, full: 9999 },
        input: { sm: 8, md: 12, lg: 16 },
        card: { sm: 8, md: 12, lg: 16, xl: 20 },
        modal: { sm: 12, md: 16, lg: 20, xl: 24 },
        avatar: { sm: 16, md: 24, lg: 32, full: 9999 },
        badge: { sm: 4, md: 8, lg: 12, full: 9999 },
      },
      width: { none: 0, thin: 1, medium: 2, thick: 4 }
    };

  // Crear estilos dinámicos con los tokens del tema
  const styles = createStyles(colors, safeTypography, spacing, safeBorders);

  const [healthData, setHealthData] = useState(null);
  const [vehicleData, setVehicleData] = useState(vehicle); // Estado para guardar vehículo si se carga
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const pollingIntervalRef = useRef(null);
  const wsHandlerRef = useRef(null);

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Cargar vehículo si no vino en params
        let currentVehicle = vehicleData;
        if (!currentVehicle && vehicleId) {
          try {
            console.log('🚗 Cargando datos del vehículo...', vehicleId);
            currentVehicle = await getVehicleById(vehicleId);
            setVehicleData(currentVehicle);
          } catch (err) {
            console.error('Error cargando vehículo:', err);
            // No bloqueamos healthfetch, pero guardamos error en log
          }
        }

        // Cargar salud
        await fetchVehicleHealth(false);
      } catch (err) {
        console.error('Error general cargando pantalla:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    loadData();
  }, [vehicleId]);

  // Configurar WebSocket para actualizaciones en tiempo real
  useEffect(() => {
    // Conectar WebSocket si no está conectado
    if (!WebSocketService.getConnectionStatus()) {
      WebSocketService.connect();
    }

    // Suscribirse a actualizaciones de salud del vehículo
    const handleSaludActualizada = (data) => {
      console.log('📨 [SALUD] Mensaje WebSocket recibido:', data);

      // Solo procesar si es para este vehículo
      if (data.vehicle_id && String(data.vehicle_id) === String(vehicleId)) {
        console.log('✅ [SALUD] Actualización recibida para este vehículo, recargando datos...');

        // Mostrar notificación push
        NotificationService.notificarSaludVehiculoActualizada(
          data.vehiculo_info || 'Vehículo',
          data.componentes_actualizados || 0
        );

        // Recargar datos inmediatamente
        fetchVehicleHealth(true);
      }
    };

    // Registrar handler
    WebSocketService.onMessage('salud_vehiculo_actualizada', handleSaludActualizada);
    wsHandlerRef.current = handleSaludActualizada;

    // Limpiar al desmontar
    return () => {
      if (wsHandlerRef.current) {
        WebSocketService.offMessage('salud_vehiculo_actualizada', wsHandlerRef.current);
      }
    };
  }, [vehicleId]);

  // Polling automático cada 30 segundos cuando la pantalla está activa
  useEffect(() => {
    // Limpiar intervalo anterior si existe
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Configurar polling
    pollingIntervalRef.current = setInterval(() => {
      console.log('🔄 [SALUD] Polling automático - recargando datos...');
      fetchVehicleHealth(true);
    }, 30000); // 30 segundos

    // Limpiar al desmontar
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [vehicleId]);

  // Recargar cuando la pantalla gana foco
  useFocusEffect(
    useCallback(() => {
      console.log('👁️ [SALUD] Pantalla enfocada, recargando datos...');
      fetchVehicleHealth(true);
    }, [vehicleId])
  );

  const fetchVehicleHealth = async (forceRefresh = false) => {
    try {
      setError(null);
      const data = await VehicleHealthService.getVehicleHealth(vehicleId, forceRefresh);
      setHealthData(data);
    } catch (err) {
      console.error('Error fetching health data:', err);
      setError('No se pudo cargar el estado de salud del vehículo');
    } finally {
      // Solo actualizamos loading si no es refresh, pero ya lo manejamos en el useEffect principal para la carga inicial
      if (refreshing) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchVehicleHealth(true);
  };

  const getHealthColor = (percentage) => {
    if (percentage >= 70) return colors.success?.[500] || '#10B981';
    if (percentage >= 40) return colors.warning?.[500] || '#F59E0B';
    if (percentage >= 20) return colors.error?.[500] || '#EF4444';
    return colors.error?.[600] || '#DC2626';
  };

  const handleComponentPress = useCallback((component) => {
    if (!vehicleData) {
      console.warn('⚠️ No se encontró vehículo para el componente');
      return;
    }

    // Obtener nombre del componente
    const componenteNombre = component.nombre || component.componente_config?.nombre || '';

    // Mapeo de componentes a categorías comunes (similar a handleAlertPress en UserPanelScreen)
    const componenteToCategory = {
      'Aceite Motor': 'Cambio de Aceite',
      'Filtro de Aire': 'Filtros',
      'Filtro de Aceite': 'Filtros',
      'Batería': 'Batería',
      'Neumáticos': 'Neumáticos',
      'Pastillas de Freno': 'Frenos',
      'Amortiguadores': 'Suspensión',
    };

    // Buscar categoría que coincida
    const categoriaNombre = componenteToCategory[componenteNombre] || componenteNombre;

    // Navegar a crear solicitud con descripción pre-rellenada
    // IMPORTANTE: CREAR_SOLICITUD está en el TabNavigator, necesitamos usar navegación anidada
    try {
      navigation.navigate('TabNavigator', {
        screen: ROUTES.CREAR_SOLICITUD,
        params: {
          vehicle: vehicleData,
          descripcionPrellenada: `Servicio de mantenimiento: ${componenteNombre}. ${component.mensaje_alerta || 'El componente requiere atención.'}`,
        },
      });
      console.log('✅ Navegación exitosa a CREAR_SOLICITUD desde componente');
    } catch (error) {
      console.error('❌ Error navegando a CREAR_SOLICITUD:', error);
      // Fallback: intentar navegación directa
      navigation.navigate(ROUTES.CREAR_SOLICITUD, {
        vehicle: vehicleData,
        descripcionPrellenada: `Servicio de mantenimiento: ${componenteNombre}. ${component.mensaje_alerta || 'El componente requiere atención.'}`,
      });
    }
  }, [vehicleData, navigation]);

  const renderComponentCard = (component, index) => {
    const healthColor = getHealthColor(component.salud_porcentaje);

    return (
      <TouchableOpacity
        key={component.id}
        activeOpacity={0.7}
        onPress={() => handleComponentPress(component)}
      >
        <Animatable.View
          animation="fadeInUp"
          delay={index * 50}
          style={styles.componentCard}
        >
          <View style={styles.componentHeader}>
            <View style={[styles.componentIcon, { backgroundColor: `${healthColor}15` }]}>
              <Ionicons
                name={component.icono || 'construct-outline'}
                size={20}
                color={healthColor}
              />
            </View>
            <View style={styles.componentInfo}>
              <Text style={styles.componentName}>{component.nombre}</Text>
              <Text style={styles.componentSubtitle}>
                Último servicio: {component.km_ultimo_servicio?.toLocaleString() || 0} km
              </Text>
            </View>
            <View style={styles.componentPercentage}>
              <Text style={[styles.percentageText, { color: healthColor }]}>
                {component.salud_porcentaje}%
              </Text>
              <Text style={styles.statusBadge}>{component.nivel_alerta_display || component.nivel_alerta}</Text>
            </View>
          </View>

          {component.requiere_servicio_inmediato && component.mensaje_alerta && (
            <View style={styles.alertBanner}>
              <Ionicons name="warning" size={16} color={colors.error?.[500] || '#EF4444'} />
              <Text style={styles.alertText}>{component.mensaje_alerta}</Text>
            </View>
          )}

          <View style={styles.componentProgress}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${component.salud_porcentaje}%`,
                  backgroundColor: healthColor
                }
              ]}
            />
          </View>

          <View style={styles.componentFooter}>
            <View style={styles.footerItem}>
              <Ionicons name="speedometer-outline" size={14} color={colors.text?.secondary || '#5D6F75'} />
              <Text style={styles.footerText}>
                {component.km_estimados_restantes?.toLocaleString() || 0} km restantes
              </Text>
            </View>
            <View style={styles.footerItem}>
              <Ionicons name="calendar-outline" size={14} color={colors.text?.secondary || '#5D6F75'} />
              <Text style={styles.footerText}>
                {component.dias_estimados_restantes || 0} días aprox.
              </Text>
            </View>
          </View>
        </Animatable.View>
      </TouchableOpacity>
    );
  };

  const renderCircularProgress = () => {
    const percentage = healthData?.salud_general_porcentaje || 0;
    const healthColor = getHealthColor(percentage);

    return (
      <View style={styles.circularProgressContainer}>
        <View style={[styles.circularProgressCircle, { borderColor: healthColor }]}>
          <Text style={[styles.circularProgressValue, { color: healthColor }]}>
            {Math.round(percentage)}%
          </Text>
          <Text style={styles.circularProgressLabel}>Salud</Text>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary?.[500] || '#003459'} />
        <Text style={styles.loadingText}>Cargando estado de salud...</Text>
      </View>
    );
  }

  if (error && !healthData) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.error?.[500] || '#EF4444'} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchVehicleHealth(true)} activeOpacity={0.8}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollContainer
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary?.[500] || '#003459']}
            tintColor={colors.primary?.[500] || '#003459'}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <>
          {/* Header con salud general */}
          <Animatable.View animation="fadeIn" style={styles.headerCard}>
            <View style={styles.headerContent}>
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleTitle}>
                  {vehicleData?.marca_nombre || vehicleData?.marca || 'Cargando...'} {vehicleData?.modelo_nombre || vehicleData?.modelo || ''}
                </Text>
                <Text style={styles.vehicleSubtitle}>
                  {vehicleData?.year || ''} • {vehicleData?.patente || ''}
                </Text>
                <Text style={styles.vehicleKm}>
                  {vehicleData?.kilometraje?.toLocaleString() || 0} km
                </Text>
              </View>

              {renderCircularProgress()}
            </View>

            {/* Resumen de componentes */}
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <View style={[styles.summaryDot, { backgroundColor: colors.success?.[500] || '#10B981' }]} />
                <Text style={styles.summaryText}>
                  {healthData?.componentes_optimos || 0} Óptimos
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <View style={[styles.summaryDot, { backgroundColor: colors.warning?.[500] || '#F59E0B' }]} />
                <Text style={styles.summaryText}>
                  {healthData?.componentes_atencion || 0} Atención
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <View style={[styles.summaryDot, { backgroundColor: colors.error?.[500] || '#EF4444' }]} />
                <Text style={styles.summaryText}>
                  {healthData?.componentes_urgentes || 0} Urgentes
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <View style={[styles.summaryDot, { backgroundColor: colors.error?.[600] || '#DC2626' }]} />
                <Text style={styles.summaryText}>
                  {healthData?.componentes_criticos || 0} Críticos
                </Text>
              </View>
            </View>
          </Animatable.View>

          {/* Lista de componentes */}
          <View style={styles.componentsSection}>
            <Text style={styles.sectionTitle}>Estado de Componentes</Text>

            {healthData?.calculando ? (
              <View style={styles.calculatingContainer}>
                <ActivityIndicator size="small" color={colors.primary?.[500] || '#003459'} />
                <Text style={styles.calculatingText}>
                  {healthData.mensaje || 'Calculando estado de salud...'}
                </Text>
              </View>
            ) : healthData?.componentes && healthData.componentes.length > 0 ? (
              healthData.componentes.map((component, index) => renderComponentCard(component, index))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="construct-outline" size={48} color={colors.text?.secondary || '#5D6F75'} />
                <Text style={styles.emptyText}>No hay componentes registrados</Text>
              </View>
            )}
          </View>

          {/* Botón de agendar servicio */}
          {healthData?.tiene_alertas_activas && (
            <Animatable.View
              animation="pulse"
              iterationCount="infinite"
              style={styles.ctaCard}
            >
              <Ionicons name="construct" size={32} color={colors.primary?.[500] || '#003459'} />
              <Text style={styles.ctaTitle}>¿Necesitas agendar un servicio?</Text>
              <Text style={styles.ctaSubtitle}>
                Costo estimado: ${(healthData.costo_estimado_mantenimiento || 0).toLocaleString()}
              </Text>
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => {
                  // IMPORTANTE: CREAR_SOLICITUD está en el TabNavigator, necesitamos usar navegación anidada
                  try {
                    navigation.navigate('TabNavigator', {
                      screen: ROUTES.CREAR_SOLICITUD,
                      params: {
                        vehicle: vehicleData,
                        alertas: healthData.alertas
                      },
                    });
                    console.log('✅ Navegación exitosa a CREAR_SOLICITUD desde VehicleHealthScreen');
                  } catch (error) {
                    console.error('❌ Error navegando a CREAR_SOLICITUD:', error);
                    // Fallback: intentar navegación directa
                    navigation.navigate(ROUTES.CREAR_SOLICITUD, {
                      vehicle: vehicleData,
                      alertas: healthData.alertas
                    });
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.ctaButtonText}>Agendar Ahora</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </Animatable.View>
          )}
        </>
      </ScrollContainer>
    </View>
  );
};

// Función para crear estilos dinámicos basados en el tema
const createStyles = (colors, typography, spacing, borders) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background?.default || '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background?.default || '#F8F9FA',
  },
  loadingText: {
    marginTop: spacing.md || 12,
    fontSize: typography.fontSize?.md || 16,
    color: colors.text?.secondary || '#5D6F75',
    fontWeight: typography.fontWeight?.medium || '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl || 32,
    backgroundColor: colors.background?.default || '#F8F9FA',
  },
  errorText: {
    marginTop: spacing.md || 16,
    fontSize: typography.fontSize?.md || 16,
    color: colors.error?.[500] || '#EF4444',
    textAlign: 'center',
    fontWeight: typography.fontWeight?.medium || '500',
  },
  retryButton: {
    marginTop: spacing.lg || 24,
    paddingVertical: spacing.sm || 12,
    paddingHorizontal: spacing.lg || 24,
    backgroundColor: colors.primary?.[500] || '#003459',
    borderRadius: borders.radius?.button?.md || 12,
    shadowColor: colors.primary?.[500] || '#003459',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: typography.fontSize?.md || 16,
    fontWeight: typography.fontWeight?.semibold || '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E5E5',
    borderRadius: 30,
    padding: 4,
    marginHorizontal: 16,
    marginVertical: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  tabTextActive: {
    color: '#1c2434',
  },
  scrollView: {
    flex: 1,
  },
  headerCard: {
    backgroundColor: colors.background?.paper || '#FFFFFF',
    padding: spacing.md || 20,
    borderBottomLeftRadius: borders.radius?.card?.xl || 24,
    borderBottomRightRadius: borders.radius?.card?.xl || 24,
    shadowColor: colors.base?.inkBlack || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: spacing.md || 20,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.neutral?.gray?.[200] || '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md || 20,
  },
  vehicleInfo: {
    flex: 1,
    marginRight: spacing.md || 16,
  },
  vehicleTitle: {
    fontSize: typography.fontSize?.xl || 20,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#00171F',
    marginBottom: spacing.xs || 4,
    lineHeight: typography.fontSize?.xl ? typography.fontSize.xl * 1.2 : 24,
  },
  vehicleSubtitle: {
    fontSize: typography.fontSize?.base || 14,
    color: colors.text?.secondary || '#5D6F75',
    marginTop: spacing.xs || 4,
    fontWeight: typography.fontWeight?.medium || '500',
  },
  vehicleKm: {
    fontSize: typography.fontSize?.md || 16,
    fontWeight: typography.fontWeight?.semibold || '600',
    color: colors.primary?.[500] || '#003459',
    marginTop: spacing.xs || 8,
  },
  circularProgressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularProgressCircle: {
    width: 100,
    height: 100,
    borderRadius: borders.radius?.avatar?.full || 50,
    borderWidth: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background?.default || '#F8F9FA',
  },
  circularProgressValue: {
    fontSize: typography.fontSize?.['2xl'] || 24,
    fontWeight: typography.fontWeight?.bold || '700',
  },
  circularProgressLabel: {
    fontSize: typography.fontSize?.xs || 12,
    color: colors.text?.secondary || '#5D6F75',
    marginTop: spacing.xs || 4,
    fontWeight: typography.fontWeight?.medium || '500',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginTop: spacing.sm || 12,
    gap: spacing.sm || 8,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.sm || 12,
    marginTop: spacing.xs || 8,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: borders.radius?.badge?.sm || 4,
    marginRight: spacing.xs || 6,
  },
  summaryText: {
    fontSize: typography.fontSize?.xs || 12,
    color: colors.text?.secondary || '#5D6F75',
    fontWeight: typography.fontWeight?.medium || '500',
  },
  componentsSection: {
    paddingHorizontal: spacing.md || 20,
    marginBottom: spacing.md || 20,
  },
  sectionTitle: {
    fontSize: typography.fontSize?.lg || 18,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#00171F',
    marginBottom: spacing.md || 16,
  },
  calculatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md || 20,
    backgroundColor: colors.background?.paper || '#FFFFFF',
    borderRadius: borders.radius?.card?.md || 12,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.neutral?.gray?.[200] || '#E5E7EB',
  },
  calculatingText: {
    marginLeft: spacing.sm || 12,
    fontSize: typography.fontSize?.base || 14,
    color: colors.text?.secondary || '#5D6F75',
    fontWeight: typography.fontWeight?.medium || '500',
  },
  componentCard: {
    backgroundColor: colors.background?.paper || '#FFFFFF',
    borderRadius: borders.radius?.card?.md || 12,
    padding: spacing.md || 16,
    marginBottom: spacing.sm || 14,
    shadowColor: colors.base?.inkBlack || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.neutral?.gray?.[200] || '#E5E7EB',
  },
  componentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm || 12,
  },
  componentIcon: {
    width: 44,
    height: 44,
    borderRadius: borders.radius?.avatar?.md || 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm || 12,
  },
  componentInfo: {
    flex: 1,
    marginRight: spacing.xs || 8,
  },
  componentName: {
    fontSize: typography.fontSize?.base || 16,
    fontWeight: typography.fontWeight?.semibold || '600',
    color: colors.text?.primary || '#00171F',
    marginBottom: spacing.xs || 4,
  },
  componentSubtitle: {
    fontSize: typography.fontSize?.xs || 12,
    color: colors.text?.secondary || '#5D6F75',
    marginTop: spacing.xs || 4,
    fontWeight: typography.fontWeight?.regular || '400',
  },
  componentPercentage: {
    alignItems: 'flex-end',
  },
  percentageText: {
    fontSize: typography.fontSize?.lg || 20,
    fontWeight: typography.fontWeight?.bold || '700',
  },
  statusBadge: {
    fontSize: typography.fontSize?.xs || 10,
    fontWeight: typography.fontWeight?.semibold || '600',
    color: colors.text?.secondary || '#5D6F75',
    marginTop: spacing.xs || 4,
    textTransform: 'uppercase',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error?.[50] || '#FEF2F2',
    padding: spacing.sm || 10,
    borderRadius: borders.radius?.badge?.md || 8,
    marginBottom: spacing.sm || 12,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.error?.[200] || '#FECACA',
  },
  alertText: {
    flex: 1,
    fontSize: typography.fontSize?.xs || 12,
    color: colors.error?.[600] || '#DC2626',
    marginLeft: spacing.xs || 8,
    fontWeight: typography.fontWeight?.medium || '500',
  },
  componentProgress: {
    height: 6,
    backgroundColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    borderRadius: borders.radius?.badge?.sm || 3,
    overflow: 'hidden',
    marginBottom: spacing.sm || 12,
  },
  progressBar: {
    height: '100%',
    borderRadius: borders.radius?.badge?.sm || 3,
  },
  componentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm || 8,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs || 6,
  },
  footerText: {
    fontSize: typography.fontSize?.xs || 12,
    color: colors.text?.secondary || '#5D6F75',
    fontWeight: typography.fontWeight?.medium || '500',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: spacing.xl || 32,
    backgroundColor: colors.background?.paper || '#FFFFFF',
    borderRadius: borders.radius?.card?.md || 12,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.neutral?.gray?.[200] || '#E5E7EB',
  },
  emptyText: {
    marginTop: spacing.sm || 12,
    fontSize: typography.fontSize?.base || 14,
    color: colors.text?.secondary || '#5D6F75',
    fontWeight: typography.fontWeight?.medium || '500',
    textAlign: 'center',
  },
  ctaCard: {
    backgroundColor: colors.background?.paper || '#FFFFFF',
    borderRadius: borders.radius?.card?.md || 16,
    padding: spacing.lg || 24,
    alignItems: 'center',
    marginHorizontal: spacing.md || 20,
    marginBottom: spacing.md || 20,
    shadowColor: colors.base?.inkBlack || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.neutral?.gray?.[200] || '#E5E7EB',
  },
  ctaTitle: {
    fontSize: typography.fontSize?.lg || 18,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#00171F',
    marginTop: spacing.sm || 12,
    textAlign: 'center',
  },
  ctaSubtitle: {
    fontSize: typography.fontSize?.base || 14,
    color: colors.text?.secondary || '#5D6F75',
    marginTop: spacing.xs || 8,
    textAlign: 'center',
    fontWeight: typography.fontWeight?.medium || '500',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary?.[500] || '#003459',
    paddingVertical: spacing.sm || 14,
    paddingHorizontal: spacing.lg || 24,
    borderRadius: borders.radius?.button?.md || 12,
    marginTop: spacing.md || 16,
    gap: spacing.xs || 8,
    shadowColor: colors.primary?.[500] || '#003459',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: typography.fontSize?.md || 16,
    fontWeight: typography.fontWeight?.semibold || '600',
  },
});

export default VehicleHealthScreen;
