import * as api from './api';
import logger from '../utils/logger';

/**
 * Obtener el perfil del usuario autenticado
 * @param {number} userId - ID del usuario (opcional, para usar endpoint alternativo)
 * @returns {Promise} Promesa con la respuesta del servidor normalizada
 */
export const getUserProfile = async (userId = null) => {
  let profileData = null;
  let lastError = null;
  
  // Estrategia: Intentar múltiples endpoints y aceptar datos parciales
  // Si tenemos userId, intentar el endpoint alternativo primero
  if (userId) {
    try {
      console.log(`🔄 [getUserProfile] Intentando endpoint alternativo: /usuarios/usuarios/${userId}/`);
      profileData = await api.get(`/usuarios/usuarios/${userId}/`);
      
      // Verificar que tenemos al menos id y email (datos mínimos requeridos)
      if (profileData && profileData.id && profileData.email) {
        console.log('✅ [getUserProfile] Datos obtenidos desde endpoint alternativo:', {
          id: profileData.id,
          email: profileData.email,
          first_name: profileData.first_name || '(vacío)',
          last_name: profileData.last_name || '(vacío)',
          telefono: profileData.telefono || '(vacío)',
          direccion: profileData.direccion || '(vacío)',
        });
      } else {
        console.warn('⚠️ [getUserProfile] Datos incompletos desde endpoint alternativo (falta id o email)');
        profileData = null;
      }
    } catch (altError) {
      console.warn('⚠️ [getUserProfile] Error en endpoint alternativo:', {
        message: altError.message,
        status: altError.status || altError.response?.status,
        url: `/usuarios/usuarios/${userId}/`
      });
      lastError = altError;
      profileData = null;
    }
  }
  
  // Si no tenemos datos aún, intentar el endpoint principal /usuarios/profile/
  if (!profileData || !profileData.id) {
    try {
      console.log('🔄 [getUserProfile] Intentando endpoint principal: /usuarios/profile/');
      profileData = await api.get('/usuarios/profile/');
      
      // Verificar que tenemos al menos id y email
      // NOTA: first_name y last_name pueden estar vacíos debido al bug del UserProfileSerializer
      if (profileData && profileData.id && profileData.email) {
        console.log('✅ [getUserProfile] Datos obtenidos desde endpoint principal:', {
          id: profileData.id,
          email: profileData.email,
          first_name: profileData.first_name || profileData.firstName || '(vacío)',
          last_name: profileData.last_name || profileData.lastName || '(vacío)',
          telefono: profileData.telefono || '(vacío)',
          direccion: profileData.direccion || '(vacío)',
        });
        
        // Si el endpoint principal tiene datos válidos pero falta nombre/apellido y tenemos userId,
        // intentar complementar con el endpoint alternativo
        const hasName = (profileData.first_name || profileData.firstName || '').trim() !== '' &&
                       (profileData.last_name || profileData.lastName || '').trim() !== '';
        
        if (!hasName && userId) {
          logger.debug('🔄 [getUserProfile] Datos del perfil sin nombre/apellido, intentando complementar...');
          try {
            const altData = await api.get(`/usuarios/usuarios/${userId}/`);
            if (altData && altData.id && altData.email) {
              // Combinar datos: usar datos del perfil pero complementar con datos del alternativo
              profileData = {
                ...profileData,
                first_name: (profileData.first_name || profileData.firstName || '').trim() || altData.first_name || '',
                last_name: (profileData.last_name || profileData.lastName || '').trim() || altData.last_name || '',
                firstName: (profileData.first_name || profileData.firstName || '').trim() || altData.first_name || '',
                lastName: (profileData.last_name || profileData.lastName || '').trim() || altData.last_name || '',
                telefono: profileData.telefono || altData.telefono || '',
                direccion: profileData.direccion || altData.direccion || '',
              };
              logger.debug('✅ [getUserProfile] Datos complementados exitosamente');
            }
          } catch (complementError) {
            logger.warn('⚠️ [getUserProfile] Error complementando datos (continuando con datos disponibles):', complementError.message);
            // Continuar con los datos disponibles aunque estén incompletos
          }
        }
      } else {
        logger.warn('⚠️ [getUserProfile] Datos incompletos desde endpoint principal (falta id o email)');
        profileData = null;
      }
    } catch (profileError) {
      logger.warn('⚠️ [getUserProfile] Error en endpoint principal:', {
        message: profileError.message,
        status: profileError.status || profileError.response?.status,
        url: '/usuarios/profile/'
      });
      lastError = profileError;
      profileData = null;
    }
  }
  
  // Si después de intentar ambos endpoints no tenemos datos válidos, lanzar error
  if (!profileData || !profileData.id || !profileData.email) {
    // Generar mensaje de error amigable (nunca técnico)
    // IMPORTANTE: NO incluir detalles técnicos del error en el mensaje al usuario
    // El mensaje debe ser siempre amigable y no mencionar endpoints, códigos de estado, etc.
    const errorMessage = 'No se pudieron obtener los datos del perfil. Por favor, intenta nuevamente más tarde.';
    
    // Solo loguear detalles técnicos en desarrollo (__DEV__), nunca en producción (APK)
    // Estos logs solo aparecen en el terminal de Expo durante desarrollo
    // En producción (APK), estos logs NO aparecerán porque el logger verifica __DEV__
    logger.error('❌ [getUserProfile] Error final (solo visible en desarrollo):', {
      message: errorMessage,
      lastError: lastError?.message,
      receivedData: profileData ? { id: profileData.id, email: profileData.email } : null,
      userId: userId
    });
    
    // Lanzar error con mensaje amigable (nunca técnico)
    throw new Error(errorMessage);
  }
  
  // Normalizar los datos recibidos del backend
  // Aceptar datos incluso si first_name o last_name están vacíos
  const normalizedProfile = {
    id: profileData.id,
    username: profileData.username || profileData.email || '',
    email: profileData.email || '',
    first_name: (profileData.first_name || profileData.firstName || '').trim(),
    last_name: (profileData.last_name || profileData.lastName || '').trim(),
    firstName: (profileData.first_name || profileData.firstName || '').trim(),
    lastName: (profileData.last_name || profileData.lastName || '').trim(),
    telefono: profileData.telefono || '',
    direccion: profileData.direccion || '',
    foto_perfil: profileData.foto_perfil || null,
    es_mecanico: profileData.es_mecanico !== undefined ? profileData.es_mecanico : false,
    is_client: profileData.is_client !== undefined ? profileData.is_client : (profileData.is_client === false ? false : true),
  };
  
  // Solo loguear en desarrollo (__DEV__), nunca en producción (APK)
  logger.debug('✅ [getUserProfile] Perfil normalizado exitosamente:', {
    id: normalizedProfile.id,
    email: normalizedProfile.email,
    firstName: normalizedProfile.firstName || '(vacío)',
    lastName: normalizedProfile.lastName || '(vacío)',
    telefono: normalizedProfile.telefono || '(vacío)',
    direccion: normalizedProfile.direccion || '(vacío)',
  });
  
  return normalizedProfile;
};

