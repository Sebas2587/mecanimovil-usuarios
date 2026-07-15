import AsyncStorage from '@react-native-async-storage/async-storage';

export const PENDING_GUEST_INTENT_KEY = 'pending_guest_intent';

/**
 * Guarda la intención del invitado (patente + datos del vehículo) antes de registrarse.
 */
export async function savePendingGuestIntent({ patente, vehicleData }) {
  if (!patente) return;
  const payload = {
    patente: String(patente).toUpperCase().trim(),
    vehicleData: vehicleData || null,
    savedAt: Date.now(),
  };
  await AsyncStorage.setItem(PENDING_GUEST_INTENT_KEY, JSON.stringify(payload));
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
