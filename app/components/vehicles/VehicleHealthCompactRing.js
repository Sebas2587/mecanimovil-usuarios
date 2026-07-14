import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { COLORS, TYPOGRAPHY } from '../../design-system/tokens';
import { getHealthColor, getHealthLabel } from '../../utils/healthFormat';
import Skeleton from '../feedback/Skeleton/Skeleton';

const DEFAULT_SIZE = 40;

/**
 * Anillo compacto de salud — Airbnb (solo %) + stroke semántico Tinder/tokens.
 */
const VehicleHealthCompactRing = ({
  score = 0,
  color: _color,
  loading = false,
  available = true,
  size = DEFAULT_SIZE,
  compact = false,
  onPress,
  accessibilityLabel,
}) => {
  const pct = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  const strokeColor = available ? getHealthColor(pct) : COLORS.neutral.gray[300];
  const trackColor = COLORS.neutral.gray[100];

  const { radius, circumference, strokeDashoffset, strokeWidth } = useMemo(() => {
    const sw = compact ? 2.5 : Math.max(2.5, Math.round(size * 0.065));
    const r = (size - sw) / 2 - 0.5;
    const c = 2 * Math.PI * r;
    const offset = c - (pct / 100) * c;
    return {
      radius: r,
      circumference: c,
      strokeDashoffset: offset,
      strokeWidth: sw,
    };
  }, [size, pct, compact]);

  const center = size / 2;
  const pctFontSize = compact
    ? Math.max(10, Math.round(size * 0.28))
    : Math.max(11, Math.round(size * 0.3));
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
        <Skeleton width={size * 0.4} height={8} borderRadius={4} />
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
          fill={COLORS.base.white}
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
              color: available ? COLORS.text.primary : COLORS.text.tertiary,
              fontSize: pctFontSize,
              lineHeight: pctFontSize + 1,
            },
          ]}
        >
          {available ? `${pct}%` : '—'}
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pct: {
    fontFamily: TYPOGRAPHY.styles.captionBold.fontFamily,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontVariant: ['tabular-nums'],
  },
});

export default React.memo(VehicleHealthCompactRing);
