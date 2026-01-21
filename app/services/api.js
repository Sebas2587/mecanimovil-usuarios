import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import serverConfig from '../config/serverConfig';
import logger from '../utils/logger';

/**
 * Sistema de cache simple para respetar headers Cache-Control del servidor
 * Cachea respuestas por max-age especificado en Cache-Control header
 */
const responseCache = new Map();

/**
 * Parsea el header Cache-Control y retorna el max-age en milisegundos
 * @param {string} cacheControl - Header Cache-Control del servidor
 * @returns {number|null} - max-age en milisegundos o null si no se puede cachear
 */
function parseCacheControl(cacheControl) {
  if (!cacheControl) return null;

  // Buscar max-age en el header
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  if (maxAgeMatch) {
    const maxAgeSeconds = parseInt(maxAgeMatch[1], 10);
    return maxAgeSeconds * 1000; // Convertir a milisegundos
  }

  return null;
}

/**
 * Genera una clave de cache única para una petición
 * @param {string} url - URL de la petición
 * @param {object} params - Parámetros de la petición
 * @returns {string} - Clave única de cache
 */
function getCacheKey(url, params = {}) {
  const paramsStr = JSON.stringify(params);
  return `${url}:${paramsStr}`;
}

/**
 * Obtiene una respuesta del cache si está disponible y no ha expirado
 * @param {string} url - URL de la petición
 * @param {object} params - Parámetros de la petición
 * @returns {object|null} - Datos cacheados o null si no hay cache válido
 */
function getCachedResponse(url, params = {}) {
  const cacheKey = getCacheKey(url, params);
  const cached = responseCache.get(cacheKey);

  if (!cached) return null;

  const now = Date.now();
  const age = now - cached.timestamp;

  // Si el cache ha expirado, eliminarlo y retornar null
  if (age >= cached.maxAge) {
    responseCache.delete(cacheKey);
    return null;
  }

  logger.debug(`✅ Cache hit para ${url} (edad: ${Math.floor(age / 1000)}s, max: ${cached.maxAge / 1000}s)`);
  return cached.data;
}

/**
 * Guarda una respuesta en el cache
 * @param {string} url - URL de la petición
 * @param {object} params - Parámetros de la petición
 * @param {object} data - Datos a cachear
 * @param {string} cacheControl - Header Cache-Control del servidor
 */
function setCachedResponse(url, params = {}, data, cacheControl) {
  const maxAge = parseCacheControl(cacheControl);
  if (!maxAge) return; // No cachear si no hay max-age

  const cacheKey = getCacheKey(url, params);
  responseCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
    maxAge
  });

  logger.debug(`💾 Respuesta cacheada para ${url} por ${maxAge / 1000}s`);
}

/**
 * Configuración dinámica del API que detecta automáticamente la IP correcta
 */

// Inicializar configuración del servidor
let isInitialized = false;
let initializationPromise = null;

/**
 * Inicializa la configuración del servidor si no está inicializada
 */
async function ensureInitialized() {
  if (isInitialized) {
    return;
  }

  // Si ya hay una inicialización en progreso, esperar a que termine
  if (initializationPromise) {
    await initializationPromise;
    return;
  }

  // Crear nueva promesa de inicialización
  initializationPromise = serverConfig.initialize();

  try {
    await initializationPromise;
    isInitialized = true;
    logger.info('✅ Configuración del servidor inicializada correctamente');
  } catch (error) {
    logger.error('❌ Error en inicialización del servidor:', error);
    // Continuar con configuración fallback
    isInitialized = true;
  } finally {
    initializationPromise = null;
  }
}

/**
 * Obtiene la URL base del API con inicialización automática
 */
async function getBaseURL() {
  await ensureInitialized();

  const baseURL = serverConfig.getBaseURL();

  // Fallback si no hay configuración
  if (!baseURL) {
    const fallbackURL = `http://localhost:8000/api`;
    logger.warn('⚠️ Usando URL fallback:', fallbackURL);
    return fallbackURL;
  }

  return baseURL;
}

/**
 * Obtiene la URL base para medios con inicialización automática
 * @returns {Promise<string>} URL base para medios
 */
export async function getMediaBaseURL() {
  await ensureInitialized();

  const mediaURL = serverConfig.getMediaURL();

  // Fallback si no hay configuración
  if (!mediaURL) {
    const fallbackURL = `http://localhost:8000`;
    console.warn('⚠️ Usando Media URL fallback:', fallbackURL);
    return fallbackURL;
  }

  return mediaURL;
}

