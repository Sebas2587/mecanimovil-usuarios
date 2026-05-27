import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { TrendingUp, Gauge, Shield } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SPACING } from '../../../design-system/tokens';
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
  showHealthRing = true,
  compact = false,
  embedded = false,
  healthLoading = false,
  healthAvailable = true,
  style,
}) => {
  const healthRing = showHealthRing ? (
    healthLoading ? (
      <View style={styles.healthCircleWrap}>
        <View style={[styles.healthCircle, styles.healthCircleMuted]}>
          <ActivityIndicator size="small" color={COLORS.primary[500]} />
          <Text style={styles.healthCircleSaludLabel}>Salud</Text>
        </View>
      </View>
    ) : !healthAvailable ? (
      <View style={styles.healthCircleWrap}>
        <View style={[styles.healthCircle, styles.healthCircleMuted]}>
          <Text style={styles.healthCirclePctMuted}>—</Text>
          <Text style={styles.healthCircleSaludLabel}>Sin datos</Text>
        </View>
      </View>
    ) : (
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
    )
  ) : null;

  const content = (
    <>
      <View style={styles.heroRow}>
        <View style={[styles.heroMain, !showHealthRing && styles.heroMainFull]}>
          <View style={styles.labelRow}>
            <TrendingUp size={14} color={COLORS.success.main} />
            <Text style={styles.labelText}>Valor estimado</Text>
          </View>
          <Text style={[styles.heroPrice, compact && styles.heroPriceCompact]} numberOfLines={1}>
            {formatCLP(valuation)}
          </Text>
          {priceDelta !== 0 ? (
            <Text
              style={[
                styles.heroDelta,
                compact && styles.heroDeltaCompact,
                { color: priceDelta >= 0 ? COLORS.success.main : COLORS.error.main },
              ]}
              numberOfLines={compact ? 2 : undefined}
            >
              {priceDelta >= 0 ? '+' : ''}
              {formatCLP(Math.abs(priceDelta))} vs mercado
            </Text>
          ) : null}
          {!showHealthRing && healthAvailable && healthScore != null ? (
            <TouchableOpacity onPress={onPressHealth} activeOpacity={0.85}>
              <Text style={[styles.healthInline, { color: healthScoreColor }]}>
                Salud {Math.round(healthScore)}% · {getHealthLabel(healthScore)}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {healthRing}
      </View>

      <View style={[styles.odometerRow, compact && styles.odometerRowCompact]}>
        <Gauge size={compact ? 12 : 14} color={COLORS.text.tertiary} />
        <Text style={[styles.odometerText, compact && styles.odometerTextCompact]} numberOfLines={1}>
          {formatKm(odometer)} km
        </Text>
        <View style={styles.odometerDot} />
        <Shield size={compact ? 12 : 14} color={COLORS.text.tertiary} />
        <Text style={[styles.odometerText, compact && styles.odometerTextCompact]} numberOfLines={1}>
          {motorType || 'Motor'}
        </Text>
      </View>
    </>
  );

  if (embedded) {
    return <View style={[styles.embeddedRoot, style]}>{content}</View>;
  }

  return (
    <HomePanelCard
      style={[styles.card, compact && styles.cardCompact, style]}
      innerStyle={compact ? styles.cardInnerCompact : undefined}
    >
      {content}
    </HomePanelCard>
  );
};

const styles = StyleSheet.create({
  embeddedRoot: {
    width: '100%',
  },
  card: {
    marginBottom: 12,
  },
  cardCompact: {
    flex: 1,
    minWidth: 0,
    marginBottom: 0,
    alignSelf: 'stretch',
  },
  cardInnerCompact: {
    padding: SPACING.sm,
    flex: 1,
  },
  heroPriceCompact: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    lineHeight: 28,
  },
  heroDeltaCompact: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    lineHeight: 16,
  },
  odometerRowCompact: {
    flexWrap: 'wrap',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    gap: 4,
  },
  odometerTextCompact: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    flexShrink: 1,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroMain: {
    flex: 1,
  },
  heroMainFull: {
    flex: 1,
    marginRight: 0,
  },
  healthInline: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    marginTop: 8,
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
  healthCircleMuted: {
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.neutral.gray[100],
  },
  healthCirclePctMuted: {
    fontSize: 20,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.tertiary,
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
