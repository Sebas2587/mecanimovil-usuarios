import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { calculateDistance } from '../utils/geoUtils';

const TRIP_TASK_NAME = 'mecanimovil-trip-tracking-task';
const TRIP_STORAGE_KEY = '@trip_tracking_snapshot';

const MIN_ACCURACY_M = 50;
const MIN_DISTANCE_KM = 0.008;
const MAX_DISTANCE_KM = 2;
const MIN_SPEED_KMH = 3;
const MAX_SPEED_KMH = 200;

const emptySnapshot = () => ({
  active: false,
  vehicleId: null,
  km: 0,
  startTime: null,
  endTime: null,
  lastPoint: null,
  lastTimestamp: null,
  startCoords: null,
  endCoords: null,
});

const readSnapshot = async () => {
  try {
    const raw = await AsyncStorage.getItem(TRIP_STORAGE_KEY);
    if (!raw) return emptySnapshot();
    return { ...emptySnapshot(), ...JSON.parse(raw) };
  } catch {
    return emptySnapshot();
  }
};

const writeSnapshot = async (snapshot) => {
  await AsyncStorage.setItem(TRIP_STORAGE_KEY, JSON.stringify(snapshot));
};

const processPoint = (snapshot, coords, timestamp) => {
  const { latitude, longitude, accuracy, speed: rawSpeed } = coords;
  if (accuracy && accuracy > MIN_ACCURACY_M) return snapshot;

  const point = { latitude, longitude };
  const now = timestamp || Date.now();
  const next = { ...snapshot };

  if (!next.startCoords) next.startCoords = point;
  next.endCoords = point;

  if (!next.lastPoint) {
    next.lastPoint = point;
    next.lastTimestamp = now;
    return next;
  }

  const dist = calculateDistance(
    next.lastPoint.latitude,
    next.lastPoint.longitude,
    latitude,
    longitude,
  );

  if (dist < MIN_DISTANCE_KM || dist > MAX_DISTANCE_KM) {
    next.lastPoint = point;
    next.lastTimestamp = now;
    return next;
  }

  const dtHours = (now - (next.lastTimestamp || now)) / 3600000;
  const instantSpeed = dtHours > 0 ? dist / dtHours : 0;

  if (rawSpeed != null && rawSpeed >= 0) {
    const speedKmh = rawSpeed * 3.6;
    if (speedKmh < MIN_SPEED_KMH || speedKmh > MAX_SPEED_KMH) {
      next.lastPoint = point;
      next.lastTimestamp = now;
      return next;
    }
  } else if (instantSpeed < MIN_SPEED_KMH || instantSpeed > MAX_SPEED_KMH) {
    next.lastPoint = point;
    next.lastTimestamp = now;
    return next;
  }

  next.km = (next.km || 0) + dist;
  next.lastPoint = point;
  next.lastTimestamp = now;
  return next;
};

TaskManager.defineTask(TRIP_TASK_NAME, async ({ data, error }) => {
  if (error) return;
  const locations = data?.locations || [];
  if (!locations.length) return;

  const snapshot = await readSnapshot();
  if (!snapshot.active) return;

  let updated = snapshot;
  for (const loc of locations) {
    updated = processPoint(updated, loc.coords, loc.timestamp);
  }
  await writeSnapshot(updated);
});

export const startTripTracking = async (vehicleId) => {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') {
    throw new Error('Se requieren permisos de ubicación en primer plano.');
  }

  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== 'granted') {
    throw new Error('Se requieren permisos de ubicación en segundo plano para telemetría.');
  }

  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(TRIP_TASK_NAME);
  if (alreadyStarted) {
    await Location.stopLocationUpdatesAsync(TRIP_TASK_NAME);
  }

  const snapshot = {
    ...emptySnapshot(),
    active: true,
    vehicleId,
    startTime: Date.now(),
  };
  await writeSnapshot(snapshot);

  await Location.startLocationUpdatesAsync(TRIP_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 5000,
    distanceInterval: 10,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Mecanimovil - Telemetria activa',
      notificationBody: 'Registrando kilometros del viaje en segundo plano.',
      notificationColor: '#0d9488',
    },
  });

  return snapshot;
};

export const getTripSnapshot = async () => {
  return readSnapshot();
};

export const stopTripTracking = async () => {
  const snapshot = await readSnapshot();
  const started = await Location.hasStartedLocationUpdatesAsync(TRIP_TASK_NAME);
  if (started) {
    await Location.stopLocationUpdatesAsync(TRIP_TASK_NAME);
  }

  const finalSnapshot = {
    ...snapshot,
    active: false,
    endTime: Date.now(),
  };
  await writeSnapshot(finalSnapshot);
  return finalSnapshot;
};

export const resetTripTracking = async () => {
  const started = await Location.hasStartedLocationUpdatesAsync(TRIP_TASK_NAME);
  if (started) {
    await Location.stopLocationUpdatesAsync(TRIP_TASK_NAME);
  }
  await writeSnapshot(emptySnapshot());
};
