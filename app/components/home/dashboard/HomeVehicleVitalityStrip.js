import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Gauge, CloudRain, Navigation, TrendingUp, ChevronDown } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY } from '../../../design-system/tokens';
import { formatCLP, formatKm } from '../shared/homeFormatters';

/**
 * Resumen vital del vehículo (cabecera del bloque colapsable o standalone).
 */
const HomeVehicleVitalityStrip = ({
  healthScore,
  healthScoreColor,
  odometer,
  valuation,
  tripActive,
  tripKm,
  climateRiskPct,
  weatherAvailable,
  onPressHealth,
  embedded = false,
  expanded = false,
}) => {
  if (healthScore == null && !valuation) return null;

  return (
    <View style={[styles.inner, embedded && styles.innerEmbedded]}>
      <TouchableOpacity
        style={[styles.healthRing, { borderColor: healthScoreColor || COLORS.primary[300] }]}
        onPress={onPressHealth}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Salud del vehículo ${healthScore != null ? Math.round(healthScore) : ''} por ciento`}
      >
        <Text style={[styles.healthPct, { color: healthScoreColor || COLORS.primary[600] }]}>
          {healthScore != null ? `${Math.round(healthScore)}%` : '—'}
        </Text>
        <Text style={styles.healthLbl}>Salud</Text>
      </TouchableOpacity>

      <View style={styles.mid}>
        {valuation > 0 ? (
          <View style={styles.row}>
            <TrendingUp size={12} color={COLORS.success.main} />
            <Text style={styles.valText} numberOfLines={1}>
              {formatCLP(valuation)}
            </Text>
          </View>
        ) : null}
        <View style={styles.row}>
          <Gauge size={12} color={COLORS.text.tertiary} />
          <Text style={styles.meta}>{formatKm(odometer)} km</Text>
        </View>
        {tripActive ? (
          <View style={styles.row}>
            <Navigation size={12} color={COLORS.primary[500]} />
            <Text style={styles.tripLive}>Viaje · {tripKm.toFixed(1)} km</Text>
          </View>
        ) : null}
        {weatherAvailable && climateRiskPct != null ? (
          <View style={styles.row}>
            <CloudRain size={12} color={COLORS.text.tertiary} />
            <Text style={styles.meta}>Clima {climateRiskPct}% riesgo</Text>
          </View>
        ) : null}
      </View>

      {embedded ? (
        <ChevronDown
          size={20}
          color={COLORS.text.tertiary}
          style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginBottom: 12,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  innerEmbedded: {
    flex: 1,
    width: '100%',
    marginBottom: 0,
    padding: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
  },
  healthRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.gray[50],
  },
  healthPct: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  healthLbl: {
    fontSize: 9,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  mid: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  valText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    flex: 1,
  },
  meta: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
  },
  tripLive: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.primary[600],
  },
});

export default React.memo(HomeVehicleVitalityStrip);
