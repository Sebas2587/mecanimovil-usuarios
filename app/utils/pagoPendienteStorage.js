import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MP_CHECKOUT_WEBVIEW_ACTIVE_KEY } from './constants';

export const PAGO_PENDIENTE_STORAGE_KEYS = [
  'pago_pendiente',
  'pago_pendiente_data',
  'expected_deep_link',
  'pending_deep_link',
];

/** URL de retorno real de Mercado Pago (HTTPS, deep link o query params MP). */
export function isMercadoPagoReturnUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  if (
    lower.includes('payment_id=') ||
    lower.includes('collection_id=') ||
    lower.includes('collection_status=') ||
    lower.includes('external_reference=')
  ) {
    return true;
  }
  if (lower.startsWith('mecanimovil://payment')) return true;
  if (/\/payment\/(success|failure|pending)/i.test(lower) && !lower.includes('from_storage=true')) {
    return true;
  }
  return false;
}

/** Callback interno obsoleto (p. ej. recarga en /payment/processing?from_storage=true). */
export function isStaleProcessingCallback(params = {}, url = null) {
  if (isMercadoPagoReturnUrl(url)) return false;
  if (params.from_foreground) return false;
  if (params.payment_id || params.collection_id || params.external_reference) return false;

  const status = String(params.status || '').toLowerCase();
  if (params.from_storage) return true;
  if (status === 'processing' && !params.payment_id) return true;
  return false;
}

export async function clearPagoPendienteStorage() {
  await AsyncStorage.multiRemove([
    ...PAGO_PENDIENTE_STORAGE_KEYS,
    MP_CHECKOUT_WEBVIEW_ACTIVE_KEY,
  ]);
}

/**
 * En cold start / recarga, descarta datos de pago guardados si no hay retorno legítimo de MP.
 * @returns {Promise<boolean>} true si se limpió storage
 */
export async function discardStalePaymentSessionOnColdStart() {
  const pendingDeepLink = await AsyncStorage.getItem('pending_deep_link');
  if (pendingDeepLink && isMercadoPagoReturnUrl(pendingDeepLink)) {
    return false;
  }

  let initialUrl = null;
  try {
    initialUrl = await Linking.getInitialURL();
  } catch (_) {
    initialUrl = null;
  }

  if (isMercadoPagoReturnUrl(initialUrl)) {
    return false;
  }

  const pagoPendienteData = await AsyncStorage.getItem('pago_pendiente_data');
  if (!pagoPendienteData && !pendingDeepLink) {
    return false;
  }

  await clearPagoPendienteStorage();
  return true;
}
