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
}) => (
  <TouchableOpacity activeOpacity={0.85} onPress={onPressOpenDetail} style={styles.wrap}>
    <HomePanelCard innerStyle={styles.inner}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.primary[500]} size="small" />
          <Text style={styles.muted}>Consultando clima...</Text>
        </View>
      ) : !available ? (
        <View style={styles.centered}>
          <CloudRain size={24} color={COLORS.text.tertiary} />
          <Text style={styles.muted}>{unavailableReason || 'Clima no disponible.'}</Text>
        </View>
      ) : (
        <>
          <View style={styles.headerRow}>
            <CloudRain size={20} color={riskColorForLevel(overallRiskLevel)} />
            <Text style={styles.riskLabel}>Riesgo de desgaste (clima)</Text>
          </View>
          <Text style={[styles.riskPct, { color: riskColorForLevel(overallRiskLevel) }]}>
            {climateRiskPct}%
          </Text>
          {overallRiskLabel ? (
            <Text style={[styles.riskBand, { color: riskColorForLevel(overallRiskLevel) }]}>
              {overallRiskLabel}
            </Text>
          ) : null}
          {weatherCity ? (
            <Text style={styles.city}>
              {weatherCity} · {weatherCondition} · {weatherTemp != null ? `${weatherTemp}°C` : '—'}
              {weatherAgeLabel ? ` · ${weatherAgeLabel}` : ''}
            </Text>
          ) : null}
          <View style={styles.bars}>
            <MicroBar label="Frenos" pct={frenoWearPct} color={COLORS.error.main} />
            <MicroBar label="Gomas" pct={gomaWearPct} color={COLORS.success.main} />
          </View>
          <View style={styles.footer}>
            <Droplets size={12} color={COLORS.text.tertiary} />
            <Text style={styles.footerText}>Toca para análisis climático al conducir</Text>
          </View>
        </>
      )}
    </HomePanelCard>
  </TouchableOpacity>
);

function MicroBar({ label, pct, color }) {
  return (
    <View style={styles.microRow}>
      <Text style={styles.microLabel}>{label}</Text>
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
  inner: {
    padding: SPACING.cardPadding,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
    minHeight: 100,
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
  },
  riskPct: {
    ...TYPOGRAPHY.styles.numberDisplay,
    fontSize: TYPOGRAPHY.fontSize['3xl'],
    lineHeight: 34,
    marginBottom: 4,
    ...(Platform.OS === 'web' ? { fontFeatureSettings: '"tnum"' } : {}),
  },
  riskBand: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    marginBottom: 6,
  },
  city: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
    marginBottom: 10,
  },
  bars: {
    gap: 10,
    marginBottom: 4,
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
