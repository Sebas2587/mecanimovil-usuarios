import { post, put, get, delete_ } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '../utils/logger';

/**
 * Obtiene el header de autenticación con el token
 * @returns {Promise<object>} Header con el token de autenticación
 */
export const getAuthHeader = async () => {
  try {
    const token = await AsyncStorage.getItem('auth_token');
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (token && token !== "usuario_registrado_exitosamente") {
      headers['Authorization'] = `Token ${token}`;
    }
    
    return headers;
  } catch (error) {
    logger.error('Error obteniendo token de autenticación:', error);
    return { 'Content-Type': 'application/json' };
  }
};

/**
 * Servicio para iniciar sesión
 * @param {string} username - Nombre de usuario o correo electrónico
 * @param {string} password - Contraseña
 * @returns {Promise<object>} - Respuesta con token y datos de usuario
 */
export const login = async (username, password) => {
  try {
    // Solo loguear en desarrollo (__DEV__), nunca en producción (APK)
    logger.debug('Intentando login con credenciales:', { username, password: '********' });
    
    // Endpoint de autenticación personalizado que devuelve token + datos de usuario
    const response = await post('/usuarios/login/', { 
      username, 
      password 
    });
    
    logger.debug('Respuesta login recibida:', {
      token: response.token ? 'Token recibido' : 'Sin token',
      user: response.user ? 'Datos de usuario recibidos' : 'Sin datos de usuario',
    });
    
    // Verificar que la respuesta tenga el formato esperado
    if (!response.token) {
      logger.error('Error: No se recibió token en la respuesta', response);
      throw new Error('No se recibió un token válido del servidor');
    }
    
    if (!response.user) {
      logger.error('Error: No se recibieron datos de usuario en la respuesta', response);
      throw new Error('No se recibieron datos de usuario del servidor');
    }
    
    // La respuesta ya viene con el formato correcto desde el backend
    return {
      token: response.token,
      user: response.user
    };
  } catch (error) {
    // Log completo del error para debugging (solo en desarrollo, nunca en producción)
    // En producción (APK), estos logs NO aparecerán
    logger.error('❌ [authService.login] Error en login:', {
      message: error.message,
      status: error.status || error.response?.status,
      isNetworkError: error.isNetworkError,
      code: error.code,
      // NO loguear datos sensibles, contraseñas, o detalles técnicos completos
    });
    
    // Preservar la estructura del error para que AuthContext pueda manejarlo apropiadamente
    // Pero asegurar que tenga la información necesaria para generar mensajes amigables
    const formattedError = {
      ...error,
      isNetworkError: error.isNetworkError || error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND',
      status: error.status || error.response?.status,
      response: error.response,
      // NO incluir stack traces, mensajes técnicos completos, o información sensible
    };
    
    throw formattedError;
  }
};

/**
 * Servicio para registrar un nuevo usuario
 * @param {object} userData - Datos del usuario a registrar
 * @returns {Promise<object>} - Respuesta con token y datos de usuario
 */
