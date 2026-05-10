import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// setNotificationHandler se llama en App.js (nivel de módulo) para garantizar
// que esté activo antes de que cualquier componente se monte.
// Este bloque queda solo como documentación; no llamar aquí para evitar doble setup.

const ANDROID_CHANNELS = [
  {
    id: 'default',
    name: 'General',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2A4065',
    sound: 'default',
  },
  {
    id: 'salud',
    name: 'Salud del Vehículo',
    description: 'Alertas y actualizaciones de métricas de salud',
    // MAX: banner / heads-up y sonido cuando el usuario no ha silenciado el canal (Android 8+)
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#EF4444',
    sound: 'default',
  },
  {
    id: 'viajes',
    name: 'Viajes y Telemetría',
    description: 'Confirmaciones de viaje y kilometraje',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200],
    lightColor: '#10B981',
    sound: 'default',
  },
  {
    id: 'servicios',
    name: 'Servicios y Pagos',
    description: 'Ofertas, estados de solicitudes y recordatorios de pago',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#3B82F6',
    sound: 'default',
  },
  {
    id: 'chat',
    name: 'Chat',
    description: 'Mensajes de negociación y chat con talleres',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 200, 200],
    lightColor: '#6366F1',
    sound: 'default',
  },
  {
    id: 'marketplace',
    name: 'Marketplace',
    description: 'Ofertas en tu vehículo publicado y alertas de mercado',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#F59E0B',
    sound: 'default',
  },
  {
    id: 'clima',
    name: 'Alerta Climática',
    description: 'Análisis y alertas de condiciones climáticas para conducción',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200],
    lightColor: '#06B6D4',
    sound: 'default',
  },
];

class NotificationService {
  constructor() {
    this.isInitialized = false;
    /** @type {Promise<void>} */
    this._initPromise = this.initializeService();
  }

  /** Esperar canales Android y setup nativo antes de pedir token (evita condiciones de carrera al abrir la app). */
  async ensureInitialized() {
    await this._initPromise;
  }

  async initializeService() {
    try {
      if (!Constants.isDevice && Platform.OS !== 'web') {
        console.log('[NotificationService] Ejecutándose en simulador – push no disponible.');
      }

      if (Platform.OS === 'android') {
        await Promise.all(
          ANDROID_CHANNELS.map((ch) => Notifications.setNotificationChannelAsync(ch.id, ch)),
        );
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('[NotificationService] Error inicializando:', error);
    }
  }

  /**
   * Verificar si las notificaciones están disponibles
   */
  isAvailable() {
    // Si es web, las notificaciones push de Expo no están soportadas
    if (Platform.OS === 'web') return false;

    // NOTA: No bloqueamos por !Constants.isDevice aquí porque en algunos entornos 
    // de producción/dev builds puede reportar false incorrectamente en dispositivos físicos.
    return true;
  }

  /**
   * Solicitar permisos para notificaciones
   */
  async requestPermissions() {
    console.log('📱 [NotificationService] Solicitando permisos...');
    try {
      if (Platform.OS === 'web') return false;

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log('📱 [NotificationService] Estado actual de permisos:', existingStatus);

      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        console.log('📱 [NotificationService] Los permisos no están otorgados. Solicitando...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ [NotificationService] Permisos denegados por el usuario');
        return false;
      }

      console.log('✅ [NotificationService] Permisos otorgados');
      return true;
    } catch (error) {
      console.error('❌ [NotificationService] Error al solicitar permisos:', error);
      return false;
    }
  }

  /**
   * Mostrar notificación local (funciona en Expo Go)
   */
  /**
   * Mapeo de tipo → canal Android para que cada push vaya al canal correcto.
   */
  _channelForType(type) {
    if (!type) return 'default';
    if (type.includes('salud') || type.includes('health')) return 'salud';
    if (type.includes('viaje') || type.includes('trip')) return 'viajes';
    if (type.includes('chat') || type.includes('mensaje')) return 'chat';
    if (type.includes('oferta') || type.includes('solicitud') || type.includes('pago') || type.includes('offer')) return 'servicios';
    if (type.includes('marketplace') || type.includes('vehicle')) return 'marketplace';
    if (type.includes('clima') || type.includes('weather') || type.includes('driving')) return 'clima';
    return 'default';
  }

