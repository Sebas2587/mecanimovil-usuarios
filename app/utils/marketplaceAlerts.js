import { Alert, Platform } from 'react-native';

/**
 * Alertas compatibles con iOS, Android y web (Alert.alert no ejecuta onPress en web).
 */
export function showMarketplaceAlert(title, message, buttons = [{ text: 'OK' }]) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const lines = [title, message].filter(Boolean);
    window.alert(lines.join('\n\n'));
    const primary = buttons.find((b) => b.style !== 'cancel') || buttons[0];
    if (primary?.onPress) {
      primary.onPress();
    }
    return;
  }
  Alert.alert(title, message, buttons);
}

export const MSG_OFERTA_ACTIVA_MISMO_VENDEDOR =
  'No puedes enviar más ofertas a este vendedor hasta que acepte o rechace tu oferta activa.';
