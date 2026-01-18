import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import * as vehicleService from '../../services/vehicle';
import * as personalizacionService from '../../services/personalizacion';

/**
 * Componente selector de vehículo activo
 * Permite al usuario seleccionar cuál de sus vehículos será el activo
 * para personalizar las recomendaciones
 */
const VehicleSelector = ({ onVehicleChange, currentVehicle }) => {
  const [vehicles, setVehicles] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUserVehicles();
  }, []);

  const fetchUserVehicles = async () => {
    try {
      const userVehicles = await vehicleService.getUserVehicles();
      setVehicles(userVehicles);
    } catch (error) {
      console.error('Error al obtener vehículos:', error);
      Alert.alert('Error', 'No se pudieron cargar tus vehículos');
    }
  };

  const handleVehicleSelect = async (vehicle) => {
    setLoading(true);
    try {
      // Establecer vehículo activo en el backend
      await personalizacionService.setActiveVehicle(vehicle.id);
      
      // Notificar al componente padre
      if (onVehicleChange) {
        onVehicleChange(vehicle);
      }
      
      setModalVisible(false);
      Alert.alert('Éxito', `${vehicle.marca_nombre} ${vehicle.modelo_nombre} seleccionado como vehículo activo`);
    } catch (error) {
      console.error('Error al establecer vehículo activo:', error);
      Alert.alert('Error', 'No se pudo establecer el vehículo activo');
    } finally {
      setLoading(false);
    }
  };

  const renderVehicleItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.vehicleItem,
        currentVehicle?.id === item.id && styles.selectedVehicleItem
      ]}
      onPress={() => handleVehicleSelect(item)}
      disabled={loading}
    >
      <View style={styles.vehicleInfo}>
        <Text style={styles.vehicleName}>
          {item.marca_nombre} {item.modelo_nombre}
        </Text>
        <Text style={styles.vehicleDetails}>
          {item.year} • {item.patente} • {item.kilometraje?.toLocaleString()} km
        </Text>
      </View>
      
      {currentVehicle?.id === item.id && (
        <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
      )}
    </TouchableOpacity>
  );

  if (vehicles.length <= 1) {
    // Si solo hay un vehículo o ninguno, no mostrar selector
    return null;
  }

  return (
    <>
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.selectorContent}>
          <Ionicons name="car-outline" size={20} color={COLORS.primary} />
          <View style={styles.selectorText}>
            <Text style={styles.selectorLabel}>Vehículo activo:</Text>
            <Text style={styles.selectorValue}>
              {currentVehicle 
                ? `${currentVehicle.marca_nombre} ${currentVehicle.modelo_nombre}`
                : 'Seleccionar vehículo'
              }
            </Text>
          </View>
          <Ionicons name="chevron-down" size={16} color={COLORS.textLight} />
        </View>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Vehículo</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Selecciona el vehículo para el cual deseas ver servicios y recomendaciones personalizadas.
            </Text>

            <FlatList
              data={vehicles}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderVehicleItem}
              style={styles.vehicleList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  selectorButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectorText: {
    flex: 1,
    marginLeft: 12,
  },
  selectorLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  selectorValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  modalDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    paddingHorizontal: 20,
    paddingBottom: 16,
    lineHeight: 20,
  },
  vehicleList: {
    paddingHorizontal: 20,
  },
  vehicleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
  },
  selectedVehicleItem: {
    backgroundColor: COLORS.glass.primary,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  vehicleDetails: {
    fontSize: 14,
    color: COLORS.textLight,
  },
});

export default VehicleSelector; 