import React from 'react';
import { View, StyleSheet } from 'react-native';
import HomeVehicleDashboardFold from './HomeVehicleDashboardFold';

/**
 * Clima del vehículo seleccionado al final del home.
 */
const HomeVehicleDashboardCard = ({ selectedVehicle, weather }) => {
  if (!selectedVehicle) return null;

  return (
    <View style={styles.wrap}>
      <HomeVehicleDashboardFold visible weather={weather} />
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
