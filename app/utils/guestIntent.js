import AsyncStorage from '@react-native-async-storage/async-storage';

export const PENDING_GUEST_INTENT_KEY = 'pending_guest_intent';

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