export const register = async (userData) => {
  try {
    logger.debug('Iniciando registro con datos:', {
      ...userData,
      password: '********' // No mostrar la contraseña en logs
    });
    
    // Validar datos antes de enviar
    if (!userData.firstName || !userData.lastName || !userData.email || !userData.password) {
      throw {
        message: 'Todos los campos son requeridos',
        status: 400,
        response: {
          data: {
            error: 'Todos los campos son requeridos',
            details: 'Por favor completa todos los campos del formulario'
          }
        }
      };
    }

    // Estructura de datos para crear usuario
    // IMPORTANTE: username se usa para login, así que debe ser el email o un identificador único
    // Pero para mostrar al usuario, usaremos first_name como display name
    const userDataToSend = {
      username: userData.email.trim().toLowerCase(), // Usar email como username para login
      email: userData.email.trim().toLowerCase(),
      password: userData.password,
      first_name: userData.firstName.trim(),
      last_name: userData.lastName.trim(),
      telefono: userData.telefono || null,
      direccion: userData.direccion || null,
      es_mecanico: userData.esMecanico || false,
    };

    // Crear usuario
    let userResponse;
    try {
      userResponse = await post('/usuarios/usuarios/', userDataToSend, { requiresAuth: false });
      logger.debug('Usuario creado:', userResponse);
    } catch (createError) {
      // Manejar errores específicos de creación de usuario
      logger.error('Error al crear usuario:', createError);
      
      // Si el error viene del backend, preservar toda la información
      if (createError.response) {
        throw createError; // Re-lanzar el error con toda la información del backend
      }
      
      // Si es un error de red, envolverlo con más contexto
      if (createError.isNetworkError || createError.code === 'ERR_NETWORK') {
        throw {
          ...createError,
          message: createError.message || 'No se pudo conectar al servidor. Verifica tu conexión a internet.',
          isNetworkError: true
        };
      }
      
      // Cualquier otro error
      throw {
        message: createError.message || 'Error al crear el usuario. Por favor, intenta nuevamente.',
        status: createError.status || 500,
        response: {
          data: {
            error: createError.message || 'Error desconocido al crear usuario'
          }
        }
      };
    }

    try {
      // Si es cliente, crear perfil de cliente
      if (!userData.esMecanico) {
        console.log('Creando perfil de cliente para usuario ID:', userResponse.id);
        
        try {
          const clienteResponse = await post('/usuarios/clientes/', {
            usuario: userResponse.id
          }, { requiresAuth: false });
          
          // Si la respuesta tiene un ID, significa que se creó o ya existía (200 o 201)
          if (clienteResponse && (clienteResponse.id || clienteResponse.usuario)) {
            console.log('✅ Perfil de cliente creado o ya existe:', clienteResponse.id || clienteResponse.usuario);
          } else {
            console.log('✅ Perfil de cliente creado correctamente');
          }
        } catch (clienteError) {
          // Si el cliente ya existe (200 OK), continuar normalmente
          // El backend devuelve 200 con los datos del cliente existente
          if (clienteError.status === 200 || clienteError.response?.status === 200 || 
              (clienteError.response?.data && (clienteError.response.data.id || clienteError.response.data.usuario))) {
            console.log('✅ Perfil de cliente ya existe, continuando con el registro');
          } else if (clienteError.response?.status === 201) {
            // 201 Created - cliente creado exitosamente
            console.log('✅ Perfil de cliente creado exitosamente');
          } else {
            // Si es otro error, re-lanzarlo para que se maneje en el catch externo
            console.error('❌ Error al crear perfil de cliente:', clienteError);
            throw clienteError;
          }
        }
      } else {
        // Si es mecánico, crear perfil de mecánico
        console.log('Creando perfil de mecánico para usuario ID:', userResponse.id);
        
        try {
          const mecanicoResponse = await post('/usuarios/mecanicos/', {
            usuario: userResponse.id,
            disponibilidad: userData.disponibilidad || 'Disponible',
            especialidades: userData.especialidades || []
          }, { requiresAuth: false });
          
          // Si la respuesta tiene un ID, significa que se creó o ya existía (200 o 201)
          if (mecanicoResponse && (mecanicoResponse.id || mecanicoResponse.usuario)) {
            console.log('✅ Perfil de mecánico creado o ya existe:', mecanicoResponse.id || mecanicoResponse.usuario);
          } else {
            console.log('✅ Perfil de mecánico creado correctamente');
          }
        } catch (mecanicoError) {
          // Si el mecánico ya existe (200 OK), continuar normalmente
          if (mecanicoError.status === 200 || mecanicoError.response?.status === 200 || 
              (mecanicoError.response?.data && (mecanicoError.response.data.id || mecanicoError.response.data.usuario))) {
            logger.debug('✅ Perfil de mecánico ya existe, continuando con el registro');
          } else if (mecanicoError.response?.status === 201) {
            // 201 Created - mecánico creado exitosamente
            logger.debug('✅ Perfil de mecánico creado exitosamente');
          } else {
            // Si es otro error, re-lanzarlo para que se maneje en el catch externo
            logger.error('❌ Error al crear perfil de mecánico:', mecanicoError);
            throw mecanicoError;
          }
        }
      }

      try {
        // Construir manualmente el objeto de resultado para evitar tener que iniciar sesión
        logger.debug('Construcción de respuesta de autenticación sin iniciar sesión');
        // Normalizar los datos del usuario de la misma forma que en login
        return {
          token: "usuario_registrado_exitosamente", // Token temporal
          user: {
            id: userResponse.id,
            username: userResponse.username || userResponse.email, // Username técnico (email) para login
            email: userResponse.email,
            firstName: userResponse.first_name || '',
            lastName: userResponse.last_name || '',
            first_name: userResponse.first_name || '', // Mantener snake_case para compatibilidad
            last_name: userResponse.last_name || '', // Mantener snake_case para compatibilidad
            telefono: userResponse.telefono || '',
            direccion: userResponse.direccion || '',
            foto_perfil: userResponse.foto_perfil || null,
            es_mecanico: userResponse.es_mecanico || false,
            is_client: userResponse.is_client || false,
          }
        };
        
        // NOTA: El código siguiente está comentado porque el inicio de sesión automático
        // estaba fallando. En su lugar, redirigimos al usuario a la pantalla de inicio de sesión.
        /*
        // Iniciar sesión automáticamente
        console.log('Iniciando sesión automática tras registro exitoso');
        return await login(userData.username, userData.password);
        */
      } catch (loginError) {
        logger.error('Error en inicio de sesión automático:', loginError);
        // Ya no eliminamos el usuario, simplemente devolvemos un error que indique
        // que el registro fue exitoso pero el inicio de sesión falló
        throw new Error('Tu cuenta se ha creado correctamente, pero ocurrió un problema al iniciar sesión automáticamente. Por favor, inicia sesión manualmente.');
      }
      
    } catch (profileError) {
      logger.error('Error al crear perfil:', profileError);
      
      // Si el error indica que el cliente ya existe (200 OK), no es un error real
      if (profileError.status === 200 || profileError.response?.status === 200 || (profileError.data && profileError.data.id)) {
        logger.debug('✅ Cliente ya existe, registro completado');
        // Continuar con el flujo normal - retornar respuesta exitosa
        // Normalizar los datos del usuario de la misma forma que en login
        return {
          token: "usuario_registrado_exitosamente",
          user: {
            id: userResponse.id,
            username: userResponse.username || userResponse.email, // Username técnico (email) para login
            email: userResponse.email,
            firstName: userResponse.first_name || '',
            lastName: userResponse.last_name || '',
            first_name: userResponse.first_name || '', // Mantener snake_case para compatibilidad
            last_name: userResponse.last_name || '', // Mantener snake_case para compatibilidad
            telefono: userResponse.telefono || '',
            direccion: userResponse.direccion || '',
            foto_perfil: userResponse.foto_perfil || null,
            es_mecanico: userResponse.es_mecanico || false,
            is_client: userResponse.is_client || false,
          }
        };
      } else {
        // Solo intentar eliminar el usuario si realmente hubo un error
        logger.warn('⚠️ Error real al crear perfil, intentando eliminar usuario creado...');
        try {
          await delete_(`/usuarios/usuarios/${userResponse.id}/`, { requiresAuth: false });
          logger.debug('Usuario eliminado tras fallo en creación de perfil');
        } catch (deleteError) {
          logger.error('No se pudo eliminar el usuario tras el error:', deleteError);
          // No lanzar error aquí, ya tenemos un error principal
        }
        
        // Envolver el error del perfil con más contexto
        throw {
          message: 'El usuario se creó, pero hubo un problema al crear el perfil. Por favor, contacta al soporte.',
          status: profileError.status || profileError.response?.status || 500,
          response: profileError.response || {
            data: {
              error: profileError.message || 'Error al crear perfil de usuario',
              details: profileError.response?.data || profileError.data
            }
          },
          originalError: profileError
        };
      }
    }
    
  } catch (error) {
    logger.error('Error completo en registro:', error);
    
    // Si el error ya está bien formateado, simplemente re-lanzarlo
    if (error.response || error.isNetworkError || error.status) {
      throw error;
    }
    
    // Si es un error desconocido, envolverlo con formato estándar
    throw {
      message: error.message || 'Ocurrió un error inesperado al registrar. Por favor, intenta nuevamente.',
      status: 500,
      response: {
        data: {
          error: error.message || 'Error desconocido',
          details: 'Por favor, verifica todos los campos e intenta nuevamente'
        }
      },
      originalError: error
    };
  }
};

