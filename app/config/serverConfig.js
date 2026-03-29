import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Network from 'expo-network';

/**
 * Configuración dinámica del servidor backend
 * Detecta automáticamente la IP correcta sin hardcodear IPs fijas
 */

// Configuración por defecto y fallbacks
const DEFAULT_CONFIG = {
  port: 8000,
  protocol: 'http',
  apiPath: '/api',
  timeout: 15000,
  retryAttempts: 3,
  retryDelay: 1000,
  // No forzar IP específica - usar detección automática
  forcedServerIP: null
};

// Variables de entorno (pueden ser configuradas en .env o expo-constants)
const ENV_CONFIG = {
  SERVER_HOST: Constants.expoConfig?.extra?.serverHost,
  SERVER_PORT: Constants.expoConfig?.extra?.serverPort,
  API_URL: Constants.expoConfig?.extra?.apiUrl,
  FORCE_LOCALHOST: Constants.expoConfig?.extra?.forceLocalhost,
  USE_NGROK: Constants.expoConfig?.extra?.useNgrok || false,
  NGROK_URL: Constants.expoConfig?.extra?.ngrokUrl || null
};

/**
 * Obtiene la IP local del dispositivo/emulador
 */
async function getLocalNetworkInfo() {
  try {
    if (Network && Network.getNetworkStateAsync) {
      const networkState = await Network.getNetworkStateAsync();
      return networkState;
    }
  } catch (error) {
    console.warn('⚠️ No se pudo obtener información de red:', error);
  }
  return null;
}

/**
 * Detecta la IP del servidor automáticamente de forma agnóstica
 */
function detectServerIPs() {
  const possibleIPs = [];

  // 1. Variables de entorno (prioridad máxima)
  if (ENV_CONFIG.SERVER_HOST) {
    possibleIPs.push(ENV_CONFIG.SERVER_HOST);
  }

  // 2. Configuración según plataforma
  if (Platform.OS === 'android') {
    // Android físico: IP del host de desarrollo de Expo
    if (Constants.expoConfig?.hostUri) {
      const hostIP = Constants.expoConfig.hostUri.split(':')[0];
      possibleIPs.push(hostIP);
    }

    // Android emulador: IP especial para localhost
    possibleIPs.push('10.0.2.2');

  } else if (Platform.OS === 'ios') {
    // iOS simulator: puede usar localhost directamente
    possibleIPs.push('localhost', '127.0.0.1');

    // iOS físico: IP del host de desarrollo de Expo
    if (Constants.expoConfig?.hostUri) {
      const hostIP = Constants.expoConfig.hostUri.split(':')[0];
      possibleIPs.push(hostIP);
    }

  } else if (Platform.OS === 'web') {
    // Web: usar localhost
    possibleIPs.push('localhost', '127.0.0.1');
  }

  // 3. IPs específicas de la red actual
  possibleIPs.push('192.168.100.63'); // IP actual del servidor
  possibleIPs.push('192.168.100.235'); // IP anterior detectada
  possibleIPs.push('192.168.100.34'); // IP anterior
  possibleIPs.push('192.168.100.24'); // IP anterior
  possibleIPs.push('192.168.100.1'); // Gateway común
  possibleIPs.push('192.168.100.100'); // IP común

  // 4. Fallbacks universales (prioridad baja)
  possibleIPs.push('localhost', '127.0.0.1');

  // Eliminar duplicados manteniendo orden
  return [...new Set(possibleIPs)];
}

/**
 * Prueba la conectividad con una URL específica
 */
