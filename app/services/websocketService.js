import api from './api';
import ServerConfig from '../config/serverConfig';

class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.isConnected = false;
    this.isConnecting = false;
    this.messageHandlers = new Map();
    this.reconnectTimeout = null;
  }

  /**
   * Conecta al WebSocket
   */
  async connect() {
    // Evitar múltiples conexiones simultáneas
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) {
      console.log('🔄 [CLIENTE WS] Conexión ya en progreso, ignorando...');
      return;
    }

    // Limpiar timeout de reconexión si existe
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    try {
      console.log('🔗 [CLIENTE WS] Iniciando conexión WebSocket cliente...');
      this.isConnecting = true;
      
      // Cerrar conexión existente si está en estado inválido
      if (this.ws && (this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING)) {
        this.ws = null;
      }
      
      // Obtener URL del servidor
      const serverUrl = await this.getServerUrl();
      console.log('🔗 [CLIENTE WS] URL del servidor obtenida:', serverUrl);
      
      if (!serverUrl) {
        throw new Error('No se pudo obtener la URL del servidor');
      }
      
      // Obtener token de autenticación
      const token = await this.getAuthToken();
      console.log('🔗 [CLIENTE WS] Token obtenido:', token ? 'presente' : 'ausente');
      
      let wsUrl = serverUrl.replace('http', 'ws').replace('/api', '') + '/ws/client_status/';
      
      // Agregar token si está disponible
      if (token) {
        wsUrl += `?token=${token}`;
        console.log('🔗 [CLIENTE WS] Token agregado a la URL');
      }
      
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
    this.reconnectAttempts = 0;
    
    // Suscribirse a mecánicos relevantes (se puede personalizar según la ubicación del usuario)
    this.subscribeToMechanics([]);
    console.log('✅ [CLIENTE WS] Conexión establecida, listo para recibir mensajes');
  }

  /**
   * Maneja mensajes recibidos
   */
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      console.log('📨 [CLIENTE WS] Mensaje WebSocket recibido:', data);
      console.log('📨 [CLIENTE WS] Handlers registrados:', Array.from(this.messageHandlers.keys()));

      // Notificar a todos los handlers registrados
      let handlersCalled = 0;
      this.messageHandlers.forEach((handler, type) => {
        if (type === 'any' || data.type === type) {
          console.log(`📨 [CLIENTE WS] Llamando handler para tipo: ${type}`);
          handler(data);
          handlersCalled++;
        }
      });
      
      if (handlersCalled === 0) {
        console.log('⚠️ [CLIENTE WS] No hay handlers registrados para el tipo:', data.type);
      }
    } catch (error) {
      console.log('❌ [CLIENTE WS] Error procesando mensaje WebSocket:', error);
    }
  }

  /**
   * Maneja el cierre de la conexión
   */
  handleClose(event) {
    console.log('🔌 [CLIENTE WS] WebSocket cliente desconectado. Code:', event.code, 'Reason:', event.reason);
    this.isConnected = false;
    this.isConnecting = false;
    
    // Solo programar reconexión si no fue una desconexión intencional
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
   * Programa una reconexión
   */
  scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * this.reconnectAttempts;
      
      console.log(`🔄 Programando reconexión ${this.reconnectAttempts}/${this.maxReconnectAttempts} en ${delay}ms`);
      
      this.reconnectTimeout = setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.log('❌ Máximo de intentos de reconexión alcanzado');
    }
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
    this.reconnectAttempts = 0;
  }

  /**
   * Registra un handler para un tipo de mensaje específico
   */
  onMessage(type, handler) {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Registra un handler para todos los mensajes
   */
  onAnyMessage(handler) {
    this.messageHandlers.set('any', handler);
  }

  /**
   * Remueve un handler
   */
  offMessage(type, handler) {
    if (handler) {
      // Si se proporciona un handler específico, solo eliminar si coincide
      const currentHandler = this.messageHandlers.get(type);
      if (currentHandler === handler) {
        this.messageHandlers.delete(type);
      }
    } else {
      // Si no se proporciona handler, eliminar el tipo completamente
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
    this.messageHandlers.forEach((handler, type) => {
      if (type === 'mechanic_status_update' || type === 'any') {
        handler(data);
      }
    });
  }
}

export default new WebSocketService(); 