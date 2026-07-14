import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, PanResponder, Platform } from 'react-native';
import Svg, { Rect, Line } from 'react-native-svg';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';
import {
  resolvePriceHistogram,
  formatCLP,
  normalizePriceRange,
} from '../../utils/vehicleValueChart';

const THUMB = 28;
const THUMB_R = THUMB / 2;
const BAR_H = 88;
const MIN_GAP = 0.06;
const ACTIVE = COLORS.primary[500];
const INACTIVE = COLORS.neutral.gray[200];
const TRACK_INACTIVE = COLORS.neutral.gray[200];

/**
 * Histograma estilo Airbnb Filters: colina de barras + dual thumb + Mínimo/Máximo.
 * Barras activas (rosa) dentro del rango; grises fuera. Sin marcador vertical
 * extra — Airbnb no lo usa; el valor del auto vive en el título de la card.
 */
const VehicleValueHistogramChart = ({
  histogram = [],
  valorReal = 0,
  rangoMin = 0,
  rangoMax = 0,
  histogramaOrigen = null,
  height = BAR_H,
}) => {
  const [width, setWidth] = useState(0);

  const normalized = useMemo(
    () => normalizePriceRange(rangoMin, rangoMax, valorReal),
    [rangoMin, rangoMax, valorReal],
  );

  const { buckets, origen } = useMemo(
    () =>
      resolvePriceHistogram({
        histogram,
        valorReal,
        rangoMin: normalized.min,
        rangoMax: normalized.max,
        histogramaOrigen,
      }),
    [histogram, valorReal, normalized.min, normalized.max, histogramaOrigen],
  );

  const axisLo = buckets[0]?.bucket_start ?? normalized.min;
  const axisHi = buckets[buckets.length - 1]?.bucket_end ?? normalized.max;
  const axisSpan = Math.max(1, axisHi - axisLo);

  const priceToRatio = useCallback(
    (price) => Math.min(1, Math.max(0, (Number(price) - axisLo) / axisSpan)),
    [axisLo, axisSpan],
  );

  const ratioToPrice = useCallback(
    (ratio) => Math.round(axisLo + ratio * axisSpan),
    [axisLo, axisSpan],
  );

  const defaultLeft = priceToRatio(normalized.min);
  const defaultRight = priceToRatio(normalized.max);

  const [leftRatio, setLeftRatio] = useState(Math.min(defaultLeft, defaultRight - MIN_GAP));
  const [rightRatio, setRightRatio] = useState(Math.max(defaultRight, defaultLeft + MIN_GAP));
  const leftRef = useRef(leftRatio);
  const rightRef = useRef(rightRatio);
  const startRef = useRef(0);

  useEffect(() => {
    const left = Math.min(defaultLeft, defaultRight - MIN_GAP);
    const right = Math.max(defaultRight, defaultLeft + MIN_GAP);
    leftRef.current = left;
    rightRef.current = right;
    setLeftRatio(left);
    setRightRatio(right);
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

  if (!valorReal || !buckets.length) return null;

  const minPrice = ratioToPrice(leftRatio);
  const maxPrice = Math.max(minPrice + 1, ratioToPrice(rightRatio));

  const barH = height;
  const trackY = barH + 2;
  const svgH = trackY + THUMB_R + 2;

  const chart = width <= 0 ? null : (() => {
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

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Rango de venta</Text>
      <Text style={styles.subtitle}>
        {origen === 'mercado'
          ? 'Altura = cantidad de avisos en ese precio'
          : 'Altura = densidad estimada del rango de venta (no son avisos reales)'}
      </Text>

      <View
        style={[styles.box, { height: svgH }]}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
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
    marginTop: 2,
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
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  inputCol: { flex: 1 },
  inputLabel: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  inputBox: {
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    borderRadius: BORDERS.radius.lg,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.background.paper,
  },
  inputValue: {
    ...TYPOGRAPHY.styles.bodyBold,
    color: COLORS.text.primary,
  },
});

export default React.memo(VehicleValueHistogramChart);
