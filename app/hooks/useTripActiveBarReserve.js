import { useMemo } from 'react';
import { useTripTracking } from '../context/TripTrackingContext';
import { getTripActiveBarReserve } from '../components/trip/TripActiveBar';

/**
 * Reserva inferior para footers fijos cuando TripActiveBar está visible (stack).
 */
export function useTripActiveBarReserve() {
  const { tripActive } = useTripTracking();
  const tripBarReserve = useMemo(() => getTripActiveBarReserve(tripActive), [tripActive]);
  return { tripActive, tripBarReserve };
}
