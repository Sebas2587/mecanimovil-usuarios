import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '../../../design-system/tokens';
import Button from '../../base/Button/Button';
import { formatDuration } from '../shared/homeFormatters';

/**
 * Bloque de telemetría del viaje — tipografía Airbnb + acento Tinder.
 */
const HomeTelemetrySection = ({
  tripActive,
  tripKm,
  tripElapsed,
  currentSpeed,
  onStartTrip,
  onStopTrip,
}) => (
  <View style={styles.card}>
    <Text style={styles.title}>Viaje</Text>
    <Text style={styles.subtitle}>Telemetría en tiempo real</Text>

    <View style={styles.kmRow}>
      <Text style={[styles.kmHuge, tripActive && styles.kmHugeLive]}>
        {Number(tripKm || 0).toFixed(1)}
      </Text>
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
          <Text style={styles.liveMetricValue}>{Math.round(currentSpeed || 0)} km/h</Text>
        </View>
      </View>
    ) : (
      <Text style={styles.hint}>
        Registra un viaje con GPS y actualiza los kilómetros en tiempo real.
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
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.text.primary,
  },
  subtitle: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    marginTop: 2,
    marginBottom: SPACING.md,
  },
  kmRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  kmHuge: {
    ...TYPOGRAPHY.styles.numberDisplay,
    color: COLORS.text.primary,
    ...(Platform.OS === 'web' ? { fontFeatureSettings: '"tnum"' } : {}),
  },
  kmHugeLive: {
    color: COLORS.primary[600],
  },
  kmUnit: {
    ...TYPOGRAPHY.styles.bodyBold,
    color: COLORS.text.tertiary,
  },
  liveMetrics: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingTop: SPACING.md,
    marginTop: SPACING.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border.light,
    gap: SPACING.md,
  },
  liveMetric: {
    flex: 1,
  },
  liveDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border.light,
    marginVertical: 2,
  },
  liveMetricLabel: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    marginBottom: 4,
  },
  liveMetricValue: {
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.text.primary,
  },
  hint: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  ctaWrap: {
    marginTop: SPACING.sm,
  },
});

export default React.memo(HomeTelemetrySection);
