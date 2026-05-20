import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Gauge, CloudRain, Navigation, TrendingUp, ChevronRight } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SHADOWS } from '../../../design-system/tokens';
import { formatCLP, formatKm } from '../shared/homeFormatters';

/**
 * Resumen vital del vehículo activo (siempre visible, ligado al auto seleccionado).
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
  onPressDetails,
}) => {
  if (healthScore == null && !valuation) return null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPressDetails}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel="Detalle de salud, patrimonio, viaje y clima de tu vehículo"
    >
      <TouchableOpacity
        style={[styles.healthRing, { borderColor: healthScoreColor || COLORS.primary[300] }]}
        onPress={onPressHealth}
        hitSlop={8}
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

      <View style={styles.chevron}>
        <Text style={styles.more}>Detalle</Text>
        <ChevronRight size={16} color={COLORS.text.tertiary} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginBottom: 12,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
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
  chevron: {
    alignItems: 'flex-end',
    gap: 2,
  },
  more: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.tertiary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
});

export default React.memo(HomeVehicleVitalityStrip);