async function testConnection(url, timeout = 5000) {
  try {
    console.log(`🔍 Probando conexión a: ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Construir la URL correctamente
    const testUrl = url.endsWith('/api') ? `${url}/hello/` : `${url}/api/hello/`;

    // Preparar headers - agregar header para ngrok si es necesario
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    // Si es una URL de ngrok, agregar header para evitar warning
    if (url.includes('ngrok-free.app') || url.includes('ngrok.io')) {
      headers['ngrok-skip-browser-warning'] = 'true';
    }

    const response = await fetch(testUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: headers,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      console.log(`✅ Servidor encontrado en: ${url}`);
      return true;
    } else {
      console.log(`❌ Error HTTP ${response.status} en: ${url}`);
      return false;
    }

  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`⏱️ Timeout en: ${url}`);
    } else {
      console.log(`❌ Error de conexión a ${url}: ${error.message}`);
    }
    return false;
  }
}

async function discoverServerURL() {
  console.log('🔍 Iniciando auto-discovery del servidor...');

  // Web en producción (p. ej. static en Vercel): el probe GET a /api/hello/ puede fallar por CORS
  // aunque la API sea válida; entonces se caía al fallback localhost y la ficha pública quedaba vacía.
  if (Platform.OS === 'web' && !__DEV__ && ENV_CONFIG.API_URL) {
    console.log('🌐 Web producción: usando API_URL del manifest (sin probe CORS):', ENV_CONFIG.API_URL);
    return ENV_CONFIG.API_URL;
  }

  // 1. PRIORIDAD MÁXIMA: URL de Producción (Configurada manualmente)
  if (ENV_CONFIG.API_URL) {
    console.log('🌐 Probando URL de producción (Prioridad 1):', ENV_CONFIG.API_URL);
    // Timeout corto para producción (2s) para fallar rápido si no hay internet o está caído
    if (await testConnection(ENV_CONFIG.API_URL, 2000)) {
      console.log(`✅ Conectado a producción: ${ENV_CONFIG.API_URL}`);
      return ENV_CONFIG.API_URL;
    }
  }

  // 2. Si producción falla, probar Ngrok (si está configurado)
  if (ENV_CONFIG.USE_NGROK && ENV_CONFIG.NGROK_URL) {
    const ngrokAPIUrl = `${ENV_CONFIG.NGROK_URL}/api`;
    console.log('🌐 Producción falló, probando Ngrok:', ngrokAPIUrl);
    if (await testConnection(ngrokAPIUrl, 2000)) {
      return ngrokAPIUrl;
    }
  }

  // 3. FALLBACK: Entorno de Desarrollo (Local)
  // Solo buscar localmente si estamos en DEV o si no hay URL de producción
  if (__DEV__) {
    const possibleIPs = detectServerIPs();
    const port = ENV_CONFIG.SERVER_PORT || DEFAULT_CONFIG.port;

    console.log('⚠️ Producción no disponible. Buscando servidor LOCAL...', possibleIPs);

    // Optimización: Probar la primera IP candidata (host de Expo) rápidamente
    if (possibleIPs.length > 0) {
      const firstIp = possibleIPs[0]; // La más probable (Host URI)
      const fastUrl = `${DEFAULT_CONFIG.protocol}://${firstIp}:${port}${DEFAULT_CONFIG.apiPath}`;
      if (await testConnection(fastUrl, 1000)) {
        console.log(`✅ Servidor LOCAL (Rápido) encontrado en: ${fastUrl}`);
        return fastUrl;
      }
    }

    // Si la rápida falla, probar todas en paralelo (race) para encontrar cualquiera que responda
    const checkPromises = possibleIPs.map(async (ip) => {
      const url = `${DEFAULT_CONFIG.protocol}://${ip}:${port}${DEFAULT_CONFIG.apiPath}`;
      if (await testConnection(url, 1500)) return url;
      return null;
    });

    try {
      // Esperar a que alguna responda (Promise.any no está en JS Core antiguo de RN, usamos loop o all)
      // Usaremos un enfoque secuencial rápido o Promise.all y find
      const results = await Promise.all(checkPromises);
      const validUrl = results.find(url => url !== null);

      if (validUrl) {
        console.log(`✅ Servidor LOCAL encontrado en: ${validUrl}`);
        return validUrl;
      }
    } catch (e) {
      console.log("Error buscando localmente", e);
    }
  }

  // 4. Fallback final
  console.log('⚠️ No se pudo conectar a ningún servidor (Prod/Local). Usando fallback localhost.');
  const fallbackPort = ENV_CONFIG.SERVER_PORT || DEFAULT_CONFIG.port;
  return `${DEFAULT_CONFIG.protocol}://localhost:${fallbackPort}${DEFAULT_CONFIG.apiPath}`;
}

/**
 * Configuración principal del servidor
 */
class ServerConfig {
  constructor() {
    this.baseURL = null;
    this.mediaURL = null;
    this.isConnected = false;
    this.lastCheck = null;
    this.checkInterval = 30000; // 30 segundos
  }

  /**
   * Inicializa la configuración del servidor
   */
  async initialize() {
    try {
      console.log('🚀 Inicializando configuración del servidor...');

      // Descubrir la URL correcta
      this.baseURL = await discoverServerURL();
      this.mediaURL = this.baseURL.replace('/api', '');
      this.isConnected = true;
      this.lastCheck = Date.now();

      console.log('✅ Configuración del servidor inicializada:');
      console.log(`   📡 API URL: ${this.baseURL}`);
      console.log(`   🎨 Media URL: ${this.mediaURL}`);
      console.log(`   📱 Plataforma: ${Platform.OS}`);
      console.log(`   🔧 Modo desarrollo: ${__DEV__ ? 'SÍ' : 'NO'}`);

      return true;

    } catch (error) {
      console.error('❌ Error inicializando configuración del servidor:', error);
      this.isConnected = false;

      // Usar configuración fallback
      const fallbackPort = ENV_CONFIG.SERVER_PORT || DEFAULT_CONFIG.port;
      this.baseURL = `${DEFAULT_CONFIG.protocol}://localhost:${fallbackPort}${DEFAULT_CONFIG.apiPath}`;
      this.mediaURL = `${DEFAULT_CONFIG.protocol}://localhost:${fallbackPort}`;

      return false;
    }
  }

  /**
   * Obtiene la URL base del API
   */
  getBaseURL() {
    return this.baseURL;
  }

  /**
   * Obtiene la URL base para medios
   */
  getMediaURL() {
    return this.mediaURL;
  }

  /**
   * Verifica si la configuración está inicializada
   */
  isInitialized() {
    return this.baseURL !== null;
  }

  /**
   * Verifica el estado de la conexión
   */
  isServerConnected() {
    return this.isConnected;
  }

  /**
   * Fuerza una nueva verificación de conectividad
   */
  async recheckConnection() {
    if (!this.baseURL) {
      return await this.initialize();
    }

    const isConnected = await testConnection(this.baseURL);
    this.isConnected = isConnected;
    this.lastCheck = Date.now();

    return isConnected;
  }

  /**
   * Obtiene información de configuración para debug
   */
  getDebugInfo() {
    return {
      baseURL: this.baseURL,
      mediaURL: this.mediaURL,
      isConnected: this.isConnected,
      lastCheck: this.lastCheck,
      platform: Platform.OS,
      isDev: __DEV__,
      envConfig: ENV_CONFIG
    };
  }
}

// Instancia singleton
const serverConfig = new ServerConfig();

export default serverConfig; 