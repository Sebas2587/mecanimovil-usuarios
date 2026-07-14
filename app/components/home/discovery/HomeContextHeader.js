import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { HomeContextHeaderSkeleton } from '../../utils/HomePanelSkeletons';
import { Image } from 'expo-image';
import { Bell, Car, ChevronDown, MapPin, Plus } from 'lucide-react-native';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY } from '../../../design-system/tokens';
import VehicleHealthCompactRing from '../../vehicles/VehicleHealthCompactRing';

/**
 * Header home: dirección + notificaciones, luego selector de vehículo (Airbnb + Tinder).
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
          <MapPin size={15} color={COLORS.primary[500]} strokeWidth={2.25} />
          <Text style={styles.addressText} numberOfLines={1}>
            {addressLabel}
          </Text>
          <ChevronDown size={15} color={COLORS.text.tertiary} strokeWidth={2} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onPressNotifications}
          activeOpacity={0.85}
          accessibilityLabel="Notificaciones"
        >
          <Bell size={18} color={COLORS.text.primary} strokeWidth={2} />
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
              <Car size={15} color={COLORS.primary[500]} strokeWidth={2} />
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
              size={36}
              compact
            />
          ) : null}
          <ChevronDown size={16} color={COLORS.text.tertiary} strokeWidth={2} />
        </TouchableOpacity>
      ) : vehiclesLoading ? (
        <HomeContextHeaderSkeleton />
      ) : (
        <TouchableOpacity style={styles.addVehiclePill} onPress={onAddVehicle} activeOpacity={0.85}>
          <Plus size={16} color={COLORS.primary[500]} strokeWidth={2.25} />
          <Text style={styles.addVehicleText}>Agregar vehículo</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  addressTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  addressBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
    paddingVertical: 2,
  },
  addressText: {
    ...TYPOGRAPHY.styles.captionBold,
    flexShrink: 1,
    color: COLORS.text.primary,
  },
  vehiclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    minWidth: 0,
  },
  vehicleThumb: {
    width: 40,
    height: 40,
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
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
  },
  vehicleSub: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    marginTop: 2,
    fontSize: 12,
  },
  addVehiclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.primary[50],
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.primary[100],
  },
  addVehicleText: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.primary[600],
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.background.paper,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  bellBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: COLORS.primary[500],
    borderRadius: BORDERS.radius.full,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 2,
    borderColor: COLORS.background.paper,
  },
  bellBadgeText: {
    color: COLORS.base.white,
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
});

export default React.memo(HomeContextHeader);