/**
 * Crea una instancia de axios con configuración dinámica
 */
async function createApiInstance() {
  const baseURL = await getBaseURL();

  logger.info(`🌐 App Clientes - Configurando API con URL: ${baseURL}`);
  logger.info(`📱 Plataforma detectada: ${Platform.OS}`);
  logger.info(`🔧 Modo desarrollo: ${__DEV__ ? 'SÍ' : 'NO'}`);

  return axios.create({
    baseURL,
    timeout: 15000, // 15 segundos de timeout
    headers: {
      'Content-Type': 'application/json',
      'Accept-Encoding': 'gzip, deflate', // Solicitar compresión (gzip/deflate soportados nativamente)
    },
  });
}

// Crear instancia inicial (será recreada dinámicamente)
let api = null;

/**
 * Obtiene la instancia de API, creándola si es necesario
 */
async function getApiInstance() {
  if (!api) {
    api = await createApiInstance();
    setupInterceptors(api);
  }
  return api;
}

/**
 * Configura los interceptors para la instancia de API
 */
function setupInterceptors(apiInstance) {
  /**
   * Interceptor para añadir el token de autenticación a las peticiones
   */
  apiInstance.interceptors.request.use(
    async (config) => {
      try {
        // Agregar header de ngrok si es necesario (para evitar warning de ngrok-free.app)
        if (config.baseURL && (config.baseURL.includes('ngrok-free.app') || config.baseURL.includes('ngrok.io'))) {
          config.headers['ngrok-skip-browser-warning'] = 'true';
        }

        // Verificar si la petición requiere autenticación
        const requiresAuth = config.requiresAuth !== false; // Por defecto, todas requieren auth

        if (requiresAuth) {
          const token = await AsyncStorage.getItem('auth_token');
          logger.debug('🔑 Token interceptor:', token ? `Token encontrado (${token.substring(0, 10)}...)` : 'Sin token');

          if (token && token !== "usuario_registrado_exitosamente") {
            config.headers.Authorization = `Token ${token}`;
            logger.debug('✅ Token añadido al header de Authorization');
          } else {
            logger.debug('⚠️ No se añadió token al header (no existe o es token temporal)');
          }
        } else {
          logger.debug('🔓 Petición sin autenticación requerida');
        }

        // Depuración: mostrar detalles de la solicitud (solo en desarrollo)
        logger.debug('📤 Enviando solicitud:', {
          url: `${config.baseURL}${config.url}`,
          method: config.method?.toUpperCase(),
          headers: {
            'Content-Type': config.headers['Content-Type'],
            'Authorization': config.headers.Authorization ? 'Token presente' : 'Sin token',
            'ngrok-skip-browser-warning': config.headers['ngrok-skip-browser-warning'] ? 'Presente' : 'No'
          },
          data: config.data ? 'Datos presentes' : 'Sin datos',
          requiresAuth
        });

        return config;
      } catch (error) {
        logger.error('❌ Error en interceptor de solicitud:', error);
        return config;
      }
    },
    (error) => {
      logger.error('❌ Error en interceptor antes de enviar:', error);
      return Promise.reject(error);
    }
  );

  /**
   * Interceptor para manejar errores en las respuestas
   */
  apiInstance.interceptors.response.use(
    (response) => {
      // Manejar respuestas DELETE con 204 No Content
      if (response.config?.method?.toLowerCase() === 'delete') {
        if (response.status === 204 || response.status === 200) {
          logger.debug('✅ DELETE exitoso (puede tener respuesta vacía):', {
            url: response.config.url,
            status: response.status,
            tieneData: !!response.data
          });
        }
      }

      logger.debug('✅ Respuesta exitosa:', {
        url: response.config.url,
        method: response.config?.method?.toUpperCase(),
        status: response.status,
        data: response.data ? 'Datos recibidos' : 'Sin datos'
      });
      return response;
    },
    async (error) => {
      // Manejar errores comunes
      if (error.response) {
        // Casos especiales que no son errores críticos
        const isCarritoNotFound = error.response.status === 404 &&
          error.config?.url?.includes('/carritos/activo') &&
          error.response.data?.error?.includes('No hay carrito activo');
        // NUEVO: 404 esperado para establecer principal (frontend usa fallback PATCH)
        const isSetMainAddressMissing = error.response.status === 404 &&
          error.config?.url?.includes('/usuarios/direcciones/') &&
          error.config?.url?.includes('/establecer-principal/');
        // NUEVO: 404 esperado para puede-crear-solicitud (frontend usa validación alternativa)
        const isPuedeCrearSolicitudMissing = error.response.status === 404 &&
          error.config?.url?.includes('/puede-crear-solicitud/');
        // NUEVO: 401 esperado para endpoints que requieren auth cuando no hay sesión activa
        const isUnauthorizedExpected = error.response.status === 401 &&
          (error.config?.url?.includes('/solicitudes-publicas/activas/') ||
            error.config?.url?.includes('/solicitudes/activas/') ||
            error.config?.url?.includes('/ordenes/solicitudes-publicas/activas/'));

        if (isCarritoNotFound) {
          // Este es un estado normal, no un error crítico
          logger.info('ℹ️ Estado normal: No hay carrito activo para este vehículo');
        } else if (isSetMainAddressMissing) {
          // Evitar RedBox: este 404 es esperado, el caller hará fallback por PATCH
          logger.warn('ℹ️ Endpoint establecer-principal no disponible (404). Se usará fallback PATCH en el servicio.');
        } else if (isPuedeCrearSolicitudMissing) {
          // Evitar mostrar como error: este 404 es esperado, el caller usará validación alternativa
          logger.info('ℹ️ Endpoint puede-crear-solicitud no disponible (404). Se usará validación alternativa en el servicio.');
        } else if (isUnauthorizedExpected) {
          // Evitar mostrar como error: este 401 es esperado cuando no hay sesión activa
          // El servicio manejará esto silenciosamente retornando array vacío
          // No loguear como error, solo silenciosamente
        } else {
          // El servidor respondió con un código de estado fuera del rango 2xx
          // Solo loguear en desarrollo (__DEV__), nunca en producción (APK)
          logger.error('❌ Error de respuesta detallado:', {
            url: error.config?.url,
            method: error.config?.method?.toUpperCase(),
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
            headers: error.response.headers
          });
        }

        // Si el token ha expirado o es inválido (401)
        // CRÍTICO: Solo limpiar credenciales si es un error REAL de autenticación
        // NO limpiar si hay problemas de servidor/BD/red que causan 401 incorrectamente
        if (error.response.status === 401 && !isUnauthorizedExpected) {
          // Verificar si es un error real de autenticación (token inválido/expirado)
          const errorData = error.response.data;
          const errorMessage = (errorData?.detail || errorData?.error || '').toLowerCase();
          const errorString = JSON.stringify(errorData || {}).toLowerCase();

          // Solo limpiar credenciales si el mensaje indica claramente problema de autenticación
          // NO limpiar si hay indicios de errores de servidor/BD/red
          const isAuthError = (
            errorMessage.includes('token') && !errorMessage.includes('server') ||
            errorMessage.includes('authentication') && !errorMessage.includes('server') ||
            errorMessage.includes('unauthorized') && !errorMessage.includes('server') ||
            errorMessage.includes('invalid credentials') ||
            errorMessage.includes('token expired') ||
            errorString.includes('invalid_token') ||
            errorString.includes('token_not_found')
          ) && !(
            errorMessage.includes('server error') ||
            errorMessage.includes('connection') ||
            errorMessage.includes('database') ||
            errorMessage.includes('500') ||
            errorString.includes('operationalerror')
          );

          if (isAuthError) {
            logger.info('🔒 Error 401 de autenticación: Token inválido o expirado, limpiando credenciales');
            AsyncStorage.removeItem('auth_token');
            AsyncStorage.removeItem('user');
          } else {
            // 401 por problemas de servidor/BD - NO limpiar credenciales para evitar desconexiones incorrectas
            logger.warn('⚠️ Error 401 posiblemente por problemas de servidor/BD/red. NO limpiando credenciales para evitar desconexiones incorrectas.');
          }
        }

        // Extraer mensaje de error de diferentes formatos que puede devolver el backend
        // IMPORTANTE: Siempre generar mensajes amigables, nunca técnicos
        let errorMessage = null;

        // Función auxiliar para validar si un mensaje es amigable (no técnico)
        const isFriendlyMessage = (msg) => {
          if (!msg || typeof msg !== 'string') return false;
          // Lista de palabras clave técnicas que NO deben aparecer en mensajes al usuario
          const technicalKeywords = [
            'status', 'code', 'HTTP', 'ERR_', 'ECONN', 'ETIMEDOUT', 'ENOTFOUND',
            'axios', 'request failed', 'network error', 'connection refused',
            'stack', 'trace', 'at ', 'undefined', 'null', 'object Object',
            'JSON.parse', 'SyntaxError', 'TypeError', 'ReferenceError'
          ];
          // Verificar que no contenga palabras técnicas y tenga longitud razonable
          const lowerMsg = msg.toLowerCase();
          return !technicalKeywords.some(keyword => lowerMsg.includes(keyword.toLowerCase())) &&
            msg.length < 200 && // Mensajes muy largos suelen ser técnicos
            !msg.match(/^\d+$/); // No solo números (códigos de estado)
        };

        // Extraer mensaje del backend con prioridad
        if (error.response.data) {
          const candidates = [
            error.response.data.error,
            error.response.data.detail,
            Array.isArray(error.response.data.non_field_errors)
              ? error.response.data.non_field_errors[0]
              : error.response.data.non_field_errors,
            error.response.data.message,
            typeof error.response.data === 'string' ? error.response.data : null
          ];

          // Buscar el primer mensaje amigable
          for (const candidate of candidates) {
            if (candidate && isFriendlyMessage(candidate)) {
              errorMessage = candidate;
              break;
            }
          }
        }

        // Si no encontramos un mensaje amigable, generar uno basado en el código de estado
        if (!errorMessage || !isFriendlyMessage(errorMessage)) {
          switch (error.response.status) {
            case 400:
              errorMessage = 'La solicitud no es válida. Por favor, verifica los datos e intenta nuevamente.';
              break;
            case 401:
              errorMessage = 'No autorizado. Por favor, inicia sesión nuevamente.';
              break;
            case 403:
              errorMessage = 'No tienes permiso para realizar esta acción.';
              break;
            case 404:
              errorMessage = 'El recurso solicitado no fue encontrado.';
              break;
            case 409:
              errorMessage = 'Ya existe un registro con estos datos. Por favor, verifica la información.';
              break;
            case 422:
              errorMessage = 'Los datos proporcionados no son válidos. Por favor, verifica e intenta nuevamente.';
              break;
            case 500:
            case 502:
            case 503:
            case 504:
              errorMessage = 'El servidor no está disponible en este momento. Por favor, intenta nuevamente más tarde.';
              break;
            default:
              errorMessage = 'Ocurrió un error al procesar tu solicitud. Por favor, intenta nuevamente.';
          }
        }

        // Asegurar que el mensaje final sea amigable (limpiar cualquier texto técnico residual)
        errorMessage = errorMessage
          .replace(/status\s*\d+/gi, '')
          .replace(/code\s*:\s*\w+/gi, '')
          .replace(/HTTP\s*\d+/gi, '')
          .replace(/\s+/g, ' ')
          .trim();

        // Si después de limpiar el mensaje está vacío, usar mensaje predeterminado
        if (!errorMessage || errorMessage.length === 0) {
          errorMessage = 'Ocurrió un error al procesar tu solicitud. Por favor, intenta nuevamente.';
        }

        return Promise.reject({
          message: errorMessage,
          status: error.response.status,
          response: {
            ...error.response,
            // NO incluir datos completos del error al usuario - solo información necesaria
          },
          // Preservar estructura para debugging pero sin exponer detalles técnicos
        });
      } else if (error.request) {
        // La solicitud se realizó pero no se recibió ninguna respuesta
        // CASO ESPECIAL: Para DELETE, si la solicitud se completó (sin respuesta del servidor),
        // puede ser que el servidor haya procesado correctamente pero no haya enviado respuesta
        const isDeleteRequest = error.config?.method?.toLowerCase() === 'delete';

        if (isDeleteRequest && !error.response) {
          // Para DELETE, si no hay respuesta pero la solicitud se envió, asumir éxito
          // Esto puede pasar cuando el servidor devuelve 204 y el cliente tiene problemas parseando
          logger.warn('⚠️ DELETE sin respuesta del servidor, pero la solicitud se envió. Asumiendo éxito.');
          // No rechazar el error, sino devolver una respuesta exitosa simulada
          return Promise.resolve({
            status: 204,
            statusText: 'No Content',
            data: { success: true, message: 'Solicitud procesada (respuesta vacía)' },
            config: error.config,
            headers: {}
          });
        }

        // Solo loguear en desarrollo (__DEV__), nunca en producción (APK)
        logger.error('🌐 Error de red detallado:', {
          url: error.config?.url,
          method: error.config?.method?.toUpperCase(),
          baseURL: error.config?.baseURL,
          timeout: error.config?.timeout,
          message: error.message,
          code: error.code
        });

        // Si es un error de red, intentar reinicializar la configuración
        if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
          logger.info('🔄 Error de red detectado, intentando reinicializar configuración...');
          try {
            await serverConfig.recheckConnection();
            // Recrear instancia de API con nueva configuración
            api = await createApiInstance();
            setupInterceptors(api);
            logger.info('✅ Configuración del servidor actualizada');
          } catch (recheckError) {
            logger.error('❌ Error al verificar reconexión:', recheckError);
          }
        }

        // Mensajes amigables para errores de red (nunca técnicos)
        let mensajeError = 'No se pudo conectar con el servidor. Verifica tu conexión a internet e intenta nuevamente.';

        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          mensajeError = 'La conexión está tardando demasiado. Por favor, verifica tu conexión a internet e intenta nuevamente.';
        } else if (error.message?.includes('Network Error') || error.code === 'ERR_NETWORK') {
          mensajeError = 'Error de conexión. Por favor, verifica tu conexión a internet e intenta nuevamente.';
        } else if (error.code === 'ECONNREFUSED') {
          mensajeError = 'No se pudo conectar al servidor. Por favor, verifica tu conexión a internet e intenta nuevamente.';
        } else if (error.code === 'ETIMEDOUT') {
          mensajeError = 'La conexión expiró. Por favor, verifica tu conexión a internet e intenta nuevamente.';
        } else if (error.code === 'ENOTFOUND') {
          mensajeError = 'No se pudo encontrar el servidor. Por favor, verifica tu conexión a internet e intenta nuevamente.';
        }

        return Promise.reject({
          message: mensajeError,
          isNetworkError: true,
          code: error.code,
          // NO incluir detalles técnicos como baseURL, timeout, config completa, etc.
        });
      } else {
        // Ocurrió un error al configurar la solicitud
        // Log solo en desarrollo (__DEV__), nunca en producción (APK)
        logger.error('⚙️ Error de configuración (solo para debugging):', {
          message: error.message,
          // NO loguear config completa que puede contener datos sensibles
        });

        // Siempre retornar mensaje amigable, nunca técnico
        return Promise.reject({
          message: 'Ocurrió un error al realizar la solicitud. Por favor, intenta nuevamente.',
          // NO incluir error.message que puede ser técnico
        });
      }
    }
  );
}

