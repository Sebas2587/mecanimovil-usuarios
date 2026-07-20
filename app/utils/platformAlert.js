import { Platform, Alert } from 'react-native';

/**
 * React Native `Alert.alert` no tiene implementación completa en web.
 * Un único `PlatformAlertHost` en App.js registra el host; no montar varios.
 */

let alertHost = null;
let alertHostId = 0;

/**
 * @param {object|null} host
 * @param {number} [hostId] — si se pasa en cleanup, solo anula si sigue siendo el host activo
 */
export function registerPlatformAlertHost(host, hostId) {
  if (host == null) {
    if (hostId == null || hostId === alertHostId) {
      alertHost = null;
    }
    return;
  }
  alertHostId += 1;
  alertHost = host;
  return alertHostId;
}

export function showAlert(title, message = '', options = {}) {
  const t = title ?? '';
  const m = message ?? '';
  const buttonText = options.buttonText || 'Entendido';

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (alertHost?.alert) {
      alertHost.alert({ title: t, message: m, buttonText }).catch((e) => console.error('showAlert web host', e));
      return;
    }
    window.alert(m ? `${t}\n\n${m}` : t);
    return;
  }
  Alert.alert(t, m, [{ text: buttonText }]);
}

/**
 * Diálogo con Cancelar + acción principal.
 */
export function showConfirm(
  title,
  message,
  {
    onConfirm,
    onCancel,
    confirmText = 'Aceptar',
    cancelText = 'Cancelar',
    destructive = false,
  } = {},
) {
  const t = title ?? '';
  const m = message ?? '';

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const runConfirm = () => Promise.resolve(onConfirm?.()).catch((e) => console.error(e));

    if (alertHost?.confirm) {
      alertHost
        .confirm({ title: t, message: m, confirmText, cancelText, destructive })
        .then((accepted) => {
          if (accepted) runConfirm();
          else onCancel?.();
        })
        .catch((e) => console.error('showConfirm web host', e));
      return;
    }

    const text = m ? `${t}\n\n${m}` : t;
    if (window.confirm(text)) {
      runConfirm();
    } else {
      onCancel?.();
    }
    return;
  }

  Alert.alert(t, m, [
    { text: cancelText, style: 'cancel', onPress: onCancel },
    {
      text: confirmText,
      style: destructive ? 'destructive' : 'default',
      onPress: () => Promise.resolve(onConfirm?.()).catch((e) => console.error(e)),
    },
  ]);
}

/** @deprecated use showConfirm */
export function confirmDestructive(message, onConfirm, options = {}) {
  const { title = '', confirmText = 'OK' } = options;
  showConfirm(title, message, { onConfirm, confirmText, destructive: true });
}

/**
 * Alert con varios botones. En web con host: modal de opciones.
 */
export function showAlertButtons(title, message, buttons = [{ text: 'OK' }]) {
  const list = Array.isArray(buttons) ? buttons : [{ text: 'OK' }];
  const cancelBtn = list.find((b) => b.style === 'cancel');
  const actionBtns = list.filter((b) => b.style !== 'cancel');

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (alertHost?.choose && list.length > 1) {
      alertHost
        .choose({ title, message, buttons: list })
        .then((selected) => {
          if (selected?.onPress) {
            selected.onPress();
          } else if (!selected && cancelBtn?.onPress) {
            cancelBtn.onPress();
          }
        })
        .catch((e) => console.error('showAlertButtons web host', e));
      return;
    }

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
