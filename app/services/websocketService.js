import api from './api';
import ServerConfig from '../config/serverConfig';
import logger from '../utils/logger';

/** Mensajes del protocolo WS del backend sin handler de UI (esperados). */
const WS_TYPES_OPTIONAL_NO_HANDLER = new Set(['current_statuses', 'subscription_confirmed', 'auth_invalid']);

class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    this.maxReconnectDelay = 30000;
    this.isConnected = false;
    this.isConnecting = false;
    this.isAuthenticated = false;
    this.authFailures = 0;
    this.maxAuthFailures = 3;
    this.messageHandlers = new Map();
    this.reconnectTimeout = null;
  }

  /**
   * Conecta al WebSocket.
   * @param {string|null} authToken — Si se pasa, se usa directamente en vez de
   *   leer AsyncStorage (evita race conditions con token rotation en login).
   */
  async connect(authToken = null) {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) {
      console.log('🔄 [CLIENTE WS] Conexión ya en progreso, ignorando...');
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (authToken) {
      this.authFailures = 0;
    }

    try {
      console.log('🔗 [CLIENTE WS] Iniciando conexión WebSocket cliente...');
      this.isConnecting = true;
      
      if (this.ws && (this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING)) {
        this.ws = null;
      }
      
      const serverUrl = await this.getServerUrl();
      if (!serverUrl) {
        throw new Error('No se pudo obtener la URL del servidor');
      }
      
      const token = authToken || await this.getAuthToken();
      if (!token || token === 'usuario_registrado_exitosamente') {
        console.log('🔌 [CLIENTE WS] Sin token de auth, no se intenta conexión');
        this.isConnecting = false;
        return;
      }
      
      let wsUrl = serverUrl.replace('http', 'ws').replace('/api', '') + '/ws/client_status/';
      wsUrl += `?token=${token}`;
      
      console.log('🔗 [CLIENTE WS] Conectando a:', wsUrl.replace(/token=.+/, 'token=***'));
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      
      console.log('🔗 [CLIENTE WS] WebSocket creado, esperando conexión...');
      
    } catch (error) {
      console.log('❌ [CLIENTE WS] Error conectando WebSocket:', error);
      this.isConnecting = false;
      
      // Solo programar reconexión si no es un error de configuración
      if (error.message !== 'No se pudo obtener la URL del servidor') {
        this.scheduleReconnect();
      }
    }
  }

  /**
   * Maneja la apertura de la conexión
   */
  handleOpen(event) {
    console.log('✅ [CLIENTE WS] WebSocket cliente conectado exitosamente!');
    this.isConnected = true;
    this.isConnecting = false;
    this.isAuthenticated = true;
    this.reconnectAttempts = 0;

    this.subscribeToMechanics([]);
    console.log('✅ [CLIENTE WS] Conexión establecida, listo para recibir mensajes');
  }

  /**
   * Maneja mensajes recibidos
   */
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      logger.debug('📨 [CLIENTE WS] Mensaje:', data?.type, data);

      if (data.type === 'auth_invalid') {
        console.log('⚠️ [CLIENTE WS] Backend reporta token inválido, cerrando conexión');
        this.isAuthenticated = false;
        this.authFailures++;
        if (this.ws) {
          this.ws.close(1000, 'auth_invalid');
        }
        return;
      }

      this.authFailures = 0;

      let handlersCalled = 0;
      const runHandlers = (setOrFn) => {
        if (!setOrFn) return;
        if (typeof setOrFn === 'function') {
          setOrFn(data);
          handlersCalled++;
          return;
        }
        if (setOrFn instanceof Set) {
          setOrFn.forEach((fn) => {
            try {
              fn(data);
              handlersCalled++;
            } catch (err) {
              logger.warn('❌ [CLIENTE WS] Error en handler:', err?.message || err);
            }
          });
        }
      };

      this.messageHandlers.forEach((handlers, type) => {
        if (type === 'any' || data.type === type) {
          runHandlers(handlers);
        }
      });

      if (
        handlersCalled === 0 &&
        data?.type &&
        !WS_TYPES_OPTIONAL_NO_HANDLER.has(data.type)
      ) {
        logger.warn('[CLIENTE WS] Sin handler para tipo:', data.type);
      }
    } catch (error) {
      logger.warn('❌ [CLIENTE WS] Error procesando mensaje:', error?.message || error);
    }
  }

  /**
   * Maneja el cierre de la conexión
   */
  handleClose(event) {
    console.log('🔌 [CLIENTE WS] WebSocket cliente desconectado. Code:', event.code, 'Reason:', event.reason);
    this.isConnected = false;
    this.isConnecting = false;
    this.isAuthenticated = false;

    if (event.reason === 'auth_invalid' || this.authFailures >= this.maxAuthFailures) {
      console.log('🛑 [CLIENTE WS] Auth inválido, no se reintenta. Esperando nuevo login/token.');
      return;
    }

    if (event.code !== 1000) {
      console.log('🔄 [CLIENTE WS] Programando reconexión...');
      this.scheduleReconnect();
    }
  }

  /**
   * Maneja errores de la conexión
   */
  handleError(event) {
    console.log('❌ [CLIENTE WS] Error en WebSocket cliente:', event);
    console.log('❌ [CLIENTE WS] Error message:', event.message);
    this.isConnected = false;
    this.isConnecting = false;
  }

  /**
   * Programa una reconexión con exponential backoff + jitter (sin límite de intentos).
   * Tras un deploy o caída temporal del server, la app siempre se reconecta.
   * No programa reconexión si no hay token (usuario deslogueado).
   */
  async scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const token = await this.getAuthToken();
    if (!token || token === 'usuario_registrado_exitosamente') {
      console.log('🔌 [CLIENTE WS] Sin token, cancelando reconexión');
      return;
    }

    this.reconnectAttempts++;
    const exponential = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );
    const jitter = Math.random() * 1000;
    const delay = exponential + jitter;

    console.log(`🔄 Reconexión #${this.reconnectAttempts} en ${Math.round(delay)}ms`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Obtiene la URL del servidor
   */
  async getServerUrl() {
    try {
      // ServerConfig ya es una instancia singleton
      await ServerConfig.initialize();
      return ServerConfig.getBaseURL();
    } catch (error) {
      console.log('❌ [CLIENTE WS] Error obteniendo URL del servidor:', error);
      return null;
    }
  }

  /**
   * Obtiene el token de autenticación
   */
  async getAuthToken() {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const token = await AsyncStorage.getItem('auth_token');
      return token;
    } catch (error) {
      console.log('❌ [CLIENTE WS] Error obteniendo token:', error);
      return null;
    }
  }

  /**
   * Desconecta el WebSocket
   */
  disconnect() {
    console.log('🔌 Desconectando WebSocket cliente...');
    
    // Limpiar timeout de reconexión
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      // Verificar el estado antes de cerrar
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(1000, 'Desconexión intencional');
      }
      this.ws = null;
    }
    
    this.isConnected = false;
    this.isConnecting = false;
    this.isAuthenticated = false;
    this.reconnectAttempts = 0;
    this.authFailures = 0;
  }

  /**
   * Registra un handler para un tipo de mensaje específico
   */
  onMessage(type, handler) {
    if (!handler || typeof handler !== 'function') return;
    let bucket = this.messageHandlers.get(type);
    if (!bucket) {
      bucket = new Set();
      this.messageHandlers.set(type, bucket);
    } else if (typeof bucket === 'function') {
      const prev = bucket;
      bucket = new Set([prev, handler]);
      this.messageHandlers.set(type, bucket);
      return;
    } else if (!(bucket instanceof Set)) {
      bucket = new Set([handler]);
      this.messageHandlers.set(type, bucket);
      return;
    }
    bucket.add(handler);
  }

  /**
   * Registra un handler para todos los mensajes
   */
  onAnyMessage(handler) {
    this.onMessage('any', handler);
  }

  /**
   * Remueve un handler
   */
  offMessage(type, handler) {
    const bucket = this.messageHandlers.get(type);
    if (!bucket) return;
    if (!handler) {
      this.messageHandlers.delete(type);
      return;
    }
    if (bucket instanceof Set) {
      bucket.delete(handler);
      if (bucket.size === 0) {
        this.messageHandlers.delete(type);
      }
    } else if (bucket === handler) {
      this.messageHandlers.delete(type);
    }
  }

  /**
   * Obtiene el estado de conexión
   */
  getConnectionStatus() {
    return this.isConnected;
  }

  /**
   * Suscribe a mecánicos específicos para recibir actualizaciones de estado
   */
  subscribeToMechanics(mechanicIds = []) {
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        const message = {
          type: 'subscribe_to_mechanics',
          mechanic_ids: mechanicIds
        };
        
        this.ws.send(JSON.stringify(message));
        console.log('📋 Suscrito a mecánicos:', mechanicIds);
      } catch (error) {
        console.log('❌ Error enviando mensaje de suscripción:', error);
      }
    } else {
      console.log('❌ No se puede suscribir - WebSocket no conectado');
    }
  }

  /**
   * Suscribe a mecánicos cercanos basado en la ubicación del usuario
   */
  async subscribeToNearbyMechanics() {
    try {
      // Obtener mecánicos cercanos desde la API
      const response = await api.get('/usuarios/mecanicos-domicilio/cerca/', {
        lat: -33.4679046, // Coordenadas de ejemplo
        lng: -70.6736568,
        dist: 10,
        ordenar_por: 'distancia'
      });

      if (response && response.results) {
        const mechanicIds = response.results.map(mechanic => mechanic.id);
        this.subscribeToMechanics(mechanicIds);
        console.log('📍 Suscrito a mecánicos cercanos:', mechanicIds);
      }
    } catch (error) {
      console.log('❌ Error suscribiendo a mecánicos cercanos:', error);
    }
  }

  /**
   * Maneja actualizaciones de estado de mecánicos
   */
  handleMechanicStatusUpdate(data) {
    console.log('🔄 Actualización de estado de mecánico:', data);
    
    // Notificar a los handlers registrados
    this.messageHandlers.forEach((handlers, type) => {
      if (type !== 'mechanic_status_update' && type !== 'any') return;
      if (handlers instanceof Set) {
        handlers.forEach((fn) => {
          try {
            fn(data);
          } catch (e) {
            logger.warn('❌ [CLIENTE WS] mechanic handler error:', e?.message || e);
          }
        });
      } else if (typeof handlers === 'function') {
        handlers(data);
      }
    });
  }
}

export default new WebSocketService(); 