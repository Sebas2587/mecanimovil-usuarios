import AsyncStorage from '@react-native-async-storage/async-storage';

export const PENDING_GUEST_INTENT_KEY = 'pending_guest_intent';
/** Vehículo consultado como invitado → banner opcional en UserPanel (nunca fuerza registro). */
export const PENDING_GUEST_VEHICLE_SUGGESTION_KEY = 'pending_guest_vehicle_suggestion';
/** Tras login: preferir seleccionar esta patente en el panel si ya está en el garaje. */
export const PREFERRED_VEHICLE_PATENTE_KEY = 'preferred_vehicle_patente';

/**
 * Guarda intención del invitado antes de registrarse.
 * @param {{ type?: 'vehicle'|'schedule', patente?: string, vehicleData?: object, schedule?: object }} payload
 */
export async function savePendingGuestIntent(payload = {}) {
  const { patente, vehicleData, schedule, type } = payload;
  if (!patente && !schedule) return;

  const data = {
    type: schedule ? 'schedule' : type || 'vehicle',
    patente: patente ? String(patente).toUpperCase().trim() : null,
    vehicleData: vehicleData || null,
    schedule: schedule || null,
    savedAt: Date.now(),
  };
  await AsyncStorage.setItem(PENDING_GUEST_INTENT_KEY, JSON.stringify(data));
}

/**
 * Sugerencia opcional de agregar el auto consultado (guest → login sin schedule).
 * No abre VehicleRegistration sola: el home la muestra como banner Airbnb.
 */
export async function savePendingGuestVehicleSuggestion({ patente, vehicleData } = {}) {
  const plate = patente ? String(patente).toUpperCase().trim() : null;
  if (!plate) return;
  await AsyncStorage.setItem(
    PENDING_GUEST_VEHICLE_SUGGESTION_KEY,
    JSON.stringify({
      patente: plate,
      vehicleData: vehicleData || null,
      savedAt: Date.now(),
    }),
  );
}

export async function peekPendingGuestVehicleSuggestion() {
  try {
    const raw = await AsyncStorage.getItem(PENDING_GUEST_VEHICLE_SUGGESTION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function clearPendingGuestVehicleSuggestion() {
  await AsyncStorage.removeItem(PENDING_GUEST_VEHICLE_SUGGESTION_KEY);
}

export async function setPreferredVehiclePatente(patente) {
  const plate = patente ? String(patente).toUpperCase().trim() : null;
  if (!plate) return;
  await AsyncStorage.setItem(PREFERRED_VEHICLE_PATENTE_KEY, plate);
}

export async function peekPreferredVehiclePatente() {
  try {
    const plate = await AsyncStorage.getItem(PREFERRED_VEHICLE_PATENTE_KEY);
    return plate ? String(plate).toUpperCase().trim() : null;
  } catch {
    return null;
  }
}

export async function consumePreferredVehiclePatente() {
  try {
    const plate = await AsyncStorage.getItem(PREFERRED_VEHICLE_PATENTE_KEY);
    if (plate) await AsyncStorage.removeItem(PREFERRED_VEHICLE_PATENTE_KEY);
    return plate ? String(plate).toUpperCase().trim() : null;
  } catch {
    return null;
  }
}

/** Guarda intención de agendar un servicio concreto tras registrarse. */
export async function savePendingGuestScheduleIntent({
  patente,
  vehicleData,
  provider,
  providerType,
  servicio,
  ofertaServicioId,
}) {
  if (!provider?.id || !servicio) return;
  await savePendingGuestIntent({
    type: 'schedule',
    patente,
    vehicleData,
    schedule: {
      provider,
      providerType: providerType || provider._panelKind || 'taller',
      servicio,
      ofertaServicioId: ofertaServicioId ?? servicio?.oferta_id ?? null,
    },
  });
}

export async function peekPendingGuestIntent() {
  try {
    const raw = await AsyncStorage.getItem(PENDING_GUEST_INTENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function consumePendingGuestIntent() {
  const intent = await peekPendingGuestIntent();
  if (intent) {
    await AsyncStorage.removeItem(PENDING_GUEST_INTENT_KEY);
  }
  return intent;
}

export async function clearPendingGuestIntent() {
  await AsyncStorage.removeItem(PENDING_GUEST_INTENT_KEY);
}
