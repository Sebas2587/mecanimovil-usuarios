import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS } from '../../utils/constants';
import * as userService from '../../services/user';

// Componentes
import GlassmorphicContainer from '../../components/utils/GlassmorphicContainer';
import Card from '../../components/base/Card/Card';
import ChecklistViewerModal from '../../components/modals/ChecklistViewerModal';

const AppointmentDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { agendamiento } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [agendamientoActual, setAgendamientoActual] = useState(null);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [checklistDisponible, setChecklistDisponible] = useState(false);
  const [verificandoChecklist, setVerificandoChecklist] = useState(false);

  // Detectar si estamos en un stack anidado (ProfileStack)
  const isInNestedStack = navigation.getState?.()?.routes?.some(route => 
    route.name === 'Profile' || route.name === 'UserProfileMain'
  ) || false;

  // Cargar datos completos desde la API
  useEffect(() => {
    cargarDatosCompletos();
  }, [agendamiento.id]);

  // Verificar si hay checklist disponible cuando cambie el estado
  useEffect(() => {
    if (agendamientoActual && agendamientoActual.estado === 'completado') {
      verificarChecklistDisponible();
    }
  }, [agendamientoActual]);

  const cargarDatosCompletos = async () => {
    try {
      setLoading(true);
      
      console.log('🔄 Cargando datos completos para solicitud #', agendamiento.id);
      
      // Importar API service
      const { get } = await import('../../services/api');
      
      // Obtener datos completos desde el endpoint principal
      const solicitudesResponse = await get('/ordenes/solicitudes/');
      const solicitudesData = solicitudesResponse.results || solicitudesResponse;
      
      // Buscar la solicitud específica
      const solicitudCompleta = solicitudesData.find(s => s.id === agendamiento.id);
      
      // Helper para normalizar líneas
      const getLineasFrom = (obj) => {
        if (!obj) return [];
        if (Array.isArray(obj.lineas) && obj.lineas.length > 0) return obj.lineas;
        if (Array.isArray(obj.lineas_detail) && obj.lineas_detail.length > 0) return obj.lineas_detail;
        return [];
      };

      if (solicitudCompleta) {
        console.log('✅ Datos completos encontrados:', {
          id: solicitudCompleta.id,
          lineas: (solicitudCompleta.lineas?.length || 0) || (solicitudCompleta.lineas_detail?.length || 0),
          repuestos_en_primera_linea: (getLineasFrom(solicitudCompleta)[0]?.repuestos_servicio?.length || 0)
        });
        
        // Guardar con líneas normalizadas
        setAgendamientoActual({
          ...solicitudCompleta,
          lineas: getLineasFrom(solicitudCompleta),
        });
      } else {
        console.log('⚠️ Solicitud no encontrada en endpoint principal, usando datos pasados por navegación');
        setAgendamientoActual({
          ...agendamiento,
          lineas: Array.isArray(agendamiento.lineas) && agendamiento.lineas.length > 0
            ? agendamiento.lineas
            : (Array.isArray(agendamiento.lineas_detail) ? agendamiento.lineas_detail : []),
        });
      }
    } catch (error) {
      console.error('❌ Error cargando datos completos:', error);
      console.log('📋 Usando datos pasados por navegación como fallback');
      setAgendamientoActual({
        ...agendamiento,
        lineas: Array.isArray(agendamiento.lineas) && agendamiento.lineas.length > 0
          ? agendamiento.lineas
          : (Array.isArray(agendamiento.lineas_detail) ? agendamiento.lineas_detail : []),
      });
    } finally {
      setLoading(false);
    }
  };

  const verificarChecklistDisponible = async () => {
    try {
      setVerificandoChecklist(true);
      console.log('🔍 Verificando checklist para orden:', agendamientoActual.id);
      
      // Importar el servicio de checklist
      const checklistClienteService = (await import('../../services/checklistService')).default;
      
      const disponible = await checklistClienteService.tieneChecklistDisponible(agendamientoActual.id);
      setChecklistDisponible(disponible);
      
      console.log(disponible ? '✅ Checklist disponible' : '❌ Sin checklist disponible');
    } catch (error) {
      console.error('❌ Error verificando checklist:', error);
      setChecklistDisponible(false);
    } finally {
      setVerificandoChecklist(false);
    }
  };

  const handleVerChecklist = () => {
    console.log('🔍 Abriendo modal de checklist para orden:', agendamientoActual.id);
    setShowChecklistModal(true);
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'pendiente':
        return '#FF9500';
      case 'pago_validado':
        return '#007AFF';
      case 'confirmado':
        return '#0056CC';
      case 'en_proceso':
        return '#28A745';
      case 'completado':
        return '#6C757D';
      case 'cancelado':
        return '#DC3545';
      case 'cancelacion_solicitada':
        return '#8E44AD';
      case 'devolucion_procesada':
        return '#A0522D';
      default:
        return '#6C757D';
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

  const formatearFechaCorta = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleCancelarAgendamiento = () => {
    if (agendamientoActual.estado !== 'pendiente') {
      Alert.alert(
        'No se puede cancelar',
        'Solo se pueden cancelar agendamientos en estado pendiente.'
      );
      return;
    }

    Alert.alert(
      'Cancelar Agendamiento',
      '¿Estás seguro de que deseas cancelar este agendamiento? Esta acción no se puede deshacer.',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Sí, cancelar', 
          style: 'destructive',
          onPress: confirmarCancelacion
        }
      ]
    );
  };

  const confirmarCancelacion = async () => {
    try {
      setLoading(true);
      await userService.cancelarSolicitud(agendamientoActual.id);
      
      // Actualizar el estado local
      setAgendamientoActual({
        ...agendamientoActual,
        estado: 'cancelado'
      });

      Alert.alert(
        'Agendamiento Cancelado',
        'Tu agendamiento ha sido cancelado exitosamente.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
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

  const handleLlamarTaller = () => {
    if (agendamientoActual.taller_detail?.telefono) {
      const phoneNumber = `tel:${agendamientoActual.taller_detail.telefono}`;
      Linking.openURL(phoneNumber);
    } else {
      Alert.alert('Información', 'No hay número de teléfono disponible para este taller.');
    }
  };

  const handleVerUbicacion = () => {
    if (agendamientoActual.taller_detail?.direccion) {
      const address = encodeURIComponent(agendamientoActual.taller_detail.direccion);
      const url = `https://maps.google.com/?q=${address}`;
      Linking.openURL(url);
    } else {
      Alert.alert('Información', 'No hay dirección disponible para este taller.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Contenido principal sin header personalizado */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Cargando detalles...</Text>
          </View>
        ) : agendamientoActual ? (
          renderContent()
        ) : (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={48} color="#FF6B35" />
            <Text style={styles.errorText}>No se pudieron cargar los detalles</Text>
          </View>
        )}
      </ScrollView>

      {/* Modal del Checklist */}
      {agendamientoActual && (
        <ChecklistViewerModal
          visible={showChecklistModal}
          onClose={() => setShowChecklistModal(false)}
          ordenId={agendamientoActual.id}
          servicioNombre={(() => {
            const lineas = Array.isArray(agendamientoActual.lineas) && agendamientoActual.lineas.length > 0
              ? agendamientoActual.lineas
              : (Array.isArray(agendamientoActual.lineas_detail) ? agendamientoActual.lineas_detail : []);
            return lineas.length > 0
              ? (lineas[0].servicio_nombre || lineas[0].nombre || 'Servicio Automotriz')
              : 'Servicio Automotriz';
          })()}
        />
      )}
    </View>
  );

  // Función para renderizar el contenido
  function renderContent() {
    return (
      <>
        {/* Estado y Número de Orden */}
        <View style={styles.headerCard}>
          <View style={styles.orderHeader}>
            <View>
              <Text style={styles.orderNumber}>
                Orden #{agendamientoActual.numero_orden || agendamientoActual.id}
              </Text>
              <Text style={styles.orderDate}>
                Solicitado el {formatearFechaCorta(agendamientoActual.fecha_hora_solicitud)}
              </Text>
            </View>
            <View style={[
              styles.estadoBadge,
              { backgroundColor: getEstadoColor(agendamientoActual.estado) }
            ]}>
              <Text style={styles.estadoTexto}>
                {getEstadoTexto(agendamientoActual.estado)}
              </Text>
            </View>
          </View>

          {/* Resumen del servicio asociado a la orden */}
          {(() => {
            const lineas = Array.isArray(agendamientoActual.lineas) && agendamientoActual.lineas.length > 0
              ? agendamientoActual.lineas
              : (Array.isArray(agendamientoActual.lineas_detail) ? agendamientoActual.lineas_detail : []);
            if (!lineas || lineas.length === 0) return null;
            return (
              <View style={styles.servicioResumenRow}>
                <Ionicons name="construct" size={18} color="#007AFF" />
                <Text style={styles.servicioResumenLabel}>Servicio:</Text>
                <Text style={styles.servicioResumenText} numberOfLines={1}>
                  {lineas[0].servicio_nombre || lineas[0].nombre || 'Servicio'}
                </Text>
                {lineas.length > 1 && (
                  <Text style={styles.servicioResumenMas}>
                    +{lineas.length - 1} más
                  </Text>
                )}
              </View>
            );
          })()}
        </View>

        {/* Información del Vehículo */}
        {agendamientoActual.vehiculo_detail && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="car" size={24} color="#007AFF" />
              <Text style={styles.sectionTitle}>Vehículo</Text>
            </View>
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleText}>
                {agendamientoActual.vehiculo_detail.marca_nombre} {agendamientoActual.vehiculo_detail.modelo_nombre}
              </Text>
              <Text style={styles.vehicleSubtext}>
                Año {agendamientoActual.vehiculo_detail.year} • Patente {agendamientoActual.vehiculo_detail.patente}
              </Text>
              <Text style={styles.vehicleSubtext}>
                {agendamientoActual.vehiculo_detail.tipo_motor} • {agendamientoActual.vehiculo_detail.cilindraje}L
              </Text>
              <Text style={styles.vehicleSubtext}>
                Kilometraje: {agendamientoActual.vehiculo_detail.kilometraje?.toLocaleString('es-CL')} km
              </Text>
            </View>
          </View>
        )}

        {/* Información del Taller */}
        {agendamientoActual.taller_detail && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="business" size={24} color="#007AFF" />
              <Text style={styles.sectionTitle}>Taller</Text>
            </View>
            <View style={styles.tallerInfo}>
              <Text style={styles.tallerName}>
                {agendamientoActual.taller_detail.nombre}
              </Text>
              <Text style={styles.tallerAddress}>
                {agendamientoActual.taller_detail.direccion}
              </Text>
              
              {/* Fecha y hora específica del servicio */}
              <View style={styles.serviceDateTimeContainer}>
                <Text style={styles.serviceDateTimeLabel}>Fecha y hora del servicio:</Text>
                <View style={styles.serviceDateTimeRow}>
                  <Ionicons name="calendar" size={16} color="#007AFF" />
                  <Text style={styles.serviceDateTimeText}>
                    {formatearFecha(agendamientoActual.fecha_servicio)}
                  </Text>
                </View>
                <View style={styles.serviceDateTimeRow}>
                  <Ionicons name="time" size={16} color="#007AFF" />
                  <Text style={styles.serviceDateTimeText}>
                    {agendamientoActual.hora_servicio}
                  </Text>
                </View>
              </View>
              
              {/* Botones de acción del taller */}
              <View style={styles.tallerActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleLlamarTaller}
                >
                  <Ionicons name="call" size={16} color="#007AFF" />
                  <Text style={styles.actionButtonText}>Llamar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleVerUbicacion}
                >
                  <Ionicons name="location" size={16} color="#007AFF" />
                  <Text style={styles.actionButtonText}>Ver Ubicación</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Servicios Solicitados */}
        {(Array.isArray(agendamientoActual.lineas) && agendamientoActual.lineas.length > 0
          || (Array.isArray(agendamientoActual.lineas_detail) && agendamientoActual.lineas_detail.length > 0)) && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="construct" size={24} color="#007AFF" />
              <Text style={styles.sectionTitle}>Servicios</Text>
            </View>
            <View style={styles.serviciosContainer}>
              {(Array.isArray(agendamientoActual.lineas) && agendamientoActual.lineas.length > 0
                ? agendamientoActual.lineas
                : agendamientoActual.lineas_detail
              ).map((linea, index) => (
                <View key={index} style={styles.servicioItem}>
                  <View style={styles.servicioInfo}>
                    <Text style={styles.servicioNombre}>
                      {linea.servicio_nombre || linea.nombre}
                    </Text>
                    <Text style={styles.servicioDescripcion}>
                      {linea.descripcion || 'Servicio profesional'}
                    </Text>
                    
                    {/* Mostrar información de repuestos */}
                    {linea.con_repuestos ? (
                      <View style={styles.repuestosSection}>
                        <Text style={styles.repuestosTitle}>✓ Con repuestos incluidos</Text>
                        {/* Primero intentar usar repuestos específicos de la solicitud */}
                        {linea.repuestos_incluidos && linea.repuestos_incluidos.length > 0 ? (
                          <View style={styles.repuestosList}>
                            {linea.repuestos_incluidos.map((repuesto, repuestoIndex) => (
                              <View key={repuestoIndex} style={styles.repuestoItem}>
                                <Text style={styles.repuestoNombre}>
                                  • {repuesto.repuesto_info?.nombre || 'Repuesto'}
                                </Text>
                                <Text style={styles.repuestoCantidad}>
                                  Cantidad: {repuesto.cantidad || 1}
                                  {repuesto.incluido_en_garantia ? ' (Con garantía)' : ''}
                                </Text>
                                {repuesto.repuesto_info?.descripcion && (
                                  <Text style={styles.repuestoDescripcion}>
                                    {repuesto.repuesto_info.descripcion}
                                  </Text>
                                )}
                              </View>
                            ))}
                          </View>
                        ) : linea.repuestos_servicio && linea.repuestos_servicio.length > 0 ? (
                          /* Si no hay repuestos específicos, usar los repuestos del servicio */
                          <View style={styles.repuestosList}>
                            {linea.repuestos_servicio.map((repuesto, repuestoIndex) => (
                              <View key={repuestoIndex} style={styles.repuestoItem}>
                                <Text style={styles.repuestoNombre}>
                                  • {repuesto.repuesto_info?.nombre || 'Repuesto'}
                                </Text>
                                <Text style={styles.repuestoCantidad}>
                                  Cantidad: {repuesto.cantidad || 1}
                                  {repuesto.incluido_en_garantia ? ' (Con garantía)' : ''}
                                  {repuesto.es_opcional ? ' (Opcional)' : ''}
                                </Text>
                                {repuesto.repuesto_info?.descripcion && (
                                  <Text style={styles.repuestoDescripcion}>
                                    {repuesto.repuesto_info.descripcion}
                                  </Text>
                                )}
                                {repuesto.repuesto_info?.marca && (
                                  <Text style={styles.repuestoMarca}>
                                    Marca: {repuesto.repuesto_info.marca}
                                  </Text>
                                )}
                                {repuesto.notas && (
                                  <Text style={styles.repuestoNotas}>
                                    {repuesto.notas}
                                  </Text>
                                )}
                              </View>
                            ))}
                          </View>
                        ) : (
                          <Text style={styles.repuestosGeneral}>
                            Los repuestos necesarios están incluidos en el precio del servicio.
                          </Text>
                        )}
                      </View>
                    ) : (
                      <View style={styles.sinRepuestosSection}>
                        <View style={styles.advertenciaContainer}>
                          <View style={styles.advertenciaHeader}>
                            <Ionicons name="warning-outline" size={16} color="#FF6B35" />
                            <Text style={styles.advertenciaTitulo}>Servicio sin repuestos</Text>
                          </View>
                          <Text style={styles.advertenciaTexto}>
                            Este servicio fue agendado solo con mano de obra. Los repuestos no están incluidos 
                            y deben ser proporcionados por separado. 
                          </Text>
                          <Text style={styles.advertenciaGarantia}>
                            ⚠️ Importante: Los repuestos no suministrados por MecaniMóvil no están cubiertos 
                            por nuestra garantía de servicio, excepto para servicios de diagnóstico.
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                  <View style={styles.servicioPrecios}>
                    <Text style={styles.servicioPrecio}>
                      ${parseFloat(linea.precio_final || linea.precio || 0).toLocaleString('es-CL')}
                    </Text>
                    <Text style={styles.servicioTipo}>
                      {linea.con_repuestos ? 'Con repuestos' : 'Solo mano de obra'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Información de Pago */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="card" size={24} color="#007AFF" />
            <Text style={styles.sectionTitle}>Información de Pago</Text>
          </View>
          <View style={styles.paymentInfo}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Método de pago:</Text>
              <Text style={styles.paymentValue}>
                {agendamientoActual.metodo_pago === 'transferencia' ? 'Transferencia' : 
                 agendamientoActual.metodo_pago === 'efectivo' ? 'Efectivo' : 
                 agendamientoActual.metodo_pago}
              </Text>
            </View>
            
            {/* Estado de validación del comprobante */}
            {agendamientoActual.metodo_pago === 'transferencia' && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Estado del comprobante:</Text>
                <View style={styles.validationContainer}>
                  <Ionicons 
                    name={agendamientoActual.comprobante_validado ? "checkmark-circle" : "time-outline"} 
                    size={16} 
                    color={agendamientoActual.comprobante_validado ? "#28A745" : "#FF9500"} 
                  />
                  <Text style={[
                    styles.validationText,
                    { color: agendamientoActual.comprobante_validado ? "#28A745" : "#FF9500" }
                  ]}>
                    {agendamientoActual.comprobante_validado ? 'Validado' : 'Pendiente de validación'}
                  </Text>
                </View>
              </View>
            )}
            
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total a pagar:</Text>
              <Text style={styles.totalAmount}>
                ${parseFloat(agendamientoActual.total || 0).toLocaleString('es-CL')}
              </Text>
            </View>
          </View>
        </View>

        {/* Botones de Acción */}
        <View style={styles.actionsContainer}>
          {/* Botón para ver checklist en servicios completados */}
          {agendamientoActual.estado === 'completado' && (
            <View style={styles.checklistSection}>
              {verificandoChecklist ? (
                <View style={styles.checklistVerificando}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.checklistVerificandoText}>
                    Verificando inspección...
                  </Text>
                </View>
              ) : checklistDisponible ? (
                <TouchableOpacity
                  style={[styles.actionButtonLarge, styles.checklistButton]}
                  onPress={handleVerChecklist}
                >
                  <Ionicons name="document-text" size={20} color="white" />
                  <Text style={styles.actionButtonLargeText}>Ver Inspección Realizada</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.checklistNoDisponible}>
                  <Ionicons name="information-circle" size={16} color={COLORS.textLight} />
                  <Text style={styles.checklistNoDisponibleText}>
                    Este servicio no incluye inspección detallada
                  </Text>
                </View>
              )}
            </View>
          )}

          {agendamientoActual.estado === 'pendiente' && (
            <TouchableOpacity
              style={[styles.actionButtonLarge, styles.cancelButton]}
              onPress={handleCancelarAgendamiento}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="close-circle" size={20} color="white" />
                  <Text style={styles.actionButtonLargeText}>Cancelar Agendamiento</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.actionButtonLarge, styles.contactButton]}
            onPress={() => {
              Alert.alert('Información', 'Funcionalidad de soporte próximamente disponible');
            }}
          >
            <Ionicons name="chatbubble" size={20} color="white" />
            <Text style={styles.actionButtonLargeText}>Contactar Soporte</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
  },
  headerCard: {
    backgroundColor: 'white',
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: '#666666',
  },
  estadoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  estadoTexto: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: 'white',
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginLeft: 12,
  },
  vehicleInfo: {
    paddingLeft: 36,
  },
  vehicleText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  vehicleSubtext: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  tallerInfo: {
    paddingLeft: 36,
  },
  tallerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  tallerAddress: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  tallerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 6,
  },
  serviciosContainer: {
    paddingLeft: 36,
  },
  servicioItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  servicioInfo: {
    flex: 1,
    marginRight: 16,
  },
  servicioNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  servicioDescripcion: {
    fontSize: 14,
    color: '#666666',
  },
  servicioPrecios: {
    alignItems: 'flex-end',
  },
  servicioPrecio: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 2,
  },
  servicioTipo: {
    fontSize: 12,
    color: '#666666',
  },
  paymentInfo: {
    paddingLeft: 36,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#666666',
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  actionsContainer: {
    marginTop: 8,
    marginBottom: 20,
    gap: 12,
  },
  actionButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#DC3545',
  },
  contactButton: {
    backgroundColor: '#007AFF',
  },
  actionButtonLargeText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  serviceDateTimeContainer: {
    backgroundColor: '#F0F8FF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    marginBottom: 16,
  },
  serviceDateTimeLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  serviceDateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  serviceDateTimeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginLeft: 8,
  },
  validationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  validationText: {
    fontSize: 14,
    fontWeight: '600',
  },
  repuestosSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  repuestosTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  repuestosList: {
    paddingLeft: 8,
  },
  repuestoItem: {
    marginBottom: 6,
    paddingVertical: 4,
  },
  repuestoNombre: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 2,
  },
  repuestoCantidad: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 2,
  },
  repuestoDescripcion: {
    fontSize: 11,
    color: '#888888',
    fontStyle: 'italic',
  },
  repuestosGeneral: {
    fontSize: 13,
    color: '#007AFF',
    fontStyle: 'italic',
  },
  sinRepuestosSection: {
    marginTop: 12,
  },
  advertenciaContainer: {
    padding: 12,
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  advertenciaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  advertenciaTitulo: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginLeft: 8,
  },
  advertenciaTexto: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
    marginBottom: 8,
  },
  advertenciaGarantia: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 16,
    fontWeight: '600',
  },
  repuestoMarca: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '600',
  },
  repuestoNotas: {
    fontSize: 11,
    color: '#666666',
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginTop: 16,
  },
  checklistSection: {
    marginBottom: 12,
  },
  checklistVerificando: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    gap: 8,
  },
  checklistVerificandoText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  checklistButton: {
    backgroundColor: '#28A745',
  },
  checklistNoDisponible: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    gap: 8,
  },
  checklistNoDisponibleText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  servicioResumenRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  servicioResumenLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginLeft: 6,
  },
  servicioResumenText: {
    flex: 1,
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  servicioResumenMas: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 8,
  },
});

export default AppointmentDetailScreen; 