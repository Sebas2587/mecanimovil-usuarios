import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Plus, Star, Trash2, ChevronDown, Navigation, X } from 'lucide-react-native';
import * as locationService from '../../services/location';
import AddressSelectionModal from '../location/AddressSelectionModal';
import { showAlert, showConfirm } from '../../utils/platformAlert';
import { COLORS, withOpacity } from '../../design-system/tokens/colors';
import { BORDERS } from '../../design-system/tokens/borders';
import { SHADOWS } from '../../design-system/tokens/shadows';

const AddressRow = React.memo(function AddressRow({
  item,
  isSelected,
  onSelect,
  onSetMain,
  onDelete,
}) {
  return (
    <View style={[styles.addressCard, isSelected && styles.addressCardSelected]}>
      <TouchableOpacity
        style={styles.addressCardMain}
        onPress={() => onSelect(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.addressIconWrap, isSelected && styles.addressIconWrapSelected]}>
          {item.es_principal ? (
            <Star
              size={18}
              color={isSelected ? COLORS.primary[600] : COLORS.warning[600]}
              fill={COLORS.warning[500]}
            />
          ) : (
            <MapPin size={18} color={isSelected ? COLORS.primary[600] : COLORS.text.tertiary} />
          )}
        </View>

        <View style={styles.addressTextContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={[styles.addressLabel, isSelected && styles.addressLabelSelected]}>
              {item.etiqueta || 'Dirección'}
            </Text>
            {item.es_principal && (
              <View style={styles.principalBadge}>
                <Text style={styles.principalBadgeText}>Principal</Text>
              </View>
            )}
          </View>
          <Text style={styles.addressText} numberOfLines={2}>
            {item.direccion}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.addressActions}>
        {!item.es_principal && (
          <TouchableOpacity onPress={() => onSetMain(item.id)} style={styles.actionBtn} activeOpacity={0.7}>
            <Star size={16} color={COLORS.text.tertiary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => onDelete(item.id)}
          style={[styles.actionBtn, styles.deleteBtn]}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Eliminar dirección ${item.etiqueta || ''}`}
        >
          <Trash2 size={14} color={COLORS.error[500]} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

/**
 * Selector de dirección alineado al design system (OpenSpec design-system-coinbase-usuarios):
 * canvas claro, hairlines, primario del design system, CTAs sólidos tipo píldora.
 * `glassStyle` se mantiene por compatibilidad con el formulario de solicitud (ubicación).
 */
const AddressSelector = ({
  currentAddress,
  onAddressChange,
  onAddNewAddress,
  modalVisible,
  onModalVisibleChange,
  glassStyle = true,
  autoSelectPrincipal = false,
}) => {
  const insets = useSafeAreaInsets();
  const didAutoSelectRef = useRef(false);
  const [internalModalVisible, setInternalModalVisible] = useState(false);

  const isModalVisible = modalVisible !== undefined ? modalVisible : internalModalVisible;
  const setModalVisibleState = onModalVisibleChange || setInternalModalVisible;
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addressPickerVisible, setAddressPickerVisible] = useState(false);

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

  useEffect(() => {
    if (!autoSelectPrincipal || currentAddress || didAutoSelectRef.current || !onAddressChange) return;
    if (!addresses.length) return;

    const principal = addresses.find((a) => a.es_principal) || addresses[0];
    if (!principal) return;

    didAutoSelectRef.current = true;
    (async () => {
      try {
        const active = await locationService.setActiveAddress(principal);
        onAddressChange(active || principal);
      } catch (e) {
        console.warn('No se pudo establecer dirección principal automática:', e);
        onAddressChange(principal);
      }
    })();
  }, [autoSelectPrincipal, addresses, currentAddress, onAddressChange]);

  const handleAddressSelect = useCallback(
    async (address) => {
      try {
        const active = await locationService.setActiveAddress(address);
        if (onAddressChange) onAddressChange(active || address);
      } catch (e) {
        console.warn('No se pudo establecer dirección activa, usando selección local:', e);
        if (onAddressChange) onAddressChange(address);
      } finally {
        setModalVisibleState(false);
      }
    },
    [onAddressChange, setModalVisibleState]
  );

  const handleAddNew = () => {
    setModalVisibleState(false);
    setTimeout(() => {
      if (onAddNewAddress) {
        onAddNewAddress();
      } else {
        setAddressPickerVisible(true);
      }
    }, 120);
  };

  const handlePickerSelect = async (address) => {
    try {
      const active = await locationService.setActiveAddress(address);
      if (onAddressChange) onAddressChange(active || address);
    } catch (e) {
      if (onAddressChange) onAddressChange(address);
    }
    await fetchAddresses();
    setAddressPickerVisible(false);
  };

  const handleOpenModal = () => setModalVisibleState(true);

  const handleSetMainAddress = useCallback(
    async (addressId) => {
      try {
        setLoading(true);
        const main = await locationService.setMainAddress(addressId);
        setAddresses((prev) => {
          const list = prev || [];
          return list.map(a => ({ ...a, es_principal: a.id === (main?.id || addressId) }));
        });
        const mainAddress = main || (await locationService.getUserAddresses())?.find((a) => a.id === addressId) || null;
        if (mainAddress && onAddressChange) onAddressChange(mainAddress);
      } catch (error) {
        console.warn('Aviso al establecer principal:', error?.message || error);
      } finally {
        setLoading(false);
      }
    },
    [onAddressChange]
  );

  const handleDeleteAddress = useCallback(
    async (addressId) => {
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

      showConfirm(
        'Eliminar dirección',
        '¿Estás seguro de que quieres eliminar esta dirección?',
        { confirmText: 'Eliminar', onConfirm: performDelete },
      );
    },
    [currentAddress, onAddressChange, fetchAddresses]
  );

  const headerTopPad = useMemo(() => Math.max(insets.top, Platform.OS === 'ios' ? 12 : 8), [insets.top]);

  const useInstitutional = true;
  const pickerVariant = 'default';

  const renderAddressRow = useCallback(
    ({ item }) => {
      const Row = useInstitutional ? AddressRow : AddressRowLegacy;
      return (
        <Row
          item={item}
          isSelected={currentAddress?.id === item.id}
          onSelect={handleAddressSelect}
          onSetMain={handleSetMainAddress}
          onDelete={handleDeleteAddress}
        />
      );
    },
    [
      useInstitutional,
      currentAddress?.id,
      handleAddressSelect,
      handleSetMainAddress,
      handleDeleteAddress,
    ]
  );

  return (
    <>
      <TouchableOpacity
        style={useInstitutional ? styles.trigger : styles.triggerLegacy}
        onPress={handleOpenModal}
        activeOpacity={0.7}
      >
        <View style={useInstitutional ? styles.triggerContent : styles.triggerContentLegacy}>
          <View style={useInstitutional ? styles.triggerIconWrap : styles.triggerIconWrapLegacy}>
            <Navigation size={18} color={currentAddress ? COLORS.primary[500] : COLORS.text.tertiary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={useInstitutional ? styles.triggerLabel : styles.triggerLabelLegacy}>Ubicación</Text>
            <Text style={useInstitutional ? styles.triggerAddress : styles.triggerAddressLegacy} numberOfLines={2}>
              {currentAddress ? currentAddress.direccion : 'Toca para elegir una dirección'}
            </Text>
          </View>
          <ChevronDown size={18} color={useInstitutional ? COLORS.text.tertiary : withOpacity(COLORS.base.white, 0.4)} />
        </View>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisibleState(false)}
      >
        <View style={useInstitutional ? styles.modalContainer : styles.modalContainerLegacy}>
          <StatusBar barStyle={useInstitutional ? 'dark-content' : 'light-content'} />
          <View style={[useInstitutional ? styles.modalHeader : styles.modalHeaderLegacy, { paddingTop: headerTopPad }]}>
            <TouchableOpacity
              onPress={() => setModalVisibleState(false)}
              style={useInstitutional ? styles.modalCloseBtn : styles.modalCloseBtnLegacy}
              activeOpacity={0.7}
            >
              <X size={22} color={useInstitutional ? COLORS.text.secondary : withOpacity(COLORS.base.white, 0.85)} />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MapPin size={18} color={useInstitutional ? COLORS.primary[500] : COLORS.success[300]} />
              <Text style={useInstitutional ? styles.modalTitle : styles.modalTitleLegacy}>Mis direcciones</Text>
            </View>
            <TouchableOpacity
              onPress={handleAddNew}
              style={useInstitutional ? styles.modalAddBtn : styles.modalAddBtnLegacy}
              activeOpacity={0.7}
            >
              <Plus size={20} color={useInstitutional ? COLORS.primary[500] : COLORS.primary[200]} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={useInstitutional ? COLORS.primary[500] : COLORS.success[300]} />
                <Text style={useInstitutional ? styles.loadingText : styles.loadingTextLegacy}>Cargando direcciones...</Text>
              </View>
            ) : addresses.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={useInstitutional ? styles.emptyIconWrap : styles.emptyIconWrapLegacy}>
                  <MapPin size={40} color={useInstitutional ? COLORS.neutral.gray[300] : withOpacity(COLORS.base.white, 0.2)} />
                </View>
                <Text style={useInstitutional ? styles.emptyTitle : styles.emptyTitleLegacy}>No tienes direcciones guardadas</Text>
                <Text style={useInstitutional ? styles.emptySubtitle : styles.emptySubtitleLegacy}>
                  Agrega tu primera dirección para comenzar
                </Text>
                <TouchableOpacity onPress={handleAddNew} style={styles.emptyButton} activeOpacity={0.85}>
                  <View style={useInstitutional ? styles.emptyButtonSolid : styles.emptyButtonGradientLegacy}>
                    <Plus size={18} color={COLORS.text.inverse} />
                    <Text style={styles.emptyButtonText}>Agregar dirección</Text>
                  </View>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={addresses}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderAddressRow}
                contentContainerStyle={styles.addressList}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </Modal>

      <AddressSelectionModal
        visible={addressPickerVisible}
        onClose={() => setAddressPickerVisible(false)}
        onSelectAddress={handlePickerSelect}
        currentAddress={currentAddress}
        variant={pickerVariant}
        heroSubtitle="Usa tu ubicación para guardar una dirección y usarla en tu solicitud."
      />
    </>
  );
};

/** Fila con estética oscura (solo si `glassStyle={false}`). */
const AddressRowLegacy = React.memo(function AddressRowLegacy({
  item,
  isSelected,
  onSelect,
  onSetMain,
  onDelete,
}) {
  return (
    <TouchableOpacity
      style={[styles.legacyAddressCard, isSelected && styles.legacyAddressCardSelected]}
      onPress={() => onSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.addressCardContent}>
        <View style={[styles.legacyIconWrap, isSelected && styles.legacyIconWrapSelected]}>
          {item.es_principal ? (
            <Star size={18} color={isSelected ? COLORS.success[300] : COLORS.warning[400]} fill={COLORS.warning[400]} />
          ) : (
            <MapPin size={18} color={isSelected ? COLORS.success[300] : withOpacity(COLORS.base.white, 0.5)} />
          )}
        </View>
        <View style={styles.addressTextContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={[styles.legacyAddressLabel, isSelected && styles.legacyAddressLabelSelected]}>
              {item.etiqueta || 'Dirección'}
            </Text>
            {item.es_principal && (
              <View style={styles.legacyPrincipalBadge}>
                <Text style={styles.legacyPrincipalBadgeText}>Principal</Text>
              </View>
            )}
          </View>
          <Text style={styles.legacyAddressText} numberOfLines={2}>
            {item.direccion}
          </Text>
        </View>
        <View style={styles.addressActions}>
          {!item.es_principal && (
            <TouchableOpacity onPress={() => onSetMain(item.id)} style={styles.legacyActionBtn} activeOpacity={0.7}>
              <Star size={16} color={withOpacity(COLORS.base.white, 0.4)} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => onDelete(item.id)}
            style={[styles.legacyActionBtn, styles.legacyDeleteBtn]}
            activeOpacity={0.7}
          >
            <Trash2 size={14} color={COLORS.error[400]} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  trigger: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  triggerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  triggerLabel: {
    fontSize: 11,
    color: COLORS.text.tertiary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  triggerAddress: {
    fontSize: 15,
    color: COLORS.text.primary,
    fontWeight: '600',
    lineHeight: 20,
  },

  triggerLegacy: {
    backgroundColor: Platform.OS === 'ios' ? withOpacity(COLORS.base.white, 0.06) : withOpacity(COLORS.base.white, 0.10),
    borderRadius: 14,
    borderWidth: 1,
    borderColor: withOpacity(COLORS.base.white, 0.12),
    overflow: 'hidden',
  },
  triggerContentLegacy: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  triggerIconWrapLegacy: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: withOpacity(COLORS.success[500], 0.12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  triggerLabelLegacy: {
    fontSize: 10,
    color: withOpacity(COLORS.base.white, 0.4),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  triggerAddressLegacy: {
    fontSize: 14,
    color: COLORS.text.inverse,
    fontWeight: '600',
  },

  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: 0.2,
  },
  modalAddBtn: {
    width: 40,
    height: 40,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.primary[50],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.primary[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  modalContainerLegacy: {
    flex: 1,
    backgroundColor: COLORS.neutral.gray[900],
  },
  modalHeaderLegacy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: withOpacity(COLORS.base.white, 0.06),
  },
  modalCloseBtnLegacy: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: withOpacity(COLORS.base.white, 0.06),
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitleLegacy: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text.inverse,
  },
  modalAddBtnLegacy: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: withOpacity(COLORS.primary[300], 0.12),
    justifyContent: 'center',
    alignItems: 'center',
  },

  addressList: {
    paddingBottom: 32,
    gap: 10,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  addressCardSelected: {
    borderColor: COLORS.primary[400],
    backgroundColor: COLORS.primary[50],
  },
  addressCardMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  addressCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  addressIconWrap: {
    width: 44,
    height: 44,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.neutral.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressIconWrapSelected: {
    backgroundColor: COLORS.primary[100],
  },
  addressTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  addressLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  addressLabelSelected: {
    color: COLORS.primary[700],
  },
  addressText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
  principalBadge: {
    backgroundColor: COLORS.warning[50],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BORDERS.radius.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.warning[200],
  },
  principalBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.warning[700],
  },
  addressActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.neutral.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  deleteBtn: {
    backgroundColor: COLORS.error[50],
    borderColor: COLORS.error[200],
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },

  legacyAddressCard: {
    backgroundColor: Platform.OS === 'ios' ? withOpacity(COLORS.base.white, 0.06) : withOpacity(COLORS.base.white, 0.10),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: withOpacity(COLORS.base.white, 0.10),
    overflow: 'hidden',
  },
  legacyAddressCardSelected: {
    borderColor: withOpacity(COLORS.success[500], 0.4),
    backgroundColor: Platform.OS === 'ios' ? withOpacity(COLORS.success[500], 0.06) : withOpacity(COLORS.success[500], 0.10),
  },
  legacyIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: withOpacity(COLORS.base.white, 0.06),
    justifyContent: 'center',
    alignItems: 'center',
  },
  legacyIconWrapSelected: {
    backgroundColor: withOpacity(COLORS.success[500], 0.12),
  },
  legacyAddressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.inverse,
    marginBottom: 2,
  },
  legacyAddressLabelSelected: {
    color: COLORS.success[300],
  },
  legacyAddressText: {
    fontSize: 13,
    color: withOpacity(COLORS.base.white, 0.45),
    lineHeight: 18,
  },
  legacyPrincipalBadge: {
    backgroundColor: withOpacity(COLORS.warning[400], 0.15),
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: withOpacity(COLORS.warning[400], 0.3),
  },
  legacyPrincipalBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.warning[400],
  },
  legacyActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: withOpacity(COLORS.base.white, 0.06),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: withOpacity(COLORS.base.white, 0.08),
  },
  legacyDeleteBtn: {
    backgroundColor: withOpacity(COLORS.error[400], 0.08),
    borderColor: withOpacity(COLORS.error[400], 0.2),
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 16,
    fontWeight: '500',
  },
  loadingTextLegacy: {
    fontSize: 14,
    color: withOpacity(COLORS.base.white, 0.5),
    marginTop: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: BORDERS.radius.xl,
    backgroundColor: COLORS.neutral.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  emptyIconWrapLegacy: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: withOpacity(COLORS.base.white, 0.04),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyTitleLegacy: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text.inverse,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptySubtitleLegacy: {
    fontSize: 14,
    color: withOpacity(COLORS.base.white, 0.45),
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    borderRadius: BORDERS.radius.md,
    overflow: 'hidden',
    minWidth: 220,
  },
  emptyButtonSolid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.primary[500],
  },
  emptyButtonGradientLegacy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: COLORS.primary[500],
  },
  emptyButtonText: {
    color: COLORS.text.onPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default AddressSelector;
