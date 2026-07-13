import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';
import { useVehicleValuationForecast } from '../../hooks/useVehicleValuationForecast';
import VehicleValueHistogramChart from './VehicleValueHistogramChart';
import { adjustRateByHealth, formatCLP } from '../../utils/vehicleValueChart';

/**
 * Tarjeta del home: valor + histograma interactivo + progreso de scrape.
 */
const VehicleValueTeaserCard = ({ vehicle, healthScore }) => {
  const { data, isLoading } = useVehicleValuationForecast(vehicle, {
    enabled: !!vehicle?.id,
  });

  const health = Number(healthScore) || vehicle?.salud_general || 70;
  const scrape = data?.meta?.scrape || {};
  const scrapeActive = scrape.state === 'pending' || scrape.state === 'running';
  const scrapePct = Math.max(0, Math.min(100, Number(scrape.progress_pct) || 0));

  const valorHoy = useMemo(() => {
    if (data?.valor_real_hoy) return data.valor_real_hoy;
    return vehicle?.precio_sugerido_final || vehicle?.precio_mercado_promedio || 0;
  }, [data, vehicle]);

  const tasaAjustada = useMemo(() => {
    const base = data?.meta?.tasa_depreciacion_anual_pct ?? 7;
    // Si el backend ya aplicó salud, no doblar el ajuste.
    if (String(data?.meta?.fuente_tasa || '').includes('salud')) {
      return Number(base);
    }
    return adjustRateByHealth(base, health);
  }, [data?.meta?.tasa_depreciacion_anual_pct, data?.meta?.fuente_tasa, health]);

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
        <View style={styles.progressBlock}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>{scrape.message || 'Buscando datos del mercado…'}</Text>
            <Text style={styles.progressPct}>{scrapePct}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${scrapePct}%` }]} />
          </View>
        </View>
      ) : null}

      <VehicleValueHistogramChart
        histogram={data?.histograma}
        valorReal={valorHoy}
        rangoMin={data?.valor_real_rango_min}
        rangoMax={data?.valor_real_rango_max}
        tasaAnualPct={tasaAjustada}
        demanda={data?.demanda || data?.meta?.demanda}
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
  progressBlock: {
    marginBottom: SPACING.sm,
    gap: 6,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  progressLabel: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    flex: 1,
  },
  progressPct: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.primary[600],
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.neutral.gray[200],
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary[500],
    borderRadius: 3,
  },
});

export default React.memo(VehicleValueTeaserCard);