/**
 * Función para realizar peticiones GET
 * @param {string} url - Ruta del endpoint
 * @param {object} params - Parámetros de la petición
 * @param {object} options - Opciones adicionales
 * @param {boolean} options.requiresAuth - Indica si la petición requiere autenticación
 * @param {boolean} options.forceRefresh - Forzar refresh ignorando cache (default: false)
 */
export const get = async (url, params = {}, options = {}) => {
  try {
    // Intentar obtener del cache si no se fuerza refresh
    if (!options.forceRefresh) {
      const cachedData = getCachedResponse(url, params);
      if (cachedData !== null) {
        return cachedData;
      }
    }

    const apiInstance = await getApiInstance();
    const response = await apiInstance.get(url, {
      params,
      requiresAuth: options.requiresAuth
    });

    // Cachear la respuesta si el servidor envía Cache-Control
    const cacheControl = response.headers?.['cache-control'] || response.headers?.['Cache-Control'];
    if (cacheControl) {
      setCachedResponse(url, params, response.data, cacheControl);
    }

    return response.data;
  } catch (error) {
    // Casos especiales que no son errores críticos
    const isCarritoNotFound = error.status === 404 &&
      url.includes('/carritos/activo') &&
      error.data?.error?.includes('No hay carrito activo');
    const isPuedeCrearSolicitudMissing = error.status === 404 &&
      url.includes('/puede-crear-solicitud/');

    if (isCarritoNotFound) {
      logger.info(`Estado normal en GET a ${url}: No hay carrito activo`);
    } else if (isPuedeCrearSolicitudMissing) {
      // No mostrar como error: este 404 es esperado, el caller usará validación alternativa
      logger.info(`ℹ️ Endpoint puede-crear-solicitud no disponible (404) en GET a ${url}. Se usará validación alternativa.`);
    } else {
      logger.error(`Error en GET a ${url}:`, error);
    }
    throw error;
  }
};

