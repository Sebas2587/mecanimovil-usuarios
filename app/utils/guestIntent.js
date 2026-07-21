import AsyncStorage from '@react-native-async-storage/async-storage';

export const PENDING_GUEST_INTENT_KEY = 'pending_guest_intent';
/** Vehículo consultado como invitado → banner opcional en UserPanel (nunca fuerza registro). */
export const PENDING_GUEST_VEHICLE_SUGGESTION_KEY = 'pending_guest_vehicle_suggestion';
/** Tras login: preferir seleccionar esta patente en el panel si ya está en el garaje. */
export const PREFERRED_VEHICLE_PATENTE_KEY = 'preferred_vehicle_patente';
/** Tras firmar informe público: reclamar servicio al registrar vehículo. */
export const PENDING_INFORME_CLAIM_KEY = 'pending_informe_claim';

/**
 * Guarda intención del invitado antes de registrarse.
 * @param {{ type?: 'vehicle'|'schedule'|'informe_claim', patente?: string, vehicleData?: object, schedule?: object, informeToken?: string }} payload
 */
export async function savePendingGuestIntent(payload = {}) {
  const { patente, vehicleData, schedule, type, informeToken } = payload;
  if (!patente && !schedule && !informeToken) return;

  const data = {
    type: informeToken ? 'informe_claim' : schedule ? 'schedule' : type || 'vehicle',
    patente: patente ? String(patente).toUpperCase().trim() : null,
    vehicleData: vehicleData || null,
    schedule: schedule || null,
    informeToken: informeToken || null,
    savedAt: Date.now(),
  };
  await AsyncStorage.setItem(PENDING_GUEST_INTENT_KEY, JSON.stringify(data));
}

/** Guarda token(s) de informe firmado para reclamar tras registro/login. */
export async function savePendingInformeClaimIntent({ token, tokens, vehicleData } = {}) {
  const tokenList = Array.isArray(tokens) && tokens.length
    ? tokens.map((t) => String(t || '').trim()).filter(Boolean)
    : token
      ? [String(token).trim()]
      : [];
  if (!tokenList.length) return;

  const payload = {
    type: 'informe_claim',
    informeToken: tokenList[0],
    informeTokens: tokenList,
    patente: vehicleData?.patente ? String(vehicleData.patente).toUpperCase().trim() : null,
    vehicleData: vehicleData || null,
    savedAt: Date.now(),
  };
  await AsyncStorage.setItem(PENDING_GUEST_INTENT_KEY, JSON.stringify(payload));
  await AsyncStorage.setItem(PENDING_INFORME_CLAIM_KEY, JSON.stringify(payload));
}

/** Tokens pendientes normalizados desde el payload guardado. */
export function getPendingInformeClaimTokens(intent) {
  if (!intent) return [];
  if (Array.isArray(intent.informeTokens) && intent.informeTokens.length) {
    return intent.informeTokens.map((t) => String(t || '').trim()).filter(Boolean);
  }
  if (intent.informeToken) {
    return [String(intent.informeToken).trim()];
  }
  return [];
}

export async function peekPendingInformeClaimIntent() {
  try {
    const raw = await AsyncStorage.getItem(PENDING_INFORME_CLAIM_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function consumePendingInformeClaimIntent() {
  const intent = await peekPendingInformeClaimIntent();
  if (intent) {
    await AsyncStorage.removeItem(PENDING_INFORME_CLAIM_KEY);
  }
  return intent;
}

export async function clearPendingInformeClaimIntent() {
  await AsyncStorage.removeItem(PENDING_INFORME_CLAIM_KEY);
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
