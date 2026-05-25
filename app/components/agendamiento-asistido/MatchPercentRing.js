import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { COLORS, TYPOGRAPHY } from '../../design-system/tokens';

const DEFAULT_SIZE = 64;

/**
 * Rueda de porcentaje (estilo salud patrimonio / marketplace), para match de catálogo.
 */
export default function MatchPercentRing({
  percent = 0,
  label = 'Match',
  sublabel,
  esExacta = true,
  size = DEFAULT_SIZE,
}) {
  const pct = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
  const strokeColor = esExacta ? COLORS.primary[500] : COLORS.text.tertiary;
  const trackColor = COLORS.border.light;

  const { radius, circumference, strokeDashoffset, strokeWidth } = useMemo(() => {
    const sw = Math.max(5, Math.round(size * 0.068));
    const r = (size - sw) / 2 - 2;
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

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
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
      </Svg>
      <View style={styles.centerText} pointerEvents="none">
        <Text style={[styles.pct, { color: strokeColor, fontSize: size * 0.26 }]}>
          {pct}%
        </Text>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        {sublabel ? (
          <Text style={styles.sublabel} numberOfLines={1}>
            {sublabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  pct: {
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontVariant: ['tabular-nums'],
    lineHeight: 22,
  },
  label: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 1,
  },
  sublabel: {
    fontSize: 8,
    color: COLORS.text.tertiary,
    marginTop: 1,
  },
});
