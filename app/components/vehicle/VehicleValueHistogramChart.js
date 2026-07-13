import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, PanResponder, Platform } from 'react-native';
import Svg, { Rect, Line } from 'react-native-svg';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';
import {
  resolvePriceHistogram,
  formatCLP,
  formatCompactMillions,
  buildPricePathInsight,
  buildHorizonChips,
} from '../../utils/vehicleValueChart';

const THUMB = 28;
const THUMB_R = THUMB / 2;
const BAR_H = 88;
const MIN_GAP = 0.06;
const ACTIVE = COLORS.primary[500];
const INACTIVE = COLORS.neutral.gray[200];
const TRACK_INACTIVE = COLORS.neutral.gray[200];

/**
 * Histograma Airbnb + insight de cuándo vender según el rango elegido.
 */
const VehicleValueHistogramChart = ({
  histogram = [],
  valorReal = 0,
  rangoMin = 0,
  rangoMax = 0,
  tasaAnualPct = 7,
  demanda = null,
  height = BAR_H,
}) => {
  const [width, setWidth] = useState(0);
  const { buckets } = useMemo(
    () => resolvePriceHistogram({ histogram, valorReal, rangoMin, rangoMax }),
    [histogram, valorReal, rangoMin, rangoMax],
  );

  const axisLo = buckets[0]?.bucket_start ?? 0;
  const axisHi = buckets[buckets.length - 1]?.bucket_end ?? 1;
  const axisSpan = Math.max(1, axisHi - axisLo);

  const priceToRatio = useCallback(
    (price) => Math.min(1, Math.max(0, (Number(price) - axisLo) / axisSpan)),
    [axisLo, axisSpan],
  );

  const ratioToPrice = useCallback(
    (ratio) => Math.round(axisLo + ratio * axisSpan),
    [axisLo, axisSpan],
  );

  const defaultLeft = priceToRatio(rangoMin > 0 ? rangoMin : axisLo);
  const defaultRight = priceToRatio(rangoMax > 0 ? rangoMax : axisHi);

  const [leftRatio, setLeftRatio] = useState(defaultLeft);
  const [rightRatio, setRightRatio] = useState(defaultRight);
  const leftRef = useRef(defaultLeft);
  const rightRef = useRef(defaultRight);
  const startRef = useRef(0);

  useEffect(() => {
    leftRef.current = defaultLeft;
    rightRef.current = defaultRight;
    setLeftRatio(defaultLeft);
    setRightRatio(defaultRight);
  }, [defaultLeft, defaultRight]);

  const drawable = Math.max(0, width - THUMB);

  const makeResponder = useCallback(
    (which) =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          startRef.current = which === 'left' ? leftRef.current : rightRef.current;
        },
        onPanResponderMove: (_e, g) => {
          if (drawable <= 0) return;
          let next = startRef.current + g.dx / drawable;
          if (which === 'left') {
            next = Math.max(0, Math.min(next, rightRef.current - MIN_GAP));
            leftRef.current = next;
            setLeftRatio(next);
          } else {
            next = Math.min(1, Math.max(next, leftRef.current + MIN_GAP));
            rightRef.current = next;
            setRightRatio(next);
          }
        },
      }),
    [drawable],
  );

  const leftPan = useMemo(() => makeResponder('left'), [makeResponder]);
  const rightPan = useMemo(() => makeResponder('right'), [makeResponder]);

  const minPrice = ratioToPrice(leftRatio);
  const maxPrice = ratioToPrice(rightRatio);

  const timing = useMemo(
    () =>
      buildPricePathInsight({
        valorHoy: valorReal,
        tasaAnualPct,
        minPrice,
        maxPrice,
      }),
    [valorReal, tasaAnualPct, minPrice, maxPrice],
  );

  const horizons = useMemo(
    () => buildHorizonChips(valorReal, tasaAnualPct),
    [valorReal, tasaAnualPct],
  );

  if (!buckets.length) return null;

  const barH = height;
  const trackY = barH + 2;
  const svgH = trackY + THUMB_R + 2;
  const boxH = svgH;

  const chart = (() => {
    if (width <= 0) return null;
    const gap = 1.25;
    const n = buckets.length;
    const barW = Math.max(2.5, (drawable - n * gap) / n);
    const maxNorm = Math.max(...buckets.map((b) => b.normalized || 0), 0.01);

    return (
      <Svg width={width} height={svgH} pointerEvents="none">
        {buckets.map((b, i) => {
          const h = Math.max(4, ((b.normalized || 0) / maxNorm) * (barH - 8));
          const x = THUMB_R + i * (barW + gap);
          const y = barH - h;
          const mid = (b.bucket_start + b.bucket_end) / 2;
          const inRange = mid >= minPrice && mid <= maxPrice;
          return (
            <Rect
              key={`b-${i}`}
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={1}
              fill={inRange ? ACTIVE : INACTIVE}
            />
          );
        })}
        <Line
          x1={THUMB_R}
          y1={trackY}
          x2={width - THUMB_R}
          y2={trackY}
          stroke={TRACK_INACTIVE}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Line
          x1={THUMB_R + leftRatio * drawable}
          y1={trackY}
          x2={THUMB_R + rightRatio * drawable}
          y2={trackY}
          stroke={ACTIVE}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </Svg>
    );
  })();

  const timingTone =
    timing.kind === 'in_range'
      ? COLORS.primary[600]
      : timing.kind === 'path'
        ? COLORS.text.primary
        : COLORS.text.secondary;

  const demandaTone =
    demanda?.recomendacion === 'vender_ahora'
      ? COLORS.success.main
      : demanda?.recomendacion === 'esperar'
        ? COLORS.warning.main
        : COLORS.text.secondary;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Rango de venta</Text>
      <Text style={styles.subtitle}>Precio objetivo vs. cuándo tu valor lo cruzaría</Text>

      <View style={[styles.box, { height: boxH }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {chart}
        <View
          style={[styles.thumb, { left: leftRatio * drawable, top: trackY - THUMB_R }]}
          {...leftPan.panHandlers}
          accessibilityLabel="Precio mínimo"
        />
        <View
          style={[styles.thumb, { left: rightRatio * drawable, top: trackY - THUMB_R }]}
          {...rightPan.panHandlers}
          accessibilityLabel="Precio máximo"
        />
      </View>

      <View style={styles.inputs}>
        <View style={styles.inputCol}>
          <Text style={styles.inputLabel}>Mínimo</Text>
          <View style={styles.inputBox}>
            <Text style={styles.inputValue} numberOfLines={1}>
              {formatCLP(minPrice)}
            </Text>
          </View>
        </View>
        <View style={styles.inputCol}>
          <Text style={styles.inputLabel}>Máximo</Text>
          <View style={styles.inputBox}>
            <Text style={styles.inputValue} numberOfLines={1}>
              {formatCLP(maxPrice)}
            </Text>
          </View>
        </View>
      </View>

      {timing.kind !== 'none' ? (
        <View style={styles.timingCard}>
          <Text style={styles.sectionEyebrow}>Trayectoria de precio</Text>
          <Text style={[styles.timingTitle, { color: timingTone }]}>{timing.title}</Text>
          <Text style={styles.timingDetail}>{timing.detail}</Text>
        </View>
      ) : null}

      <View style={styles.timingCard}>
        <Text style={styles.sectionEyebrow}>Demanda del mercado</Text>
        <Text style={[styles.timingTitle, { color: demandaTone }]}>
          {demanda?.titulo || 'Aún midiendo la demanda'}
        </Text>
        <Text style={styles.timingDetail}>
          {demanda?.detalle ||
            'Para saber si el próximo mes es mejor que hoy hace falta ver rotación y oferta de avisos similares en el tiempo.'}
        </Text>
        {(demanda?.razones || []).slice(0, 2).map((r, i) => (
          <Text key={i} style={styles.reason}>
            · {r}
          </Text>
        ))}
      </View>

      <View style={styles.horizonRow}>
        {horizons.map((h) => {
          const active =
            timing.months != null &&
            ((h.months === 0 && timing.months === 0) ||
              (h.months > 0 && Math.abs(h.months - timing.months) <= (h.months === 6 ? 3 : 6)));
          return (
            <View key={h.key} style={[styles.horizonChip, active && styles.horizonChipActive]}>
              <Text style={[styles.horizonLabel, active && styles.horizonLabelActive]}>{h.label}</Text>
              <Text style={[styles.horizonValue, active && styles.horizonValueActive]} numberOfLines={1}>
                {formatCompactMillions(h.valor)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  title: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
  },
  subtitle: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    marginBottom: SPACING.sm,
  },
  box: {
    width: '100%',
    position: 'relative',
    overflow: 'visible',
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB_R,
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.neutral.gray[200],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.04)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.16,
        shadowRadius: 4,
        elevation: 4,
      },
    }),
  },
  inputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  inputCol: { flex: 1 },
  inputLabel: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  inputBox: {
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    borderRadius: BORDERS.radius.lg,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.background.paper,
  },
  inputValue: {
    ...TYPOGRAPHY.styles.bodyBold,
    color: COLORS.text.primary,
  },
  timingCard: {
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.base.soft,
  },
  sectionEyebrow: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    marginBottom: 2,
  },
  timingTitle: {
    ...TYPOGRAPHY.styles.captionBold,
  },
  timingDetail: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  reason: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  horizonRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  horizonChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  horizonChipActive: {
    borderColor: COLORS.primary[500],
    backgroundColor: COLORS.primary[50],
  },
  horizonLabel: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
  },
  horizonLabelActive: {
    color: COLORS.primary[600],
  },
  horizonValue: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
    marginTop: 2,
  },
  horizonValueActive: {
    color: COLORS.primary[600],
  },
});

export default React.memo(VehicleValueHistogramChart);
