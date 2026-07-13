import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar
} from 'react-native';
import {
  Car,
  CalendarDays,
  Clock,
  Building2,
  ChevronRight,
  CircleX,
  AlertTriangle,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { ROUTES } from '../../utils/constants';
import { COLORS } from '../../design-system/tokens/colors';
import { BORDERS, SHADOWS } from '../../design-system/tokens';
import * as userService from '../../services/user';

// Componentes
import Card from '../../components/base/Card/Card';

const ActiveAppointmentsScreen = () => {
  const navigation = useNavigation();
  const [agendamientos, setAgendamientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    cargarAgendamientos();
  }, []);

  const cargarAgendamientos = async () => {
    try {
      setLoading(true);
      const data = await userService.getActiveAppointments();
      console.log('Agendamientos activos obtenidos:', data);
      setAgendamientos(data || []);
    } catch (error) {
      console.error('Error al cargar agendamientos:', error);
      // Solo mostrar error si no es un 404 (no encontrado)
      if (error.status !== 404) {
        Alert.alert('Error', 'No se pudieron cargar los agendamientos activos.');
      }
      // Si es 404, simplemente mostrar lista vacía
      setAgendamientos([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarAgendamientos();
    setRefreshing(false);
  };

  const handleCancelarAgendamiento = async (solicitudId, agendamiento) => {
    // Determinar si requiere proceso especial
    const requiereProceso = agendamiento.comprobante_validado && agendamiento.metodo_pago === 'transferencia';
    
    if (requiereProceso) {
      // Mostrar modal de selección de motivo
      mostrarModalCancelacion(solicitudId, agendamiento);
    } else {
      // Cancelación directa
      Alert.alert(
        'Cancelar Agendamiento',
        '¿Estás seguro de que deseas cancelar este agendamiento?',
        [
          { text: 'No', style: 'cancel' },
          { 
            text: 'Sí, cancelar', 
            style: 'destructive',
            onPress: () => procesarCancelacion(solicitudId, 'cliente_desiste', '')
          }
        ]
      );
    }
  };

  const mostrarModalCancelacion = (solicitudId, agendamiento) => {
    const motivos = [
      { key: 'cliente_desiste', label: 'Ya no necesito el servicio' },
      { key: 'problema_vehiculo', label: 'Problema con mi vehículo' },
      { key: 'emergencia_personal', label: 'Emergencia personal' },
      { key: 'cambio_fecha', label: 'Necesito cambiar la fecha' },
      { key: 'insatisfaccion_precio', label: 'No estoy conforme con el precio' },
      { key: 'otro', label: 'Otro motivo' }
    ];

    Alert.alert(
      'Cancelar Agendamiento',
      'Tu pago ya fue validado. Para cancelar, selecciona el motivo y procesaremos la devolución en 24-48 horas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        ...motivos.map(motivo => ({
          text: motivo.label,
          onPress: () => {
            if (motivo.key === 'otro') {
              // Pedir comentario adicional
              Alert.prompt(
                'Motivo de cancelación',
                'Por favor, describe brevemente el motivo:',
                (comentario) => {
                  if (comentario) {
                    procesarCancelacion(solicitudId, motivo.key, comentario);
                  }
                }
              );
            } else {
              procesarCancelacion(solicitudId, motivo.key, '');
            }
          }
        }))
      ],
      { cancelable: true }
    );
  };

  const procesarCancelacion = async (solicitudId, motivo, comentario) => {
    try {
      setLoading(true);
      const response = await userService.cancelarSolicitud(solicitudId, { motivo, comentario });
      
      // Actualizar la lista local
      setAgendamientos(prevAgendamientos => 
        prevAgendamientos.map(agendamiento => 
          agendamiento.id === solicitudId 
            ? { ...agendamiento, estado: response.solicitud.estado }
            : agendamiento
        ).filter(agendamiento => !['cancelado', 'devolucion_procesada'].includes(agendamiento.estado))
      );

      if (response.requiere_devolucion) {
        Alert.alert(
          'Solicitud de Cancelación Enviada',
          'Tu solicitud de cancelación ha sido enviada. Procesaremos la devolución en 24-48 horas y te notificaremos por email.',
          [{ text: 'Entendido' }]
        );
      } else {
        Alert.alert(
          'Agendamiento Cancelado',
          'Tu agendamiento ha sido cancelado exitosamente.',
          [{ text: 'Entendido' }]
        );
      }
    } catch (error) {
      console.error('Error al cancelar agendamiento:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'No se pudo cancelar el agendamiento. Inténtalo nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'pendiente':
        return COLORS.warning[500];
      case 'pago_validado':
        return COLORS.secondary[500];
      case 'confirmado':
        return COLORS.primary[600];
      case 'en_proceso':
        return COLORS.success[500];
      case 'completado':
        return COLORS.neutral.gray[500];
      case 'cancelado':
        return COLORS.error[500];
      case 'cancelacion_solicitada':
        return COLORS.warning[700];
      case 'devolucion_procesada':
        return COLORS.warning[800];
      default:
        return COLORS.neutral.gray[500];
    }
  };

  const getEstadoTexto = (estado) => {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente';
      case 'pago_validado':
        return 'Pago Validado';
      case 'confirmado':
        return 'Confirmado';
      case 'en_proceso':
        return 'En Proceso';
      case 'completado':
        return 'Completado';
      case 'cancelado':
        return 'Cancelado';
      case 'cancelacion_solicitada':
        return 'Cancelación Solicitada';
      case 'devolucion_procesada':
        return 'Devolución Procesada';
      default:
        return estado;
    }
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-CL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderAgendamiento = ({ item }) => {
    try {
      return (
        <Card style={styles.agendamientoCard}>
          <View style={styles.agendamientoHeader}>
            <View style={styles.numeroOrden}>
              <Text style={styles.numeroOrdenTexto}>
                Orden #{item.numero_orden || item.id}
              </Text>
              <View style={[
                styles.estadoBadge,
                { backgroundColor: getEstadoColor(item.estado) }
              ]}>
                <Text style={styles.estadoTexto}>
                  {getEstadoTexto(item.estado)}
                </Text>
              </View>
            </View>
          </View>

          {/* Información del vehículo */}
          {item.vehiculo_detail && (
            <View style={styles.vehiculoInfo}>
              <Car size={20} color={COLORS.primary[500]} strokeWidth={1.75} />
              <Text style={styles.vehiculoTexto}>
                {item.vehiculo_detail.marca_nombre} {item.vehiculo_detail.modelo_nombre} {item.vehiculo_detail.year}
              </Text>
              <Text style={styles.patenteTexto}>
                {item.vehiculo_detail.patente}
              </Text>
            </View>
          )}

          {/* Fecha y hora */}
          <View style={styles.fechaHoraInfo}>
            <View style={styles.fechaHoraItem}>
              <CalendarDays size={16} color={COLORS.text.secondary} strokeWidth={1.75} />
              <Text style={styles.fechaHoraTexto}>
                {formatearFecha(item.fecha_servicio)}
              </Text>
            </View>
            <View style={styles.fechaHoraItem}>
              <Clock size={16} color={COLORS.text.secondary} strokeWidth={1.75} />
              <Text style={styles.fechaHoraTexto}>
                {item.hora_servicio}
              </Text>
            </View>
          </View>

          {/* Información del taller */}
          {item.taller_detail && (
            <View style={styles.tallerInfo}>
              <Building2 size={16} color={COLORS.text.secondary} strokeWidth={1.75} />
              <Text style={styles.tallerTexto}>
                {item.taller_detail.nombre}
              </Text>
            </View>
          )}

          {/* Servicios */}
          {item.lineas && item.lineas.length > 0 && (
            <View style={styles.serviciosInfo}>
              <Text style={styles.serviciosTitle}>Servicios:</Text>
              {item.lineas.map((linea, index) => (
                <View key={index} style={styles.servicioItem}>
                  <Text style={styles.servicioNombre}>
                    • {linea.servicio_nombre || linea.nombre}
                  </Text>
                  <Text style={styles.servicioPrecio}>
                    ${parseFloat(linea.precio_final || linea.precio || 0).toLocaleString('es-CL')}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Total */}
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalAmount}>
              ${parseFloat(item.total || 0).toLocaleString('es-CL')}
            </Text>
          </View>

          {/* Acciones */}
          <View style={styles.accionesContainer}>
            <TouchableOpacity
              style={styles.verDetalleButton}
              onPress={() => {
                navigation.push(ROUTES.APPOINTMENT_DETAIL, { agendamiento: item });
              }}
            >
              <Text style={styles.verDetalleButtonText}>Ver Detalle</Text>
              <ChevronRight size={16} color={COLORS.primary[500]} strokeWidth={2} />
            </TouchableOpacity>

            {['pendiente', 'pago_validado', 'confirmado'].includes(item.estado) && (
              <TouchableOpacity
                style={styles.cancelarButton}
                onPress={() => {
                  handleCancelarAgendamiento(item.id, item);
                }}
              >
                <CircleX size={16} color={COLORS.text.onPrimary} strokeWidth={1.75} />
                <Text style={styles.cancelarButtonText}>
                  {item.comprobante_validado ? 'Solicitar Cancelación' : 'Cancelar'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>
      );
    } catch (error) {
      console.error('Error renderizando agendamiento:', error, item);
      return (
        <Card style={styles.agendamientoCard}>
          <View style={styles.errorContainer}>
            <AlertTriangle size={24} color={COLORS.error.main} strokeWidth={1.75} />
            <Text style={styles.errorText}>Error al mostrar agendamiento #{item.id}</Text>
          </View>
        </Card>
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary[500]} />
          <Text style={styles.loadingText}>Cargando agendamientos...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />

      {agendamientos.length === 0 ? (
        <ScrollView 
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary[500]]}
              tintColor={COLORS.primary[500]}
            />
          }
        >
          <CalendarDays size={80} color={COLORS.text.tertiary} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>No tienes agendamientos activos</Text>
          <Text style={styles.emptySubtitle}>
            Cuando agendardes servicios, aparecerán aquí para que puedas hacer seguimiento.
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          data={agendamientos}
          renderItem={renderAgendamiento}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary[500]]}
              tintColor={COLORS.primary[500]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background.default,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: COLORS.background.default,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 22,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  agendamientoCard: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    ...SHADOWS.sm,
  },
  agendamientoHeader: {
    marginBottom: 12,
  },
  numeroOrden: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  numeroOrdenTexto: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  estadoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  estadoTexto: {
    color: COLORS.text.onPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  vehiculoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  vehiculoTexto: {
    fontSize: 14,
    color: COLORS.text.primary,
    marginLeft: 8,
    flex: 1,
  },
  patenteTexto: {
    fontSize: 12,
    color: COLORS.text.secondary,
    backgroundColor: COLORS.neutral.gray[100],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fechaHoraInfo: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  fechaHoraItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fechaHoraTexto: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginLeft: 4,
  },
  tallerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tallerTexto: {
    fontSize: 14,
    color: COLORS.text.primary,
    marginLeft: 4,
  },
  serviciosInfo: {
    marginBottom: 12,
  },
  serviciosTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  servicioItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  servicioNombre: {
    fontSize: 12,
    color: COLORS.text.secondary,
    flex: 1,
  },
  servicioPrecio: {
    fontSize: 12,
    color: COLORS.primary[500],
    fontWeight: '600',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary[500],
  },
  accionesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  verDetalleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.gray[100],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.primary[500],
  },
  verDetalleButtonText: {
    color: COLORS.primary[500],
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  cancelarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error.main,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelarButtonText: {
    color: COLORS.text.onPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    color: COLORS.error.main,
    fontSize: 14,
    marginLeft: 8,
  },
});

export default ActiveAppointmentsScreen; 