/**
 * Función para realizar peticiones POST
 * @param {string} url - Ruta del endpoint
 * @param {object} data - Datos a enviar
 * @param {object} options - Opciones adicionales
 * @param {boolean} options.requiresAuth - Indica si la petición requiere autenticación
 * @param {boolean} options.isFormData - Indica si los datos son FormData (para archivos)
 * @param {object} options.headers - Headers personalizados adicionales
 * @param {number} options.timeout - Timeout personalizado en milisegundos
 */
export const post = async (url, data = {}, options = {}) => {
  try {
    const apiInstance = await getApiInstance();
    const config = {
      requiresAuth: options.requiresAuth
    };

    // Si es FormData, NO establecer Content-Type - axios lo hace automáticamente con boundary
    if (options.isFormData || data instanceof FormData) {
      config.headers = {
        'Content-Type': 'multipart/form-data',
      };
      // En React Native, axios necesita que transformRequest sea undefined para FormData
      config.transformRequest = (formData) => formData;
      // Timeout extendido para subida de archivos (60 segundos)
      config.timeout = options.timeout || 60000;
    } else if (options.headers) {
      // Si hay headers personalizados, agregarlos
      config.headers = options.headers;
    }

    // Si se especifica timeout personalizado, usarlo
    if (options.timeout) {
      config.timeout = options.timeout;
    }

    const response = await apiInstance.post(url, data, config);
    return response.data;
  } catch (error) {
    // NUEVO: Silenciar 404 esperado para establecer principal
    const isSetMainAddressMissing = (error?.status === 404 || error?.response?.status === 404) &&
      url.includes('/usuarios/direcciones/') && url.includes('/establecer-principal/');
    if (isSetMainAddressMissing) {
      logger.warn(`ℹ️ POST ${url} devolvió 404 (endpoint no existe). El servicio hará fallback con PATCH.`);
    } else {
      logger.error(`Error en POST a ${url}:`, error);
    }
    throw error;
  }
};

