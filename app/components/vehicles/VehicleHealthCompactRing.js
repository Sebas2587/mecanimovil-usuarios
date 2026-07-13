import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { COLORS, TYPOGRAPHY } from '../../design-system/tokens';
import { getHealthColor, getHealthLabel } from '../../utils/healthFormat';
import Skeleton from '../feedback/Skeleton/Skeleton';

const DEFAULT_SIZE = 44;

/**
 * Anillo compacto de salud (Coinbase-light): track hairline + arco semántico + % tabular.
 * El stroke usa siempre getHealthColor (tokens .main), no overrides legacy (warning.dark).
 */
const VehicleHealthCompactRing = ({
  score = 0,
  // `color` se ignora: el stroke siempre sale de getHealthColor (tokens .main).
  color: _color,
  loading = false,
  available = true,
  size = DEFAULT_SIZE,
  onPress,
  accessibilityLabel,
}) => {
  const pct = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  const strokeColor = available ? getHealthColor(pct) : COLORS.neutral.gray[400];
  const bgFill = 'transparent';
  const trackColor = COLORS.border.light;

  const { radius, circumference, strokeDashoffset, strokeWidth } = useMemo(() => {
    const sw = Math.max(3, Math.round(size * 0.07));
    const r = (size - sw) / 2 - 1;
    const c = 2 * Math.PI * r;
    const offset = c - (pct / 100) * c;
    return {
      radius: r,
      circumference: c,
      strokeDashoffset: offset,
      strokeWidth: sw,
    };
  }, [size, pct]);

  const center = size / 2;
  const pctFontSize = Math.max(11, Math.round(size * 0.3));
  const label = available ? getHealthLabel(pct) : 'Sin datos';

  const a11y =
    accessibilityLabel
    ?? (loading
      ? 'Calculando salud del vehículo'
      : available
        ? `Salud del vehículo ${pct} por ciento, ${label}`
        : 'Salud del vehículo sin datos');

  const inner = loading ? (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <View style={[styles.skeletonRing, { width: size, height: size, borderRadius: size / 2 }]}>
        <Skeleton width={size * 0.42} height={10} borderRadius={4} />
      </View>
    </View>
  ) : (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill={bgFill}
        />
        {available ? (
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${center}, ${center}`}
          />
        ) : null}
      </Svg>
      <View style={styles.centerText} pointerEvents="none">
        <Text
          style={[
            styles.pct,
            {
              color: available ? strokeColor : COLORS.text.tertiary,
              fontSize: pctFontSize,
              lineHeight: pctFontSize + 2,
            },
          ]}
        >
          {available ? `${pct}%` : '—'}
        </Text>
        <Text style={styles.saludLabel} numberOfLines={1}>
          Salud
        </Text>
      </View>
    </View>
  );

  if (onPress && !loading) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={a11y}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        {inner}
      </TouchableOpacity>
    );
  }

  return (
    <View accessibilityLabel={a11y} accessibilityRole="text">
      {inner}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonRing: {
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: 1,
    borderColor: COLORS.border.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  pct: {
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  saludLabel: {
    fontSize: 8,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.35,
    marginTop: 0,
  },
});

export default React.memo(VehicleHealthCompactRing);
