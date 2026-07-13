import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Building2, Car, CheckCircle2, ChevronRight, CreditCard, Calendar, FileText, CirclePlus } from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ROUTES } from '../../utils/constants';
import * as userService from '../../services/user';
import { COLORS as DS_COLORS } from '../../design-system/tokens/colors';
import { SPACING as DS_SPACING } from '../../design-system/tokens/spacing';
import { BORDERS as DS_BORDERS } from '../../design-system/tokens/borders';
import { TYPOGRAPHY as DS_TYPOGRAPHY } from '../../design-system/tokens/typography';
import { SHADOWS as DS_SHADOWS } from '../../design-system/tokens/shadows';
import Avatar from '../../components/base/Avatar/Avatar';

/** Proveedor que ejecutó el servicio (taller o mecánico a domicilio). */
function resolveHistorialProveedor(item) {
  if (item.taller_detail) {
    return {
      name: item.taller_detail.nombre || 'Taller',
      photo: item.taller_detail.foto_perfil_url || item.taller_detail.foto_perfil || null,
      tipo: 'taller',
    };
  }
  if (item.mecanico_detail) {
    return {
      name: item.mecanico_detail.nombre || 'Mecánico',
      photo: item.mecanico_detail.foto_perfil_url || item.mecanico_detail.foto_perfil || null,
      tipo: 'mecanico',
    };
  }
  return { name: 'Proveedor', photo: null, tipo: null };
}

/**
 * Pantalla de Historial de Servicios Completados
 * Muestra solo las solicitudes cuyas órdenes fueron exitosamente completadas
 */
