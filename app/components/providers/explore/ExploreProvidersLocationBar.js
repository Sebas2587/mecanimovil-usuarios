import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MapPin, ChevronDown } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, BORDERS, SHADOWS } from '../../../design-system/tokens';

const ExploreProvidersLocationBar = ({ selectedAddress, vehicleLabel, onPressChangeAddress }) => (
  <View style={styles.wrap}>
    <TouchableOpacity
      style={styles.locationBtn}
      onPress={onPressChangeAddress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="Cambiar dirección de servicio"
    >
      <MapPin size={16} color={COLORS.primary[500]} />
      <View style={styles.textCol}>
        <Text style={styles.label} numberOfLines={1}>
          {selectedAddress?.etiqueta || 'Dirección de servicio'}
        </Text>
        <Text style={styles.address} numberOfLines={1}>
          {selectedAddress?.direccion || 'Selecciona una dirección'}
        </Text>
      </View>
      <ChevronDown size={18} color={COLORS.text.tertiary} />
    </TouchableOpacity>
    {vehicleLabel ? (
      <Text style={styles.vehicleHint} numberOfLines={1}>
        Compatibles con {vehicleLabel}
      </Text>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  address: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  vehicleHint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
    marginTop: 8,
    paddingHorizontal: 4,
  },
});

export default React.memo(ExploreProvidersLocationBar);
