import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Users } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';
import { formatCLP } from './shared/homeFormatters';
import { formatProviderBookingsBadgeLabel } from '../../utils/providerUtils';

const MAX_CHIPS = 3;

/**
 * Métricas bajo el nombre en cards de proveedor (Coinbase-light).
 * - `offers`: chips servicio + precio (`panel_servicios`).
 * - `bookings`: badge de contrataciones en la plataforma.
 */
const ProviderServiceChipsRow = ({
  variant = 'offers',
  offers = [],
  bookingsCount = null,
  compact = false,
}) => {
  if (variant === 'bookings') {
    const label = formatProviderBookingsBadgeLabel(bookingsCount);
    if (!label) return null;

    return (
      <View
        style={[styles.bookingsRow, compact && styles.bookingsRowCompact]}
        accessibilityRole="text"
        accessibilityLabel={label}
      >
        <Users size={12} color={COLORS.text.secondary} strokeWidth={2.25} />
        <Text style={styles.bookingsText} numberOfLines={1}>
          {label}
        </Text>
      </View>
    );
  }

  const list = (Array.isArray(offers) ? offers : []).slice(0, MAX_CHIPS);
  if (list.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      nestedScrollEnabled
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {list.map((item) => {
        const key = `${item.oferta_id ?? item.servicio_id}-${item.nombre}`;
        const precio = item.precio ?? item.precio_publicado_cliente;
        return (
          <View key={key} style={[styles.chip, compact && styles.chipCompact]}>
            <Text style={styles.chipName} numberOfLines={1}>
              {item.nombre}
            </Text>
            <Text style={styles.chipPrice}>{formatCLP(precio)}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    marginTop: 6,
    marginBottom: 2,
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 168,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: BORDERS.radius.full,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.neutral.gray[100],
    gap: 6,
  },
  chipCompact: {
    maxWidth: 150,
    paddingVertical: 4,
  },
  chipName: {
    flexShrink: 1,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.secondary,
  },
  chipPrice: {
    flexShrink: 0,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    color: COLORS.primary[600],
  },
  bookingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    marginTop: 4,
    marginBottom: 6,
    gap: 5,
  },
  bookingsRowCompact: {
    marginBottom: 4,
  },
  bookingsText: {
    flexShrink: 1,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.secondary,
  },
});

export default React.memo(ProviderServiceChipsRow);
