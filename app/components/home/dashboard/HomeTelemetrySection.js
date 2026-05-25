import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '../../../design-system/tokens';
import Button from '../../base/Button/Button';
import { HomePanelCard } from '../shared/HomePanelCard';
import { formatDuration } from '../shared/homeFormatters';

const HomeTelemetrySection = ({
  tripActive,
  tripKm,
  tripElapsed,
  currentSpeed,
  onStartTrip,
  onStopTrip,
}) => (
  <HomePanelCard style={styles.card}>
    <View style={styles.stack}>
      <Text style={styles.consoleLabel}>Viaje y telemetría</Text>

      <View style={styles.kmRow}>
        <Text style={[styles.kmHuge, tripActive && styles.kmHugeLive]}>{tripKm.toFixed(1)}</Text>
        <Text style={styles.kmUnit}>km</Text>
      </View>

      {tripActive ? (
        <View style={styles.liveMetrics}>
          <View style={styles.liveMetric}>
            <Text style={styles.liveMetricLabel}>Tiempo</Text>
            <Text style={styles.liveMetricValue}>{formatDuration(tripElapsed)}</Text>
          </View>
          <View style={styles.liveDivider} />
          <View style={styles.liveMetric}>
            <Text style={styles.liveMetricLabel}>Velocidad</Text>
            <Text style={styles.liveMetricValue}>{Math.round(currentSpeed)} km/h</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.hint}>
          Registra un viaje con GPS y actualiza los kilómetros recorridos en tiempo real.
        </Text>
      )}

      <View style={styles.ctaWrap}>
        {tripActive ? (
          <Button
            title="Detener viaje"
            onPress={onStopTrip}
            type="danger"
            variant="solid"
            size="md"
            fullWidth
          />
        ) : (
          <Button
            title="Iniciar viaje"
            onPress={onStartTrip}
            type="primary"
            variant="solid"
            size="md"
            fullWidth
          />
        )}
      </View>
    </View>
  </HomePanelCard>
);

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  stack: {
    gap: SPACING.sm,
  },
  consoleLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  kmRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  kmHuge: {
    ...TYPOGRAPHY.styles.numberDisplay,
    fontSize: TYPOGRAPHY.fontSize['3xl'],
    lineHeight: 34,
    color: COLORS.text.primary,
    ...(Platform.OS === 'web' ? { fontFeatureSettings: '"tnum"' } : {}),
  },
  kmHugeLive: {
    fontSize: TYPOGRAPHY.styles.numberDisplay.fontSize,
    lineHeight: TYPOGRAPHY.styles.numberDisplay.lineHeight,
  },
  kmUnit: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    color: COLORS.text.tertiary,
  },
  liveMetrics: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingTop: SPACING.sm,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: COLORS.border.light,
    gap: SPACING.md,
  },
  liveMetric: {
    flex: 1,
  },
  liveDivider: {
    width: 1,
    backgroundColor: COLORS.border.light,
    marginVertical: 2,
  },
  liveMetricLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  liveMetricValue: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    color: COLORS.text.primary,
  },
  hint: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    lineHeight: 21,
  },
  ctaWrap: {
    marginTop: SPACING.xs,
  },
});

export default React.memo(HomeTelemetrySection);
