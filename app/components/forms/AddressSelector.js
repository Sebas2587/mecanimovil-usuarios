import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  FlatList,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, ROUTES } from '../../utils/constants';

// Servicios
import * as locationService from '../../services/location';

/**
 * Componente selector de direcci?n
 * @param {Object} props - Propiedades del componente
 * @param {Object} props.currentAddress - Direcci?n actual seleccionada
 * @param {Function} props.onAddressChange - Funci?n a ejecutar cuando cambia la direcci?n
 * @param {Function} props.onAddNewAddress - Funci?n para agregar nueva direcci?n
 * @param {boolean} props.glassStyle - Si es true, aplica estilo glass/transparente con texto blanco
 * @returns {JSX.Element} Componente de selector de direcci?n
 */
const AddressSelector = ({ currentAddress, onAddressChange, onAddNewAddress, modalVisible, onModalVisibleChange, glassStyle = false }) => {
  const navigation = useNavigation();
  const [internalModalVisible, setInternalModalVisible] = useState(false);

  // Usar modalVisible externo si se proporciona, sino usar el interno
  const isModalVisible = modalVisible !== undefined ? modalVisible : internalModalVisible;
  const setModalVisibleState = onModalVisibleChange || setInternalModalVisible;
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar direcciones al iniciar
  useEffect(() => {
    fetchAddresses();
  }, []);

  // Cargar direcciones cuando se abre el modal
  useEffect(() => {
    if (isModalVisible) {
      console.log('Modal abierto, cargando direcciones...');
      fetchAddresses();
    }
  }, [isModalVisible]);

  const fetchAddresses = async () => {
    try {
      console.log('Obteniendo direcciones del usuario...');
      setLoading(true);

      try {
        const data = await locationService.getUserAddresses();
        console.log('Direcciones obtenidas del servicio:', data);
        if (Array.isArray(data) && data.length > 0) {
          setAddresses(data);
        } else {
          console.log('No se encontraron direcciones del servicio');
          setAddresses([]);
        }
      } catch (serviceError) {
        console.log('Error en servicio:', serviceError);
        setAddresses([]);
      }
    } catch (error) {
      console.error('Error al cargar direcciones:', error);
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddressSelect = async (address) => {
    try {
      console.log('Direcci?n seleccionada:', address);
      // Establecer como direcci?n activa (no cambia la principal)
      const active = await locationService.setActiveAddress(address);
      if (onAddressChange) {
        onAddressChange(active || address);
      }
    } catch (e) {
      console.warn('No se pudo establecer direcci?n activa, usando selecci?n local:', e);
      if (onAddressChange) {
        onAddressChange(address);
      }
    } finally {
      setModalVisibleState(false);
    }
  };

  const handleAddNew = () => {
    console.log('Agregando nueva direcci?n...');
    // Cerrar el modal primero
    setModalVisibleState(false);

    // Usar setTimeout para asegurar que el modal se cierre antes de navegar
    setTimeout(() => {
      if (onAddNewAddress) {
        // Si se proporciona callback personalizado, usarlo
        onAddNewAddress();
      } else {
        // Si no hay callback, navegar directamente a la pantalla de agregar direcci?n
        navigation.navigate(ROUTES.ADD_ADDRESS, {
          onAddressAdded: async (newAddress) => {
            console.log('? Nueva direcci?n agregada desde AddressSelector:', newAddress);
            // Actualizar la direcci?n actual si es la principal o no hay direcci?n actual
            if (newAddress.es_principal || !currentAddress) {
              if (onAddressChange) {
                onAddressChange(newAddress);
              }
            }
            // Recargar direcciones en el selector
            await fetchAddresses();
          }
        });
      }
    }, 100);
  };

  const handleOpenModal = () => {
    console.log('Abriendo modal de direcciones...');
    setModalVisibleState(true);
  };

  const handleSetMainAddress = async (addressId) => {
    try {
      setLoading(true);
      const main = await locationService.setMainAddress(addressId);
      // Actualizar lista local sin depender de recarga global
      const updated = (addresses || []).map(a => ({ ...a, es_principal: a.id === (main?.id || addressId) }));
      setAddresses(updated);
      // Notificar cambio inmediato y cerrar modal
      const mainAddress = main || updated.find(addr => addr.id === addressId) || null;
      if (mainAddress && onAddressChange) { onAddressChange(mainAddress); }
    } catch (error) {
      // Silenciar 404 ya que tenemos fallback PATCH en el servicio
      console.warn('Aviso al establecer principal, usando fallback si aplica:', error?.message || error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (Platform.OS === 'web') {
      const confirm = window.confirm('¿Estás seguro de que quieres eliminar esta dirección?');
      if (confirm) {
        try {
          try {
            setLoading(true);
            await locationService.deleteAddress(addressId);
            await fetchAddresses();
          } finally {
            setLoading(false);
          }

          // Si la dirección eliminada era la actual, actualizar a la nueva principal
          if (currentAddress && currentAddress.id === addressId) {
            const mainAddress = await locationService.getMainAddress();
            if (mainAddress && onAddressChange) {
              onAddressChange(mainAddress);
            }
          }
        } catch (error) {
          console.error('Error al eliminar la dirección:', error);
          alert('Error: No se pudo eliminar la dirección');
        }
      }
    } else {
      Alert.alert(
        'Eliminar dirección',
        '¿Estás seguro de que quieres eliminar esta dirección?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: async () => {
              try {
                try {
                  setLoading(true);
                  await locationService.deleteAddress(addressId);
                  await fetchAddresses();
                } finally {
                  setLoading(false);
                }

                // Si la dirección eliminada era la actual, actualizar a la nueva principal
                if (currentAddress && currentAddress.id === addressId) {
                  const mainAddress = await locationService.getMainAddress();
                  if (mainAddress && onAddressChange) {
                    onAddressChange(mainAddress);
                  }
                }
              } catch (error) {
                console.error('Error al eliminar la dirección:', error);
                Alert.alert('Error', 'No se pudo eliminar la dirección');
              }
            }
          }
        ]
      );
    }
  };

  const getIconName = (etiqueta) => {
    switch (etiqueta) {
      case 'Casa': return 'home';
      case 'Trabajo': return 'briefcase';
      default: return 'location';
    }
  };



  // Estilos dinámicos para modo glass
  const dynamicStyles = {
    iconContainer: glassStyle ? {
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
    } : {},
    locationLabel: glassStyle ? {
      color: 'rgba(255, 255, 255, 0.8)',
    } : {},
    addressText: glassStyle ? {
      color: '#FFFFFF',
    } : {},
  };

  return (
    <>
      <TouchableOpacity style={styles.container} onPress={handleOpenModal} activeOpacity={0.7}>
        <View style={styles.content}>
          <View style={[styles.iconContainer, dynamicStyles.iconContainer]}>
            <Ionicons name="location" size={14} color={glassStyle ? '#FFFFFF' : COLORS.primary} />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.locationLabel, dynamicStyles.locationLabel]}>Ubicación</Text>
            <Text style={[styles.addressText, dynamicStyles.addressText]} numberOfLines={1} ellipsizeMode="tail">
              {currentAddress
                ? currentAddress.direccion
                : 'Seleccionar ubicación'}
            </Text>
          </View>
          <View style={styles.chevronContainer}>
            <Ionicons name="chevron-down" size={12} color={glassStyle ? 'rgba(255, 255, 255, 0.8)' : COLORS.textLight} />
          </View>
        </View>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          console.log('Modal cerrado por hardware back button');
          setModalVisibleState(false);
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Header del Modal */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                console.log('Bot?n cerrar presionado');
                setModalVisibleState(false);
              }}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Mis Direcciones</Text>
            <TouchableOpacity
              onPress={handleAddNew}
              style={styles.modalAddButton}
            >
              <Ionicons name="add" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {/* Contenido del Modal */}
          <View style={styles.modalContent}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Cargando direcciones...</Text>
              </View>
            ) : addresses.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Ionicons name="location-outline" size={64} color={COLORS.textLight} />
                <Text style={styles.emptyStateTitle}>No tienes direcciones guardadas</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Agrega tu primera direcci?n para comenzar
                </Text>
                <TouchableOpacity
                  onPress={handleAddNew}
                  style={styles.emptyStateButton}
                >
                  <Text style={styles.emptyStateButtonText}>Agregar Direcci?n</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={addresses}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <View style={styles.addressCard}>
                    <TouchableOpacity
                      style={styles.addressContent}
                      onPress={() => handleAddressSelect(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.addressIconContainer}>
                        <Ionicons
                          name={item.es_principal ? "star" : "location"}
                          size={20}
                          color={item.es_principal ? COLORS.primary : COLORS.textLight}
                        />
                      </View>
                      <View style={styles.addressTextContainer}>
                        <Text style={styles.addressLabel}>{item.etiqueta}</Text>
                        <Text style={styles.addressText} numberOfLines={2}>
                          {item.direccion}
                        </Text>
                        {item.es_principal && (
                          <View style={styles.primaryBadge}>
                            <Text style={styles.primaryBadgeText}>Principal</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.addressActions}>
                        {!item.es_principal && (
                          <TouchableOpacity
                            onPress={() => handleSetMainAddress(item.id)}
                            style={styles.actionButton}
                          >
                            <Ionicons name="star-outline" size={20} color={COLORS.textLight} />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          onPress={() => handleDeleteAddress(item.id)}
                          style={[styles.actionButton, styles.deleteButton]}
                        >
                          <Ionicons name="trash-outline" size={16} color="#FF4444" />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
                contentContainerStyle={styles.addressListContainer}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginVertical: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 10,
    color: COLORS.textLight,
    fontWeight: '500',
    marginBottom: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
    flexShrink: 1,
  },
  chevronContainer: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    flexShrink: 0,
  },
  // Modal de Direcciones - Dise?o Minimalista (igual a UserPanelScreen)
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalAddButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight + '20',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  addressListContainer: {
    paddingBottom: 20,
  },
  addressCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  addressContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  addressIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  addressTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
  },
  primaryBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  primaryBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  addressActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  deleteButton: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FF4444',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 20,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default AddressSelector; 