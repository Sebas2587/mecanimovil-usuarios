import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, BORDERS, SHADOWS } from '../../../design-system/tokens';
import HomeVehicleVitalityStrip from './HomeVehicleVitalityStrip';
import HomePatrimonyHeroSection from './HomePatrimonyHeroSection';
import HomeTelemetrySection from './HomeTelemetrySection';
import HomeWeatherPreviewSection from './HomeWeatherPreviewSection';

/**
 * Un solo bloque: resumen vital (siempre visible) + detalle al expandir.
 */
const HomeVehicleDashboardFold = ({
  visible,
  tripActive,
  expanded: expandedProp,
  onToggle,
  valuation,
  priceDelta,
  healthScore,
  healthScoreColor,
  odometer,
  motorType,
  onPressHealth,
  tripKm,
  climateRiskPct,
  weatherAvailable,
  telemetry,
  weather,
}) => {
  const [expandedInternal, setExpandedInternal] = useState(false);
  const expanded = expandedProp != null ? expandedProp : expandedInternal;

  const handleToggle = () => {
    if (onToggle) onToggle();
    else setExpandedInternal((v) => !v);
  };

  useEffect(() => {
    if (tripActive && expandedProp == null) setExpandedInternal(true);
  }, [tripActive, expandedProp]);

  if (!visible) return null;

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={[styles.headerCard, tripActive && !expanded && styles.headerHighlight]}
        onPress={handleToggle}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={
          expanded
            ? 'Contraer detalle del vehículo'
            : 'Expandir valor, viaje y clima de tu vehículo'
        }
      >
        <HomeVehicleVitalityStrip
          healthScore={healthScore}
          healthScoreColor={healthScoreColor}
          odometer={odometer}
          valuation={valuation}
          tripActive={tripActive}
          tripKm={tripKm}
          climateRiskPct={climateRiskPct}
          weatherAvailable={weatherAvailable}
          onPressHealth={onPressHealth}
          embedded
          expanded={expanded}
        />
      </TouchableOpacity>

      {expanded ? (
        <View style={styles.body}>
          <HomePatrimonyHeroSection
            valuation={valuation}
            priceDelta={priceDelta}
            healthScore={healthScore}
            healthScoreColor={healthScoreColor}
            odometer={odometer}
            motorType={motorType}
            onPressHealth={onPressHealth}
            showHealthRing={false}
          />
          <HomeTelemetrySection
            tripActive={telemetry.tripActive}
            tripKm={telemetry.tripKm}
            tripElapsed={telemetry.tripElapsed}
            currentSpeed={telemetry.currentSpeed}
            onStartTrip={telemetry.onStartTrip}
            onStopTrip={telemetry.onStopTrip}
          />
          <HomeWeatherPreviewSection {...weather} />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 18,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  headerHighlight: {
    borderColor: COLORS.primary[200],
    backgroundColor: COLORS.primary[50],
  },
  body: {
    marginTop: 12,
    gap: 0,
  },
});

export default React.memo(HomeVehicleDashboardFold);
