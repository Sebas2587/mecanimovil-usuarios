/**
 * Service Worker para Web Push Notifications (RFC 8030 / VAPID)
 * Maneja notificaciones push cuando la app web está cerrada o en background.
 * Ref: https://developer.chrome.com/blog/push-notifications-on-the-open-web
 */

const APP_ORIGIN = self.location.origin;

// ─── Push event: mostrar notificacion ───────────────────────────────────────
self.addEventListener('push', (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {
      title: 'MecaniMóvil',
      body: event.data ? event.data.text() : 'Tienes una nueva notificación.',
    };
  }

  const title = payload.title || 'MecaniMóvil';
  const body = payload.body || '';
  const data = payload.data || {};
  const type = data.type || 'default';

  // Icono segun tipo de notificacion
  const iconMap = {
    health_alert: '/assets/images/app-icon.png',
    global_health_alert: '/assets/images/app-icon.png',
    chat_message: '/assets/images/app-icon.png',
    nueva_oferta: '/assets/images/app-icon.png',
    new_offer: '/assets/images/app-icon.png',
  };
  const icon = iconMap[type] || '/assets/images/app-icon.png';

  const options = {
    body,
    icon,
    badge: '/assets/images/app-icon.png',
    data: { ...data, url: APP_ORIGIN },
    requireInteraction: ['health_alert', 'global_health_alert', 'nueva_oferta'].includes(type),
    tag: type + (data.solicitud_id || data.vehicle_id || ''),
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Notification click: abrir o enfocar la app ─────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = APP_ORIGIN;

  // Construir URL segun tipo para deep-link dentro de la SPA
  const type = data.type;
  if (type === 'chat_message' || type === 'nuevo_mensaje_chat') {
    targetUrl = APP_ORIGIN + (data.conversation_id ? `/?tab=chats&conv=${data.conversation_id}` : '/?tab=chats');
  } else if (
    ['nueva_oferta', 'new_offer', 'offer_accepted', 'solicitud_adjudicada',
     'cambio_estado', 'status_update', 'order_completed', 'solicitud_rechazada'].includes(type)
  ) {
    targetUrl = APP_ORIGIN + (data.solicitud_id ? `/?tab=solicitudes&id=${data.solicitud_id}` : '/?tab=solicitudes');
  } else if (['health_alert', 'global_health_alert', 'salud_actualizada'].includes(type)) {
    targetUrl = APP_ORIGIN + (data.vehicle_id ? `/?tab=salud&vehiculo=${data.vehicle_id}` : '/?tab=salud');
  } else if (['marketplace_offer', 'nueva_oferta_marketplace'].includes(type)) {
    targetUrl = APP_ORIGIN + (data.vehicle_id ? `/?tab=marketplace&vehiculo=${data.vehicle_id}` : '/?tab=marketplace');
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si hay una pestaña de la app abierta, enfocarla
      for (const client of clientList) {
        if (client.url.startsWith(APP_ORIGIN) && 'focus' in client) {
          return client.focus();
        }
      }
      // Si no hay pestana abierta, abrir una nueva
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ─── Push subscription change: re-suscribirse si el navegador rota la clave ──
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: event.oldSubscription
          ? event.oldSubscription.options.applicationServerKey
          : null,
      })
      .then((newSubscription) => {
        // Notificar al cliente activo para que registre la nueva suscripcion
        return clients.matchAll({ type: 'window' }).then((clientList) => {
          for (const client of clientList) {
            client.postMessage({
              type: 'PUSH_SUBSCRIPTION_ROTATED',
              subscription: JSON.parse(JSON.stringify(newSubscription)),
            });
          }
        });
      })
      .catch((err) => {
        console.error('[sw] Error re-suscribiendo push:', err);
      })
  );
});
