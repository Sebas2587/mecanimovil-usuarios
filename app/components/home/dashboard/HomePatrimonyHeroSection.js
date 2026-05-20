import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { TrendingUp, Gauge, Shield } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY } from '../../../design-system/tokens';
import { HomePanelCard } from '../shared/HomePanelCard';
import { formatCLP, formatKm } from '../shared/homeFormatters';
import { getHealthLabel } from '../../../utils/healthFormat';

const HomePatrimonyHeroSection = ({
  valuation,
  priceDelta,
  healthScore,
  healthScoreColor,
  odometer,
  motorType,
  onPressHealth,
}) => (
  <HomePanelCard style={styles.card}>
    <View style={styles.heroRow}>
      <View style={styles.heroMain}>
        <View style={styles.labelRow}>
          <TrendingUp size={14} color={COLORS.success.main} />
          <Text style={styles.labelText}>Valor estimado</Text>
        </View>
        <Text style={styles.heroPrice}>{formatCLP(valuation)}</Text>
        {priceDelta !== 0 ? (
          <Text
            style={[
              styles.heroDelta,
              { color: priceDelta >= 0 ? COLORS.success.main : COLORS.error.main },
            ]}
          >
            {priceDelta >= 0 ? '+' : ''}
            {formatCLP(Math.abs(priceDelta))} vs mercado
          </Text>
        ) : null}
      </View>

      <TouchableOpacity
        style={styles.healthCircleWrap}
        onPress={onPressHealth}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Salud del vehículo ${Math.round(healthScore)} por ciento, ${getHealthLabel(healthScore)}`}
      >
        <View style={[styles.healthCircle, { borderColor: healthScoreColor }]}>
          <Text style={[styles.healthCirclePct, { color: healthScoreColor }]}>
            {Math.round(healthScore)}%
          </Text>
          <Text style={styles.healthCircleSaludLabel}>Salud</Text>
        </View>
      </TouchableOpacity>
    </View>

    <View style={styles.odometerRow}>
      <Gauge size={14} color={COLORS.text.tertiary} />
      <Text style={styles.odometerText}>{formatKm(odometer)} km</Text>
      <View style={styles.odometerDot} />
      <Shield size={14} color={COLORS.text.tertiary} />
      <Text style={styles.odometerText}>{motorType || 'Motor'}</Text>
    </View>
  </HomePanelCard>
);

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroMain: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  labelText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
  },
  heroPrice: {
    ...TYPOGRAPHY.styles.numberDisplay,
    color: COLORS.text.primary,
    marginTop: 4,
  },
  heroDelta: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    marginTop: 2,
  },
  healthCircleWrap: {
    alignItems: 'center',
    marginLeft: 16,
  },
  healthCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.gray[100],
  },
  healthCirclePct: {
    fontSize: 22,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  healthCircleSaludLabel: {
    fontSize: 10,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  odometerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
    gap: 6,
  },
  odometerText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  odometerDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.text.tertiary,
    marginHorizontal: 4,
  },
});

export default React.memo(HomePatrimonyHeroSection);
