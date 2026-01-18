import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';

const CartItemCard = ({ item, onRemove, showVehicleInfo = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [animatedHeight] = useState(new Animated.Value(0));

  const toggleExpanded = () => {
    const toValue = isExpanded ? 0 : 1;
    
    Animated.timing(animatedHeight, {
      toValue,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    
    setIsExpanded(!isExpanded);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Sin fecha';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'Sin hora';
    return timeString.slice(0, 5); // HH:MM format
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  // Determinar información del proveedor
  const providerInfo = {
    name: item.tallerNombre || item.taller_nombre || 'Proveedor no especificado',
    address: item.tallerDireccion || item.taller_direccion || null,
    phone: item.taller_telefono || null,
    rating: item.taller_calificacion || null,
    type: item.tipo_proveedor || 'taller'
  };

  // Información del servicio
  const serviceInfo = {
    name: item.servicioNombre || item.servicio_nombre || 'Servicio',
    description: item.descripcion || '',
    category: item.categoria || 'General',
    duration: item.duracionEstimada || null,
    warranty: { incluye: false } // Simplificado por ahora
  };

  // Información de agendamiento
  const schedulingInfo = {
    date: item.fechaSeleccionada || item.fecha_servicio,
    time: item.horaSeleccionada || item.hora_servicio
  };

  // Precios
  const pricing = {
    final: item.precio || item.precio_final || 0,
    withParts: item.precio_con_repuestos || 0,
    withoutParts: item.precio_sin_repuestos || 0,
    includesParts: item.conRepuestos !== undefined ? item.conRepuestos : item.con_repuestos
  };

  return (
    <View style={styles.container}>
      {/* Header del servicio */}
      <TouchableOpacity 
        style={styles.header}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.serviceIcon}>
          <Ionicons 
            name="construct" 
            size={24} 
            color={COLORS.primary} 
          />
        </View>
        
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{serviceInfo.name}</Text>
          <Text style={styles.serviceCategory}>{serviceInfo.category}</Text>
          
          {/* Información del vehículo si es necesaria */}
          {showVehicleInfo && item.vehiculo_info && (
            <View style={styles.vehicleInfo}>
              <Ionicons name="car-outline" size={14} color={COLORS.textLight} />
              <Text style={styles.vehicleText}>
                {item.vehiculo_info.marca_nombre} {item.vehiculo_info.modelo_nombre}
                {item.vehiculo_info.patente && ` • ${item.vehiculo_info.patente}`}
              </Text>
            </View>
          )}
          
          {/* Información básica del proveedor */}
          <View style={styles.providerInfo}>
            <Ionicons 
              name={providerInfo.type === 'taller' ? "business-outline" : "person-outline"} 
              size={14} 
              color={COLORS.textLight} 
            />
            <Text style={styles.providerText}>{providerInfo.name}</Text>
          </View>
        </View>
        
        <View style={styles.rightSection}>
          <Text style={styles.priceText}>
            {formatCurrency(pricing.final)}
          </Text>
          
          {/* Tag de repuestos */}
          <View style={[
            styles.partsTag,
            pricing.includesParts ? styles.partsTagIncluded : styles.partsTagNotIncluded
          ]}>
            <Text style={[
              styles.partsTagText,
              pricing.includesParts ? styles.partsTagTextIncluded : styles.partsTagTextNotIncluded
            ]}>
              {pricing.includesParts ? 'Con repuestos' : 'Sin repuestos'}
            </Text>
          </View>
          
          {/* Ícono de expansión */}
          <Animated.View
            style={[
              styles.expandIcon,
              {
                transform: [{
                  rotate: animatedHeight.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '180deg']
                  })
                }]
              }
            ]}
          >
            <Ionicons name="chevron-down" size={20} color={COLORS.textLight} />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {/* Contenido expandido */}
      <Animated.View
        style={[
          styles.expandedContent,
          {
            opacity: animatedHeight,
            maxHeight: animatedHeight.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 500]
            })
          }
        ]}
      >
        <View style={styles.detailsContainer}>
          {/* Información del servicio */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Detalles del Servicio</Text>
            
            {serviceInfo.description && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Descripción:</Text>
                <Text style={styles.detailValue}>{serviceInfo.description}</Text>
              </View>
            )}
            
            {serviceInfo.duration && (
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={16} color={COLORS.textLight} />
                <Text style={styles.detailLabel}>Duración estimada:</Text>
                <Text style={styles.detailValue}>{serviceInfo.duration} min</Text>
              </View>
            )}
            
            {serviceInfo.warranty.incluye && (
              <View style={styles.detailRow}>
                <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.success} />
                <Text style={styles.detailLabel}>Garantía:</Text>
                <Text style={styles.detailValue}>{serviceInfo.warranty.descripcion || `${serviceInfo.warranty.duracion} días`}</Text>
              </View>
            )}
          </View>

          {/* Información del proveedor */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {providerInfo.type === 'taller' ? '🏢 Taller' : '🔧 Mecánico'}
            </Text>
            
            <View style={styles.detailRow}>
              <Ionicons name="business-outline" size={16} color={COLORS.textLight} />
              <Text style={styles.detailLabel}>Nombre:</Text>
              <Text style={styles.detailValue}>{providerInfo.name}</Text>
            </View>
            
            {providerInfo.address && (
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={16} color={COLORS.textLight} />
                <Text style={styles.detailLabel}>Dirección:</Text>
                <Text style={styles.detailValue}>{providerInfo.address}</Text>
              </View>
            )}
            
            {providerInfo.phone && (
              <View style={styles.detailRow}>
                <Ionicons name="call-outline" size={16} color={COLORS.textLight} />
                <Text style={styles.detailLabel}>Teléfono:</Text>
                <Text style={styles.detailValue}>{providerInfo.phone}</Text>
              </View>
            )}
            
            {providerInfo.rating && (
              <View style={styles.detailRow}>
                <Ionicons name="star-outline" size={16} color={COLORS.warning} />
                <Text style={styles.detailLabel}>Calificación:</Text>
                <Text style={styles.detailValue}>{providerInfo.rating.toFixed(1)} ⭐</Text>
              </View>
            )}
          </View>

          {/* Información de agendamiento */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 Agendamiento</Text>
            
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.textLight} />
              <Text style={styles.detailLabel}>Fecha:</Text>
              <Text style={styles.detailValue}>{formatDate(schedulingInfo.date)}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={16} color={COLORS.textLight} />
              <Text style={styles.detailLabel}>Hora:</Text>
              <Text style={styles.detailValue}>{formatTime(schedulingInfo.time)}</Text>
            </View>
          </View>

          {/* Información de precios */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💰 Detalles de Precio</Text>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Con repuestos:</Text>
              <Text style={styles.detailValue}>{formatCurrency(pricing.withParts)}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Sin repuestos:</Text>
              <Text style={styles.detailValue}>{formatCurrency(pricing.withoutParts)}</Text>
            </View>
            
            <View style={[styles.detailRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Precio final:</Text>
              <Text style={styles.totalValue}>{formatCurrency(pricing.final)}</Text>
            </View>
          </View>

          {/* Botón de eliminar */}
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => onRemove()}
          >
            <Ionicons name="trash-outline" size={20} color={COLORS.error} />
            <Text style={styles.removeButtonText}>Eliminar servicio</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  serviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceInfo: {
    flex: 1,
    marginRight: 8,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  serviceCategory: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 6,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  vehicleText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  rightSection: {
    alignItems: 'flex-end',
    minWidth: 100,
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 6,
  },
  partsTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  partsTagIncluded: {
    backgroundColor: '#E8F5E8',
  },
  partsTagNotIncluded: {
    backgroundColor: '#FFF5E6',
  },
  partsTagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  partsTagTextIncluded: {
    color: '#2E7D32',
  },
  partsTagTextNotIncluded: {
    color: '#F57C00',
  },
  expandIcon: {
    marginTop: 4,
  },
  expandedContent: {
    overflow: 'hidden',
  },
  detailsContainer: {
    padding: 16,
    paddingTop: 0,
    backgroundColor: '#FAFAFA',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  detailLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    marginLeft: 6,
    marginRight: 8,
    minWidth: 80,
  },
  detailValue: {
    fontSize: 13,
    color: COLORS.text,
    flex: 1,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 0,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  removeButtonText: {
    fontSize: 14,
    color: COLORS.error,
    fontWeight: '500',
    marginLeft: 6,
  },
});

export default CartItemCard; 