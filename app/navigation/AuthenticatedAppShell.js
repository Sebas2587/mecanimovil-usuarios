import React, { Suspense, lazy } from 'react';
import { View, StyleSheet } from 'react-native';
import { TripTrackingProvider, useTripTracking } from '../context/TripTrackingContext';
import { useAuth } from '../context/AuthContext';
import TripActiveBar from '../components/trip/TripActiveBar';
import HomeTripCompletionModal from '../components/home/dashboard/HomeTripCompletionModal';
import { useLegalConsentGate } from '../hooks/useLegalConsentGate';
import AppNavigator from './AppNavigator';

const LegalConsentModal = lazy(() => import('../components/legal/LegalConsentModal'));

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
 * El gate GuestLanding vs shell está en App.js (`isAuthenticated`).
 */
export default function AuthenticatedAppShell() {
  const { isAuthenticated } = useAuth();
  const { needsConsent, clearNeedsConsent } = useLegalConsentGate(isAuthenticated);

  return (
    <TripTrackingProvider>
      <View style={styles.root}>
        <View style={styles.nav}>
          <AppNavigator />
        </View>
        <TripActiveBar />
        <TripCompletionOverlay />
        {needsConsent ? (
          <Suspense fallback={null}>
            <LegalConsentModal visible={needsConsent} onAccepted={clearNeedsConsent} />
          </Suspense>
        ) : null}
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
