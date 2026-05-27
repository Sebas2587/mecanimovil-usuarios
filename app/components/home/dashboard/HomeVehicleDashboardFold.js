import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SPACING } from '../../../design-system/tokens';
import HomeWeatherPreviewSection from './HomeWeatherPreviewSection';

/**
 * Clima del vehículo en el home (telemetría en pantalla Registrar viaje + barra global).
 */
const HomeVehicleDashboardFold = ({ visible, weather }) => {
  if (!visible) return null;

  return (
    <View style={styles.wrap}>
      <HomeWeatherPreviewSection {...weather} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 18,
  },
});

export default React.memo(HomeVehicleDashboardFold);
