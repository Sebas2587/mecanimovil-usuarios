import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MapPin, Plus, Star, Trash2, ChevronDown, Navigation } from 'lucide-react-native';
import { ROUTES } from '../../utils/constants';
import * as locationService from '../../services/location';

const AddressSelector = ({ currentAddress, onAddressChange, onAddNewAddress, modalVisible, onModalVisibleChange, glassStyle = false }) => {
  const navigation = useNavigation();
  const [internalModalVisible, setInternalModalVisible] = useState(false);

  const isModalVisible = modalVisible !== undefined ? modalVisible : internalModalVisible;
  const setModalVisibleState = onModalVisibleChange || setInternalModalVisible;
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAddresses();
  }, []);

  useEffect(() => {
    if (isModalVisible) fetchAddresses();
  }, [isModalVisible]);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const data = await locationService.getUserAddresses();
      setAddresses(Array.isArray(data) && data.length > 0 ? data : []);
    } catch (error) {
      console.error('Error al cargar direcciones:', error);
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddressSelect = async (address) => {
    try {
      const active = await locationService.setActiveAddress(address);
      if (onAddressChange) onAddressChange(active || address);
    } catch (e) {
      console.warn('No se pudo establecer dirección activa, usando selección local:', e);
      if (onAddressChange) onAddressChange(address);
    } finally {
      setModalVisibleState(false);
    }
  };

  const handleAddNew = () => {
    setModalVisibleState(false);
    setTimeout(() => {
      if (onAddNewAddress) {
        onAddNewAddress();
      } else {
        navigation.navigate(ROUTES.ADD_ADDRESS, {
          onAddressAdded: async (newAddress) => {
            if (newAddress.es_principal || !currentAddress) {
              if (onAddressChange) onAddressChange(newAddress);
            }
            await fetchAddresses();
          }
        });
      }
    }, 100);
  };

  const handleOpenModal = () => setModalVisibleState(true);

  const handleSetMainAddress = async (addressId) => {
    try {
      setLoading(true);
      const main = await locationService.setMainAddress(addressId);
      const updated = (addresses || []).map(a => ({ ...a, es_principal: a.id === (main?.id || addressId) }));
      setAddresses(updated);
      const mainAddress = main || updated.find(addr => addr.id === addressId) || null;
      if (mainAddress && onAddressChange) onAddressChange(mainAddress);
    } catch (error) {
      console.warn('Aviso al establecer principal:', error?.message || error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAddress = async (addressId) => {
    const performDelete = async () => {
      try {
        setLoading(true);
        await locationService.deleteAddress(addressId);
        await fetchAddresses();
        if (currentAddress && currentAddress.id === addressId) {
          const mainAddress = await locationService.getMainAddress();
          if (onAddressChange) onAddressChange(mainAddress);
        }
      } catch (error) {
        console.error('Error al eliminar la dirección:', error);
        Alert.alert('Error', 'No se pudo eliminar la dirección');
      } finally {
        setLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('¿Estás seguro de que quieres eliminar esta dirección?')) {
        await performDelete();
      }
    } else {
      Alert.alert(
        'Eliminar dirección',
        '¿Estás seguro de que quieres eliminar esta dirección?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: performDelete }
        ]
      );
    }
  };

  const renderAddressCard = ({ item }) => {
    const isSelected = currentAddress?.id === item.id;

    return (
      <TouchableOpacity
        style={[styles.addressCard, isSelected && styles.addressCardSelected]}
        onPress={() => handleAddressSelect(item)}
        activeOpacity={0.7}
      >
        {Platform.OS === 'ios' && (
          <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
        )}
        <View style={styles.addressCardContent}>
          <View style={[styles.addressIconWrap, isSelected && styles.addressIconWrapSelected]}>
            {item.es_principal ? (
              <Star size={18} color={isSelected ? '#6EE7B7' : '#FBBF24'} />
            ) : (
              <MapPin size={18} color={isSelected ? '#6EE7B7' : 'rgba(255,255,255,0.5)'} />
            )}
          </View>

          <View style={styles.addressTextContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.addressLabel, isSelected && styles.addressLabelSelected]}>
                {item.etiqueta || 'Dirección'}
              </Text>
              {item.es_principal && (
                <View style={styles.principalBadge}>
                  <Text style={styles.principalBadgeText}>Principal</Text>
                </View>
              )}
            </View>
            <Text style={styles.addressText} numberOfLines={2}>{item.direccion}</Text>
          </View>

          <View style={styles.addressActions}>
            {!item.es_principal && (
              <TouchableOpacity onPress={() => handleSetMainAddress(item.id)} style={styles.actionBtn} activeOpacity={0.7}>
                <Star size={16} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => handleDeleteAddress(item.id)} style={[styles.actionBtn, styles.deleteBtn]} activeOpacity={0.7}>
              <Trash2 size={14} color="#F87171" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      {/* Trigger Button */}
      <TouchableOpacity style={styles.trigger} onPress={handleOpenModal} activeOpacity={0.7}>
        {Platform.OS === 'ios' && (
          <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
        )}
        <View style={styles.triggerContent}>
          <View style={styles.triggerIconWrap}>
            <Navigation size={16} color={currentAddress ? '#6EE7B7' : 'rgba(255,255,255,0.5)'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.triggerLabel}>Ubicación</Text>
            <Text style={styles.triggerAddress} numberOfLines={1}>
              {currentAddress ? currentAddress.direccion : 'Toca para elegir una dirección'}
            </Text>
          </View>
          <ChevronDown size={16} color="rgba(255,255,255,0.4)" />
        </View>
      </TouchableOpacity>

      {/* Modal Mis Direcciones */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisibleState(false)}
      >
        <View style={styles.modalContainer}>
          <StatusBar barStyle="light-content" />
          <LinearGradient colors={['#030712', '#0a1628', '#030712']} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
            <View style={{ position: 'absolute', top: -60, right: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(16,185,129,0.08)' }} />
            <View style={{ position: 'absolute', bottom: 100, left: -60, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(99,102,241,0.06)' }} />
          </View>

          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisibleState(false)} style={styles.modalCloseBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MapPin size={16} color="#6EE7B7" />
              <Text style={styles.modalTitle}>Mis Direcciones</Text>
            </View>
            <TouchableOpacity onPress={handleAddNew} style={styles.modalAddBtn} activeOpacity={0.7}>
              <Plus size={20} color="#93C5FD" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.modalContent}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6EE7B7" />
                <Text style={styles.loadingText}>Cargando direcciones...</Text>
              </View>
            ) : addresses.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconWrap}>
                  <MapPin size={40} color="rgba(255,255,255,0.2)" />
                </View>
                <Text style={styles.emptyTitle}>No tienes direcciones guardadas</Text>
                <Text style={styles.emptySubtitle}>Agrega tu primera dirección para comenzar</Text>
                <TouchableOpacity onPress={handleAddNew} style={styles.emptyButton} activeOpacity={0.8}>
                  <LinearGradient colors={['#007EA7', '#00A8E8']} style={styles.emptyButtonGradient}>
                    <Plus size={18} color="#FFF" />
                    <Text style={styles.emptyButtonText}>Agregar Dirección</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={addresses}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderAddressCard}
                contentContainerStyle={styles.addressList}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  // ── Trigger Button ──
  trigger: {
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.10)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  triggerIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(16,185,129,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  triggerLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  triggerAddress: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '600',
  },

  // ── Modal ──
  modalContainer: {
    flex: 1,
    backgroundColor: '#030712',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: Platform.OS === 'ios' ? 56 : 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  modalCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
  },
  modalAddBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(96,165,250,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // ── Address Cards ──
  addressList: {
    paddingBottom: 30,
    gap: 10,
  },
  addressCard: {
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  addressCardSelected: {
    borderColor: 'rgba(16,185,129,0.4)',
    backgroundColor: Platform.OS === 'ios' ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.10)',
  },
  addressCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  addressIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressIconWrapSelected: {
    backgroundColor: 'rgba(16,185,129,0.12)',
  },
  addressTextContainer: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 3,
  },
  addressLabelSelected: {
    color: '#6EE7B7',
  },
  addressText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 18,
  },
  principalBadge: {
    backgroundColor: 'rgba(251,191,36,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
  },
  principalBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FBBF24',
  },
  addressActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  deleteBtn: {
    backgroundColor: 'rgba(248,113,113,0.08)',
    borderColor: 'rgba(248,113,113,0.2)',
  },

  // ── Loading / Empty ──
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  emptyButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default AddressSelector;
