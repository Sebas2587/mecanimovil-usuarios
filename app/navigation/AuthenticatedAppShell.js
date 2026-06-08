import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TripTrackingProvider, useTripTracking } from '../context/TripTrackingContext';
import TripActiveBar from '../components/trip/TripActiveBar';
import HomeTripCompletionModal from '../components/home/dashboard/HomeTripCompletionModal';
import AppNavigator from './AppNavigator';
import PlatformAlertHost from '../components/common/PlatformAlertHost';

function TripCompletionOverlay() {
  const {
    tripCompletionVisible,
    tripKm,
    tripElapsed,
    avgSpeed,
    registering,
    confirmTrip,
    dismissTrip,
    selectedVehicle,
    odometer,
  } = useTripTracking();

  const vehicleLabel = selectedVehicle
    ? `${selectedVehicle.marca_nombre || ''} ${selectedVehicle.modelo_nombre || ''}`.trim()
    : '';

  return (
    <HomeTripCompletionModal
      visible={tripCompletionVisible}
      vehicleLabel={vehicleLabel}
      tripKm={tripKm}
      tripElapsed={tripElapsed}
      avgSpeed={avgSpeed}
      projectedOdometer={Math.round(odometer + tripKm)}
      registering={registering}
      onConfirm={confirmTrip}
      onDismiss={dismissTrip}
    />
  );
}

/**
 * App autenticada: navegación + barra de viaje global + modal de registro de km.
 */
export default function AuthenticatedAppShell() {
  return (
    <TripTrackingProvider>
      <View style={styles.root}>
        <View style={styles.nav}>
          <AppNavigator />
        </View>
        <TripActiveBar />
        <TripCompletionOverlay />
        <PlatformAlertHost />
      </View>
    </TripTrackingProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  nav: {
    flex: 1,
  },
});
