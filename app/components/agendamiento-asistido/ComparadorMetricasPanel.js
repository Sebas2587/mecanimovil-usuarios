import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PrimaryGradientFill from '../base/PrimaryGradientFill/PrimaryGradientFill';
import { COLORS, BORDERS, TYPOGRAPHY, SPACING } from '../../design-system/tokens';
import {
  formatMetricaPct,
  resolveMetricasComparadorModalSecciones,
} from '../../utils/catalogoComparadorMetricasModal';

function MetricaRow({ label, value, displayValue, sinDato = false }) {
  const sinValor = sinDato || displayValue === 'N/D';
  const pct = Math.round(Number(value) * 100);
  const shown = displayValue ?? formatMetricaPct(value);
  const barPct = sinValor
    ? 0
    : (displayValue != null && String(displayValue).includes('/')
      ? pct
      : Math.min(100, pct));

  return (
    <View style={styles.row}>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
      <View style={[styles.track, sinValor && styles.trackSinDato]}>
        {!sinValor ? (
          <PrimaryGradientFill style={[styles.fill, { width: `${barPct}%` }]} />
        ) : null}
      </View>
      <Text style={[styles.pct, sinValor && styles.pctSinDato]}>{shown}</Text>
    </View>
  );
}

/**
 * Factores ML por sección + métricas extra sin duplicar.
 */
export default function ComparadorMetricasPanel({ candidato, porCriterio }) {
  const secciones = useMemo(
    () => resolveMetricasComparadorModalSecciones(candidato, porCriterio),
    [candidato, porCriterio],
  );

  if (!secciones.length) {
    return (
      <Text style={styles.empty}>
        Sin métricas de comparación para este proveedor.
      </Text>
    );
  }

  return (
    <View style={styles.wrap}>
      {secciones.map((sec, secIndex) => (
        <View
          key={sec.id}
          style={[styles.seccion, secIndex > 0 && styles.seccionBorder]}
        >
          {sec.title ? (
            <Text style={styles.seccionTitle}>{sec.title}</Text>
          ) : null}
          <View style={styles.list}>
            {sec.metricas.map((m) => (
              <MetricaRow
                key={m.key}
                label={m.label}
                value={m.value}
                displayValue={m.displayValue}
                sinDato={m.sinDato}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 0,
  },
  seccion: {
    paddingTop: SPACING.xs,
  },
  seccionBorder: {
    marginTop: SPACING.xs,
    paddingTop: SPACING.sm,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: COLORS.border.light,
  },
  seccionTitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
    marginBottom: SPACING.xs,
  },
  list: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    minHeight: 26,
  },
  label: {
    width: 112,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.secondary,
    lineHeight: 16,
  },
  track: {
    flex: 1,
    height: 5,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.neutral.gray[200],
    overflow: 'hidden',
  },
  trackSinDato: {
    backgroundColor: COLORS.neutral.gray[100],
  },
  fill: {
    height: '100%',
    borderRadius: BORDERS.radius.full,
  },
  pct: {
    width: 40,
    textAlign: 'right',
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    fontVariant: ['tabular-nums'],
  },
  pctSinDato: {
    color: COLORS.text.tertiary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  empty: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
  },
});
