import { Platform, Alert } from 'react-native';

/**
 * React Native `Alert.alert` no tiene implementación en web (solo iOS/Android).
 * Usamos `window.alert` / `window.confirm` en navegador.
 */

export function showAlert(title, message = '') {
  const t = title ?? '';
  const m = message ?? '';
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(m ? `${t}\n\n${m}` : t);
    return;
  }
  Alert.alert(t, m);
}

/**
 * Diálogo confirmar / cancelar. En web: `window.confirm` (Aceptar = ejecutar onConfirm).
 */
export function confirmDestructive(message, onConfirm, options = {}) {
  const { title = '', confirmText = 'OK' } = options;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const text = title ? `${title}\n\n${message}` : message;
    if (window.confirm(text)) {
      Promise.resolve(onConfirm()).catch((e) => console.error(e));
    }
    return;
  }
  Alert.alert(title || 'Confirmar', message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: confirmText, style: 'destructive', onPress: () => Promise.resolve(onConfirm()).catch((e) => console.error(e)) },
  ]);
}