/**
 * Función para realizar peticiones PUT
 * @param {string} url - Ruta del endpoint
 * @param {object} data - Datos a enviar
 * @param {object} options - Opciones adicionales
 * @param {boolean} options.requiresAuth - Indica si la petición requiere autenticación
 */
export const put = async (url, data = {}, options = {}) => {
  try {
    const apiInstance = await getApiInstance();
    const response = await apiInstance.put(url, data, {
      requiresAuth: options.requiresAuth
    });
    return response.data;
  } catch (error) {
    logger.error(`Error en PUT a ${url}:`, error);
    throw error;
  }
};

/**
 * Función para realizar peticiones PATCH
 * @param {string} url - Ruta del endpoint
 * @param {object} data - Datos a enviar
 * @param {object} options - Opciones adicionales
 * @param {boolean} options.requiresAuth - Indica si la petición requiere autenticación
 * @param {boolean} options.isFormData - Indica si los datos son FormData (para archivos)
 * @param {object} options.headers - Headers personalizados adicionales
 * @param {number} options.timeout - Timeout personalizado en milisegundos
 */
export const patch = async (url, data = {}, options = {}) => {
  try {
    const apiInstance = await getApiInstance();
    const config = {
      requiresAuth: options.requiresAuth
    };

    // Si es FormData, configurar correctamente para archivos
    if (options.isFormData || data instanceof FormData) {
      config.headers = {
        'Content-Type': 'multipart/form-data',
      };
      // En React Native, axios necesita que transformRequest sea undefined para FormData
      config.transformRequest = (formData) => formData;
      // Timeout extendido para subida de archivos (60 segundos)
      config.timeout = options.timeout || 60000;
    } else if (options.headers) {
      // Si hay headers personalizados, agregarlos
      config.headers = options.headers;
    }

    // Si se especifica timeout personalizado, usarlo
    if (options.timeout) {
      config.timeout = options.timeout;
    }

    const response = await apiInstance.patch(url, data, config);
    return response.data;
  } catch (error) {
    logger.error(`Error en PATCH a ${url}:`, error);
    throw error;
  }
};

