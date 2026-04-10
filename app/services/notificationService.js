import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

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
  async mostrarNotificacionLocal(titulo, mensaje, data = {}) {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission && this.isAvailable()) {
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: titulo,
          body: mensaje,
          sound: 'default',
          data: {
            ...data,
            timestamp: new Date().toISOString()
          },
        },
        trigger: null, // Mostrar inmediatamente
      });

      console.log('📱 Notificación local enviada:', titulo);
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