import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';
import { getHealthColor } from '../../utils/healthFormat';
import {
  formatMatchFactorPct,
  resolveMatchFactores,
} from '../../utils/catalogoMatchFactores';

function FactorBar({ label, value }) {
  const pct = Math.round(Number(value) * 100);
  const color = getHealthColor(pct);
  return (
    <View style={styles.factorRow}>
      <Text style={styles.factorLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.factorTrackWrap}>
        <View style={styles.factorTrack}>
          <View style={[styles.factorFill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
        <Text style={[styles.factorPct, { color }]}>{formatMatchFactorPct(value)}</Text>
      </View>
    </View>
  );
}

/**
 * Desglose expandible de match_factores del motor_match ML.
 */
export default function MatchFactoresExpandible({ candidato, compact = false }) {
  const [expandido, setExpandido] = useState(false);
  const filas = useMemo(() => resolveMatchFactores(candidato), [candidato]);

  if (!filas.length) return null;

  const top = filas.slice(0, 2);
  const resto = filas.slice(2);

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpandido((v) => !v)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Ver desglose del match IA"
      >
        <View style={styles.headerLeft}>
          <Sparkles size={14} color={COLORS.primary[600]} />
          <Text style={styles.headerTitle}>Análisis del match</Text>
        </View>
        {expandido ? (
          <ChevronUp size={16} color={COLORS.text.secondary} />
        ) : (
          <ChevronDown size={16} color={COLORS.text.secondary} />
        )}
      </TouchableOpacity>

      {(expandido ? filas : top).map((f) => (
        <FactorBar key={f.key} label={f.label} value={f.value} />
      ))}

      {!expandido && resto.length > 0 ? (
        <Text style={styles.moreHint}>
          +{resto.length} factor{resto.length === 1 ? '' : 'es'} · toca para ver todo
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    padding: 10,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.primary[50],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.primary[100],
    gap: 8,
  },
  containerCompact: {
    marginTop: 8,
    padding: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.primary[800],
  },
  factorRow: {
    gap: 4,
  },
  factorLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
  },
  factorTrackWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  factorTrack: {
    flex: 1,
    height: 6,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.neutral.gray[200],
    overflow: 'hidden',
  },
  factorFill: {
    height: '100%',
    borderRadius: BORDERS.radius.full,
  },
  factorPct: {
    width: 34,
    textAlign: 'right',
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
  },
  moreHint: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
});