/**
 * Función para realizar peticiones DELETE
 * @param {string} url - Ruta del endpoint
 * @param {object} options - Opciones adicionales
 * @param {boolean} options.requiresAuth - Indica si la petición requiere autenticación
 */
export const delete_ = async (url, options = {}) => {
  try {
    const apiInstance = await getApiInstance();
    const response = await apiInstance.delete(url, {
      requiresAuth: options.requiresAuth !== false // Por defecto requiere auth
    });

    // DELETE puede devolver 204 No Content (sin datos) o 200 con datos
    // Si el status es 204, no hay response.data, así que devolvemos null o un objeto vacío
    if (response.status === 204 || response.status === 200) {
      logger.debug(`✅ DELETE exitoso a ${url}:`, {
        status: response.status,
        tieneData: !!response.data
      });
      // Si hay datos, devolverlos; si no, devolver null o un objeto indicando éxito
      return response.data !== undefined && response.data !== null && response.data !== ''
        ? response.data
        : { success: true, status: response.status };
    }

    return response.data;
  } catch (error) {
    // Si el error es un 204 o 200 con respuesta vacía, tratarlo como éxito
    if (error.response && (error.response.status === 204 || error.response.status === 200)) {
      logger.debug(`✅ DELETE exitoso a ${url} (respuesta vacía):`, error.response.status);
      return { success: true, status: error.response.status };
    }

    logger.error(`Error en DELETE a ${url}:`, error);
    throw error;
  }
};