/**
 * Servicio para actualizar el perfil de usuario
 * @param {object} userData - Datos actualizados del usuario
 * @param {string} token - Token de autenticación
 * @returns {Promise<object>} - Usuario actualizado
 */
export const updateProfile = async (userData, token) => {
  try {
    const userId = userData.id;
    
    // Convertir datos de camelCase a snake_case para el backend
    const firstName = userData.firstName || userData.first_name;
    const lastName = userData.lastName || userData.last_name;
    
    // Actualizar datos básicos del usuario
    const userResponse = await put(`/usuarios/usuarios/${userId}/`, {
      first_name: firstName,
      last_name: lastName,
      telefono: userData.telefono || null,
      direccion: userData.direccion || null,
      email: userData.email, // Incluir email si está presente
    });

    // Si el usuario es mecánico, actualizar datos adicionales
    if (userData.esMecanico && userData.mecanicoId) {
      await put(`/usuarios/mecanicos/${userData.mecanicoId}/`, {
        disponibilidad: userData.disponibilidad,
        especialidades: userData.especialidades,
      });
    }

    // Normalizar respuesta del backend antes de retornar
    return {
      ...userResponse,
      firstName: userResponse.first_name || firstName,
      lastName: userResponse.last_name || lastName,
      first_name: userResponse.first_name,
      last_name: userResponse.last_name,
      username: userResponse.username || userData.username,
      email: userResponse.email || userData.email,
    };
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    throw error;
  }
};

