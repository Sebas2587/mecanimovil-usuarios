import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Circle } from 'react-native-svg';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';

const CONFIDENCE_COPY = {
  alta: 'Alta confianza',
  media: 'Confianza media',
  estimado: 'Estimado',
};

/**
 * Histograma estilo Airbnb (rango de precios) con paleta Tinder.
 */
const VehicleValueHistogramChart = ({
  histogram = [],
  valorReal = 0,
  rangoMin = 0,
  rangoMax = 0,
  confianza = 'estimado',
  compact = false,
  height = 88,
}) => {
  const hasData = Array.isArray(histogram) && histogram.length > 0;

  const chartContent = useMemo(() => {
    if (!hasData) return null;
    const width = compact ? 280 : 320;
    const chartH = height - (compact ? 8 : 16);
    const barW = Math.max(3, (width - histogram.length * 2) / histogram.length);
    const gap = 2;
    const maxNorm = Math.max(...histogram.map((b) => b.normalized || 0), 0.01);

    const bars = histogram.map((bucket, i) => {
      const h = Math.max(4, (bucket.normalized / maxNorm) * (chartH - 12));
      const x = i * (barW + gap);
      const y = chartH - h;
      const fill = bucket.in_range ? COLORS.primary[500] : COLORS.neutral.gray[200];
      return (
        <Rect
          key={`bar-${i}`}
          x={x}
          y={y}
          width={barW}
          height={h}
          rx={2}
          fill={fill}
        />
      );
    });

    let markerX = null;
    if (valorReal > 0) {
      const lo = histogram[0]?.bucket_start ?? 0;
      const hi = histogram[histogram.length - 1]?.bucket_end ?? lo + 1;
      const span = Math.max(1, hi - lo);
      const ratio = Math.min(1, Math.max(0, (valorReal - lo) / span));
      markerX = ratio * (histogram.length * (barW + gap) - gap);
    }

    return (
      <Svg width={width} height={chartH}>
        {bars}
        {markerX != null ? (
          <>
            <Line
              x1={markerX}
              y1={0}
              x2={markerX}
              y2={chartH}
              stroke={COLORS.primary[600]}
              strokeWidth={2}
            />
            <Circle cx={markerX} cy={6} r={4} fill={COLORS.primary[600]} />
          </>
        ) : null}
      </Svg>
    );
  }, [histogram, hasData, compact, height, valorReal]);

  if (!hasData) {
    return (
      <View style={[styles.empty, compact && styles.emptyCompact]}>
        <Text style={styles.emptyTitle}>
          {confianza === 'estimado'
            ? 'Aún no hay suficientes autos comparables publicados'
            : 'Recopilando datos del mercado'}
        </Text>
        <Text style={styles.emptyHint}>
          Mostramos el valor según tasación y salud de tu vehículo.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {!compact ? (
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Rango en el mercado</Text>
          <Text style={styles.confidenceChip}>{CONFIDENCE_COPY[confianza] || CONFIDENCE_COPY.estimado}</Text>
        </View>
      ) : null}
      <View style={styles.chartRow}>{chartContent}</View>
      {!compact && rangoMin > 0 && rangoMax > 0 ? (
        <View style={styles.rangeLabels}>
          <Text style={styles.rangeText}>
            ${Math.round(rangoMin / 1_000_000)}M
          </Text>
          <Text style={styles.rangeText}>
            ${Math.round(rangoMax / 1_000_000)}M
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  sectionTitle: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
  },
  confidenceChip: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.primary[600],
    backgroundColor: COLORS.primary[50],
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDERS.radius.pill,
    overflow: 'hidden',
  },
  chartRow: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 72,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.xxs,
  },
  rangeText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
  },
  empty: {
    backgroundColor: COLORS.base.soft,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.md,
    minHeight: 72,
    justifyContent: 'center',
  },
  emptyCompact: {
    padding: SPACING.sm,
    minHeight: 56,
  },
  emptyTitle: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.secondary,
  },
  emptyHint: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
});

export default React.memo(VehicleValueHistogramChart);
