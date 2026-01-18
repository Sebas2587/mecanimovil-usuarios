import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as authService from '../services/auth';
import * as userService from '../services/user';
import WebSocketService from '../services/websocketService';
import { forceReconnect } from '../services/api';
import logger from '../utils/logger';
import NotificationService from '../services/notificationService';

// Crear el contexto
const AuthContext = createContext();

/**
 * Proveedor del contexto de autenticación
 * Gestiona el estado de autenticación del usuario y proporciona métodos para login, registro y logout
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  // Efecto para cargar el usuario y token desde AsyncStorage al iniciar la app
  useEffect(() => {
    const loadStoredData = async () => {
      try {
        setLoading(true);
        // Intentar obtener el token almacenado
        const storedToken = await AsyncStorage.getItem('auth_token');
        const storedUser = await AsyncStorage.getItem('user');

        logger.debug('Datos almacenados cargados:', {
          token: storedToken ? 'Token presente' : 'Sin token',
          user: storedUser ? 'Usuario presente' : 'Sin usuario'
        });

        if (storedToken && storedUser && storedToken !== "usuario_registrado_exitosamente") {
          const parsedUser = JSON.parse(storedUser);
          // Normalizar datos del usuario al cargar desde storage
          const normalizedUser = {
            ...parsedUser,
            firstName: parsedUser.firstName || parsedUser.first_name || '',
            lastName: parsedUser.lastName || parsedUser.last_name || '',
            first_name: parsedUser.first_name || parsedUser.firstName || '',
            last_name: parsedUser.last_name || parsedUser.lastName || '',
            username: parsedUser.username || parsedUser.email,
            email: parsedUser.email || '',
            telefono: parsedUser.telefono || '',
            direccion: parsedUser.direccion || '',
            foto_perfil: parsedUser.foto_perfil || null,
            es_mecanico: parsedUser.es_mecanico || false,
            is_client: parsedUser.is_client || false,
          };

          setToken(storedToken);
          setUser(normalizedUser);
          logger.info('Sesión restaurada exitosamente');
        }
      } catch (e) {
        logger.error('Error al cargar datos de autenticación:', e);
      } finally {
        setLoading(false);
      }
    };

    loadStoredData();
  }, []);

  // Efecto para conectar/desconectar WebSocket basado en el estado de autenticación
  useEffect(() => {
    logger.debug('🔍 [AUTH CONTEXT] Verificando estado de autenticación:', {
      hasUser: !!user,
      hasToken: !!token,
      isClient: user?.is_client
    });

    if (user && token && user.is_client) {
      logger.debug('🔗 [AUTH CONTEXT] Cliente autenticado detectado, conectando WebSocket...');
      logger.debug('🔗 [AUTH CONTEXT] Usuario:', user.username || user.email);
      WebSocketService.connect();

      // Cleanup al desmontar o al cambiar de usuario
      return () => {
        logger.debug('🔌 [AUTH CONTEXT] Desconectando WebSocket del cliente...');
        WebSocketService.disconnect();
      };
    } else if (!user || !token) {
      // Si no hay usuario, desconectar WebSocket
      logger.debug('🔌 [AUTH CONTEXT] No hay usuario autenticado, desconectando WebSocket');
      WebSocketService.disconnect();
    } else {
      logger.debug('ℹ️ [AUTH CONTEXT] Usuario no es cliente, no conectando WebSocket');
    }
  }, [user, token]);

  // Efecto para registrar push token cuando el usuario inicia sesión
  useEffect(() => {
    const registrarPushToken = async () => {
      if (!user || !user.id) return;

      try {
        const hasPermission = await NotificationService.requestPermissions();
        if (hasPermission) {
          const pushToken = await NotificationService.obtenerPushToken();
          if (pushToken) {
            await NotificationService.registrarTokenEnBackend(pushToken, user.id);
            logger.debug('✅ Push token registrado después de login');
          }
        }
      } catch (error) {
        logger.warn('⚠️ Error registrando push token:', error);
      }
    };

    if (user && token) {
      // Pequeño delay para asegurar que el token esté disponible
      const timer = setTimeout(() => {
        registrarPushToken();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [user, token]);

  /**
   * Iniciar sesión con credenciales
   * @param {string} username - Nombre de usuario o correo electrónico
   * @param {string} password - Contraseña
   */
  const login = async (username, password) => {
    try {
      setLoading(true);
      setError(null);

      logger.debug('🔐 AuthContext: Intentando iniciar sesión con:', username);

      // Limpiar cualquier token anterior para evitar problemas
      await AsyncStorage.removeItem('auth_token');

      // Llamar al servicio de autenticación
      const response = await authService.login(username, password);

      logger.debug('📥 AuthContext: Respuesta de login recibida:', {
        tokenRecibido: response.token ? 'Token presente' : 'Sin token',
        userRecibido: response.user ? 'Usuario presente' : 'Sin usuario'
      });

      if (!response.token) {
        throw new Error('No se recibió un token válido del servidor');
      }

      // Normalizar y mapear los datos del usuario para consistencia
      // El backend devuelve snake_case, pero normalizamos para uso en frontend
      let normalizedUser = {
        id: response.user.id,
        username: response.user.username || response.user.email, // Username técnico (email) para login
        email: response.user.email || '',
        firstName: response.user.first_name || response.user.firstName || '',
        lastName: response.user.last_name || response.user.lastName || '',
        first_name: response.user.first_name || response.user.firstName || '',
        last_name: response.user.last_name || response.user.lastName || '',
        telefono: response.user.telefono || '',
        direccion: response.user.direccion || '',
        foto_perfil: response.user.foto_perfil || null,
        es_mecanico: response.user.es_mecanico !== undefined ? response.user.es_mecanico : false,
        is_client: response.user.is_client !== undefined ? response.user.is_client : true,
      };

      // CRÍTICO: Validar que el usuario NO sea un proveedor antes de permitir login
      // Los proveedores solo pueden iniciar sesión en la app de proveedores, no en la app de usuarios

      // PRIMERA VERIFICACIÓN: Verificar si el campo es_mecanico indica que es proveedor
      // Esto es una verificación rápida sin necesidad de llamadas adicionales al backend
      if (normalizedUser.es_mecanico === true) {
        logger.warn('⚠️ [AuthContext] Intento de login de proveedor en app de usuarios rechazado (es_mecanico=true)');
        // Limpiar cualquier token temporal que pudo haberse guardado
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('user');
        setToken(null);
        setUser(null);

        const errorMessage = 'Esta cuenta es de proveedor. Por favor, utiliza la aplicación de proveedores para iniciar sesión.';
        setError(errorMessage);
        return {
          success: false,
          error: errorMessage
        };
      }

      // SEGUNDA VERIFICACIÓN: Guardar token temporalmente para verificar con el backend
      // si tiene perfil de proveedor (mecánico o taller)
      // Esto requiere autenticación, así que guardamos el token primero
      setToken(response.token);
      await AsyncStorage.setItem('auth_token', response.token);

      // Verificar si tiene perfil de proveedor usando el endpoint del backend
      try {
        // Pequeño delay para asegurar que el token esté disponible para el interceptor de axios
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verificar si es proveedor usando el endpoint del backend
        const esProveedor = await userService.isUserProvider();

        if (esProveedor) {
          logger.warn('⚠️ [AuthContext] Usuario tiene perfil de proveedor (mecánico/taller), rechazando login en app de usuarios');
          // Limpiar token y datos porque es proveedor
          await AsyncStorage.removeItem('auth_token');
          await AsyncStorage.removeItem('user');
          setToken(null);
          setUser(null);

          const errorMessage = 'Esta cuenta es de proveedor. Por favor, utiliza la aplicación de proveedores para iniciar sesión.';
          setError(errorMessage);
          return {
            success: false,
            error: errorMessage
          };
        }

        // Si llegamos aquí, el usuario NO es proveedor, continuar con el login normal
        logger.debug('✅ [AuthContext] Usuario verificado como cliente (no proveedor), continuando con login');
      } catch (providerCheckError) {
        // Si hay error verificando (excepto 404 que significa que no es proveedor), 
        // continuar con el login pero loguear el warning solo en desarrollo
        if (providerCheckError.status !== 404 && providerCheckError.response?.status !== 404) {
          logger.warn('⚠️ [AuthContext] Error verificando si usuario es proveedor, continuando con login:', providerCheckError.message);
        } else {
          // Si es 404, significa que no es proveedor (esto es normal), continuar normalmente
          logger.debug('✅ [AuthContext] Usuario no es proveedor (404 en estado-proveedor), continuando con login');
        }
        // Continuar con el login aunque haya habido un error verificando (asumir que no es proveedor)
      }

      // Si llegamos aquí, el usuario NO es proveedor según ambas verificaciones
      // Continuar con el login normal
      setUser(normalizedUser);

      // Guardar en AsyncStorage con datos normalizados (el token ya está guardado arriba)
      await AsyncStorage.setItem('user', JSON.stringify(normalizedUser));

      // Intentar obtener datos completos del perfil después del login (OPCIONAL)
      // Esto asegura que tengamos todos los campos (telefono, direccion, etc.)
      // NOTA: Esto es opcional - si falla, usamos los datos del login que ya son suficientes
      // Hacer esto en segundo plano para no bloquear el flujo de login
      try {
        // Pequeño delay adicional para asegurar que el token esté disponible para el interceptor de axios
        await new Promise(resolve => setTimeout(resolve, 200));

        logger.debug('📥 [AuthContext] Intentando obtener datos completos del perfil después del login (en segundo plano)...');
        logger.debug('👤 [AuthContext] ID del usuario:', response.user.id);

        // Intentar obtener el perfil completo con el userId
        // Esto intentará primero /usuarios/usuarios/{id}/ y luego /usuarios/profile/ como fallback
        const fullProfileData = await userService.getUserProfile(response.user.id);

        if (fullProfileData && fullProfileData.id && fullProfileData.email) {
          logger.debug('✅ [AuthContext] Datos completos del perfil obtenidos exitosamente, actualizando contexto...');

          // CRÍTICO: Verificar nuevamente si es proveedor con los datos completos del perfil
          // Esto es una verificación adicional de seguridad
          if (fullProfileData.es_mecanico === true) {
            logger.warn('⚠️ [AuthContext] Usuario es proveedor según datos completos del perfil, rechazando login');
            // Limpiar token y datos
            await AsyncStorage.removeItem('auth_token');
            await AsyncStorage.removeItem('user');
            setToken(null);
            setUser(null);

            const errorMessage = 'Esta cuenta es de proveedor. Por favor, utiliza la aplicación de proveedores para iniciar sesión.';
            setError(errorMessage);
            return {
              success: false,
              error: errorMessage
            };
          }

          // Actualizar con los datos completos del perfil, priorizando los datos del perfil completo
          const updatedUser = {
            ...normalizedUser,
            id: fullProfileData.id || normalizedUser.id,
            username: fullProfileData.username || fullProfileData.email || normalizedUser.username || normalizedUser.email,
            email: fullProfileData.email || normalizedUser.email || '',
            firstName: (fullProfileData.first_name || fullProfileData.firstName || '').trim() || normalizedUser.firstName || '',
            lastName: (fullProfileData.last_name || fullProfileData.lastName || '').trim() || normalizedUser.lastName || '',
            first_name: (fullProfileData.first_name || fullProfileData.firstName || '').trim() || normalizedUser.first_name || '',
            last_name: (fullProfileData.last_name || fullProfileData.lastName || '').trim() || normalizedUser.last_name || '',
            telefono: fullProfileData.telefono || normalizedUser.telefono || '',
            direccion: fullProfileData.direccion || normalizedUser.direccion || '',
            foto_perfil: fullProfileData.foto_perfil || normalizedUser.foto_perfil || null,
            es_mecanico: false, // Asegurar que es_mecanico sea false (ya verificamos que no es proveedor)
            is_client: fullProfileData.is_client !== undefined ? fullProfileData.is_client : true, // Asegurar que is_client sea true
          };

          // Actualizar estado y AsyncStorage con datos completos
          setUser(updatedUser);
          await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

          logger.debug('✅ [AuthContext] Usuario actualizado con datos completos del perfil:', {
            id: updatedUser.id,
            firstName: updatedUser.firstName || '(vacío)',
            lastName: updatedUser.lastName || '(vacío)',
            email: updatedUser.email,
            telefono: updatedUser.telefono || '(vacío)',
            direccion: updatedUser.direccion || '(vacío)',
            es_mecanico: updatedUser.es_mecanico,
            is_client: updatedUser.is_client,
          });
        } else {
          logger.warn('⚠️ [AuthContext] Datos del perfil incompletos o inválidos, usando datos del login');
          logger.warn('⚠️ [AuthContext] Esto no es crítico - los datos del login son suficientes');
        }
      } catch (profileError) {
        // El error ya fue logueado en getUserProfile con detalles completos
        // Aquí solo mostramos un resumen y continuamos con los datos del login
        // NO lanzar el error - solo loguearlo como warning (solo en desarrollo)
        logger.warn('⚠️ [AuthContext] No se pudieron obtener datos completos del perfil después del login');
        logger.warn('⚠️ [AuthContext] Error:', profileError.message || 'Error desconocido');
        logger.warn('⚠️ [AuthContext] Continuando con datos del login (esto es normal y no afecta la funcionalidad)');
        logger.warn('⚠️ [AuthContext] El usuario puede acceder al perfil más tarde para obtener los datos completos');
        // Continuar con los datos del login si falla obtener el perfil completo
        // Los datos del login ya están guardados arriba y son suficientes para continuar
        // NO relanzar el error - el login ya fue exitoso
      }

      // Forzar reinicialización de la configuración del servidor después del login
      // Esto asegura que las URLs de medios estén correctas para producción
      try {
        logger.debug('🔄 AuthContext: Reinicializando configuración del servidor después del login...');
        await forceReconnect();
        logger.debug('✅ AuthContext: Configuración del servidor actualizada correctamente');
      } catch (reconnectError) {
        logger.warn('⚠️ AuthContext: Error al reinicializar servidor (continuando de todas formas):', reconnectError);
      }

      logger.debug('✅ AuthContext: Login exitoso, datos guardados');

      // Registrar push token para notificaciones (en segundo plano, no bloquea el login)
      try {
        const hasPermission = await NotificationService.requestPermissions();
        if (hasPermission) {
          const pushToken = await NotificationService.obtenerPushToken();
          if (pushToken && normalizedUser.id) {
            // Registrar en segundo plano sin bloquear el login
            NotificationService.registrarTokenEnBackend(pushToken, normalizedUser.id)
              .catch(error => {
                logger.warn('⚠️ Error registrando push token (no crítico):', error);
              });
          }
        }
      } catch (pushError) {
        // No fallar el login si hay error con push tokens
        logger.warn('⚠️ Error obteniendo push token (no crítico):', pushError);
      }

      return { success: true, user: normalizedUser };
    } catch (e) {
      // Log completo del error para debugging (solo en desarrollo, nunca en producción)
      // En producción (APK), este log NO aparecerá
      logger.error('❌ AuthContext: Error en proceso de login:', {
        message: e.message,
        status: e.status || e.response?.status,
        isNetworkError: e.isNetworkError,
        code: e.code,
        // NO loguear datos sensibles o detalles técnicos del error completo
      });

      // Determinar mensaje de error amigable para el usuario
      let errorMessage = 'No se pudo iniciar sesión. Por favor, verifica tus credenciales e intenta nuevamente.';

      // Errores de conexión/red
      if (e.isNetworkError || e.code === 'ERR_NETWORK' || e.code === 'ECONNREFUSED' || e.code === 'ETIMEDOUT' || e.code === 'ENOTFOUND') {
        errorMessage = 'No se pudo conectar al servidor. Verifica tu conexión a internet e intenta nuevamente.';
      }
      // Errores de permisos (403) - usuario proveedor intentando iniciar sesión en app de usuarios
      // Este error debe manejarse ANTES de los errores 401/400 para tener prioridad
      else if (e.status === 403 || e.response?.status === 403) {
        // Extraer mensaje del backend si está disponible y es amigable
        if (e.response?.data) {
          const apiError = e.response.data;

          // Buscar mensajes amigables del backend (prioridad a non_field_errors)
          if (apiError.non_field_errors) {
            const backendMessage = Array.isArray(apiError.non_field_errors)
              ? apiError.non_field_errors[0]
              : apiError.non_field_errors;
            // Solo usar si el mensaje es amigable (no contiene códigos técnicos)
            if (backendMessage && typeof backendMessage === 'string' && !backendMessage.includes('status') && !backendMessage.includes('code')) {
              errorMessage = backendMessage;
            }
          } else if (apiError.detail && typeof apiError.detail === 'string') {
            // Solo usar si el mensaje es amigable
            if (!apiError.detail.includes('status') && !apiError.detail.includes('code') && !apiError.detail.includes('HTTP')) {
              errorMessage = apiError.detail;
            }
          } else if (apiError.error && typeof apiError.error === 'string') {
            // Solo usar si el mensaje es amigable
            if (!apiError.error.includes('status') && !apiError.error.includes('code') && !apiError.error.includes('HTTP')) {
              errorMessage = apiError.error;
            }
          }
        }

        // Si el mensaje aún es genérico, usar mensaje específico para proveedores
        if (errorMessage.includes('No se pudo iniciar sesión') || errorMessage === 'Error al iniciar sesión' || !errorMessage || errorMessage.length === 0) {
          errorMessage = 'Esta cuenta es de proveedor. Por favor, utiliza la aplicación de proveedores para iniciar sesión.';
        }
      }
      // Errores de autenticación (401, 400) - credenciales incorrectas
      else if (e.status === 401 || e.status === 400 || e.response?.status === 401 || e.response?.status === 400) {
        // Extraer mensaje del backend si está disponible y es amigable
        if (e.response?.data) {
          const apiError = e.response.data;

          // Buscar mensajes amigables del backend
          if (apiError.non_field_errors) {
            const backendMessage = Array.isArray(apiError.non_field_errors)
              ? apiError.non_field_errors[0]
              : apiError.non_field_errors;
            // Solo usar si el mensaje es amigable (no contiene códigos técnicos)
            if (backendMessage && typeof backendMessage === 'string' && !backendMessage.includes('status') && !backendMessage.includes('code')) {
              errorMessage = backendMessage;
            }
          } else if (apiError.detail && typeof apiError.detail === 'string') {
            // Solo usar si el mensaje es amigable
            if (!apiError.detail.includes('status') && !apiError.detail.includes('code') && !apiError.detail.includes('HTTP')) {
              errorMessage = apiError.detail;
            }
          } else if (apiError.error && typeof apiError.error === 'string') {
            // Solo usar si el mensaje es amigable
            if (!apiError.error.includes('status') && !apiError.error.includes('code') && !apiError.error.includes('HTTP')) {
              errorMessage = apiError.error;
            }
          }
        }

        // Si el mensaje aún es genérico, usar mensaje específico de credenciales
        if (errorMessage.includes('No se pudo iniciar sesión') || errorMessage === 'Error al iniciar sesión') {
          errorMessage = 'Correo electrónico o contraseña incorrectos. Por favor, verifica tus credenciales e intenta nuevamente.';
        }
      }
      // Error del servidor (500, 502, 503, 504)
      else if (e.status === 500 || e.status === 502 || e.status === 503 || e.status === 504 ||
        e.response?.status === 500 || e.response?.status === 502 || e.response?.status === 503 || e.response?.status === 504) {
        errorMessage = 'El servidor no está disponible en este momento. Por favor, intenta nuevamente más tarde.';
      }
      // Error de timeout
      else if (e.code === 'ECONNABORTED' || e.message?.includes('timeout')) {
        errorMessage = 'La solicitud está tardando demasiado. Verifica tu conexión a internet e intenta nuevamente.';
      }
      // Otros errores - nunca mostrar mensajes técnicos
      else if (e.message) {
        // Validar que el mensaje no sea técnico antes de usarlo
        const technicalKeywords = ['status', 'code', 'HTTP', 'ERR_', 'ECONN', 'ETIMEDOUT', 'ENOTFOUND', 'axios', 'request failed'];
        const isTechnical = technicalKeywords.some(keyword => e.message.toLowerCase().includes(keyword.toLowerCase()));

        if (!isTechnical && e.message.length < 100) {
          // Solo usar mensajes cortos y amigables
          errorMessage = e.message;
        }
        // Si es técnico, mantener el mensaje genérico
      }

      // Asegurar que el mensaje final sea siempre amigable y no técnico
      errorMessage = errorMessage.replace(/status\s*\d+/gi, '').replace(/code\s*:\s*\w+/gi, '').trim();
      if (!errorMessage || errorMessage.length === 0) {
        errorMessage = 'No se pudo iniciar sesión. Por favor, verifica tus credenciales e intenta nuevamente.';
      }

      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Registrar un nuevo usuario
   * @param {object} userData - Datos del usuario a registrar
   * @returns {object} - { success: boolean, error?: string }
   */
  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);

      // Solo loguear en desarrollo (__DEV__), nunca en producción (APK)
      logger.debug('📝 AuthContext: Iniciando registro con datos:', {
        ...userData,
        password: '***'
      });

      // Llamar al servicio de registro
      const response = await authService.register(userData);

      logger.debug('📥 AuthContext: Respuesta de registro recibida:', {
        hasToken: !!response.token,
        tokenType: response.token === "usuario_registrado_exitosamente" ? "temporal" : "real"
      });

      // Verificar si es un token temporal de registro exitoso
      if (response.token === "usuario_registrado_exitosamente") {
        // No guardamos este token en AsyncStorage, solo marcamos que el registro fue exitoso
        setRegisterSuccess(true);

        logger.debug('✅ AuthContext: Registro exitoso (token temporal)');

        return { success: true };
      }

      // Proceso normal para token real
      if (response.token && response.user) {
        setToken(response.token);
        setUser(response.user);

        // Almacenar en AsyncStorage
        await AsyncStorage.setItem('auth_token', response.token);
        await AsyncStorage.setItem('user', JSON.stringify(response.user));

        logger.debug('✅ AuthContext: Registro exitoso (token real)');

        return { success: true };
      }

      throw new Error('Respuesta inválida del servidor');
    } catch (e) {
      // Log solo en desarrollo (__DEV__), nunca en producción (APK)
      logger.error('❌ AuthContext: Error completo en registro:', {
        message: e.message,
        status: e.status || e.response?.status,
        data: e.response?.data,
        isNetworkError: e.isNetworkError,
        code: e.code
      });

      let errorMessage = 'Error al registrar usuario';
      let errorDetails = {};
      let statusCode = e.status || (e.response && e.response.status) || 500;

      // Manejar errores de red
      if (e.isNetworkError || e.code === 'ERR_NETWORK' || e.code === 'ECONNREFUSED') {
        errorMessage = 'No se pudo conectar al servidor. Verifica tu conexión a internet e intenta nuevamente.';
        statusCode = 0;
      } else if (e.code === 'ECONNABORTED' || e.message?.includes('timeout')) {
        errorMessage = 'La conexión tardó demasiado. Verifica tu conexión a internet e intenta nuevamente.';
        statusCode = 0;
      } else if (e.response && e.response.data) {
        // Error de la API del backend
        const apiError = e.response.data;

        // Extraer mensaje principal
        if (typeof apiError === 'string') {
          errorMessage = apiError;
        } else if (apiError.error) {
          errorMessage = typeof apiError.error === 'string' ? apiError.error : JSON.stringify(apiError.error);
        } else if (apiError.message) {
          errorMessage = typeof apiError.message === 'string' ? apiError.message : JSON.stringify(apiError.message);
        } else if (apiError.detail) {
          errorMessage = typeof apiError.detail === 'string' ? apiError.detail : JSON.stringify(apiError.detail);
        } else if (apiError.non_field_errors) {
          errorMessage = Array.isArray(apiError.non_field_errors)
            ? apiError.non_field_errors[0]
            : apiError.non_field_errors;
        }

        // Extraer errores por campo específico
        if (apiError.email) {
          errorDetails.email = Array.isArray(apiError.email) ? apiError.email[0] : apiError.email;
          if (!errorMessage.includes('correo') && !errorMessage.includes('email')) {
            errorMessage = errorDetails.email || errorMessage;
          }
        }
        if (apiError.username) {
          errorDetails.username = Array.isArray(apiError.username) ? apiError.username[0] : apiError.username;
          // Si el username es igual al email, puede ser un error de email duplicado
          if (errorDetails.username.toLowerCase().includes('ya existe') ||
            errorDetails.username.toLowerCase().includes('already exists') ||
            errorDetails.username.toLowerCase().includes('registered')) {
            errorDetails.email = 'Este correo electrónico ya está registrado';
            if (!errorMessage.includes('correo') && !errorMessage.includes('email')) {
              errorMessage = errorDetails.email || errorMessage;
            }
          }
        }
        if (apiError.password) {
          errorDetails.password = Array.isArray(apiError.password) ? apiError.password[0] : apiError.password;
        }
        if (apiError.first_name) {
          errorDetails.firstName = Array.isArray(apiError.first_name) ? apiError.first_name[0] : apiError.first_name;
        }
        if (apiError.last_name) {
          errorDetails.lastName = Array.isArray(apiError.last_name) ? apiError.last_name[0] : apiError.last_name;
        }

        // Mensajes específicos según el código de estado
        if (statusCode === 400) {
          // Si tenemos un mensaje genérico pero hay detalles específicos, usar el específico
          if (Object.keys(errorDetails).length > 0) {
            // Ya tenemos los detalles específicos arriba
          } else if (!errorMessage || errorMessage === 'Error al registrar usuario') {
            errorMessage = 'Los datos proporcionados no son válidos. Por favor, verifica todos los campos.';
          }
        } else if (statusCode === 409) {
          errorMessage = 'Este correo electrónico ya está registrado. Por favor, inicia sesión o utiliza otro correo.';
          errorDetails.email = errorMessage;
        } else if (statusCode === 500) {
          errorMessage = 'Error del servidor. Por favor, intenta nuevamente más tarde o contacta al soporte.';
        } else if (statusCode === 503) {
          errorMessage = 'El servidor está temporalmente no disponible. Por favor, intenta nuevamente más tarde.';
        }

        // Si hay detalles adicionales, agregarlos al mensaje
        if (apiError.details && typeof apiError.details === 'object') {
          // Guardar detalles adicionales para mostrar en la UI si es necesario
          errorDetails.additional = apiError.details;
        }
      } else if (e.message) {
        errorMessage = e.message;
      }

      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
        errorDetails: errorDetails,
        statusCode: statusCode
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Actualizar perfil de usuario
   * @param {object} userData - Datos actualizados del usuario
   */
  const updateProfile = async (userData) => {
    // Si _skipBackendUpdate es true, solo actualizar estado local sin cambiar loading
    // Esto evita re-renderizaciones innecesarias en otros componentes
    const skipBackendUpdate = userData._skipBackendUpdate;

    try {
      // Solo cambiar loading si realmente vamos a hacer una llamada al backend
      if (!skipBackendUpdate) {
        setLoading(true);
      }
      setError(null);

      // Si userData ya viene normalizado (del servicio de actualización), usarlo directamente
      // Si viene del componente EditProfileScreen, normalizarlo
      let normalizedUserData = userData;

      // Si ya tiene firstName/lastName, asumir que está normalizado
      // Si solo tiene first_name/last_name, normalizar
      if (!userData.firstName && userData.first_name) {
        normalizedUserData = {
          ...userData,
          firstName: userData.first_name,
          lastName: userData.last_name,
          first_name: userData.first_name,
          last_name: userData.last_name,
          username: userData.username || userData.email,
          email: userData.email || user?.email || '',
          telefono: userData.telefono || user?.telefono || '',
          direccion: userData.direccion || user?.direccion || '',
          foto_perfil: userData.foto_perfil || user?.foto_perfil || null,
          es_mecanico: userData.es_mecanico !== undefined ? userData.es_mecanico : (user?.es_mecanico || false),
          is_client: userData.is_client !== undefined ? userData.is_client : (user?.is_client || false),
        };
      }

      // Remover _skipBackendUpdate del objeto antes de guardar
      const { _skipBackendUpdate, ...userDataToSave } = normalizedUserData;

      // Llamar al servicio de actualización de perfil si hay cambios que requieren actualización en el backend
      // Si solo estamos actualizando el estado local (desde EditProfileScreen que ya actualizó el backend), no llamar al servicio
      if (!skipBackendUpdate) {
        const updatedUser = await authService.updateProfile(userDataToSave, token);
        // Normalizar los datos recibidos del backend
        normalizedUserData = {
          ...userDataToSave,
          ...updatedUser,
          firstName: updatedUser.first_name || updatedUser.firstName || userDataToSave.firstName,
          lastName: updatedUser.last_name || updatedUser.lastName || userDataToSave.lastName,
          first_name: updatedUser.first_name || userDataToSave.first_name,
          last_name: updatedUser.last_name || userDataToSave.last_name,
        };
      } else {
        // Si skipBackendUpdate, usar los datos normalizados directamente
        normalizedUserData = userDataToSave;
      }

      // Actualizar estado con datos normalizados
      setUser(normalizedUserData);

      // Actualizar en AsyncStorage (hacerlo de forma asíncrona si skipBackendUpdate para no bloquear)
      if (skipBackendUpdate) {
        // Actualizar AsyncStorage de forma asíncrona para no bloquear el renderizado
        AsyncStorage.setItem('user', JSON.stringify(normalizedUserData)).catch(err => {
          logger.warn('⚠️ Error al guardar usuario en AsyncStorage (no crítico):', err);
        });
      } else {
        // Si no es skipBackendUpdate, esperar a que se guarde
        await AsyncStorage.setItem('user', JSON.stringify(normalizedUserData));
      }

      return true;
    } catch (e) {
      setError(e.message || 'Error al actualizar perfil');
      return false;
    } finally {
      // Solo cambiar loading a false si realmente lo cambiamos a true
      if (!skipBackendUpdate) {
        setLoading(false);
      }
    }
  };

  /**
   * Cerrar sesión
   */
  const logout = async () => {
    try {
      setLoading(true);

      // Eliminar datos de AsyncStorage
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user');

      // Limpiar estado
      setToken(null);
      setUser(null);

      return true;
    } catch (e) {
      // Log solo en desarrollo (__DEV__), nunca en producción (APK)
      logger.error('Error al cerrar sesión:', e);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Valores y funciones disponibles a través del contexto
  const value = {
    user,
    token,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook personalizado para usar el contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export default AuthContext; 