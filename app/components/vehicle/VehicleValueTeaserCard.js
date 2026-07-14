import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';
import { useVehicleValuationForecast } from '../../hooks/useVehicleValuationForecast';
import { formatCLP } from '../../utils/vehicleValueChart';

/**
 * Tarjeta home: valor estimado de hoy (sin scrape/progreso de mercado).
 */
const VehicleValueTeaserCard = ({ vehicle }) => {
  const { data, isLoading } = useVehicleValuationForecast(vehicle, {
    enabled: !!vehicle?.id,
  });

  const valorHoy = useMemo(() => {
    if (data?.valor_real_hoy) return data.valor_real_hoy;
    return vehicle?.precio_sugerido_final || vehicle?.precio_mercado_promedio || 0;
  }, [data, vehicle]);

  if (!vehicle?.id) return null;

  if (isLoading && !data) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={COLORS.primary[500]} />
      </View>
    );
  }

  return (
    <View
      style={styles.card}
      accessibilityRole="summary"
      accessibilityLabel={`Valor estimado ${formatCLP(valorHoy)}.`}
    >
      <Text style={styles.title}>¿Cuánto vale tu auto hoy?</Text>
      <Text style={styles.value}>{formatCLP(valorHoy)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.styles.bodyBold,
    color: COLORS.text.primary,
    fontSize: 16,
  },
  value: {
    ...TYPOGRAPHY.styles.h3,
    color: COLORS.text.primary,
    marginTop: 4,
  },
});

export default React.memo(VehicleValueTeaserCard);
