import React, { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {
  AlertTriangle,
  Wrench,
  Car,
  Building2,
  Calendar,
  Clock,
  Phone,
  MapPin,
  CreditCard,
  CheckCircle2,
  FileText,
  Info,
  CircleX,
  MessageCircle,
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS, SPACING, BORDERS, SHADOWS, TYPOGRAPHY } from '../../design-system/tokens';
import * as userService from '../../services/user';

// Componentes
import Card from '../../components/base/Card/Card';
import PrimaryGradientFill from '../../components/base/PrimaryGradientFill/PrimaryGradientFill';
import ChecklistViewerModal from '../../components/modals/ChecklistViewerModal';
import PendingClientSignatureCard from '../../components/checklist/PendingClientSignatureCard';

const AppointmentDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { agendamiento } = route.params;
  const queryClient = useQueryClient();
  
  const [loading, setLoading] = useState(true);
  const [agendamientoActual, setAgendamientoActual] = useState(null);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [checklistDisponible, setChecklistDisponible] = useState(false);
  const [verificandoChecklist, setVerificandoChecklist] = useState(false);
  // Counter para refrescar la card de firma diferida del cliente.
  const [signatureRefreshKey, setSignatureRefreshKey] = useState(0);

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
        return COLORS.warning.main;
      case 'pago_validado':
        return COLORS.info.main;
      case 'confirmado':
        return COLORS.primary[600];
      case 'en_proceso':
        return COLORS.success.main;
      case 'completado':
        return COLORS.neutral.gray[600];
      case 'cancelado':
        return COLORS.error.main;
      case 'cancelacion_solicitada':
        return COLORS.accent[600];
      case 'devolucion_procesada':
        return COLORS.warning.dark;
      default:
        return COLORS.neutral.gray[600];
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

  const closeChecklistModal = useCallback(() => {
    setShowChecklistModal(false);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />
      {/* Contenido principal sin header personalizado */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary[500]} />
            <Text style={styles.loadingText}>Cargando detalles...</Text>
          </View>
        ) : agendamientoActual ? (
          renderContent()
        ) : (
          <View style={styles.errorContainer}>
            <AlertTriangle size={48} color={COLORS.warning.main} />
            <Text style={styles.errorText}>No se pudieron cargar los detalles</Text>
          </View>
        )}
      </ScrollView>

      {/* Modal del Checklist */}
      {agendamientoActual && (
        <ChecklistViewerModal
          visible={showChecklistModal}
          onClose={closeChecklistModal}
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
                <Wrench size={18} color={COLORS.primary[500]} />
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
              <Car size={24} color={COLORS.primary[500]} />
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
              <Building2 size={24} color={COLORS.primary[500]} />
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
                  <Calendar size={16} color={COLORS.primary[500]} />
                  <Text style={styles.serviceDateTimeText}>
                    {formatearFecha(agendamientoActual.fecha_servicio)}
                  </Text>
                </View>
                <View style={styles.serviceDateTimeRow}>
                  <Clock size={16} color={COLORS.primary[500]} />
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
                  <Phone size={16} color={COLORS.primary[500]} />
                  <Text style={styles.actionButtonText}>Llamar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleVerUbicacion}
                >
                  <MapPin size={16} color={COLORS.primary[500]} />
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
              <Wrench size={24} color={COLORS.primary[500]} />
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
                            <AlertTriangle size={16} color={COLORS.warning.main} />
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
            <CreditCard size={24} color={COLORS.primary[500]} />
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
                  {agendamientoActual.comprobante_validado ? (
                    <CheckCircle2 size={16} color={COLORS.success.main} />
                  ) : (
                    <Clock size={16} color={COLORS.warning.main} />
                  )}
                  <Text style={[
                    styles.validationText,
                    { color: agendamientoActual.comprobante_validado ? COLORS.success.main : COLORS.warning.main }
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

        {/*
          Firma diferida del cliente: si la orden quedó en
          `pendiente_firma_cliente` tras la firma del técnico, la card abre
          el `CustomerSignatureModal` (change firma-cliente-diferida-checklist).
        */}
        <PendingClientSignatureCard
          ordenId={agendamientoActual.id}
          servicioNombre={
            agendamientoActual?.lineas?.[0]?.servicio_nombre ||
            agendamientoActual?.lineas_detail?.[0]?.servicio_nombre ||
            'Servicio agendado'
          }
          proveedorNombre={
            agendamientoActual?.taller?.nombre ||
            agendamientoActual?.mecanico?.nombre_completo ||
            null
          }
          refreshKey={signatureRefreshKey}
          onSignatureSuccess={() => {
            setSignatureRefreshKey((v) => v + 1);
            queryClient.invalidateQueries({
              predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'requests',
            });
            queryClient.invalidateQueries({
              predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'activeRequests',
            });
            cargarDatosCompletos();
          }}
        />

        {/* Botones de Acción */}
        <View style={styles.actionsContainer}>
          {/* Botón para ver checklist en servicios completados */}
          {agendamientoActual.estado === 'completado' && (
            <View style={styles.checklistSection}>
              {verificandoChecklist ? (
                <View style={styles.checklistVerificando}>
                  <ActivityIndicator size="small" color={COLORS.primary[500]} />
                  <Text style={styles.checklistVerificandoText}>
                    Verificando inspección...
                  </Text>
                </View>
              ) : checklistDisponible ? (
                <TouchableOpacity
                  style={styles.actionButtonTouchable}
                  onPress={handleVerChecklist}
                  activeOpacity={0.85}
                >
                  <PrimaryGradientFill style={styles.actionButtonLarge}>
                    <FileText size={20} color={COLORS.text.inverse} />
                    <Text style={styles.actionButtonLargeText}>Ver Inspección Realizada</Text>
                  </PrimaryGradientFill>
                </TouchableOpacity>
              ) : (
                <View style={styles.checklistNoDisponible}>
                  <Info size={16} color={COLORS.text.tertiary} />
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
                  <CircleX size={20} color={COLORS.text.inverse} />
                  <Text style={styles.actionButtonLargeText}>Cancelar Agendamiento</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.actionButtonTouchable}
            onPress={() => {
              Alert.alert('Información', 'Funcionalidad de soporte próximamente disponible');
            }}
            activeOpacity={0.85}
          >
            <PrimaryGradientFill style={styles.actionButtonLarge}>
              <MessageCircle size={20} color={COLORS.text.inverse} />
              <Text style={styles.actionButtonLargeText}>Contactar Soporte</Text>
            </PrimaryGradientFill>
          </TouchableOpacity>
        </View>
      </>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  content: {
    flex: 1,
  },
  scrollContainer: {
    padding: SPACING.md,
  },
  headerCard: {
    backgroundColor: COLORS.background.paper,
    marginBottom: SPACING.md,
    borderRadius: BORDERS.radius.card.lg,
    padding: SPACING.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumber: {
    ...TYPOGRAPHY.styles.h3,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  orderDate: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
  },
  estadoBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDERS.radius.badge.md,
  },
  estadoTexto: {
    color: COLORS.text.inverse,
    ...TYPOGRAPHY.styles.captionBold,
  },
  sectionCard: {
    backgroundColor: COLORS.background.paper,
    marginBottom: SPACING.md,
    borderRadius: BORDERS.radius.card.lg,
    padding: SPACING.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.text.primary,
    marginLeft: SPACING.sm,
  },
  vehicleInfo: {
    paddingLeft: 36,
  },
  vehicleText: {
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  vehicleSubtext: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  tallerInfo: {
    paddingLeft: 36,
  },
  tallerName: {
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  tallerAddress: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  tallerActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary[50],
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.primary[200],
  },
  actionButtonText: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.primary[700],
    marginLeft: 6,
  },
  serviciosContainer: {
    paddingLeft: 36,
  },
  servicioItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: SPACING.sm,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: COLORS.border.light,
  },
  servicioInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  servicioNombre: {
    ...TYPOGRAPHY.styles.h5,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  servicioDescripcion: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
  },
  servicioPrecios: {
    alignItems: 'flex-end',
  },
  servicioPrecio: {
    ...TYPOGRAPHY.styles.h5,
    color: COLORS.primary[600],
    marginBottom: 2,
  },
  servicioTipo: {
    ...TYPOGRAPHY.styles.small,
    color: COLORS.text.secondary,
  },
  paymentInfo: {
    paddingLeft: 36,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  paymentLabel: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
  },
  paymentValue: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: COLORS.border.light,
  },
  totalLabel: {
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.text.primary,
  },
  totalAmount: {
    ...TYPOGRAPHY.styles.h3,
    color: COLORS.primary[600],
  },
  actionsContainer: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  actionButtonTouchable: {
    borderRadius: BORDERS.radius.button.md,
    overflow: 'hidden',
  },
  actionButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
  cancelButton: {
    backgroundColor: COLORS.error.main,
  },
  actionButtonLargeText: {
    ...TYPOGRAPHY.styles.button,
    color: COLORS.text.inverse,
  },
  serviceDateTimeContainer: {
    backgroundColor: COLORS.primary[50],
    padding: SPACING.sm,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.primary[200],
    marginBottom: SPACING.md,
  },
  serviceDateTimeLabel: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  serviceDateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  serviceDateTimeText: {
    ...TYPOGRAPHY.styles.bodyBold,
    color: COLORS.text.primary,
    marginLeft: SPACING.xs,
  },
  validationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  validationText: {
    ...TYPOGRAPHY.styles.captionBold,
  },
  repuestosSection: {
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.primary[50],
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.primary[200],
  },
  repuestosTitle: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.primary[700],
    marginBottom: SPACING.xs,
  },
  repuestosList: {
    paddingLeft: SPACING.xs,
  },
  repuestoItem: {
    marginBottom: 6,
    paddingVertical: 4,
  },
  repuestoNombre: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  repuestoCantidad: {
    ...TYPOGRAPHY.styles.small,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  repuestoDescripcion: {
    ...TYPOGRAPHY.styles.small,
    color: COLORS.text.tertiary,
    fontStyle: 'italic',
  },
  repuestosGeneral: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.primary[700],
    fontStyle: 'italic',
  },
  sinRepuestosSection: {
    marginTop: SPACING.sm,
  },
  advertenciaContainer: {
    padding: SPACING.sm,
    backgroundColor: COLORS.warning[50],
    borderRadius: BORDERS.radius.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning.main,
  },
  advertenciaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  advertenciaTitulo: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.warning.dark,
    marginLeft: SPACING.xs,
  },
  advertenciaTexto: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    lineHeight: 18,
    marginBottom: SPACING.xs,
  },
  advertenciaGarantia: {
    ...TYPOGRAPHY.styles.small,
    color: COLORS.text.secondary,
    lineHeight: 16,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  repuestoMarca: {
    ...TYPOGRAPHY.styles.small,
    color: COLORS.text.secondary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  repuestoNotas: {
    ...TYPOGRAPHY.styles.small,
    color: COLORS.text.secondary,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    ...TYPOGRAPHY.styles.bodyBold,
    color: COLORS.primary[600],
    marginTop: SPACING.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorText: {
    ...TYPOGRAPHY.styles.bodyBold,
    color: COLORS.warning.main,
    marginTop: SPACING.md,
  },
  checklistSection: {
    marginBottom: SPACING.sm,
  },
  checklistVerificando: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.neutral.gray[100],
    borderRadius: BORDERS.radius.card.lg,
    gap: SPACING.xs,
  },
  checklistVerificandoText: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.primary[600],
  },
  checklistNoDisponible: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.neutral.gray[100],
    borderRadius: BORDERS.radius.card.lg,
    gap: SPACING.xs,
  },
  checklistNoDisponibleText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },
  servicioResumenRow: {
    marginTop: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  servicioResumenLabel: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
    marginLeft: 6,
  },
  servicioResumenText: {
    flex: 1,
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.primary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  servicioResumenMas: {
    ...TYPOGRAPHY.styles.small,
    color: COLORS.text.secondary,
    marginLeft: SPACING.xs,
  },
});

export default AppointmentDetailScreen; 