import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';
import { useVehicleValuationForecast } from '../../hooks/useVehicleValuationForecast';
import VehicleValueHistogramChart from './VehicleValueHistogramChart';
import {
  adjustRateByHealth,
  projectValueAtYears,
  formatCLP,
} from '../../utils/vehicleValueChart';

/**
 * Tarjeta minimalista del home: valor hoy + histograma Airbnb interactivo.
 * Sin badge “Recopilando datos” (confunde: el scrape es batch, no live).
 */
const VehicleValueTeaserCard = ({ vehicle, healthScore }) => {
  const { data, isLoading } = useVehicleValuationForecast(vehicle, {
    enabled: !!vehicle?.id,
  });

  const health = Number(healthScore) || vehicle?.salud_general || 70;

  const valorHoy = useMemo(() => {
    if (data?.valor_real_hoy) return data.valor_real_hoy;
    return vehicle?.precio_sugerido_final || vehicle?.precio_mercado_promedio || 0;
  }, [data, vehicle]);

  const tasaAjustada = useMemo(() => {
    const base = data?.meta?.tasa_depreciacion_anual_pct ?? 7;
    return adjustRateByHealth(base, health);
  }, [data?.meta?.tasa_depreciacion_anual_pct, health]);

  const valor1y = useMemo(
    () => projectValueAtYears(valorHoy, tasaAjustada, 1),
    [valorHoy, tasaAjustada],
  );

  const healthProtects = health >= 80;

  if (!vehicle?.id) return null;

  if (isLoading) {
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

      <VehicleValueHistogramChart
        histogram={data?.histograma}
        valorReal={valorHoy}
        rangoMin={data?.valor_real_rango_min}
        rangoMax={data?.valor_real_rango_max}
        height={88}
      />

      <View style={styles.footer}>
        <Text style={styles.footerLabel}>
          {healthProtects
            ? `Salud ${Math.round(health)}% · protege el valor en el tiempo`
            : `En 1 año (con tu salud actual)`}
        </Text>
        <Text style={styles.footerValue}>{formatCLP(valor1y)}</Text>
      </View>
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
    gap: SPACING.xs,
  },
  title: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.secondary,
  },
  value: {
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border.light,
    gap: SPACING.sm,
  },
  footerLabel: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    flex: 1,
  },
  footerValue: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
  },
});

export default React.memo(VehicleValueTeaserCard);
