import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MP_CHECKOUT_WEBVIEW_ACTIVE_KEY } from './constants';

/** Pestaña de MP abierta sincrónicamente en el click del usuario (evita bloqueo de popups en web). */
let activeMpCheckoutTab = null;

/**
 * URLs de retorno para Checkout Pro.
 * En web usa HTTPS (mismo origen) para que MP redirija de vuelta a la SPA.
 * En nativo usa el scheme mecanimovil:// para deep linking.
 */
export function getMercadoPagoBackUrls() {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.replace(/\/$/, '');
    return {
      success: `${origin}/payment/success`,
      failure: `${origin}/payment/failure`,
      pending: `${origin}/payment/pending`,
    };
  }

  return {
    success: 'mecanimovil://payment/success',
    failure: 'mecanimovil://payment/failure',
    pending: 'mecanimovil://payment/pending',
  };
}

/**
 * Abre una pestaña en blanco de forma SÍNCRONA (debe llamarse en el handler del click,
 * antes de cualquier await). En nativo no hace nada.
 * @returns {Window|null}
 */
export function openMercadoPagoCheckoutTabSync() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;

  const tab = window.open('about:blank', 'mecanimovil-mp-checkout', 'noopener');
  activeMpCheckoutTab = tab;
  return tab;
}

/**
 * Navega la pestaña pre-abierta al checkout de Mercado Pago.
 * @returns {Window|null}
 */
export function assignCheckoutUrlToTab(checkoutUrl) {
  const tab = activeMpCheckoutTab;
  if (!tab || tab.closed || !checkoutUrl) return tab;

  try {
    tab.location.href = checkoutUrl;
  } catch (err) {
    console.warn('No se pudo asignar URL al checkout de MP:', err);
  }
  return tab;
}

/** Obtiene y limpia la referencia a la pestaña de checkout (para MercadoPagoWebViewScreen). */
export function consumeMpCheckoutTab() {
  const tab = activeMpCheckoutTab;
  activeMpCheckoutTab = null;
  return tab;
}

/** Cierra la pestaña de checkout si sigue abierta (p. ej. error al crear preferencia). */
export function closeMpCheckoutTab() {
  const tab = activeMpCheckoutTab;
  activeMpCheckoutTab = null;
  if (tab && !tab.closed) {
    try {
      tab.close();
    } catch {
      // ignorar
    }
  }
}

/**
 * Navega a la pantalla de checkout de Mercado Pago.
 * En ambas plataformas navega a MercadoPagoWebView; la pantalla decide
 * cómo renderizar según el entorno (WebView en nativo, nueva pestaña en web).
 */
export async function navigateToMercadoPagoCheckout({ checkoutUrl, navigation }) {
  if (!checkoutUrl) {
    closeMpCheckoutTab();
    throw new Error('No se pudo obtener el enlace de pago');
  }

  if (Platform.OS === 'web') {
    assignCheckoutUrlToTab(checkoutUrl);
  }

  await AsyncStorage.setItem(MP_CHECKOUT_WEBVIEW_ACTIVE_KEY, String(Date.now()));
  navigation.navigate('MercadoPagoWebView', { checkoutUrl });
}