/**
 * Verificar si un usuario es proveedor (mecánico o taller)
 * Esta función verifica si el usuario tiene un perfil de proveedor
 * @returns {Promise<boolean>} - true si el usuario es proveedor, false si no
 */
export const isUserProvider = async () => {
  try {
    // Intentar obtener el estado del proveedor desde el backend
    // Si el endpoint retorna datos (no 404), significa que el usuario es proveedor
    const estadoProveedor = await api.get('/usuarios/estado-proveedor/');
    
    // Si tiene perfil de proveedor (mecánico o taller), es proveedor
    // El endpoint retorna tiene_perfil: true si es proveedor
    if (estadoProveedor && estadoProveedor.tiene_perfil === true) {
      // Solo loguear en desarrollo (__DEV__), nunca en producción (APK)
      logger.debug('✅ Usuario es proveedor:', {
        tipo: estadoProveedor.tipo_proveedor || 'desconocido',
        nombre: estadoProveedor.nombre || 'sin nombre'
      });
      return true;
    }
    
    // Si tiene_perfil es false o no existe, no es proveedor
    logger.debug('✅ Usuario NO es proveedor (tiene_perfil=false o no existe)');
    return false;
  } catch (error) {
    // Si el endpoint retorna 404, significa que NO es proveedor (esto es normal)
    // El endpoint retorna 404 cuando el usuario no tiene perfil de proveedor
    if (error.status === 404 || error.response?.status === 404) {
      logger.debug('✅ Usuario NO es proveedor (404 en estado-proveedor - no tiene perfil de proveedor)');
      return false;
    }
    
    // Para otros errores (401, 500, etc.), asumir que no es proveedor para no bloquear login
    // pero loguear el warning solo en desarrollo
    // Esto es importante porque no queremos bloquear login legítimo por errores del backend
    logger.warn('⚠️ Error verificando si usuario es proveedor (asumiendo que no es proveedor para no bloquear login):', {
      message: error.message,
      status: error.status || error.response?.status,
    });
    return false; // Asumir que NO es proveedor para no bloquear login legítimo
  }
};

