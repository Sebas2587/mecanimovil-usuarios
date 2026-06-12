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

/** HTML mínimo para la pestaña pre-abierta (evita pantalla en blanco mientras se crea la preferencia). */
const MP_TAB_LOADING_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Preparando pago — Mecanimovil</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
      font-family: system-ui, -apple-system, sans-serif; background: #f4f6f8; color: #1a1a1a;
    }
    .wrap { text-align: center; padding: 24px; max-width: 320px; }
    .spinner {
      width: 40px; height: 40px; margin: 0 auto 20px;
      border: 3px solid #e0e0e0; border-top-color: #007EA7;
      border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h1 { font-size: 18px; font-weight: 600; margin: 0 0 8px; }
    p { font-size: 14px; color: #666; margin: 0; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="spinner" aria-hidden="true"></div>
    <h1>Preparando tu pago</h1>
    <p>En un momento serás redirigido a Mercado Pago de forma segura.</p>
  </div>
</body>
</html>`;

/**
 * Abre una pestaña con pantalla de carga de forma SÍNCRONA (debe llamarse en el handler del click,
 * antes de cualquier await). En nativo no hace nada.
 * @returns {Window|null}
 */
export function openMercadoPagoCheckoutTabSync() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;

  const loadingUrl = `data:text/html;charset=utf-8,${encodeURIComponent(MP_TAB_LOADING_HTML)}`;
  const tab = window.open(loadingUrl, 'mecanimovil-mp-checkout', 'noopener,noreferrer');
  activeMpCheckoutTab = tab;

  // Fallback si data: URL no abre (algunos navegadores): about:blank + write
  if (tab) {
    try {
      if (!tab.location?.href || tab.location.href === 'about:blank') {
        tab.document.open();
        tab.document.write(MP_TAB_LOADING_HTML);
        tab.document.close();
      }
    } catch {
      // assignCheckoutUrlToTab redirigirá cuando exista la preferencia
    }
  }

  return tab;
}

function tabNeedsCheckoutUrl(tab, checkoutUrl) {
  if (!tab || tab.closed || !checkoutUrl) return false;
  try {
    const href = tab.location?.href || '';
    if (href.startsWith('data:text/html')) return true;
    if (href === 'about:blank' || href.endsWith('about:blank')) return true;
    if (href.includes('mercadopago')) return false;
    return href === '';
  } catch {
    return false;
  }
}

/**
 * Navega la pestaña pre-abierta al checkout de Mercado Pago.
 * @returns {Window|null}
 */
export function assignCheckoutUrlToTab(checkoutUrl) {
  const tab = activeMpCheckoutTab;
  if (!tab || tab.closed || !checkoutUrl) return tab;

  if (tabNeedsCheckoutUrl(tab, checkoutUrl)) {
    try {
      tab.location.href = checkoutUrl;
    } catch (err) {
      console.warn('No se pudo asignar URL al checkout de MP:', err);
    }
  }
  return tab;
}

/** Asigna checkoutUrl a una pestaña ya abierta (p. ej. desde MercadoPagoWebViewScreen). */
export function navigateMpTabToCheckout(tab, checkoutUrl) {
  if (!tab || tab.closed || !checkoutUrl) return;
  if (tabNeedsCheckoutUrl(tab, checkoutUrl)) {
    try {
      tab.location.href = checkoutUrl;
    } catch (err) {
      console.warn('No se pudo navegar pestaña MP al checkout:', err);
    }
  }
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
