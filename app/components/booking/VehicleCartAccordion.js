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
import CartItemCard from './CartItemCard';
import { COLORS } from '../../utils/constants';

const VehicleCartAccordion = ({ vehicleGroup, onRemoveItem, showVehicleInfo = false }) => {
  const [isExpanded, setIsExpanded] = useState(true); // Expandido por defecto
  const [animatedHeight] = useState(new Animated.Value(1));
  const [animatedRotation] = useState(new Animated.Value(1));

  const toggleExpanded = () => {
    const toValue = isExpanded ? 0 : 1;
    
    Animated.parallel([
      Animated.timing(animatedHeight, {
        toValue,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(animatedRotation, {
        toValue,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    ]).start();
    
    setIsExpanded(!isExpanded);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  // Calcular total del vehículo
  const vehicleTotal = vehicleGroup.items.reduce((total, item) => {
    const price = item.precio || item.precio_final || item.precio_estimado || 0;
    return total + parseFloat(price);
  }, 0);

  // Determinar información del vehículo
  const vehicleInfo = vehicleGroup.vehiculo_info || vehicleGroup.items[0]?.vehiculo || {
    marca_nombre: 'Vehículo',
    modelo_nombre: 'Desconocido',
    patente: null
  };

  // Agrupar servicios por tipo de proveedor
  const servicesByProvider = vehicleGroup.items.reduce((acc, item) => {
    const providerType = item.tipo_proveedor || (item.taller_nombre ? 'taller' : 'mecanico');
    const providerName = item.taller_nombre || item.mecanico_nombre || item.tallerNombre || 'Proveedor desconocido';
    
    const key = `${providerType}_${providerName}`;
    if (!acc[key]) {
      acc[key] = {
        type: providerType,
        name: providerName,
        items: []
      };
    }
    acc[key].items.push(item);
    return acc;
  }, {});

  return (
    <View style={styles.container}>
      {/* Header del vehículo */}
      <TouchableOpacity 
        style={styles.vehicleHeader}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.vehicleIcon}>
          <Ionicons name="car" size={24} color={COLORS.primary} />
        </View>
        
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleName}>
            {vehicleInfo.marca_nombre} {vehicleInfo.modelo_nombre}
          </Text>
          <View style={styles.vehicleDetails}>
            {vehicleInfo.patente && (
              <View style={styles.plateContainer}>
                <Ionicons name="card-outline" size={14} color={COLORS.textLight} />
                <Text style={styles.plateText}>{vehicleInfo.patente}</Text>
              </View>
            )}
            <View style={styles.servicesCount}>
              <Ionicons name="construct-outline" size={14} color={COLORS.textLight} />
              <Text style={styles.countText}>
                {vehicleGroup.items.length} servicio{vehicleGroup.items.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.rightSection}>
          <Text style={styles.totalPrice}>
            {formatCurrency(vehicleTotal)}
          </Text>
          
          <Animated.View
            style={[
              styles.expandIcon,
              {
                transform: [{
                  rotate: animatedRotation.interpolate({
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

      {/* Contenido expandido - Lista de servicios */}
      <Animated.View
        style={[
          styles.expandedContent,
          {
            opacity: animatedHeight,
            maxHeight: animatedHeight.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 2000]
            })
          }
        ]}
      >
        <View style={styles.servicesContainer}>
          {/* Mostrar servicios agrupados por proveedor si hay múltiples proveedores */}
          {Object.keys(servicesByProvider).length > 1 ? (
            Object.entries(servicesByProvider).map(([key, providerGroup]) => (
              <View key={key} style={styles.providerGroup}>
                <View style={styles.providerHeader}>
                  <Ionicons 
                    name={providerGroup.type === 'taller' ? "business" : "person"} 
                    size={16} 
                    color={COLORS.secondary} 
                  />
                  <Text style={styles.providerName}>
                    {providerGroup.name} ({providerGroup.items.length} servicio{providerGroup.items.length !== 1 ? 's' : ''})
                  </Text>
                </View>
                
                {providerGroup.items.map((item, index) => (
                  <CartItemCard
                    key={item.id || item.cartItemID || index}
                    item={item}
                    onRemove={() => onRemoveItem(item)}
                    showVehicleInfo={false} // No mostrar info del vehículo ya que está en el header
                  />
                ))}
              </View>
            ))
          ) : (
            // Si solo hay un proveedor, mostrar servicios directamente
            vehicleGroup.items.map((item, index) => (
              <CartItemCard
                key={item.id || item.cartItemID || index}
                item={item}
                onRemove={() => onRemoveItem(item)}
                showVehicleInfo={showVehicleInfo}
              />
            ))
          )}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    overflow: 'hidden',
  },
  vehicleHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#F8F9FB',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
  },
  vehicleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  vehicleInfo: {
    flex: 1,
    marginRight: 8,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  vehicleDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  plateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  plateText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 4,
  },
  servicesCount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  countText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  expandIcon: {
    marginTop: 4,
  },
  expandedContent: {
    overflow: 'hidden',
  },
  servicesContainer: {
    padding: 16,
    paddingTop: 0,
  },
  providerGroup: {
    marginBottom: 16,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F0F2F5',
    borderRadius: 8,
    marginBottom: 8,
  },
  providerName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 8,
  },
});

export default VehicleCartAccordion; 