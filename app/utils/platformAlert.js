import { Platform, Alert } from 'react-native';

/**
 * React Native `Alert.alert` no tiene implementación completa en web.
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
 * Diálogo con Cancelar + acción principal. En web: window.confirm.
 */
export function showConfirm(title, message, { onConfirm, onCancel, confirmText = 'Aceptar' } = {}) {
  const t = title ?? '';
  const m = message ?? '';
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const text = m ? `${t}\n\n${m}` : t;
    if (window.confirm(text)) {
      Promise.resolve(onConfirm?.()).catch((e) => console.error(e));
    } else {
      onCancel?.();
    }
    return;
  }
  Alert.alert(t, m, [
    { text: 'Cancelar', style: 'cancel', onPress: onCancel },
    { text: confirmText, onPress: () => Promise.resolve(onConfirm?.()).catch((e) => console.error(e)) },
  ]);
}

/** @deprecated use showConfirm */
export function confirmDestructive(message, onConfirm, options = {}) {
  const { title = '', confirmText = 'OK' } = options;
  showConfirm(title, message, { onConfirm, confirmText });
}

/**
 * Alert con varios botones. En web: confirm para cancel+1 acción; si hay más, alert + ejecuta el último no-cancel.
 */
export function showAlertButtons(title, message, buttons = [{ text: 'OK' }]) {
  const list = Array.isArray(buttons) ? buttons : [{ text: 'OK' }];
  const cancelBtn = list.find((b) => b.style === 'cancel');
  const actionBtns = list.filter((b) => b.style !== 'cancel');

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (actionBtns.length === 1 && (cancelBtn || list.length === 2)) {
      const text = [title, message].filter(Boolean).join('\n\n');
      if (window.confirm(text)) {
        actionBtns[0].onPress?.();
      } else {
        cancelBtn?.onPress?.();
      }
      return;
    }
    if (actionBtns.length === 0) {
      showAlert(title, message);
      list[0]?.onPress?.();
      return;
    }
    showAlert(title, message);
    actionBtns[actionBtns.length - 1].onPress?.();
    return;
  }

  Alert.alert(title, message, list);
}
