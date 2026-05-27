import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { getUserVehicles } from '../services/vehicle';
import { showAlert } from '../utils/platformAlert';
import { registrarViaje } from '../services/tripService';
import {
  startTripTracking,
  stopTripTracking,
  getTripSnapshot,
  resetTripTracking,
} from '../services/tripTrackingService';
import { formatKm } from '../components/home/shared/homeFormatters';

const TripTrackingContext = createContext(null);

export function TripTrackingProvider({ children }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [tripActive, setTripActive] = useState(false);
  const [tripKm, setTripKm] = useState(0);
  const [tripStartTime, setTripStartTime] = useState(null);
  const [tripElapsed, setTripElapsed] = useState(0);
  const [tripCompletionVisible, setTripCompletionVisible] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [tripCoords, setTripCoords] = useState({ start: null, end: null });
  const elapsedRef = useRef(null);

  const { data: vehiclesRaw } = useQuery({
    queryKey: ['userVehicles', user?.id ?? 'anon'],
    queryFn: getUserVehicles,
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    select: (d) => (Array.isArray(d) ? d : d?.results || []),
  });

  const vehicles = useMemo(() => vehiclesRaw || [], [vehiclesRaw]);

  useEffect(() => {
    if (vehicles.length === 0) return;
    if (!selectedVehicleId || !vehicles.some((v) => v.id === selectedVehicleId)) {
      setSelectedVehicleId(vehicles[0].id);
    }
  }, [vehicles, selectedVehicleId]);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) || null,
    [vehicles, selectedVehicleId],
  );

  const odometer = selectedVehicle?.kilometraje || 0;

  useEffect(() => {
    if (tripActive && tripStartTime) {
      elapsedRef.current = setInterval(() => {
        setTripElapsed(Date.now() - tripStartTime);
      }, 1000);
    }
    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
  }, [tripActive, tripStartTime]);

  useEffect(() => {
    let poller = null;
    if (tripActive) {
      poller = setInterval(async () => {
        const snapshot = await getTripSnapshot();
        setTripKm(snapshot.km || 0);
        setCurrentSpeed(snapshot.currentSpeed || 0);
        setTripCoords({
          start: snapshot.startCoords || null,
          end: snapshot.endCoords || null,
        });
      }, 2000);
    } else {
      setCurrentSpeed(0);
    }
    return () => {
      if (poller) clearInterval(poller);
    };
  }, [tripActive]);

  useEffect(
    () => () => {
      if (elapsedRef.current) {
        clearInterval(elapsedRef.current);
        elapsedRef.current = null;
      }
    },
    [],
  );

  const startTrip = useCallback(async () => {
    if (!selectedVehicle) {
      showAlert('Sin vehículo', 'Selecciona un vehículo para iniciar el viaje.');
      return false;
    }
    try {
      await resetTripTracking();
      const snapshot = await startTripTracking(selectedVehicle.id);
      setTripKm(0);
      setTripElapsed(0);
      setTripStartTime(snapshot.startTime || Date.now());
      setTripCoords({ start: null, end: null });
      setTripActive(true);
      return true;
    } catch (err) {
      showAlert(
        'Error GPS',
        err?.message ||
          'No se pudo iniciar el rastreo de ubicación. Verifica permisos de ubicación.',
      );
      setTripActive(false);
      return false;
    }
  }, [selectedVehicle]);

  const stopTrip = useCallback(async () => {
    const snapshot = await stopTripTracking();
    const km = snapshot.km || 0;

    if (elapsedRef.current) {
      clearInterval(elapsedRef.current);
      elapsedRef.current = null;
    }

    setTripKm(km);
    setTripCoords({
      start: snapshot.startCoords || null,
      end: snapshot.endCoords || null,
    });
    if (snapshot.startTime) setTripStartTime(snapshot.startTime);
    if (snapshot.startTime && snapshot.endTime) {
      setTripElapsed(snapshot.endTime - snapshot.startTime);
    }

    setTripActive(false);
    if (km > 0.01) setTripCompletionVisible(true);
  }, []);

  const dismissTrip = useCallback(() => {
    setTripCompletionVisible(false);
    setTripKm(0);
    setTripElapsed(0);
    setTripStartTime(null);
    setTripCoords({ start: null, end: null });
    resetTripTracking();
  }, []);

  const confirmTrip = useCallback(async () => {
    if (!selectedVehicle || tripKm <= 0) return;
    setRegistering(true);
    try {
      const durationSec = tripElapsed ? Math.round(tripElapsed / 1000) : 0;
      const avgSpd = durationSec > 0 ? tripKm / (durationSec / 3600) : 0;

      const result = await registrarViaje(selectedVehicle.id, {
        km_recorridos: parseFloat(tripKm.toFixed(2)),
        duracion_segundos: durationSec,
        coordenadas_inicio: tripCoords.start || null,
        coordenadas_fin: tripCoords.end || null,
        velocidad_promedio_kmh: parseFloat(avgSpd.toFixed(1)),
        fecha_inicio: tripStartTime ? new Date(tripStartTime).toISOString() : null,
      });

      queryClient.invalidateQueries({ queryKey: ['userVehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleHealth', selectedVehicle.id] });
      queryClient.invalidateQueries({ queryKey: ['vehicleHealthComponents', selectedVehicle.id] });

      const nuevoKm =
        result?.km_odometro_nuevo ?? result?.kilometraje_actual ?? Math.round(odometer + tripKm);

      showAlert(
        'Viaje registrado',
        `Se registraron ${tripKm.toFixed(1)} km. Nuevo odómetro: ${formatKm(nuevoKm)} km.`,
      );
    } catch (err) {
      const isTimeout = err?.code === 'ECONNABORTED' || err?.message?.includes('timeout');
      if (isTimeout) {
        showAlert(
          'Registro lento',
          'El servidor tardó en responder. Verifica el odómetro en unos segundos.',
        );
      } else {
        const msg =
          err?.response?.data?.detail ||
          err?.response?.data?.km_recorridos?.[0] ||
          err?.message ||
          'Error desconocido';
        showAlert('Error al registrar', `No se pudo registrar el viaje: ${msg}`);
      }
    } finally {
      setRegistering(false);
      setTripCompletionVisible(false);
      setTripKm(0);
      setTripElapsed(0);
      setTripStartTime(null);
      setTripCoords({ start: null, end: null });
      await resetTripTracking();
    }
  }, [selectedVehicle, tripKm, tripElapsed, tripStartTime, odometer, queryClient, tripCoords]);

  const avgSpeed = tripElapsed > 0 ? tripKm / (tripElapsed / 3600000) : 0;

  const value = useMemo(
    () => ({
      vehicles,
      selectedVehicle,
      selectedVehicleId,
      setSelectedVehicleId,
      odometer,
      tripActive,
      tripKm,
      tripElapsed,
      tripCompletionVisible,
      registering,
      currentSpeed,
      avgSpeed,
      startTrip,
      stopTrip,
      dismissTrip,
      confirmTrip,
    }),
    [
      vehicles,
      selectedVehicle,
      selectedVehicleId,
      odometer,
      tripActive,
      tripKm,
      tripElapsed,
      tripCompletionVisible,
      registering,
      currentSpeed,
      avgSpeed,
      startTrip,
      stopTrip,
      dismissTrip,
      confirmTrip,
    ],
  );

  return (
    <TripTrackingContext.Provider value={value}>{children}</TripTrackingContext.Provider>
  );
}

export function useTripTracking() {
  const ctx = useContext(TripTrackingContext);
  if (!ctx) {
    throw new Error('useTripTracking debe usarse dentro de TripTrackingProvider');
  }
  return ctx;
}
