import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configurar el comportamiento de las notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  constructor() {
    this.isInitialized = false;
    this.initializeService();
  }

  /**
   * Inicializar el servicio de notificaciones
   */
  async initializeService() {
    try {
      // Solo inicializar en dispositivos físicos (Expo Go soporta notificaciones ahora)
      if (!Constants.isDevice) {
        console.log('📱 Notificaciones: Ejecutándose en Simulador - funcionalidad limitada');
        return;
      }

      // Configurar canal de notificaciones para Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'MecaniMóvil',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2A4065',
          sound: 'default',
        });
      }

      this.isInitialized = true;
      console.log('📱 Servicio de notificaciones inicializado correctamente');
    } catch (error) {
      console.error('❌ Error inicializando servicio de notificaciones:', error);
    }
  }

  /**
   * Verificar si las notificaciones están disponibles
   */
  isAvailable() {
    // Las notificaciones push requieren dispositivo físico
    if (!Constants.isDevice) {
      return false;
    }
    return true;
  }

  /**
   * Solicitar permisos para notificaciones
   */
  async requestPermissions() {
    try {
      if (!this.isAvailable()) {
        console.log('📱 Notificaciones no disponibles en Expo Go');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Permisos de notificación denegados');
        return false;
      }

      console.log('✅ Permisos de notificación concedidos');
      return true;
    } catch (error) {
      console.error('❌ Error al solicitar permisos de notificación:', error);
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
    try {
      if (!this.isAvailable()) {
        console.log('📱 Push tokens no disponibles en simuladores');
        return null;
      }

      // IMPORTANTE: Para Expo Go necesitamos pedir permisos explícitamente aquí si no se han pedido
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      // Obtener el token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId,
      });

      const token = tokenData.data;
      console.log('🔑 Push token obtenido:', token);
      return token;
    } catch (error) {
      console.error('❌ Error obteniendo push token:', error);
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