/**
 * Servicio para obtener los datos del usuario actual
 * @param {string} userId - ID del usuario
 * @returns {Promise<object>} - Datos del usuario
 */
export const getUserProfile = async (userId) => {
  try {
    const response = await get(`/usuarios/usuarios/${userId}/`);
    return response;
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    throw error;
  }
};

/**
 * Servicio para cambiar la contraseña del usuario
 * @param {string} oldPassword - Contraseña actual
 * @param {string} newPassword - Nueva contraseña
 * @returns {Promise<object>} - Respuesta del servidor
 */
export const changePassword = async (oldPassword, newPassword) => {
  try {
    const response = await post('/usuarios/change-password/', {
      old_password: oldPassword,
      new_password: newPassword,
    });
    return response;
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    throw error;
  }
};

/**
 * Servicio para solicitar recuperación de contraseña
 * @param {string} email - Correo electrónico del usuario
 * @returns {Promise<object>} - Respuesta del servidor
 */
export const forgotPassword = async (email) => {
  try {
    const response = await post('/usuarios/forgot-password/', {
      email: email.trim().toLowerCase(),
    }, { requiresAuth: false });
    return response;
  } catch (error) {
    logger.error('Error al solicitar recuperación de contraseña:', error);
    throw error;
  }
};

/**
 * Servicio para resetear la contraseña con un token
 * @param {string} token - Token de recuperación
 * @param {string} newPassword - Nueva contraseña
 * @returns {Promise<object>} - Respuesta del servidor
 */
export const resetPassword = async (token, newPassword) => {
  try {
    const response = await post('/usuarios/reset-password/', {
      token: token,
      new_password: newPassword,
    }, { requiresAuth: false });
    return response;
  } catch (error) {
    logger.error('Error al resetear contraseña:', error);
    throw error;
  }
}; 