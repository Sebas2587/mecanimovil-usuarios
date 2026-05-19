import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MapPin, ChevronDown, Sparkles } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY } from '../../../design-system/tokens';

/**
 * Fila de ubicación de servicio bajo el saludo (dirección o subtítulo por defecto).
 */
const HomeServiceLocation = ({ hasAddresses, selectedAddress, onPressSelectAddress }) => {
  if (hasAddresses) {
    return (
      <TouchableOpacity
        style={styles.addressBtn}
        onPress={onPressSelectAddress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Cambiar dirección de servicio"
      >
        <MapPin size={13} color={COLORS.primary[500]} />
        <Text style={styles.addressText} numberOfLines={1}>
          {selectedAddress?.etiqueta || 'Dirección'}: {selectedAddress?.direccion || '—'}
        </Text>
        <ChevronDown size={14} color={COLORS.text.tertiary} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.subtitleRow}>
      <Sparkles size={14} color={COLORS.primary[500]} />
      <Text style={styles.subtitle}>Dashboard Predictivo</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  addressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 5,
    paddingVertical: 3,
  },
  addressText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
});

export default React.memo(HomeServiceLocation);
