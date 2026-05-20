import React from 'react';
import { View, StyleSheet } from 'react-native';
import HomeVehicleVitalityStrip from './HomeVehicleVitalityStrip';
import HomeVehicleDashboardFold from './HomeVehicleDashboardFold';

/**
 * Bloque del vehículo al final del home: resumen + detalle colapsable.
 */
const HomeVehicleDashboardCard = ({
  selectedVehicle,
  expanded,
  onToggle,
  healthScore,
  healthScoreColor,
  odometer,
  valuation,
  tripActive,
  tripKm,
  climateRiskPct,
  weatherAvailable,
  onPressHealth,
  priceDelta,
  motorType,
  telemetry,
  weather,
}) => {
  if (!selectedVehicle) return null;

  return (
    <View style={styles.wrap}>
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
        onPressDetails={onToggle}
      />
      <HomeVehicleDashboardFold
        visible
        expanded={expanded}
        onToggle={onToggle}
        tripActive={tripActive}
        valuation={valuation}
        priceDelta={priceDelta}
        healthScore={healthScore}
        healthScoreColor={healthScoreColor}
        odometer={odometer}
        motorType={motorType}
        onPressHealth={onPressHealth}
        telemetry={telemetry}
        weather={weather}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    marginBottom: 8,
  },
});

export default React.memo(HomeVehicleDashboardCard);
