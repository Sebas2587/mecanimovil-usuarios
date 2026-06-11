import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MP_CHECKOUT_WEBVIEW_ACTIVE_KEY } from './constants';

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
 * Navega a la pantalla de checkout de Mercado Pago.
 * En ambas plataformas navega a MercadoPagoWebView; la pantalla decide
 * cómo renderizar según el entorno (WebView en nativo, nueva pestaña en web).
 */
export async function navigateToMercadoPagoCheckout({ checkoutUrl, navigation }) {
  if (!checkoutUrl) {
    throw new Error('No se pudo obtener el enlace de pago');
  }

  await AsyncStorage.setItem(MP_CHECKOUT_WEBVIEW_ACTIVE_KEY, String(Date.now()));
  navigation.navigate('MercadoPagoWebView', { checkoutUrl });
}
