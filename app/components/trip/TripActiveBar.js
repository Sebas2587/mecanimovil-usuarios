import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Square } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SHADOWS, SPACING } from '../../design-system/tokens';
import { TAB_BAR_BASE_HEIGHT } from '../home/shared/homeLayoutConstants';
import { ROUTES } from '../../utils/constants';
import { useTripTracking } from '../../context/TripTrackingContext';
import { useRootRouteName } from '../../hooks/useRootRouteName';
import { navigateRoot } from '../../navigation/rootNavigationRef';
import { formatDuration } from '../home/shared/homeFormatters';

/** Altura de la barra (actualizar padding scroll del home si cambia). */
export const TRIP_ACTIVE_BAR_HEIGHT = 68;

/** Separación entre la barra y footers / safe area inferior en pantallas stack. */
export const TRIP_ACTIVE_BAR_GAP = 12;

/** Espacio extra inferior cuando hay viaje activo (barra + gap). */
export function getTripActiveBarReserve(tripActive) {
  return tripActive ? TRIP_ACTIVE_BAR_HEIGHT + TRIP_ACTIVE_BAR_GAP : 0;
}

function TripMetric({ value, label, primary = false }) {
  return (
    <View style={styles.metricCell}>
      <Text
        style={[styles.metricValue, primary && styles.metricValuePrimary]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {value}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

/**
 * Barra global de viaje activo (encima del tab bar o del safe area en pantallas stack).
 */
const TripActiveBar = () => {
  const insets = useSafeAreaInsets();
  const rootRouteName = useRootRouteName();
  const {
    tripActive,
    tripKm,
    tripElapsed,
    currentSpeed,
    stopTrip,
    selectedVehicle,
  } = useTripTracking();

  const onTabRoot = rootRouteName === 'TabNavigator';

  const bottomOffset = useMemo(() => {
    const tabPad = Math.max(insets.bottom, 8);
    return onTabRoot ? TAB_BAR_BASE_HEIGHT + tabPad : insets.bottom;
  }, [onTabRoot, insets.bottom]);

  if (!tripActive) return null;

  const openTripScreen = () => {
    navigateRoot(ROUTES.REGISTRAR_VIAJE, {
      vehicleId: selectedVehicle?.id,
      vehicle: selectedVehicle ?? undefined,
    });
  };

  return (
    <View
      style={[styles.wrap, { bottom: bottomOffset }]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={styles.bar}
        onPress={openTripScreen}
        activeOpacity={0.92}
        accessibilityRole="button"
        accessibilityLabel={`Viaje en curso, ${tripKm.toFixed(1)} kilómetros, ${formatDuration(tripElapsed)}`}
      >
        <View style={styles.liveMark} accessibilityElementsHidden>
          <View style={styles.liveDot} />
        </View>

        <View style={styles.metricsRow}>
          <TripMetric value={tripKm.toFixed(1)} label="km" primary />
          <View style={styles.metricDivider} />
          <TripMetric value={formatDuration(tripElapsed)} label="tiempo" />
          <View style={styles.metricDivider} />
          <TripMetric value={String(Math.round(currentSpeed))} label="km/h" />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.stopBtn}
        onPress={stopTrip}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Detener viaje"
      >
        <Square size={12} color={COLORS.text.inverse} fill={COLORS.text.inverse} />
        <Text style={styles.stopText}>Detener</Text>
      </TouchableOpacity>
    </View>
  );
};

const monoTabular = Platform.OS === 'web' ? { fontFeatureSettings: '"tnum"' } : {};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: SPACING.sm,
    right: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.xs,
    zIndex: 100,
  },
  bar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.card?.lg ?? BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    minHeight: TRIP_ACTIVE_BAR_HEIGHT,
    gap: SPACING.sm,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  liveMark: {
    paddingTop: 2,
    alignSelf: 'flex-start',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success.main,
  },
  metricsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  metricCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: 2,
  },
  metricValue: {
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.lg * TYPOGRAPHY.lineHeight.tight),
    color: COLORS.text.primary,
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
    ...monoTabular,
  },
  metricValuePrimary: {
    ...TYPOGRAPHY.styles.numberDisplay,
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    lineHeight: Math.round(TYPOGRAPHY.fontSize['2xl'] * TYPOGRAPHY.lineHeight.tight),
    color: COLORS.primary[700],
  },
  metricLabel: {
    marginTop: 2,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
  },
  metricDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: 4,
    backgroundColor: COLORS.border.light,
  },
  stopBtn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: COLORS.error.main,
    borderRadius: BORDERS.radius.card?.lg ?? BORDERS.radius.lg,
    ...SHADOWS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    minHeight: TRIP_ACTIVE_BAR_HEIGHT,
    minWidth: 72,
  },
  stopText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.inverse,
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
    textTransform: 'uppercase',
  },
});

export default React.memo(TripActiveBar);
