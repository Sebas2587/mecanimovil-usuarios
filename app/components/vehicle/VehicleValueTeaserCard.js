import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';
import { useVehicleValuationForecast } from '../../hooks/useVehicleValuationForecast';
import VehicleValueHistogramChart from './VehicleValueHistogramChart';
import { formatCLP } from '../../utils/vehicleValueChart';

/**
 * Tarjeta Airbnb-minimal: título + valor + histograma + progreso opcional.
 */
const VehicleValueTeaserCard = ({ vehicle }) => {
  const { data, isLoading } = useVehicleValuationForecast(vehicle, {
    enabled: !!vehicle?.id,
  });

  const scrape = data?.meta?.scrape || {};
  const scrapeActive = scrape.state === 'pending' || scrape.state === 'running';
  const scrapePct = Math.max(0, Math.min(100, Number(scrape.progress_pct) || 0));

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

      {scrapeActive ? (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${scrapePct}%` }]} />
        </View>
      ) : null}

      <VehicleValueHistogramChart
        histogram={data?.histograma}
        valorReal={valorHoy}
        rangoMin={data?.valor_real_rango_min}
        rangoMax={data?.valor_real_rango_max}
        height={88}
      />
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
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.secondary,
  },
  value: {
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.text.primary,
    marginTop: 2,
    marginBottom: SPACING.md,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.neutral.gray[200],
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary[500],
    borderRadius: 2,
  },
});

export default React.memo(VehicleValueTeaserCard);
