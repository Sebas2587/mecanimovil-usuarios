import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { HomeContextHeaderSkeleton } from '../../utils/HomePanelSkeletons';
import { Image } from 'expo-image';
import { Bell, Car, ChevronDown, MapPin, Plus } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SHADOWS } from '../../../design-system/tokens';
import VehicleHealthCompactRing from '../../vehicles/VehicleHealthCompactRing';

/**
 * Header compacto: dirección + notificaciones arriba, vehículo + salud debajo.
 */
const HomeContextHeader = ({
  selectedVehicle,
  vehiclesLoading,
  healthScore,
  healthScoreColor,
  healthLoading = false,
  healthAvailable = true,
  onPressHealth,
  onOpenVehicleSelector,
  onAddVehicle,
  hasAddresses,
  selectedAddress,
  onPressSelectAddress,
  unreadCount = 0,
  onPressNotifications,
}) => {
  const showHealthRing =
    selectedVehicle && (healthLoading || healthAvailable || healthScore != null);

  const addressLabel = hasAddresses && selectedAddress
    ? selectedAddress.direccion || selectedAddress.etiqueta || 'Dirección'
    : 'Agrega una dirección para ver talleres cercanos';

  return (
    <View style={styles.wrap}>
      <View style={styles.addressTopRow}>
        <TouchableOpacity
          style={styles.addressBtn}
          onPress={onPressSelectAddress}
          activeOpacity={0.85}
          disabled={!onPressSelectAddress}
          accessibilityRole="button"
          accessibilityLabel="Cambiar dirección de servicio"
        >
          <MapPin size={16} color={COLORS.primary[500]} />
          <Text style={styles.addressText} numberOfLines={1}>
            {addressLabel}
          </Text>
          <ChevronDown size={16} color={COLORS.text.tertiary} style={styles.addressChevron} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onPressNotifications}
          activeOpacity={0.85}
          accessibilityLabel="Notificaciones"
        >
          <Bell size={20} color={COLORS.text.primary} />
          {unreadCount > 0 ? (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {selectedVehicle ? (
        <TouchableOpacity
          style={styles.vehiclePill}
          onPress={onOpenVehicleSelector}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Cambiar vehículo"
        >
          {selectedVehicle.foto ? (
            <Image source={{ uri: selectedVehicle.foto }} style={styles.vehicleThumb} contentFit="cover" />
          ) : (
            <View style={[styles.vehicleThumb, styles.vehicleThumbFallback]}>
              <Car size={16} color={COLORS.primary[500]} />
            </View>
          )}
          <View style={styles.vehicleTextCol}>
            <Text style={styles.vehicleTitle} numberOfLines={1}>
              {selectedVehicle.marca_nombre || selectedVehicle.marca || '—'}{' '}
              {selectedVehicle.modelo_nombre || selectedVehicle.modelo || ''}
            </Text>
            <Text style={styles.vehicleSub} numberOfLines={1}>
              {selectedVehicle.patente || selectedVehicle.year || 'Toca para cambiar'}
            </Text>
          </View>
          {showHealthRing ? (
            <VehicleHealthCompactRing
              score={healthScore ?? 0}
              color={healthScoreColor || COLORS.primary[500]}
              loading={healthLoading}
              available={healthAvailable && !healthLoading}
              onPress={onPressHealth}
            />
          ) : null}
          <ChevronDown size={18} color={COLORS.text.tertiary} />
        </TouchableOpacity>
      ) : vehiclesLoading ? (
        <HomeContextHeaderSkeleton />
      ) : (
        <TouchableOpacity style={styles.addVehiclePill} onPress={onAddVehicle} activeOpacity={0.85}>
          <Plus size={18} color={COLORS.primary[500]} />
          <Text style={styles.addVehicleText}>Agregar vehículo</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 14,
    gap: 10,
  },
  addressTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
    paddingVertical: 4,
  },
  addressText: {
    flexShrink: 1,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.primary,
  },
  addressChevron: {
    flexShrink: 0,
  },
  vehiclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    minWidth: 0,
    ...SHADOWS.sm,
  },
  vehicleThumb: {
    width: 36,
    height: 36,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.neutral.gray[100],
  },
  vehicleThumbFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary[50],
  },
  vehicleTextCol: {
    flex: 1,
    minWidth: 0,
  },
  vehicleTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  vehicleSub: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    marginTop: 1,
  },
  addVehiclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: COLORS.primary[50],
    borderRadius: BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.primary[200],
  },
  addVehicleText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.primary[600],
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.background.paper,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    ...SHADOWS.sm,
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORS.error.main,
    borderRadius: BORDERS.radius.full,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.background.paper,
  },
  bellBadgeText: {
    color: COLORS.text.inverse,
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
});

export default React.memo(HomeContextHeader);
