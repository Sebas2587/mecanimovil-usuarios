import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { Car, X, Check, Plus } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SHADOWS } from '../../../design-system/tokens';
import { formatKm } from '../shared/homeFormatters';
import { resolveVehicleHealthPct } from '../../../utils/healthFormat';

/**
 * Modal inferior para cambiar el vehículo activo del home.
 */
const HomeVehicleSelectorModal = ({
  visible,
  vehicles = [],
  selectedVehicleId,
  vehiclesHealthData = [],
  onClose,
  onSelectVehicle,
  onAddVehicle,
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      <View style={styles.selectorModal}>
        <View style={styles.selectorModalHeader}>
          <Text style={styles.selectorModalTitle}>Seleccionar Vehículo</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Cerrar">
            <X size={22} color={COLORS.text.tertiary} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={vehicles}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingBottom: 16 }}
          renderItem={({ item }) => {
            const isActive = item.id === selectedVehicleId;
            const healthSummary =
              vehiclesHealthData.find((h) => h.vehicleId === item.id)?.health ?? null;
            const healthPct = Math.round(resolveVehicleHealthPct(item, healthSummary));

            return (
              <TouchableOpacity
                style={[styles.selectorListItem, isActive && styles.selectorListItemActive]}
                onPress={() => onSelectVehicle(item.id)}
                activeOpacity={0.7}
              >
                {item.foto ? (
                  <Image source={{ uri: item.foto }} style={styles.selectorListThumb} contentFit="cover" />
                ) : (
                  <View style={[styles.selectorListThumb, styles.selectorThumbFallback]}>
                    <Car size={18} color={COLORS.primary[500]} />
                  </View>
                )}
                <View style={styles.selectorListText}>
                  <Text style={styles.selectorListTitle} numberOfLines={1}>
                    {item.marca_nombre || item.marca || ''} {item.modelo_nombre || item.modelo || ''}
                  </Text>
                  <Text style={styles.selectorListSub}>
                    {item.year || ''} · {formatKm(item.kilometraje)} km · Salud {healthPct}%
                  </Text>
                </View>
                {isActive ? <Check size={18} color={COLORS.success.main} /> : null}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.listEmpty}>
              <Text style={styles.listEmptyText}>No hay vehículos disponibles</Text>
            </View>
          }
        />

        <TouchableOpacity style={styles.selectorAddBtn} onPress={onAddVehicle} activeOpacity={0.85}>
          <Plus size={18} color={COLORS.text.inverse} />
          <Text style={styles.selectorAddText}>Agregar Vehículo</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,11,13,0.45)',
    justifyContent: 'flex-end',
  },
  selectorModal: {
    maxHeight: '70%',
    borderTopLeftRadius: BORDERS.radius.xl,
    borderTopRightRadius: BORDERS.radius.xl,
    overflow: 'hidden',
    backgroundColor: COLORS.background.paper,
    ...SHADOWS.lg,
  },
  selectorModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  selectorModalTitle: {
    fontSize: TYPOGRAPHY.styles.h3.fontSize,
    fontWeight: TYPOGRAPHY.styles.h3.fontWeight,
    letterSpacing: TYPOGRAPHY.styles.h3.letterSpacing,
    color: COLORS.text.primary,
  },
  selectorListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  selectorListItemActive: {
    backgroundColor: COLORS.primary[50],
  },
  selectorListThumb: {
    width: 44,
    height: 44,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.neutral.gray[100],
  },
  selectorThumbFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary[50],
  },
  selectorListText: {
    flex: 1,
    marginLeft: 12,
  },
  selectorListTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  selectorListSub: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  selectorAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
    backgroundColor: COLORS.primary[500],
  },
  selectorAddText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.inverse,
  },
  listEmpty: {
    padding: 32,
    alignItems: 'center',
  },
  listEmptyText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
});

export default React.memo(HomeVehicleSelectorModal);
