import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useBookingCart } from '../../context/BookingCartContext';
import agendamientoService from '../../services/agendamientoService';

const DateTimePickerScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { addToCart } = useBookingCart();

  // Parámetros recibidos de la navegación
  const { 
    ofertaServicio, 
    vehiculo, 
    conRepuestos = true 
  } = route.params || {};

  // Estados locales
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [availabilityData, setAvailabilityData] = useState({});
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [errorAvailability, setErrorAvailability] = useState(null);
  const [fechasDisponibles, setFechasDisponibles] = useState([]);

  useEffect(() => {
    // Generar fechas disponibles para los próximos 30 días
    const fechas = agendamientoService.obtenerFechasDisponibles(30);
    setFechasDisponibles(fechas);
    
    // Cargar disponibilidad inicial
    if (ofertaServicio?.taller || ofertaServicio?.taller_info?.id) {
      loadAvailability();
    }
  }, [ofertaServicio]);

  const loadAvailability = async () => {
    if (!ofertaServicio) return;

    try {
      setIsLoadingAvailability(true);
      setErrorAvailability(null);

      // Determinar el ID del taller
      const tallerId = ofertaServicio.taller || ofertaServicio.taller_info?.id;
      
      if (!tallerId) {
        throw new Error('No se pudo identificar el taller');
      }

      console.log('🔍 Cargando disponibilidad para taller:', tallerId);

      // Obtener disponibilidad para los próximos días
      const fechaInicio = new Date().toISOString().split('T')[0];
      const fechaFin = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const disponibilidad = {};
      
      // Cargar disponibilidad para cada fecha
      for (const fechaInfo of fechasDisponibles.slice(0, 7)) { // Primeros 7 días
        try {
          const response = await agendamientoService.obtenerHorariosTaller(tallerId, fechaInfo.fecha);
          if (response.taller_abierto && response.slots_disponibles) {
            disponibilidad[fechaInfo.fecha] = response.slots_disponibles;
          }
        } catch (error) {
          console.log(`Error cargando horarios para ${fechaInfo.fecha}:`, error);
        }
      }

      setAvailabilityData(disponibilidad);
      console.log('✅ Disponibilidad cargada:', Object.keys(disponibilidad).length, 'días');

    } catch (error) {
      console.error('❌ Error cargando disponibilidad:', error);
      setErrorAvailability(error.message);
    } finally {
      setIsLoadingAvailability(false);
    }
  };

  const handleDateSelect = async (fechaInfo) => {
    setSelectedDate(fechaInfo.fecha);
    setSelectedTimeSlot(null);

    // Si no tenemos disponibilidad para esta fecha, cargarla
    if (!availabilityData[fechaInfo.fecha]) {
      try {
        setIsLoadingAvailability(true);
        const tallerId = ofertaServicio.taller || ofertaServicio.taller_info?.id;
        const response = await agendamientoService.obtenerHorariosTaller(tallerId, fechaInfo.fecha);
        
        if (response.taller_abierto && response.slots_disponibles) {
          setAvailabilityData(prev => ({
            ...prev,
            [fechaInfo.fecha]: response.slots_disponibles
          }));
        }
      } catch (error) {
        console.error('Error cargando horarios para fecha específica:', error);
      } finally {
        setIsLoadingAvailability(false);
      }
    }
  };

  const handleTimeSlotSelect = (timeSlot) => {
    setSelectedTimeSlot(timeSlot);
  };

  const handleContinuar = () => {
    if (!selectedDate || !selectedTimeSlot) {
      Alert.alert('Selección Incompleta', 'Por favor selecciona fecha y hora.');
      return;
    }

    if (!ofertaServicio || !vehiculo) {
      Alert.alert('Error', 'Faltan datos del servicio o vehículo.');
      return;
    }

    try {
      // Agregar al carrito local
      const cartItem = addToCart(
        ofertaServicio,
        vehiculo,
        selectedDate,
        selectedTimeSlot.hora_inicio_24h || selectedTimeSlot.hora_inicio,
        { conRepuestos }
      );

      console.log('✅ Servicio agregado al carrito:', cartItem);

      // Navegar directamente al carrito sin mostrar alert confuso
      navigation.navigate('BookingCart');

    } catch (error) {
      console.error('Error agregando al carrito:', error);
      Alert.alert('Error', 'No se pudo agregar el servicio al carrito.');
    }
  };

  const renderTimeSlotsForSelectedDate = () => {
    if (!selectedDate || !availabilityData[selectedDate]) {
      return null;
    }

    const slots = availabilityData[selectedDate];
    
    return (
      <View style={styles.timeSlotsContainer}>
        {slots.map((slot, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.timeSlotButton,
              selectedTimeSlot?.hora_inicio === slot.hora_inicio && styles.timeSlotSelected,
              !slot.disponible && styles.timeSlotDisabled
            ]}
            onPress={() => slot.disponible && handleTimeSlotSelect(slot)}
            disabled={!slot.disponible}
          >
            <Text style={[
              styles.timeSlotText,
              selectedTimeSlot?.hora_inicio === slot.hora_inicio && styles.timeSlotTextSelected,
              !slot.disponible && styles.timeSlotTextDisabled
            ]}>
              {slot.hora_inicio} - {slot.hora_fin}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (!ofertaServicio || !vehiculo) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: Faltan datos del servicio o vehículo</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Seleccionar Fecha y Hora</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Información del servicio */}
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{ofertaServicio.servicio_info?.nombre || ofertaServicio.nombre}</Text>
          <Text style={styles.workshopName}>{ofertaServicio.taller_info?.nombre || ofertaServicio.nombre_proveedor}</Text>
          <Text style={styles.vehicleName}>{vehiculo.marca_nombre} {vehiculo.modelo_nombre}</Text>
          <Text style={styles.price}>
            ${Math.round(parseFloat(ofertaServicio.precio_con_repuestos || ofertaServicio.precio_sin_repuestos || 0)).toLocaleString('es-CL')}
          </Text>
        </View>

        {/* Selector de fecha */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selecciona una fecha</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.datesContainer}
          >
            {fechasDisponibles.map((fechaInfo) => (
              <TouchableOpacity
                key={fechaInfo.fecha}
                style={[
                  styles.dateButton,
                  selectedDate === fechaInfo.fecha && styles.dateButtonSelected
                ]}
                onPress={() => handleDateSelect(fechaInfo)}
              >
                <Text style={[
                  styles.dayText,
                  selectedDate === fechaInfo.fecha && styles.dayTextSelected
                ]}>
                  {fechaInfo.diaSemana}
                </Text>
                <Text style={[
                  styles.dateText,
                  selectedDate === fechaInfo.fecha && styles.dateTextSelected
                ]}>
                  {new Date(fechaInfo.fecha).getDate()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Selector de hora */}
        {selectedDate && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Horarios disponibles para {
                fechasDisponibles.find(f => f.fecha === selectedDate)?.fechaFormateada
              }
            </Text>
            
            {isLoadingAvailability ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Cargando horarios...</Text>
              </View>
            ) : errorAvailability ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorAvailability}</Text>
                <TouchableOpacity onPress={loadAvailability} style={styles.retryButton}>
                  <Text style={styles.retryButtonText}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              renderTimeSlotsForSelectedDate()
            )}
          </View>
        )}

        {/* Resumen de selección */}
        {selectedDate && selectedTimeSlot && (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Resumen de tu cita</Text>
            <View style={styles.summaryItem}>
              <Ionicons name="calendar-outline" size={20} color="#007AFF" />
              <Text style={styles.summaryText}>
                {fechasDisponibles.find(f => f.fecha === selectedDate)?.fechaFormateada}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="time-outline" size={20} color="#007AFF" />
              <Text style={styles.summaryText}>
                {selectedTimeSlot.hora_inicio} - {selectedTimeSlot.hora_fin}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer con botón de continuar */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            (!selectedDate || !selectedTimeSlot) && styles.continueButtonDisabled
          ]}
          onPress={handleContinuar}
          disabled={!selectedDate || !selectedTimeSlot}
        >
          <Text style={styles.continueButtonText}>Agregar al Carrito</Text>
          <Ionicons name="arrow-forward" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  content: {
    flex: 1,
  },
  serviceInfo: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 10,
  },
  serviceName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 5,
  },
  workshopName: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 5,
  },
  vehicleName: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 10,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#28A745',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginHorizontal: 20,
    marginBottom: 15,
  },
  datesContainer: {
    paddingHorizontal: 20,
  },
  dateButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    backgroundColor: 'white',
    borderRadius: 10,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dateButtonSelected: {
    backgroundColor: '#007AFF',
  },
  dayText: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 5,
  },
  dayTextSelected: {
    color: 'white',
  },
  dateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  dateTextSelected: {
    color: 'white',
  },
  timeSlotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
  },
  timeSlotButton: {
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timeSlotSelected: {
    backgroundColor: '#007AFF',
  },
  timeSlotDisabled: {
    backgroundColor: '#F5F5F5',
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  timeSlotTextSelected: {
    color: 'white',
  },
  timeSlotTextDisabled: {
    color: '#CCCCCC',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666666',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryContainer: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 15,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333333',
  },
  footer: {
    backgroundColor: 'white',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  continueButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 10,
  },
  continueButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  continueButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 10,
  },
});

export default DateTimePickerScreen; 