const ServiceHistoryScreen = () => {
  const navigation = useNavigation();

  const colors = DS_COLORS;
  const safeTypography = DS_TYPOGRAPHY;
  const spacing = DS_SPACING;
  const safeBorders = DS_BORDERS;

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
          <CheckCircle2 size={28} color={colors.success?.[500] || DS_COLORS.success[500]} strokeWidth={1.75} />
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
    const proveedor = resolveHistorialProveedor(item);
    const lineas = item.lineas || item.lineas_detail || [];

    return (
      <TouchableOpacity
        style={styles.serviceCard}
        onPress={() => navigation.push(ROUTES.APPOINTMENT_DETAIL, { agendamiento: item })}
        activeOpacity={0.75}
      >
        <View style={styles.serviceHeader}>
          <View style={styles.completedBadge}>
            <CheckCircle2 size={14} color={DS_COLORS.text.onPrimary} />
            <Text style={styles.completedBadgeText}>Completado</Text>
          </View>
          <Text style={styles.serviceDate}>
            {formatearFecha(item.fecha_hora_solicitud || item.fecha_servicio)}
          </Text>
        </View>

        <View style={styles.cardSection}>
          <Text style={styles.sectionLabel}>Proveedor</Text>
          <View style={styles.providerRow}>
            <Avatar source={proveedor.photo} name={proveedor.name} size="md" variant="circular" />
            <View style={styles.providerTextCol}>
              <Text style={styles.providerName} numberOfLines={2}>{proveedor.name}</Text>
              {proveedor.tipo ? (
                <View style={styles.tipoPill}>
                  <Building2 size={12} color={DS_COLORS.primary[600]} />
                  <Text style={styles.tipoPillText}>
                    {proveedor.tipo === 'taller' ? 'Taller' : 'Mecánico a domicilio'}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {item.vehiculo_detail ? (
          <View style={styles.cardSectionMuted}>
            <Text style={styles.sectionLabel}>Vehículo</Text>
            <View style={styles.vehicleRow}>
              <View style={styles.vehicleIconContainer}>
                <Car size={20} color={DS_COLORS.primary[600]} />
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
          </View>
        ) : null}

        {item.fecha_servicio ? (
          <View style={styles.infoRow}>
            <Calendar size={16} color={DS_COLORS.text.secondary} />
            <Text style={styles.infoText}>
              {formatearFechaCompleta(item.fecha_servicio)}
              {item.hora_servicio ? ` · ${item.hora_servicio}` : ''}
            </Text>
          </View>
        ) : null}

        {lineas.length > 0 ? (
          <View style={styles.cardSectionMuted}>
            <Text style={styles.sectionLabel}>Servicios realizados</Text>
            <View style={styles.servicesList}>
              {lineas.slice(0, 4).map((linea, index) => (
                <View key={linea.id ?? index} style={styles.serviceItem}>
                  <CheckCircle2 size={14} color={DS_COLORS.success[500]} />
                  <Text style={styles.serviceName}>{linea.servicio_nombre || linea.nombre}</Text>
                </View>
              ))}
              {lineas.length > 4 ? (
                <Text style={styles.moreServices}>
                  +{lineas.length - 4} más
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.serviceFooter}>
          <View style={styles.paymentInfo}>
            <CreditCard size={16} color={DS_COLORS.text.secondary} />
            <Text style={styles.paymentMethod}>
              {item.metodo_pago === 'transferencia' ? 'Transferencia' :
                item.metodo_pago === 'efectivo' ? 'Efectivo' :
                  item.metodo_pago || 'N/A'}
            </Text>
          </View>
          <View style={styles.totalPill}>
            <Text style={styles.totalAmount}>
              ${parseFloat(item.total || 0).toLocaleString('es-CL')}
            </Text>
          </View>
        </View>

        <View style={styles.viewMoreIndicator}>
          <Text style={styles.viewMoreText}>Ver detalles</Text>
          <ChevronRight size={18} color={DS_COLORS.primary[600]} />
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
          <ActivityIndicator size="large" color={colors.primary?.[500] || DS_COLORS.primary[500]} />
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
              colors={[colors.primary?.[500] || DS_COLORS.primary[500]]}
              tintColor={colors.primary?.[500] || DS_COLORS.primary[500]}
            />
          }
        >
          <View style={styles.emptyIconContainer}>
            <FileText size={80} color={colors.text?.tertiary || DS_COLORS.text.tertiary} strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>Sin servicios completados</Text>
          <Text style={styles.emptySubtitle}>
            Cuando completes servicios para tus vehículos, aparecerán aquí como parte de tu historial.
          </Text>
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={() => navigation.navigate(ROUTES.CREAR_SOLICITUD)}
          >
            <CirclePlus size={20} color={DS_COLORS.text.onPrimary} strokeWidth={2} />
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
              colors={[colors.primary?.[500] || DS_COLORS.primary[500]]}
              tintColor={colors.primary?.[500] || DS_COLORS.primary[500]}
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
    backgroundColor: colors.background?.default || DS_COLORS.background.default,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing?.md || 16,
    fontSize: typography.fontSize?.md || 16,
    color: colors.text?.secondary || DS_COLORS.text.secondary,
    textAlign: 'center',
  },
  
  // Resumen
  resumenContainer: {
    backgroundColor: colors.background?.paper || DS_COLORS.background.paper,
    borderRadius: borders.radius?.card?.lg || 16,
    marginHorizontal: spacing?.md || 16,
    marginTop: spacing?.md || 16,
    marginBottom: spacing?.lg || 24,
    padding: spacing?.lg || 20,
    borderWidth: borders.width?.thin ?? 1,
    borderColor: colors.border?.light || DS_COLORS.border.light,
    ...DS_SHADOWS.sm,
  },
  resumenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resumenIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.success?.[50] || DS_COLORS.success[50],
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
    color: colors.text?.primary || DS_COLORS.text.primary,
    marginBottom: spacing?.xs || 4,
  },
  resumenSubtitle: {
    fontSize: typography.fontSize?.sm || 14,
    color: colors.text?.secondary || DS_COLORS.text.secondary,
  },
  resumenFooter: {
    marginTop: spacing?.md || 16,
    paddingTop: spacing?.md || 16,
    borderTopWidth: 1,
    borderTopColor: colors.neutral?.gray?.[200] || DS_COLORS.neutral.gray[200],
  },
  resumenStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resumenStatLabel: {
    fontSize: typography.fontSize?.sm || 14,
    color: colors.text?.secondary || DS_COLORS.text.secondary,
  },
  resumenStatValue: {
    fontSize: typography.fontSize?.xl || 20,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.primary?.[500] || DS_COLORS.primary[500],
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
    color: colors.text?.primary || DS_COLORS.text.primary,
    textTransform: 'capitalize',
  },
  monthBadge: {
    backgroundColor: colors.primary?.[500] || DS_COLORS.primary[500],
    borderRadius: borders.radius?.badge?.full || 12,
    paddingHorizontal: spacing?.sm || 10,
    paddingVertical: spacing?.xs || 4,
    minWidth: 28,
    alignItems: 'center',
  },
  monthCount: {
    fontSize: typography.fontSize?.sm || 12,
    fontWeight: typography.fontWeight?.bold || '700',
    color: DS_COLORS.text.onPrimary,
  },
  
  // Card de servicio
  serviceCard: {
    backgroundColor: colors.background?.paper || DS_COLORS.background.paper,
    borderRadius: borders.radius?.card?.lg || 16,
    padding: spacing?.md || 16,
    marginBottom: spacing?.sm || 12,
    borderWidth: borders.width?.thin ?? 1,
    borderColor: colors.border?.light || DS_COLORS.border.light,
    ...DS_SHADOWS.sm,
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
    gap: 6,
    backgroundColor: colors.success?.main || DS_COLORS.success.main,
    borderRadius: borders.radius?.badge?.full || 9999,
    paddingHorizontal: spacing?.sm || 10,
    paddingVertical: spacing?.xs || 4,
  },
  completedBadgeText: {
    fontSize: typography.fontSize?.xs || 11,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.onPrimary || DS_COLORS.text.onPrimary,
  },
  cardSection: {
    marginBottom: spacing?.md || 16,
  },
  cardSectionMuted: {
    marginBottom: spacing?.md || 16,
    backgroundColor: colors.neutral?.gray?.[100] || DS_COLORS.neutral.gray[100],
    borderRadius: borders.radius?.card?.md || 12,
    padding: spacing?.sm || 12,
    borderWidth: borders.width?.thin ?? 1,
    borderColor: colors.border?.light || DS_COLORS.border.light,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.tertiary || DS_COLORS.text.tertiary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: spacing?.xs || 8,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing?.sm || 12,
  },
  providerTextCol: {
    flex: 1,
    minWidth: 0,
  },
  providerName: {
    fontSize: typography.fontSize?.md || 16,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || DS_COLORS.text.primary,
    marginBottom: 4,
  },
  tipoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: spacing?.sm || 8,
    paddingVertical: 2,
    borderRadius: borders.radius?.badge?.full || 9999,
    backgroundColor: colors.primary?.[50] || DS_COLORS.primary[50],
    borderWidth: borders.width?.thin ?? 1,
    borderColor: colors.primary?.[100] || DS_COLORS.primary[100],
  },
  tipoPillText: {
    fontSize: 11,
    fontWeight: typography.fontWeight?.semibold || '600',
    color: colors.primary?.[700] || DS_COLORS.primary[700],
  },
  serviceDate: {
    fontSize: typography.fontSize?.sm || 12,
    color: colors.text?.secondary || DS_COLORS.text.secondary,
    fontWeight: typography.fontWeight?.medium || '500',
  },
  
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing?.sm || 12,
  },
  vehicleIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary?.[50] || DS_COLORS.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: typography.fontSize?.md || 16,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || DS_COLORS.text.primary,
    marginBottom: 2,
  },
  vehicleDetails: {
    fontSize: typography.fontSize?.sm || 13,
    color: colors.text?.secondary || DS_COLORS.text.secondary,
  },
  
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing?.md || 16,
    gap: spacing?.sm || 10,
  },
  infoText: {
    fontSize: typography.fontSize?.sm || 13,
    color: colors.text?.secondary || DS_COLORS.text.secondary,
    flex: 1,
    lineHeight: 20,
  },
  servicesList: {
    gap: spacing?.xs || 6,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing?.xs || 8,
  },
  serviceName: {
    fontSize: typography.fontSize?.sm || 13,
    color: colors.text?.secondary || DS_COLORS.text.secondary,
    flex: 1,
  },
  moreServices: {
    fontSize: typography.fontSize?.sm || 13,
    color: colors.primary?.[600] || DS_COLORS.primary[600],
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
    borderTopColor: colors.neutral?.gray?.[100] || DS_COLORS.neutral.gray[100],
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paymentMethod: {
    fontSize: typography.fontSize?.sm || 13,
    color: colors.text?.secondary || DS_COLORS.text.secondary,
  },
  totalPill: {
    backgroundColor: colors.primary?.[50] || DS_COLORS.primary[50],
    paddingHorizontal: spacing?.md || 14,
    paddingVertical: spacing?.xs || 6,
    borderRadius: borders.radius?.card?.md || 12,
    borderWidth: borders.width?.thin ?? 1,
    borderColor: colors.primary?.[100] || DS_COLORS.primary[100],
  },
  totalAmount: {
    fontSize: typography.fontSize?.lg || 18,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.primary?.[700] || DS_COLORS.primary[700],
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
    color: colors.primary?.[500] || DS_COLORS.primary[500],
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
    color: colors.text?.primary || DS_COLORS.text.primary,
    textAlign: 'center',
    marginBottom: spacing?.sm || 12,
  },
  emptySubtitle: {
    fontSize: typography.fontSize?.md || 15,
    color: colors.text?.secondary || DS_COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing?.lg || 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary?.[500] || DS_COLORS.primary[500],
    borderRadius: borders.radius?.button?.md || 12,
    paddingHorizontal: spacing?.lg || 20,
    paddingVertical: spacing?.sm || 12,
    gap: spacing?.sm || 8,
  },
  emptyButtonText: {
    fontSize: typography.fontSize?.md || 15,
    fontWeight: typography.fontWeight?.semibold || '600',
    color: DS_COLORS.text.onPrimary,
  },
});

export default ServiceHistoryScreen;
