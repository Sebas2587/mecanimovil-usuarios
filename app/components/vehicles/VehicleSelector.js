import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Alert } from 'react-native';
import { COLORS as DESIGN_COLORS, withOpacity } from '../../design-system/tokens/colors';
import { SHADOWS } from '../../design-system/tokens/shadows';
import * as vehicleService from '../../services/vehicle';
import * as personalizacionService from '../../services/personalizacion';
import Icon from '../base/Icon/Icon';

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
        <Icon name="checkmark-circle" size={24} color={DESIGN_COLORS.primary[500]} />
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
          <Icon name="car-outline" size={20} color={DESIGN_COLORS.primary[500]} />
          <View style={styles.selectorText}>
            <Text style={styles.selectorLabel}>Vehículo activo:</Text>
            <Text style={styles.selectorValue}>
              {currentVehicle 
                ? `${currentVehicle.marca_nombre} ${currentVehicle.modelo_nombre}`
                : 'Seleccionar vehículo'
              }
            </Text>
          </View>
          <Icon name="chevron-down" size={16} color={DESIGN_COLORS.text.secondary} />
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
                <Icon name="close" size={24} color={DESIGN_COLORS.text.primary} />
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
    backgroundColor: withOpacity(DESIGN_COLORS.base.white, 0.9),
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.sm,
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
    color: DESIGN_COLORS.text.secondary,
    marginBottom: 2,
  },
  selectorValue: {
    fontSize: 16,
    fontWeight: '600',
    color: DESIGN_COLORS.text.primary,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: withOpacity(DESIGN_COLORS.base.inkBlack, 0.5),
  },
  modalContent: {
    backgroundColor: DESIGN_COLORS.background.paper,
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
    borderBottomColor: DESIGN_COLORS.border.light,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: DESIGN_COLORS.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  modalDescription: {
    fontSize: 14,
    color: DESIGN_COLORS.text.secondary,
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
    backgroundColor: DESIGN_COLORS.neutral.gray[100],
  },
  selectedVehicleItem: {
    backgroundColor: DESIGN_COLORS.primary[50],
    borderWidth: 2,
    borderColor: DESIGN_COLORS.primary[500],
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: DESIGN_COLORS.text.primary,
    marginBottom: 4,
  },
  vehicleDetails: {
    fontSize: 14,
    color: DESIGN_COLORS.text.secondary,
  },
});

export default VehicleSelector; 