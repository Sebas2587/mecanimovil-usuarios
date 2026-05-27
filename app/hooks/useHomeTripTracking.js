import { useEffect } from 'react';
import { useTripTracking } from '../context/TripTrackingContext';

/**
 * @deprecated Usar useTripTracking() desde TripTrackingProvider.
 * Mantiene compatibilidad sincronizando el vehículo del panel.
 */
export function useHomeTripTracking(selectedVehicle) {
  const trip = useTripTracking();

  useEffect(() => {
    if (selectedVehicle?.id) {
      trip.setSelectedVehicleId(selectedVehicle.id);
    }
  }, [selectedVehicle?.id, trip.setSelectedVehicleId]);

  return {
    tripActive: trip.tripActive,
    tripKm: trip.tripKm,
    tripElapsed: trip.tripElapsed,
    tripCompletionVisible: trip.tripCompletionVisible,
    registering: trip.registering,
    currentSpeed: trip.currentSpeed,
    avgSpeed: trip.avgSpeed,
    startTrip: trip.startTrip,
    stopTrip: trip.stopTrip,
    dismissTrip: trip.dismissTrip,
    confirmTrip: trip.confirmTrip,
  };
}
