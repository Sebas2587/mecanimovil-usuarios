/**
 * webPushService.js
 * Gestiona la suscripcion a Web Push Notifications (VAPID/RFC 8030) en navegadores.
 * Solo se ejecuta en Platform.OS === 'web'.
 *
 * Flujo:
 * 1. Registrar el Service Worker (/sw.js)
 * 2. Obtener la VAPID public key del backend
 * 3. Llamar pushManager.subscribe(...)
 * 4. Enviar la suscripcion al backend para persistir
 *
 * Refs:
 *  - Expo docs: https://docs.expo.dev/versions/latest/sdk/notifications/
 *  - Web Push: https://developer.chrome.com/blog/push-notifications-on-the-open-web
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { get, post } from './api';

const WEB_PUSH_ENDPOINT_KEY = 'web_push_endpoint';

/**
 * Convierte una cadena base64url a Uint8Array (requerido por pushManager.subscribe).
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Registra el Service Worker si aun no esta registrado.
 * Devuelve el ServiceWorkerRegistration o null si falla.
 */
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[webPush] Service Workers no soportados en este navegador.');
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return registration;
  } catch (err) {
    console.error('[webPush] Error registrando Service Worker:', err);
    return null;
  }
}

/**
 * Solicita permiso de notificaciones al usuario.
 * Devuelve true si se concede, false si se deniega.
 */
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('[webPush] Notifications API no soportada.');
    return false;
  }

  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') {
    console.warn('[webPush] El usuario bloqueó las notificaciones. Debe habilitarlas manualmente.');
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

/**
 * Obtiene la VAPID public key desde el backend.
 */
async function getVapidPublicKey() {
  try {
    const response = await get('/usuarios/vapid-public-key/');
    return response?.vapid_public_key || null;
  } catch (err) {
    console.error('[webPush] No se pudo obtener VAPID public key:', err);
    return null;
  }
}

/**
 * Registra la suscripcion en el backend.
 */
async function registerSubscriptionInBackend(subscription) {
  const { endpoint, keys } = subscription.toJSON ? subscription.toJSON() : subscription;
  try {
    await post('/usuarios/registrar-web-push/', {
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    });
    await AsyncStorage.setItem(WEB_PUSH_ENDPOINT_KEY, endpoint);
  } catch (err) {
    console.error('[webPush] Error registrando suscripcion en backend:', err);
  }
}

/**
 * Flujo completo de suscripcion Web Push.
 * Debe llamarse despues de que el usuario inicia sesion (requiere auth token).
 * Solo actua en Platform.OS === 'web'.
 */
export async function subscribeWebPush() {
  if (Platform.OS !== 'web') return;
  if (!('PushManager' in window)) {
    console.warn('[webPush] Push API no soportada en este navegador.');
    return;
  }

  try {
    // 1. Registrar Service Worker
    const registration = await registerServiceWorker();
    if (!registration) return;

    // 2. Solicitar permiso
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return;

    // 3. Verificar si ya hay una suscripcion activa
    const existingSub = await registration.pushManager.getSubscription();
    if (existingSub) {
      // Ya esta suscrito — re-registrar en backend por si se perdio (ej. nuevo login)
      await registerSubscriptionInBackend(existingSub);
      return;
    }

    // 4. Obtener VAPID key del backend
    const vapidPublicKey = await getVapidPublicKey();
    if (!vapidPublicKey) {
      console.warn('[webPush] Sin VAPID key — omitiendo suscripcion.');
      return;
    }

    // 5. Suscribirse
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    // 6. Persistir en backend
    await registerSubscriptionInBackend(subscription);
    console.log('[webPush] Suscripcion registrada exitosamente.');

    // 7. Escuchar rotaciones de suscripcion desde el Service Worker
    navigator.serviceWorker.addEventListener('message', async (event) => {
      if (event.data?.type === 'PUSH_SUBSCRIPTION_ROTATED') {
        await registerSubscriptionInBackend(event.data.subscription);
      }
    });
  } catch (err) {
    console.error('[webPush] Error en subscribeWebPush:', err);
  }
}

/**
 * Desuscribirse y notificar al backend (usar en logout).
 */
export async function unsubscribeWebPush() {
  if (Platform.OS !== 'web') return;
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!registration) return;

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();

    try {
      await post('/usuarios/desactivar-web-push/', { endpoint });
    } catch (err) {
      console.warn('[webPush] No se pudo desactivar en backend (usuario ya sin auth):', err?.message);
    }

    await AsyncStorage.removeItem(WEB_PUSH_ENDPOINT_KEY);
    console.log('[webPush] Suscripcion cancelada.');
  } catch (err) {
    console.error('[webPush] Error en unsubscribeWebPush:', err);
  }
}

/**
 * Verificar si el navegador actual tiene una suscripcion activa.
 */
export async function getWebPushStatus() {
  if (Platform.OS !== 'web') return { supported: false };
  if (!('PushManager' in window)) return { supported: false, reason: 'PushManager not supported' };
  if (!('Notification' in window)) return { supported: false, reason: 'Notification API not supported' };

  const permission = Notification.permission;
  if (!('serviceWorker' in navigator)) return { supported: false, reason: 'ServiceWorker not supported' };

  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    const subscription = registration
      ? await registration.pushManager.getSubscription()
      : null;

    return {
      supported: true,
      permission,
      subscribed: !!subscription,
      endpoint: subscription?.endpoint?.slice(0, 60) || null,
    };
  } catch (err) {
    return { supported: true, permission, subscribed: false, error: err.message };
  }
}
