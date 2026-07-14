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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Car, X, Check, Plus } from 'lucide-react-native';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY } from '../../../design-system/tokens';
import { formatKm } from '../shared/homeFormatters';
import { resolveVehicleHealthPct } from '../../../utils/healthFormat';

/**
 * Bottom sheet Airbnb + Tinder: seleccionar vehículo activo del home.
 */
const HomeVehicleSelectorModal = ({
  visible,
  vehicles = [],
  selectedVehicleId,
  vehiclesHealthData = [],
  onClose,
  onSelectVehicle,
  onAddVehicle,
  onManageVehicles,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, SPACING.md) }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Tu vehículo</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={12}
              accessibilityLabel="Cerrar"
              style={styles.closeBtn}
            >
              <X size={20} color={COLORS.text.primary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={vehicles}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isActive = item.id === selectedVehicleId;
              const healthSummary =
                vehiclesHealthData.find((h) => h.vehicleId === item.id)?.health ?? null;
              const healthPct = Math.round(resolveVehicleHealthPct(item, healthSummary));

              return (
                <TouchableOpacity
                  style={[styles.item, isActive && styles.itemActive]}
                  onPress={() => onSelectVehicle(item.id)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                >
                  {item.foto ? (
                    <Image source={{ uri: item.foto }} style={styles.thumb} contentFit="cover" />
                  ) : (
                    <View style={[styles.thumb, styles.thumbFallback]}>
                      <Car size={16} color={COLORS.primary[500]} strokeWidth={2} />
                    </View>
                  )}
                  <View style={styles.itemText}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {item.marca_nombre || item.marca || ''} {item.modelo_nombre || item.modelo || ''}
                    </Text>
                    <Text style={styles.itemSub} numberOfLines={1}>
                      {[item.patente || item.year, formatKm(item.kilometraje) ? `${formatKm(item.kilometraje)} km` : null, `Salud ${healthPct}%`]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                  {isActive ? (
                    <View style={styles.checkWrap}>
                      <Check size={16} color={COLORS.base.white} strokeWidth={2.5} />
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.listEmpty}>
                <Text style={styles.listEmptyText}>No hay vehículos</Text>
              </View>
            }
          />

          <View style={styles.footer}>
            <TouchableOpacity style={styles.addBtn} onPress={onAddVehicle} activeOpacity={0.9}>
              <Plus size={18} color={COLORS.base.white} strokeWidth={2.5} />
              <Text style={styles.addText}>Agregar vehículo</Text>
            </TouchableOpacity>
            {onManageVehicles ? (
              <TouchableOpacity
                style={styles.manageLink}
                onPress={onManageVehicles}
                activeOpacity={0.85}
                accessibilityRole="button"
              >
                <Text style={styles.manageLinkText}>Ver patrimonio</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.background.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '72%',
    borderTopLeftRadius: BORDERS.radius.xl,
    borderTopRightRadius: BORDERS.radius.xl,
    backgroundColor: COLORS.background.paper,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.neutral.gray[200],
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.text.primary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.neutral.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
  },
  itemActive: {
    borderColor: COLORS.primary[500],
    borderWidth: 2,
    backgroundColor: COLORS.primary[50],
    paddingVertical: SPACING.sm - 1,
    paddingHorizontal: SPACING.sm - 1,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.neutral.gray[100],
  },
  thumbFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary[50],
  },
  itemText: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
  },
  itemSub: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    marginTop: 2,
    fontSize: 12,
  },
  checkWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    gap: SPACING.xs,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: COLORS.primary[500],
  },
  addText: {
    ...TYPOGRAPHY.styles.bodyBold,
    color: COLORS.base.white,
    fontSize: 15,
  },
  manageLink: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  manageLinkText: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.secondary,
  },
  listEmpty: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  listEmptyText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
  },
});

export default React.memo(HomeVehicleSelectorModal);