/**
 * Función genérica para realizar peticiones HTTP
 * @param {object} config - Configuración de la petición
 * @param {string} config.url - Ruta del endpoint
 * @param {string} config.method - Método HTTP (GET, POST, PUT, PATCH, DELETE)
 * @param {object} config.data - Datos a enviar (para POST, PUT, PATCH)
 * @param {object} config.params - Parámetros de query (para GET)
 * @param {boolean} config.requiresAuth - Indica si la petición requiere autenticación
 * @param {object} config.headers - Headers adicionales
 */
export const apiRequest = async (config) => {
  try {
    const { url, method = 'GET', data, params, requiresAuth = true, headers = {} } = config;

    logger.debug(`apiRequest: ${method.toUpperCase()} a ${url}`);

    const apiInstance = await getApiInstance();

    const requestConfig = {
      url,
      method: method.toLowerCase(),
      requiresAuth,
      headers: {
        ...headers
      }
    };

    // Agregar datos según el método
    if (['post', 'put', 'patch'].includes(method.toLowerCase()) && data) {
      requestConfig.data = data;
    }

    if (method.toLowerCase() === 'get' && params) {
      requestConfig.params = params;
    }

    const response = await apiInstance.request(requestConfig);

    // Retornar en el formato esperado por el código de personalización
    return {
      data: response.data,
      status: response.status,
      headers: response.headers
    };
  } catch (error) {
    logger.error(`Error en apiRequest ${config.method} a ${config.url}:`, error);
    throw error;
  }
};

/**
 * Función para obtener la URL de medios
 * @param {string} path - Ruta del medio
 * @returns {Promise<string>} URL completa del medio
 */
export const getMediaURL = async (path) => {
  const baseMediaURL = await getMediaBaseURL();

  if (!path) return null;

  // Si es una URL completa, devolverla tal como está
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // Si es una ruta relativa, construir URL completa
  if (!path.startsWith('/')) {
    return `${baseMediaURL}/media/${path}`;
  }

  return `${baseMediaURL}${path}`;
};

/**
 * Función para obtener información de debug de la configuración
 */
export const getDebugInfo = () => {
  return serverConfig.getDebugInfo();
};

/**
 * Función para forzar reconexión del servidor
 */
export const forceReconnect = async () => {
  logger.info('🔄 Forzando reconexión del servidor...');

  try {
    // Reinicializar configuración
    isInitialized = false;
    api = null;

    // Crear nueva instancia
    await ensureInitialized();
    api = await createApiInstance();
    setupInterceptors(api);

    logger.info('✅ Reconexión exitosa');
    return true;
  } catch (error) {
    logger.error('❌ Error en reconexión:', error);
    return false;
  }
};

// Exportar la función de inicialización para uso manual si es necesario
export const initializeServerConfig = ensureInitialized; 