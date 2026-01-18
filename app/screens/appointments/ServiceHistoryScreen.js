import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Alert,
  Dimensions,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ROUTES } from '../../utils/constants';
import * as userService from '../../services/user';
import { useTheme } from '../../design-system/theme/useTheme';
import CustomHeader from '../../components/navigation/Header/Header';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Pantalla de Historial de Servicios Completados
 * Muestra solo las solicitudes cuyas órdenes fueron exitosamente completadas
 */
const ServiceHistoryScreen = () => {
  const navigation = useNavigation();
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
  
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    totalGastado: 0
  });

  // Cargar historial cuando la pantalla recibe foco
  useFocusEffect(
    useCallback(() => {
      cargarHistorial();
    }, [])
  );

  const cargarHistorial = useCallback(async () => {
    try {
      setLoading(true);
      
      // Solo cargar servicios completados exitosamente
      const data = await userService.getServicesHistory({ estado: 'completado' });
      const serviciosCompletados = (data || []).filter(s => s.estado === 'completado');
      
      setHistorial(serviciosCompletados);
      calcularEstadisticas(serviciosCompletados);
    } catch (error) {
      console.error('Error al cargar historial:', error);
      if (error.status !== 404) {
        Alert.alert('Error', 'No se pudo cargar el historial de servicios.');
      }
      setHistorial([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const calcularEstadisticas = useCallback((servicios) => {
    const stats = {
      total: servicios.length,
      totalGastado: servicios.reduce((sum, s) => sum + parseFloat(s.total || 0), 0)
    };
    setEstadisticas(stats);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await cargarHistorial();
    setRefreshing(false);
  }, [cargarHistorial]);

  const formatearFecha = (fecha) => {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatearFechaCompleta = (fecha) => {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-CL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const agruparPorMes = useCallback((servicios) => {
    const grupos = {};
    
    servicios.forEach(servicio => {
      const fecha = new Date(servicio.fecha_hora_solicitud || servicio.fecha_servicio);
      const mesAno = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      const nombreMes = fecha.toLocaleDateString('es-CL', { year: 'numeric', month: 'long' });
      
      if (!grupos[mesAno]) {
        grupos[mesAno] = {
          nombre: nombreMes,
          servicios: []
        };
      }
      
      grupos[mesAno].servicios.push(servicio);
    });
    
    return Object.keys(grupos)
      .sort((a, b) => b.localeCompare(a))
      .map(key => grupos[key]);
  }, []);

  // Componente de Resumen de Historial
  const ResumenCard = () => (
    <View style={styles.resumenContainer}>
      <View style={styles.resumenHeader}>
        <View style={styles.resumenIconContainer}>
          <Ionicons name="checkmark-circle" size={28} color={colors.success?.[500] || '#10B981'} />
        </View>
        <View style={styles.resumenTextContainer}>
          <Text style={styles.resumenTitle}>Servicios Completados</Text>
          <Text style={styles.resumenSubtitle}>
            {estadisticas.total} {estadisticas.total === 1 ? 'servicio realizado' : 'servicios realizados'}
          </Text>
        </View>
      </View>
      
      {estadisticas.totalGastado > 0 && (
        <View style={styles.resumenFooter}>
          <View style={styles.resumenStat}>
            <Text style={styles.resumenStatLabel}>Total invertido</Text>
            <Text style={styles.resumenStatValue}>
              ${estadisticas.totalGastado.toLocaleString('es-CL')}
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  // Card de Servicio Completado
  const ServiceCard = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.serviceCard}
        onPress={() => navigation.push(ROUTES.APPOINTMENT_DETAIL, { agendamiento: item })}
        activeOpacity={0.7}
      >
        {/* Header con badge de completado */}
        <View style={styles.serviceHeader}>
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
            <Text style={styles.completedBadgeText}>Completado</Text>
          </View>
          <Text style={styles.serviceDate}>
            {formatearFecha(item.fecha_hora_solicitud || item.fecha_servicio)}
          </Text>
        </View>

        {/* Información del vehículo */}
        {item.vehiculo_detail && (
          <View style={styles.vehicleSection}>
            <View style={styles.vehicleIconContainer}>
              <Ionicons name="car" size={22} color={colors.primary?.[500] || '#003459'} />
            </View>
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleName}>
                {item.vehiculo_detail.marca_nombre} {item.vehiculo_detail.modelo_nombre}
              </Text>
              <Text style={styles.vehicleDetails}>
                {item.vehiculo_detail.year} • {item.vehiculo_detail.patente}
              </Text>
            </View>
          </View>
        )}

        {/* Fecha del servicio */}
        {item.fecha_servicio && (
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.text?.secondary || '#5D6F75'} />
            <Text style={styles.infoText}>
              {formatearFechaCompleta(item.fecha_servicio)}
              {item.hora_servicio ? ` a las ${item.hora_servicio}` : ''}
            </Text>
          </View>
        )}

        {/* Proveedor */}
        {item.taller_detail && (
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={16} color={colors.text?.secondary || '#5D6F75'} />
            <Text style={styles.infoText}>{item.taller_detail.nombre}</Text>
          </View>
        )}

        {/* Servicios realizados */}
        {item.lineas && item.lineas.length > 0 && (
          <View style={styles.servicesSection}>
            <Text style={styles.servicesTitle}>Servicios realizados</Text>
            <View style={styles.servicesList}>
              {item.lineas.slice(0, 3).map((linea, index) => (
                <View key={index} style={styles.serviceItem}>
                  <Ionicons name="checkmark" size={14} color={colors.success?.[500] || '#10B981'} />
                  <Text style={styles.serviceName}>{linea.servicio_nombre || linea.nombre}</Text>
                </View>
              ))}
              {item.lineas.length > 3 && (
                <Text style={styles.moreServices}>
                  +{item.lineas.length - 3} más
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Footer con total */}
        <View style={styles.serviceFooter}>
          <View style={styles.paymentInfo}>
            <Ionicons name="card-outline" size={16} color={colors.text?.secondary || '#5D6F75'} />
            <Text style={styles.paymentMethod}>
              {item.metodo_pago === 'transferencia' ? 'Transferencia' : 
               item.metodo_pago === 'efectivo' ? 'Efectivo' : 
               item.metodo_pago || 'N/A'}
            </Text>
          </View>
          <Text style={styles.totalAmount}>
            ${parseFloat(item.total || 0).toLocaleString('es-CL')}
          </Text>
        </View>

        {/* Indicador de ver más */}
        <View style={styles.viewMoreIndicator}>
          <Text style={styles.viewMoreText}>Ver detalles</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary?.[500] || '#003459'} />
        </View>
      </TouchableOpacity>
    );
  };

  // Componente de grupo por mes
  const MonthGroup = ({ item: grupo }) => (
    <View style={styles.monthGroup}>
      <View style={styles.monthHeader}>
        <Text style={styles.monthTitle}>{grupo.nombre}</Text>
        <View style={styles.monthBadge}>
          <Text style={styles.monthCount}>{grupo.servicios.length}</Text>
        </View>
      </View>
      {grupo.servicios.map((servicio) => (
        <ServiceCard key={servicio.id} item={servicio} />
      ))}
    </View>
  );

  // Estado de carga
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary?.[500] || '#003459'} />
          <Text style={styles.loadingText}>Cargando historial...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const gruposHistorial = agruparPorMes(historial);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Contenido principal */}
      {historial.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={[colors.primary?.[500] || '#003459']}
              tintColor={colors.primary?.[500] || '#003459'}
            />
          }
        >
          <View style={styles.emptyIconContainer}>
            <Ionicons name="document-text-outline" size={80} color={colors.text?.tertiary || '#9CA3AF'} />
          </View>
          <Text style={styles.emptyTitle}>Sin servicios completados</Text>
          <Text style={styles.emptySubtitle}>
            Cuando completes servicios para tus vehículos, aparecerán aquí como parte de tu historial.
          </Text>
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={() => navigation.navigate(ROUTES.CREAR_SOLICITUD)}
          >
            <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.emptyButtonText}>Solicitar un servicio</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <FlatList
          data={gruposHistorial}
          renderItem={({ item }) => <MonthGroup item={item} />}
          keyExtractor={(item, index) => `grupo-${index}`}
          ListHeaderComponent={<ResumenCard />}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={[colors.primary?.[500] || '#003459']}
              tintColor={colors.primary?.[500] || '#003459'}
            />
          }
        />
      )}
    </SafeAreaView>
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
  },
  loadingText: {
    marginTop: spacing?.md || 16,
    fontSize: typography.fontSize?.md || 16,
    color: colors.text?.secondary || '#5D6F75',
    textAlign: 'center',
  },
  
  // Resumen
  resumenContainer: {
    backgroundColor: colors.background?.paper || '#FFFFFF',
    borderRadius: borders.radius?.card?.lg || 16,
    marginHorizontal: spacing?.md || 16,
    marginTop: spacing?.md || 16,
    marginBottom: spacing?.lg || 24,
    padding: spacing?.lg || 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  resumenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resumenIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.success?.[50] || '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing?.md || 16,
  },
  resumenTextContainer: {
    flex: 1,
  },
  resumenTitle: {
    fontSize: typography.fontSize?.xl || 20,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#00171F',
    marginBottom: spacing?.xs || 4,
  },
  resumenSubtitle: {
    fontSize: typography.fontSize?.sm || 14,
    color: colors.text?.secondary || '#5D6F75',
  },
  resumenFooter: {
    marginTop: spacing?.md || 16,
    paddingTop: spacing?.md || 16,
    borderTopWidth: 1,
    borderTopColor: colors.neutral?.gray?.[200] || '#E5E7EB',
  },
  resumenStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resumenStatLabel: {
    fontSize: typography.fontSize?.sm || 14,
    color: colors.text?.secondary || '#5D6F75',
  },
  resumenStatValue: {
    fontSize: typography.fontSize?.xl || 20,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.primary?.[500] || '#003459',
  },
  
  // Lista
  listContainer: {
    paddingBottom: spacing?.xl || 32,
  },
  
  // Grupos por mes
  monthGroup: {
    marginBottom: spacing?.lg || 24,
    paddingHorizontal: spacing?.md || 16,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing?.md || 16,
  },
  monthTitle: {
    fontSize: typography.fontSize?.lg || 18,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#00171F',
    textTransform: 'capitalize',
  },
  monthBadge: {
    backgroundColor: colors.primary?.[500] || '#003459',
    borderRadius: borders.radius?.badge?.full || 12,
    paddingHorizontal: spacing?.sm || 10,
    paddingVertical: spacing?.xs || 4,
    minWidth: 28,
    alignItems: 'center',
  },
  monthCount: {
    fontSize: typography.fontSize?.sm || 12,
    fontWeight: typography.fontWeight?.bold || '700',
    color: '#FFFFFF',
  },
  
  // Card de servicio
  serviceCard: {
    backgroundColor: colors.background?.paper || '#FFFFFF',
    borderRadius: borders.radius?.card?.lg || 16,
    padding: spacing?.md || 16,
    marginBottom: spacing?.sm || 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing?.md || 16,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success?.[500] || '#10B981',
    borderRadius: borders.radius?.badge?.full || 16,
    paddingHorizontal: spacing?.sm || 10,
    paddingVertical: spacing?.xs || 4,
  },
  completedBadgeText: {
    fontSize: typography.fontSize?.xs || 11,
    fontWeight: typography.fontWeight?.bold || '700',
    color: '#FFFFFF',
    marginLeft: spacing?.xs || 4,
  },
  serviceDate: {
    fontSize: typography.fontSize?.sm || 12,
    color: colors.text?.secondary || '#5D6F75',
    fontWeight: typography.fontWeight?.medium || '500',
  },
  
  // Sección de vehículo
  vehicleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing?.md || 16,
    paddingBottom: spacing?.sm || 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral?.gray?.[100] || '#F3F4F6',
  },
  vehicleIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary?.[50] || '#E6F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing?.sm || 12,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: typography.fontSize?.md || 16,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#00171F',
    marginBottom: 2,
  },
  vehicleDetails: {
    fontSize: typography.fontSize?.sm || 13,
    color: colors.text?.secondary || '#5D6F75',
  },
  
  // Filas de información
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing?.sm || 10,
  },
  infoText: {
    fontSize: typography.fontSize?.sm || 13,
    color: colors.text?.secondary || '#5D6F75',
    marginLeft: spacing?.sm || 10,
    flex: 1,
  },
  
  // Sección de servicios
  servicesSection: {
    marginBottom: spacing?.md || 16,
  },
  servicesTitle: {
    fontSize: typography.fontSize?.sm || 13,
    fontWeight: typography.fontWeight?.semibold || '600',
    color: colors.text?.primary || '#00171F',
    marginBottom: spacing?.sm || 8,
  },
  servicesList: {
    backgroundColor: colors.background?.default || '#F8F9FA',
    borderRadius: borders.radius?.md || 10,
    padding: spacing?.sm || 10,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing?.xs || 4,
  },
  serviceName: {
    fontSize: typography.fontSize?.sm || 13,
    color: colors.text?.secondary || '#5D6F75',
    marginLeft: spacing?.sm || 8,
    flex: 1,
  },
  moreServices: {
    fontSize: typography.fontSize?.sm || 13,
    color: colors.primary?.[500] || '#003459',
    fontWeight: typography.fontWeight?.semibold || '600',
    marginTop: spacing?.xs || 4,
    marginLeft: 22,
  },
  
  // Footer
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing?.sm || 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral?.gray?.[100] || '#F3F4F6',
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethod: {
    fontSize: typography.fontSize?.sm || 13,
    color: colors.text?.secondary || '#5D6F75',
    marginLeft: spacing?.xs || 6,
  },
  totalAmount: {
    fontSize: typography.fontSize?.lg || 18,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.primary?.[500] || '#003459',
  },
  
  // Ver más
  viewMoreIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing?.sm || 12,
    paddingTop: spacing?.sm || 10,
  },
  viewMoreText: {
    fontSize: typography.fontSize?.sm || 13,
    color: colors.primary?.[500] || '#003459',
    fontWeight: typography.fontWeight?.semibold || '600',
    marginRight: spacing?.xs || 4,
  },
  
  // Estado vacío
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing?.xl || 40,
    paddingVertical: spacing?.xl || 60,
  },
  emptyIconContainer: {
    marginBottom: spacing?.lg || 24,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: typography.fontSize?.xl || 20,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#00171F',
    textAlign: 'center',
    marginBottom: spacing?.sm || 12,
  },
  emptySubtitle: {
    fontSize: typography.fontSize?.md || 15,
    color: colors.text?.secondary || '#5D6F75',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing?.lg || 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary?.[500] || '#003459',
    borderRadius: borders.radius?.button?.md || 12,
    paddingHorizontal: spacing?.lg || 20,
    paddingVertical: spacing?.sm || 12,
    gap: spacing?.sm || 8,
  },
  emptyButtonText: {
    fontSize: typography.fontSize?.md || 15,
    fontWeight: typography.fontWeight?.semibold || '600',
    color: '#FFFFFF',
  },
});

export default ServiceHistoryScreen;
