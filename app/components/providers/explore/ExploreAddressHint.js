import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY } from '../../../design-system/tokens';

/** Dirección de servicio solo lectura (se cambia desde el inicio). */
const ExploreAddressHint = ({ address, vehicleLabel }) => {
  if (!address?.direccion) return null;
  return (
    <View style={styles.wrap}>
      <MapPin size={14} color={COLORS.text.tertiary} />
      <View style={styles.col}>
        <Text style={styles.label} numberOfLines={1}>
          {address.etiqueta || 'Tu dirección'} · {address.direccion}
        </Text>
        {vehicleLabel ? (
          <Text style={styles.sub} numberOfLines={1}>
            {vehicleLabel} · Cambia la dirección desde el inicio si necesitas
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  col: { flex: 1, minWidth: 0 },
  label: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
  sub: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
});

export default React.memo(ExploreAddressHint);
