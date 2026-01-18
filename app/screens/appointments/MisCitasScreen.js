import React, { useState, useEffect } from 'react';
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
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, ROUTES } from '../../utils/constants';
import * as userService from '../../services/user';

// Componentes
import Card from '../../components/base/Card/Card';

const MisCitasScreen = () => {
  const navigation = useNavigation();
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    proximas: 0,
    enProceso: 0,
    pendientes: 0
  });

  // Normalizar líneas de una cita (usa lineas_detail si lineas viene vacío)
  const getLineas = (cita) => {
    if (!cita) return [];
    if (Array.isArray(cita.lineas) && cita.lineas.length > 0) return cita.lineas;
    if (Array.isArray(cita.lineas_detail) && cita.lineas_detail.length > 0) return cita.lineas_detail;
    return [];
  };

  useEffect(() => {
    cargarCitas();
  }, []);

  const cargarCitas = async () => {
    try {
      setLoading(true);
      
      // Obtener solo las citas activas (no completadas ni canceladas)
      const data = await userService.getActiveAppointments();
      console.log('Citas activas obtenidas:', data);
      
      setCitas(data || []);
      calcularEstadisticas(data || []);
    } catch (error) {
      console.error('Error al cargar citas:', error);
      if (error.status !== 404) {
        Alert.alert('Error', 'No se pudieron cargar las citas activas.');
      }
      setCitas([]);
    } finally {
      setLoading(false);
    }
  };

  const calcularEstadisticas = (solicitudes) => {
    const stats = {
      total: solicitudes.length,
      proximas: solicitudes.filter(s => ['confirmado', 'pago_validado'].includes(s.estado)).length,
      enProceso: solicitudes.filter(s => s.estado === 'en_proceso').length,
      pendientes: solicitudes.filter(s => s.estado === 'pendiente').length
    };
    setEstadisticas(stats);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarCitas();
    setRefreshing(false);
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
      default:
        return '#6C757D';
    }
  };

  const getEstadoTexto = (estado) => {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente de Pago';
      case 'pago_validado':
        return 'Pago Confirmado';
      case 'confirmado':
        return 'Cita Confirmada';
      case 'en_proceso':
        return 'En Proceso';
      default:
        return estado;
    }
  };

  const getEstadoIcono = (estado) => {
    switch (estado) {
      case 'pendiente':
        return 'card-outline';
      case 'pago_validado':
        return 'checkmark-circle-outline';
      case 'confirmado':
        return 'calendar-outline';
      case 'en_proceso':
        return 'construct-outline';
      default:
        return 'ellipse-outline';
    }
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-CL', {
      weekday: 'short',
      day: '2-digit',
      month: 'short'
    });
  };

  const formatearFechaCompleta = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-CL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const agruparPorVehiculo = (solicitudes) => {
    const grupos = {};
    
    solicitudes.forEach(solicitud => {
      if (solicitud.vehiculo_detail) {
        const vehiculoId = solicitud.vehiculo_detail.id;
        
        if (!grupos[vehiculoId]) {
          grupos[vehiculoId] = {
            vehiculo: solicitud.vehiculo_detail,
            citas: []
          };
        }
        
        grupos[vehiculoId].citas.push(solicitud);
      }
    });
    
    // Ordenar por fecha más próxima
    Object.values(grupos).forEach(grupo => {
      grupo.citas.sort((a, b) => new Date(a.fecha_servicio) - new Date(b.fecha_servicio));
    });
    
    return Object.values(grupos).sort((a, b) => {
      const fechaA = new Date(a.citas[0]?.fecha_servicio);
      const fechaB = new Date(b.citas[0]?.fecha_servicio);
      return fechaA - fechaB;
    });
  };

  const renderEstadisticas = () => (
    <View style={styles.estadisticasCard}>
      <Text style={styles.estadisticasTitle}>Resumen de Citas</Text>
      <View style={styles.estadisticasContainer}>
        <View style={styles.estadisticaItem}>
          <View style={[styles.estadisticaIcono, { backgroundColor: '#007AFF' }]}>
            <Ionicons name="calendar" size={16} color="white" />
          </View>
          <Text style={styles.estadisticaNumero}>{estadisticas.total}</Text>
          <Text style={styles.estadisticaLabel}>Total</Text>
        </View>
        <View style={styles.estadisticaItem}>
          <View style={[styles.estadisticaIcono, { backgroundColor: '#0056CC' }]}>
            <Ionicons name="checkmark-circle" size={16} color="white" />
          </View>
          <Text style={[styles.estadisticaNumero, { color: '#0056CC' }]}>
            {estadisticas.proximas}
          </Text>
          <Text style={styles.estadisticaLabel}>Confirmadas</Text>
        </View>
        <View style={styles.estadisticaItem}>
          <View style={[styles.estadisticaIcono, { backgroundColor: '#28A745' }]}>
            <Ionicons name="construct" size={16} color="white" />
          </View>
          <Text style={[styles.estadisticaNumero, { color: '#28A745' }]}>
            {estadisticas.enProceso}
          </Text>
          <Text style={styles.estadisticaLabel}>En Proceso</Text>
        </View>
        <View style={styles.estadisticaItem}>
          <View style={[styles.estadisticaIcono, { backgroundColor: '#FF9500' }]}>
            <Ionicons name="card" size={16} color="white" />
          </View>
          <Text style={[styles.estadisticaNumero, { color: '#FF9500' }]}>
            {estadisticas.pendientes}
          </Text>
          <Text style={styles.estadisticaLabel}>Pendientes</Text>
        </View>
      </View>
    </View>
  );

  const renderCita = (cita) => (
    <TouchableOpacity
      key={cita.id}
      style={styles.citaCard}
      onPress={() => {
        navigation.push(ROUTES.APPOINTMENT_DETAIL, { agendamiento: cita });
      }}
      activeOpacity={0.7}
    >
      {/* Header de la cita */}
      <View style={styles.citaHeader}>
        <View style={styles.fechaContainer}>
          <Text style={styles.fechaTexto}>
            {formatearFecha(cita.fecha_servicio)}
          </Text>
          <Text style={styles.horaTexto}>
            {cita.hora_servicio}
          </Text>
        </View>
        <View style={[
          styles.estadoBadge,
          { backgroundColor: getEstadoColor(cita.estado) }
        ]}>
          <Ionicons 
            name={getEstadoIcono(cita.estado)} 
            size={12} 
            color="white" 
          />
          <Text style={styles.estadoTexto}>
            {getEstadoTexto(cita.estado)}
          </Text>
        </View>
      </View>

      {/* Orden y resumen de servicio */}
      {(() => {
        const lineas = getLineas(cita);
        const servicioPrincipal = lineas[0]?.servicio_nombre || lineas[0]?.nombre;
        return (
          <View style={styles.ordenServicioRow}>
            <Ionicons name="receipt-outline" size={16} color="#666" />
            <Text style={styles.ordenLabel}>Orden</Text>
            <Text style={styles.ordenNumero}>#{cita.numero_orden || cita.id}</Text>
            {servicioPrincipal ? (
              <>
                <Text style={styles.separadorPunto}>•</Text>
                <Text style={styles.servicioResumen} numberOfLines={1}>
                  {servicioPrincipal}
                </Text>
                {lineas.length > 1 && (
                  <Text style={styles.servicioMas}> +{lineas.length - 1} más</Text>
                )}
              </>
            ) : null}
          </View>
        );
      })()}

      {/* Información del proveedor */}
      <View style={styles.proveedorInfo}>
        <View style={styles.proveedorIcono}>
          <Ionicons 
            name={cita.tipo_servicio === 'taller' ? 'business' : 'person'} 
            size={20} 
            color="#007AFF" 
          />
        </View>
        <View style={styles.proveedorTextos}>
          <Text style={styles.proveedorNombre}>
            {cita.taller_detail?.nombre || cita.mecanico_detail?.nombre || 'Proveedor'}
          </Text>
          <Text style={styles.proveedorTipo}>
            {cita.tipo_servicio === 'taller' ? 'Taller' : 'Mecánico a domicilio'}
          </Text>
          {cita.taller_detail?.direccion && (
            <Text style={styles.proveedorDireccion}>
              {cita.taller_detail.direccion}
            </Text>
          )}
        </View>
      </View>

      {/* Servicios */}
      {(() => {
        const lineas = getLineas(cita);
        if (!lineas || lineas.length === 0) return null;
        return (
        <View style={styles.serviciosInfo}>
          <Text style={styles.serviciosTitle}>
            {lineas.length} servicio{lineas.length > 1 ? 's' : ''}
          </Text>
          <View style={styles.serviciosList}>
            {lineas.slice(0, 2).map((linea, index) => (
              <Text key={index} style={styles.servicioNombre}>
                • {linea.servicio_nombre || linea.nombre}
              </Text>
            ))}
            {lineas.length > 2 && (
              <Text style={styles.serviciosExtra}>
                +{lineas.length - 2} más...
              </Text>
            )}
          </View>
        </View>
        );
      })()}

      {/* Footer con total */}
      <View style={styles.citaFooter}>
        <Text style={styles.totalLabel}>Total:</Text>
        <Text style={styles.totalAmount}>
          ${parseFloat(cita.total || 0).toLocaleString('es-CL')}
        </Text>
      </View>

      {/* Indicador de ver más */}
      <View style={styles.verMasIndicador}>
        <Ionicons name="chevron-forward" size={16} color="#007AFF" />
      </View>
    </TouchableOpacity>
  );

  const renderGrupoVehiculo = ({ item: grupo }) => (
    <View style={styles.grupoVehiculo}>
      {/* Header del vehículo */}
      <View style={styles.vehiculoHeader}>
        <View style={styles.vehiculoIcono}>
          <Ionicons name="car" size={24} color="#007AFF" />
        </View>
        <View style={styles.vehiculoInfo}>
          <Text style={styles.vehiculoNombre}>
            {grupo.vehiculo.marca_nombre} {grupo.vehiculo.modelo_nombre}
          </Text>
          <Text style={styles.vehiculoDetalles}>
            {grupo.vehiculo.year} • {grupo.vehiculo.patente}
          </Text>
        </View>
        <View style={styles.citasCount}>
          <Text style={styles.citasCountTexto}>
            {grupo.citas.length} cita{grupo.citas.length > 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Lista de citas para este vehículo */}
      <View style={styles.citasContainer}>
        {grupo.citas.map(cita => renderCita(cita))}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Cargando tus citas...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const gruposVehiculos = agruparPorVehiculo(citas);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Mis Citas</Text>
          <TouchableOpacity
            style={styles.historialButton}
            onPress={() => navigation.navigate(ROUTES.SERVICES_HISTORY)}
          >
            <Ionicons name="time-outline" size={20} color="#007AFF" />
            <Text style={styles.historialButtonText}>Historial</Text>
          </TouchableOpacity>
        </View>

        {/* Estadísticas */}
        {citas.length > 0 && renderEstadisticas()}

        {/* Lista de citas */}
        {citas.length === 0 ? (
          <ScrollView
            contentContainerStyle={styles.emptyContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            <View style={styles.emptyIconContainer}>
              <Ionicons name="calendar-outline" size={64} color="#666666" />
            </View>
            <Text style={styles.emptyTitle}>No tienes citas activas</Text>
            <Text style={styles.emptySubtitle}>
              Cuando agendes servicios para tus vehículos, aparecerán aquí organizados por vehículo.
            </Text>
            <TouchableOpacity
              style={styles.agendarButton}
              onPress={() => navigation.navigate(ROUTES.HOME)}
            >
              <Ionicons name="add-circle" size={20} color="white" />
              <Text style={styles.agendarButtonText}>Agendar Servicio</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <FlatList
            data={gruposVehiculos}
            renderItem={renderGrupoVehiculo}
            keyExtractor={(item, index) => `vehiculo-${item.vehiculo.id}-${index}`}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  historialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  historialButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666666',
  },
  estadisticasCard: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  estadisticasTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
    textAlign: 'center',
  },
  estadisticasContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  estadisticaItem: {
    alignItems: 'center',
    flex: 1,
  },
  estadisticaIcono: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  estadisticaNumero: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  estadisticaLabel: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  agendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  agendarButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  listContainer: {
    paddingBottom: 20,
  },
  grupoVehiculo: {
    marginBottom: 24,
  },
  vehiculoHeader: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vehiculoIcono: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  vehiculoInfo: {
    flex: 1,
  },
  vehiculoNombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  vehiculoDetalles: {
    fontSize: 14,
    color: '#666666',
  },
  citasCount: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  citasCountTexto: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  citasContainer: {
    gap: 12,
  },
  citaCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  citaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  fechaContainer: {
    alignItems: 'flex-start',
  },
  fechaTexto: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    textTransform: 'capitalize',
  },
  horaTexto: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  estadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  estadoTexto: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  proveedorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  proveedorIcono: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  proveedorTextos: {
    flex: 1,
  },
  proveedorNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 2,
  },
  proveedorTipo: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 2,
  },
  proveedorDireccion: {
    fontSize: 12,
    color: '#666666',
  },
  serviciosInfo: {
    marginBottom: 12,
  },
  serviciosTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 6,
  },
  serviciosList: {
    paddingLeft: 8,
  },
  servicioNombre: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 2,
  },
  serviciosExtra: {
    fontSize: 13,
    color: '#007AFF',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  citaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  verMasIndicador: {
    position: 'absolute',
    top: 15,
    right: 15,
  },
  ordenServicioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  ordenLabel: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 6,
  },
  ordenNumero: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333333',
  },
  separadorPunto: {
    fontSize: 12,
    color: '#999999',
    marginHorizontal: 2,
  },
  servicioResumen: {
    flexShrink: 1,
    fontSize: 13,
    color: '#333333',
    fontWeight: '500',
  },
  servicioMas: {
    fontSize: 12,
    color: '#666666',
  },
});

export default MisCitasScreen; 