  async mostrarNotificacionLocal(titulo, mensaje, data = {}) {
    try {
      // Web (y entornos sin módulo nativo): no hay scheduleNotificationAsync; evitar UnavailabilityError.
      if (!this.isAvailable()) {
        return;
      }

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return;
      }

      const channelId = this._channelForType(data?.type);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: titulo,
          body: mensaje,
          sound: 'default',
          // Android: enrutar al canal correcto (salud, servicios, chat, marketplace, clima, etc.)
          ...(Platform.OS === 'android' ? { channelId } : {}),
          data: {
            ...data,
            timestamp: new Date().toISOString(),
          },
        },
        trigger: null, // Mostrar inmediatamente
      });

      if (__DEV__) {
        console.log('📱 Notificación local enviada:', titulo, '→ canal:', channelId);
      }
    } catch (error) {
      console.error('❌ Error al mostrar notificación local:', error);
    }
  }

  /**
   * Mostrar notificación cuando se agrega un servicio al carrito
   */
  async notificarServicioAgregado(nombreServicio, cantidadTotal) {
    await this.mostrarNotificacionLocal(
      '🛒 Servicio agregado al carrito',
      `${nombreServicio} ha sido agregado. Tienes ${cantidadTotal} servicio${cantidadTotal > 1 ? 's' : ''} en tu carrito.`,
      {
        type: 'carrito_actualizado',
        cantidadServicios: cantidadTotal
      }
    );
  }

  /**
   * Mostrar notificación cuando se confirma un agendamiento
   */
  async notificarAgendamientoConfirmado(numeroOrden, fechaServicio) {
    await this.mostrarNotificacionLocal(
      '✅ Agendamiento confirmado',
      `Tu orden #${numeroOrden} ha sido confirmada para el ${fechaServicio}.`,
      {
        type: 'agendamiento_confirmado',
        numeroOrden: numeroOrden
      }
    );
  }

  /**
   * Mostrar notificación recordatorio de servicio próximo
   */
  async programarRecordatorioServicio(fechaServicio, nombreServicio, horasAntes = 24) {
    try {
      if (!this.isAvailable()) {
        console.log('📱 Recordatorios no disponibles en Expo Go');
        return;
      }

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return;

      const fechaNotificacion = new Date(fechaServicio);
      fechaNotificacion.setHours(fechaNotificacion.getHours() - horasAntes);

      // Solo programar si la fecha es en el futuro
      if (fechaNotificacion > new Date()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🔧 Recordatorio de servicio',
            body: `Tu servicio de ${nombreServicio} está programado para mañana.`,
            sound: 'default',
            data: {
              type: 'recordatorio_servicio',
              nombreServicio: nombreServicio
            },
          },
          trigger: {
            date: fechaNotificacion,
          },
        });

        console.log('📅 Recordatorio programado para:', fechaNotificacion);
      }
    } catch (error) {
      console.error('❌ Error al programar recordatorio de servicio:', error);
    }
  }

  /**
   * Cancelar todas las notificaciones programadas
   */
  async cancelarTodasLasNotificaciones() {
    try {
      if (!this.isAvailable()) return;

      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('🗑️ Todas las notificaciones programadas han sido canceladas');
    } catch (error) {
      console.error('❌ Error al cancelar notificaciones:', error);
    }
  }

  /**
   * Obtener el número de notificaciones programadas
   */
  async obtenerNotificacionesProgramadas() {
    try {
      if (!this.isAvailable()) return [];

      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`📊 Notificaciones programadas: ${notifications.length}`);
      return notifications;
    } catch (error) {
      console.error('❌ Error al obtener notificaciones programadas:', error);
      return [];
    }
  }

  /**
   * Notificar actualización de salud del vehículo
   */
  async notificarSaludVehiculoActualizada(vehiculoInfo, componentesActualizados) {
    await this.mostrarNotificacionLocal(
      '🔧 Métricas actualizadas',
      `Las métricas de salud de tu ${vehiculoInfo} han sido actualizadas. ${componentesActualizados > 0 ? `${componentesActualizados} componente${componentesActualizados > 1 ? 's' : ''} actualizado${componentesActualizados > 1 ? 's' : ''}.` : ''}`,
      {
        type: 'salud_vehiculo_actualizada',
        vehiculo_info: vehiculoInfo,
        componentes_actualizados: componentesActualizados
      }
    );
  }

  /**
   * Nueva oferta recibida para una solicitud de servicio.
   * Canal: servicios (alta prioridad).
   */
  async notificarNuevaOferta({ proveedorNombre, vehiculo, solicitudId }) {
    await this.mostrarNotificacionLocal(
      '🔧 Nueva oferta recibida',
      `${proveedorNombre} hizo una oferta para tu ${vehiculo || 'vehículo'}.`,
      { type: 'nueva_oferta', solicitud_id: solicitudId },
    );
  }

  /**
   * Nueva oferta en vehículo publicado en Marketplace.
   * Canal: marketplace.
   */
  async notificarOfertaMarketplace({ compradorNombre, vehiculo, vehiculoId }) {
    await this.mostrarNotificacionLocal(
      '🚗 Nueva oferta en tu publicación',
      `${compradorNombre} está interesado en tu ${vehiculo || 'vehículo'}.`,
      { type: 'marketplace_offer', vehicle_id: vehiculoId },
    );
  }

  /**
   * Alerta de análisis climático para conducción.
   * Canal: clima.
   */
  async notificarAlertaClimatica({ titulo, cuerpo, vehiculoId }) {
    await this.mostrarNotificacionLocal(
      titulo || '🌦️ Alerta climática para conducción',
      cuerpo || 'Revisa las condiciones climáticas antes de salir.',
      { type: 'weather_alert', vehicle_id: vehiculoId },
    );
  }

  /**
   * Obtener token de push (solo para builds de producción)
   */
  async obtenerPushToken() {
    console.log('🔑 [NotificationService] Intentando obtener Expo Push Token...');
    try {
      if (Platform.OS === 'web') {
        console.log('⚠️ [NotificationService] Push tokens no disponibles en web');
        return null;
      }

      // IMPORTANTE: Para Expo Go necesitamos pedir permisos explícitamente aquí si no se han pedido
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('❌ [NotificationService] No se puede obtener token sin permisos');
        return null;
      }

      // Obtener el token
      console.log('🔑 [NotificationService] Llamando a getExpoPushTokenAsync...');
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId,
      });

      const token = tokenData.data;
      console.log('✅ [NotificationService] Push token obtenido exitosamente:', token);
      return token;
    } catch (error) {
      console.error('❌ [NotificationService] Error obteniendo push token:', error);
      return null;
    }
  }

  /**
   * Registrar token de push en el backend
   */
  async registrarTokenEnBackend(token, userId) {
    try {
      // Guardrail: no intentar registrar si no hay sesión (evita 401 spam al boot).
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const authToken = await AsyncStorage.getItem('auth_token');
        if (!authToken) return null;
      } catch (_e) {
        // Si AsyncStorage falla por alguna razón, igual evitar romper el flujo.
      }

      const { post } = require('./api');
      const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'unknown';

      const response = await post('/usuarios/registrar-push-token/', {
        push_token: token,
        user_id: userId,
        dispositivo: `${Platform.OS} Device`,
        plataforma: platform
      });

      console.log('✅ Push token registrado en backend:', response);
      return response;
    } catch (error) {
      console.error('❌ Error registrando push token en backend:', error);
      return null;
    }
  }

  /**
   * Desactivar token de push en el backend (al cerrar sesión)
   */
  async desactivarTokenEnBackend(token) {
    try {
      const { post } = require('./api');

      await post('/usuarios/desactivar-push-token/', {
        push_token: token
      });

      console.log('✅ Push token desactivado en backend');
    } catch (error) {
      console.error('❌ Error desactivando push token:', error);
    }
  }
}

export default new NotificationService(); 