/**
 * Obtener la información de cliente del usuario autenticado
 * @returns {Promise} Promesa con la respuesta del servidor que incluye el ID de cliente
 */
export const getClienteDetails = async () => {
  try {
    return await api.get('/usuarios/cliente-detail/');
  } catch (error) {
    // Solo loguear en desarrollo (__DEV__), nunca en producción (APK)
    logger.error('Error al obtener detalles de cliente:', error);
    throw error;
  }
};

/**
 * Actualizar información del perfil de usuario
 * @param {object} userData - Datos actualizados del usuario
 * @returns {Promise} Promesa con la respuesta del servidor
 */
export const updateUserProfile = async (userData) => {
  try {
    return await api.patch('/usuarios/profile/', userData);
  } catch (error) {
    // Solo loguear en desarrollo (__DEV__), nunca en producción (APK)
    logger.error('Error al actualizar perfil de usuario:', error);
    throw error;
  }
};

/**
 * Actualizar la foto de perfil del usuario
 * @param {object} formData - FormData con la imagen del perfil
 * @returns {Promise} Promesa con la respuesta del servidor
 */
export const updateProfilePicture = async (formData) => {
  try {
    const response = await api.post('/usuarios/actualizar-foto-perfil/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  } catch (error) {
    // Solo loguear en desarrollo (__DEV__), nunca en producción (APK)
    logger.error('Error al actualizar foto de perfil:', error);
    throw error;
  }
};

/**
 * Obtener lista de vehículos del usuario
 * @returns {Promise} Promesa con la respuesta del servidor
 */
export const getUserVehicles = async () => {
  try {
    return await api.get('/vehiculos/');
  } catch (error) {
    // Solo loguear en desarrollo (__DEV__), nunca en producción (APK)
    logger.error('Error al obtener vehículos del usuario:', error);
    throw error;
  }
};

/**
 * Obtener agendamientos activos del usuario
 * @returns {Promise} Promesa con la respuesta del servidor
 */
export const getActiveAppointments = async () => {
  try {
    // Usar el nuevo endpoint específico para solicitudes activas
    return await api.get('/ordenes/solicitudes/activas/');
  } catch (error) {
    // Solo loguear en desarrollo (__DEV__), nunca en producción (APK)
    logger.error('Error al obtener agendamientos activos:', error);
    // Si no hay agendamientos, devolver array vacío en lugar de error
    if (error.status === 404) {
      return [];
    }
    throw error;
  }
};

/**
 * Obtener historial completo de servicios del usuario
 * @param {object} filtros - Filtros opcionales (estado, fecha_desde, fecha_hasta)
 * @returns {Promise} Promesa con la respuesta del servidor
 */
export const getServicesHistory = async (filtros = {}) => {
  try {
    const params = new URLSearchParams();
    
    if (filtros.estado) {
      params.append('estado', filtros.estado);
    }
    if (filtros.fecha_desde) {
      params.append('fecha_desde', filtros.fecha_desde);
    }
    if (filtros.fecha_hasta) {
      params.append('fecha_hasta', filtros.fecha_hasta);
    }
    
    const queryString = params.toString();
    const url = `/ordenes/solicitudes/historial/${queryString ? `?${queryString}` : ''}`;
    
    return await api.get(url);
  } catch (error) {
    // Solo loguear en desarrollo (__DEV__), nunca en producción (APK)
    logger.error('Error al obtener historial de servicios:', error);
    // Si no hay historial (404) o error del servidor (500), devolver array vacío
    const status = error.status ?? error.response?.status;
    if (status === 404 || status === 500) {
      return [];
    }
    throw error;
  }
};

/**
 * Cancelar una solicitud de servicio
 * @param {number} solicitudId - ID de la solicitud a cancelar
 * @param {object} datos - Datos de cancelación (motivo, comentario)
 * @returns {Promise} Promesa con la respuesta del servidor
 */
export const cancelarSolicitud = async (solicitudId, datos = {}) => {
  try {
    return await api.post(`/ordenes/solicitudes/${solicitudId}/cancelar/`, datos);
  } catch (error) {
    // Solo loguear en desarrollo (__DEV__), nunca en producción (APK)
    logger.error('Error al cancelar solicitud:', error);
    throw error;
  }
};