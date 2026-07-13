import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Alert
} from 'react-native';
import Icon from '../base/Icon/Icon';
import { COLORS } from '../../design-system/tokens';
import * as vehicleService from '../../services/vehicle';

const VehicleSelectionModal = ({ 
  visible, 
  onClose, 
  onVehicleSelected,
  servicio,
  proveedor,
  type // 'taller' o 'mecanico'
}) => {
  const [userVehicles, setUserVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  // Colores temáticos según el tipo de proveedor
  const themeColors = {
    primary: type === 'taller' ? COLORS.primary[500] : COLORS.secondary[500],
    secondary: type === 'taller' ? COLORS.secondary[500] : COLORS.primary[500],
    light: type === 'taller' ? COLORS.primary[50] : COLORS.warning[100]
  };

  useEffect(() => {
    if (visible) {
      loadUserVehicles();
    }
  }, [visible]);

  // Validación de seguridad: no renderizar si no hay datos necesarios
  if (!visible || !servicio || !proveedor) {
    return null;
  }

  const loadUserVehicles = async () => {
    try {
      setLoading(true);
      console.log('🚗 Cargando vehículos del usuario...');
      
      const vehicles = await vehicleService.getUserVehicles();
      console.log('✅ Vehículos cargados:', vehicles);
      
      // Filtrar vehículos compatibles con el proveedor si es necesario
      const compatibleVehicles = filterCompatibleVehicles(vehicles);
      setUserVehicles(compatibleVehicles);
      
    } catch (error) {
      console.error('❌ Error cargando vehículos:', error);
      Alert.alert('Error', 'No se pudieron cargar tus vehículos');
      setUserVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  const filterCompatibleVehicles = (vehicles) => {
    console.log('🚗 Iniciando filtrado de vehículos compatibles');
    console.log('🚗 Servicio seleccionado:', servicio?.nombre);
    console.log('🚗 Total vehículos del usuario:', vehicles.length);
    
    // Si el servicio tiene modelos compatibles específicos, usarlos para filtrar
    if (servicio?.modelos_compatibles && servicio.modelos_compatibles.length > 0) {
      console.log('🚗 Modelos compatibles del servicio:', servicio.modelos_compatibles);
      
      const compatibleVehicles = vehicles.filter(vehicle => {
        const vehicleMarca = vehicle.marca_nombre || vehicle.marca;
        const vehicleModelo = vehicle.modelo_nombre || vehicle.modelo;
        const vehicleComplete = `${vehicleMarca} ${vehicleModelo}`;
        
        const isCompatible = servicio.modelos_compatibles.some(modeloCompatible => {
          // Buscar coincidencias exactas o parciales
          const match = vehicleComplete.toLowerCase().includes(modeloCompatible.toLowerCase()) ||
                       modeloCompatible.toLowerCase().includes(vehicleComplete.toLowerCase()) ||
                       modeloCompatible.toLowerCase().includes(vehicleMarca.toLowerCase());
          
          if (match) {
            console.log(`✅ Vehículo compatible encontrado: ${vehicleComplete} ↔ ${modeloCompatible}`);
          }
          
          return match;
        });
        
        return isCompatible;
      });

      console.log('🔍 Vehículos compatibles con el servicio:', compatibleVehicles.length);
      
      if (compatibleVehicles.length > 0) {
        return compatibleVehicles;
      } else {
        console.log('⚠️ No hay vehículos compatibles específicos para este servicio');
        // Continuar con el filtrado por especialidades del proveedor
      }
    }

    // Fallback: Si no hay especialidades de vehículos del proveedor, mostrar todos
    if (!proveedor.especialidades_modelos || proveedor.especialidades_modelos.length === 0) {
      console.log('🚗 Proveedor sin especialidades específicas, mostrando todos los vehículos');
      return vehicles;
    }

    // Filtrar vehículos que coincidan con las especialidades del proveedor
    const compatibleVehicles = vehicles.filter(vehicle => {
      const vehicleMarca = vehicle.marca_nombre || vehicle.marca;
      const vehicleModelo = vehicle.modelo_nombre || vehicle.modelo;
      const vehicleComplete = `${vehicleMarca} ${vehicleModelo}`;
      
      const isCompatible = proveedor.especialidades_modelos.some(especialidad => 
        especialidad.includes(vehicleComplete) || 
        especialidad.includes(vehicleMarca) ||
        vehicleComplete.includes(especialidad)
      );
      
      if (isCompatible) {
        console.log(`✅ Vehículo compatible con proveedor: ${vehicleMarca} ${vehicleModelo}`);
      }
      
      return isCompatible;
    });

    console.log('🔍 Vehículos compatibles con proveedor encontrados:', compatibleVehicles.length);
    
    // Si no hay vehículos compatibles, mostrar todos con una advertencia
    if (compatibleVehicles.length === 0) {
      console.log('⚠️ No hay vehículos compatibles específicos, mostrando todos');
      return vehicles;
    }
    
    return compatibleVehicles;
  };

  const handleVehicleSelect = (vehicle) => {
    setSelectedVehicle(vehicle);
  };

  const handleContinue = () => {
    if (!selectedVehicle) {
      Alert.alert('Selecciona un vehículo', 'Por favor selecciona el vehículo para el cual necesitas el servicio');
      return;
    }

    console.log('✅ Vehículo seleccionado para agendamiento:', {
      vehiculo: `${selectedVehicle.marca_nombre} ${selectedVehicle.modelo_nombre}`,
      servicio: servicio?.nombre || 'Servicio desconocido',
      proveedor: proveedor?.nombre || 'Proveedor desconocido'
    });

    // ✅ DEBUG: Verificar si el vehículo contiene datos de ubicación
    console.log('🔍 DEBUG VEHÍCULO COMPLETO:', selectedVehicle);
    console.log('🔍 DEBUG VEHÍCULO KEYS:', Object.keys(selectedVehicle));
    
    // ✅ VALIDACIÓN DEFENSIVA: Verificar si el vehículo contiene coordenadas
    if (selectedVehicle.type && selectedVehicle.coordinates) {
      console.error('❌ VEHÍCULO CONTIENE DATOS DE UBICACIÓN:', selectedVehicle);
      Alert.alert('Error', 'Error en los datos del vehículo. Por favor, intenta nuevamente.');
      return;
    }

    // ✅ LIMPIAR VEHÍCULO: Asegurar que solo se pasen datos primitivos
    const vehiculoLimpio = {
      id: selectedVehicle.id,
      marca: selectedVehicle.marca,
      marca_nombre: selectedVehicle.marca_nombre,
      modelo: selectedVehicle.modelo,
      modelo_nombre: selectedVehicle.modelo_nombre,
      año: selectedVehicle.año || selectedVehicle.year,
      tipo_motor: selectedVehicle.tipo_motor,
      kilometraje: selectedVehicle.kilometraje,
      numero_motor: selectedVehicle.numero_motor,
      numero_chasis: selectedVehicle.numero_chasis,
      patente: selectedVehicle.patente,
      color: selectedVehicle.color,
      cliente: selectedVehicle.cliente
    };

    console.log('✅ Vehículo limpio para navegación:', vehiculoLimpio);
    onVehicleSelected(vehiculoLimpio);
    onClose();
  };

  const handleClose = () => {
    setSelectedVehicle(null);
    onClose();
  };

  const renderVehicleCard = (vehicle, index) => {
    const isSelected = selectedVehicle?.id === vehicle.id;
    
    return (
      <TouchableOpacity
        key={vehicle.id || index}
        style={[
          styles.vehicleCard,
          isSelected && [styles.vehicleCardSelected, { borderColor: themeColors.primary }]
        ]}
        onPress={() => handleVehicleSelect(vehicle)}
        activeOpacity={0.8}
      >
        <View style={styles.vehicleCardContent}>
          <View style={[
            styles.vehicleIcon,
            { backgroundColor: isSelected ? themeColors.primary : themeColors.light }
          ]}>
            <Icon 
              name="car" 
              size={24} 
              color={isSelected ? COLORS.text.inverse : themeColors.primary} 
            />
          </View>
          
          <View style={styles.vehicleInfo}>
            <Text style={[
              styles.vehicleName,
              isSelected && { color: themeColors.primary }
            ]}>
              {vehicle.marca_nombre || vehicle.marca} {vehicle.modelo_nombre || vehicle.modelo}
            </Text>
            <Text style={styles.vehicleDetails}>
              {vehicle.year || 'Año no especificado'} • {vehicle.color || 'Color no especificado'}
            </Text>
            {vehicle.placa && (
              <Text style={styles.vehiclePlate}>Placa: {vehicle.placa}</Text>
            )}
          </View>

          {isSelected && (
            <View style={[styles.checkIcon, { backgroundColor: themeColors.primary }]}>
              <Icon name="checkmark" size={16} color={COLORS.text.inverse} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={COLORS.text.secondary} />
            </TouchableOpacity>
            
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Seleccionar Vehículo</Text>
              <Text style={styles.headerSubtitle}>
                Para: {servicio?.nombre || 'Servicio'}
              </Text>
            </View>
            
            <View style={styles.headerSpacer} />
          </View>
        </View>

        {/* Información del servicio */}
        <View style={[styles.serviceInfo, { backgroundColor: themeColors.light }]}>
          <View style={styles.serviceInfoContent}>
            <View style={[styles.serviceIcon, { backgroundColor: themeColors.primary }]}>
              <Icon name="construct" size={20} color={COLORS.text.inverse} />
            </View>
            <View style={styles.serviceDetails}>
              <Text style={styles.serviceName}>{servicio?.nombre || 'Servicio'}</Text>
              <Text style={styles.providerInfo}>
                {proveedor?.nombre || 'Proveedor'} • {type === 'taller' ? 'Taller' : 'A domicilio'}
              </Text>
            </View>
          </View>
        </View>

        {/* Contenido principal */}
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={themeColors.primary} />
              <Text style={styles.loadingText}>Cargando tus vehículos...</Text>
            </View>
          ) : userVehicles.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="car-outline" size={60} color={COLORS.text.secondary} />
              <Text style={styles.emptyTitle}>No tienes vehículos registrados</Text>
              <Text style={styles.emptyText}>
                Para agendar servicios, necesitas tener al menos un vehículo registrado en tu perfil.
              </Text>
              <TouchableOpacity 
                style={[styles.addVehicleButton, { backgroundColor: themeColors.primary }]}
                onPress={() => {
                  // TODO: Navegar a agregar vehículo
                  Alert.alert('Próximamente', 'La función de agregar vehículo estará disponible pronto');
                }}
              >
                <Icon name="add" size={20} color={COLORS.text.inverse} />
                <Text style={styles.addVehicleText}>Agregar Vehículo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>
                Selecciona el vehículo para este servicio
              </Text>
              
              {servicio?.modelos_compatibles && servicio.modelos_compatibles.length > 0 && (
                <View style={styles.compatibilityInfo}>
                  <Icon name="information-circle" size={16} color={themeColors.primary} />
                  <Text style={[styles.compatibilityText, { color: themeColors.primary }]}>
                    Solo se muestran vehículos compatibles con este servicio
                  </Text>
                </View>
              )}
              
              <ScrollView 
                style={styles.vehiclesList}
                showsVerticalScrollIndicator={false}
              >
                {userVehicles.map(renderVehicleCard)}
              </ScrollView>
            </>
          )}
        </View>

        {/* Footer con botones */}
        {userVehicles.length > 0 && (
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={handleClose}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.continueButton,
                { 
                  backgroundColor: selectedVehicle ? themeColors.primary : COLORS.neutral.gray[200]
                }
              ]}
              onPress={handleContinue}
              disabled={!selectedVehicle}
            >
              <Icon 
                name="calendar" 
                size={18} 
                color={selectedVehicle ? COLORS.text.inverse : COLORS.text.tertiary}
              />
              <Text style={[
                styles.continueButtonText,
                { color: selectedVehicle ? COLORS.text.inverse : COLORS.text.tertiary }
              ]}>
                Continuar Agendamiento
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  header: {
    backgroundColor: COLORS.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  closeButton: {
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  headerSpacer: {
    width: 32, // Mismo ancho que el botón de cerrar para centrar el título
  },
  serviceInfo: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  serviceInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceDetails: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  providerInfo: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  vehiclesList: {
    flex: 1,
  },
  vehicleCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.border.light,
    shadowColor: COLORS.base.inkBlack,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  vehicleCardSelected: {
    borderWidth: 2,
    backgroundColor: COLORS.background.default,
  },
  vehicleCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  vehicleDetails: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  vehiclePlate: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  addVehicleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  addVehicleText: {
    color: COLORS.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: COLORS.background.paper,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  continueButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  compatibilityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  compatibilityText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginLeft: 8,
  },
});

export default VehicleSelectionModal; 