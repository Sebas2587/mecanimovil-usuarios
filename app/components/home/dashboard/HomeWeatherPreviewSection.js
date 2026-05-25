import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { CloudRain, Droplets } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../../design-system/tokens';
import { HomePanelCard } from '../shared/HomePanelCard';
import { riskColorForLevel } from './riskColorMap';

const HomeWeatherPreviewSection = ({
  loading,
  available,
  unavailableReason,
  overallRiskLevel,
  overallRiskLabel,
  climateRiskPct,
  weatherCity,
  weatherCondition,
  weatherTemp,
  weatherAgeLabel,
  frenoWearPct,
  gomaWearPct,
  onPressOpenDetail,
  compact = false,
}) => (
  <TouchableOpacity
    activeOpacity={0.85}
    onPress={onPressOpenDetail}
    style={[styles.wrap, compact && styles.wrapCompact]}
  >
    <HomePanelCard
      style={compact ? styles.cardCompact : undefined}
      innerStyle={[styles.inner, compact && styles.innerCompact]}
    >
      {loading ? (
        <View style={[styles.centered, compact && styles.centeredCompact]}>
          <ActivityIndicator color={COLORS.primary[500]} size="small" />
          <Text style={styles.muted}>Consultando clima...</Text>
        </View>
      ) : !available ? (
        <View style={[styles.centered, compact && styles.centeredCompact]}>
          <CloudRain size={24} color={COLORS.text.tertiary} />
          <Text style={styles.muted}>{unavailableReason || 'Clima no disponible.'}</Text>
        </View>
      ) : (
        <>
          <View style={styles.headerRow}>
            <CloudRain size={compact ? 14 : 20} color={riskColorForLevel(overallRiskLevel)} />
            <Text style={[styles.riskLabel, compact && styles.riskLabelCompact]} numberOfLines={2}>
              {compact ? 'Riesgo desgaste' : 'Riesgo de desgaste (clima)'}
            </Text>
          </View>
          <Text
            style={[
              styles.riskPct,
              compact && styles.riskPctCompact,
              { color: riskColorForLevel(overallRiskLevel) },
            ]}
          >
            {climateRiskPct}%
          </Text>
          {overallRiskLabel ? (
            <Text
              style={[styles.riskBand, compact && styles.riskBandCompact, { color: riskColorForLevel(overallRiskLevel) }]}
              numberOfLines={compact ? 2 : undefined}
            >
              {overallRiskLabel}
            </Text>
          ) : null}
          {weatherCity && !compact ? (
            <Text style={styles.city}>
              {weatherCity} · {weatherCondition} · {weatherTemp != null ? `${weatherTemp}°C` : '—'}
              {weatherAgeLabel ? ` · ${weatherAgeLabel}` : ''}
            </Text>
          ) : null}
          {compact && weatherCity ? (
            <Text style={styles.cityCompact} numberOfLines={2}>
              {weatherCity}
              {weatherTemp != null ? ` · ${weatherTemp}°C` : ''}
            </Text>
          ) : null}
          <View style={[styles.bars, compact && styles.barsCompact]}>
            <MicroBar label="Frenos" pct={frenoWearPct} color={COLORS.error.main} compact={compact} />
            <MicroBar label="Gomas" pct={gomaWearPct} color={COLORS.success.main} compact={compact} />
          </View>
          {!compact ? (
            <View style={styles.footer}>
              <Droplets size={12} color={COLORS.text.tertiary} />
              <Text style={styles.footerText}>Toca para análisis climático al conducir</Text>
            </View>
          ) : null}
        </>
      )}
    </HomePanelCard>
  </TouchableOpacity>
);

function MicroBar({ label, pct, color, compact }) {
  return (
    <View style={styles.microRow}>
      <Text style={[styles.microLabel, compact && styles.microLabelCompact]}>{label}</Text>
      <View style={styles.microTrack}>
        <View style={[styles.microFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.microPct}>{pct}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 0,
  },
  wrapCompact: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
  },
  cardCompact: {
    flex: 1,
    minWidth: 0,
  },
  inner: {
    padding: SPACING.cardPadding,
  },
  innerCompact: {
    padding: SPACING.sm,
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
    minHeight: 100,
  },
  centeredCompact: {
    minHeight: 72,
    paddingVertical: 12,
  },
  muted: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  riskLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    flex: 1,
  },
  riskLabelCompact: {
    fontSize: 10,
    lineHeight: 13,
  },
  riskPct: {
    ...TYPOGRAPHY.styles.numberDisplay,
    fontSize: TYPOGRAPHY.fontSize['3xl'],
    lineHeight: 34,
    marginBottom: 4,
    ...(Platform.OS === 'web' ? { fontFeatureSettings: '"tnum"' } : {}),
  },
  riskPctCompact: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    lineHeight: 28,
    marginBottom: 2,
  },
  riskBand: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    marginBottom: 6,
  },
  riskBandCompact: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    lineHeight: 16,
    marginBottom: 4,
  },
  city: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
    marginBottom: 10,
  },
  cityCompact: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.tertiary,
    marginBottom: 6,
    lineHeight: 15,
  },
  bars: {
    gap: 10,
    marginBottom: 4,
  },
  barsCompact: {
    gap: 6,
    marginTop: 2,
  },
  microRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  microLabel: {
    width: 44,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
  },
  microLabelCompact: {
    width: 36,
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
  microTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.neutral.gray[200],
    overflow: 'hidden',
  },
  microFill: {
    height: '100%',
    borderRadius: 3,
  },
  microPct: {
    width: 36,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    color: COLORS.text.tertiary,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  footerText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
    fontStyle: 'italic',
  },
});

export default React.memo(HomeWeatherPreviewSection);
