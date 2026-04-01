import { get, post, patch, delete_ } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Obtiene los vehículos del usuario actual
 * @returns {Promise<Array>} Lista de vehículos
 */
export const getUserVehicles = async () => {
  try {
    // Verificar si existe un token de autenticación
    const token = await AsyncStorage.getItem('auth_token');

    if (!token) {
      console.warn('No hay token de autenticación disponible');
      return [];
    }

    console.log('Solicitando vehículos con token:', token.substring(0, 10) + '...');

    // Realizar la petición al endpoint correcto según la documentación
    // Usamos forceRefresh: true para evitar cache interno de api.js
    // Agregamos timestamp para evitar cache de Cloudflare/CDN/Browser
    const data = await get('/vehiculos/', { _t: Date.now() }, { forceRefresh: true });
    console.log('Respuesta de vehículos:', JSON.stringify(data));

    // Verificar si la respuesta es un array
    if (Array.isArray(data)) {
      console.log(`Se encontraron ${data.length} vehículos`);
      return data;
    } else if (data && typeof data === 'object') {
      // Si la respuesta es un objeto, buscar si tiene una propiedad que contenga los vehículos
      console.log('Respuesta no es un array, analizando estructura');
      const possibleArrayProperties = Object.keys(data).filter(key => Array.isArray(data[key]));
      if (possibleArrayProperties.length > 0) {
        console.log(`Encontrada propiedad ${possibleArrayProperties[0]} que contiene array`);
        return data[possibleArrayProperties[0]];
      }
    }

    // Si llegamos aquí, retornar la data tal cual (podría ser un array vacío o algún formato inesperado)
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error obteniendo vehículos:', error);
    // Retornar un array vacío en caso de error para evitar errores en el componente
    return [];
  }
};

/**
 * Obtiene un vehículo por su ID
 * @param {number} vehicleId - ID del vehículo
 * @returns {Promise<Object>} Datos del vehículo
 */
export const getVehicleById = async (vehicleId) => {
  try {
    // Realizar la petición
    // También forzamos refresh aquí para asegurar datos frescos al ver detalles/salud
    const data = await get(`/vehiculos/${vehicleId}/`, {}, { forceRefresh: true });
    return data;
  } catch (error) {
    console.error(`Error obteniendo vehículo ${vehicleId}:`, error);
    throw error;
  }
};

/**
 * Obtiene las marcas de vehículos disponibles
 * @returns {Promise<Array>} Lista de marcas
 */
export const getCarBrands = async () => {
  try {
    // Usar el endpoint correcto para obtener marcas
    const data = await get('/vehiculos/marcas/');
    return data;
  } catch (error) {
    console.error('Error obteniendo marcas:', error);
    throw error;
  }
};

/**
 * Obtiene los modelos de vehículos por marca
 * @param {number} marcaId - ID de la marca
 * @returns {Promise<Array>} Lista de modelos para la marca especificada
 */
export const getCarModels = async (marcaId) => {
  try {
    // Usar el endpoint correcto con el parámetro marca
    const data = await get(`/vehiculos/modelos/`, { marca: marcaId });
    return data;
  } catch (error) {
    console.error('Error obteniendo modelos:', error);
    throw error;
  }
};

/**
 * Obtiene la lista de chequeo inicial de componentes de salud para un tipo de motor
 * @param {string} tipoMotor - 'Gasolina' o 'Diésel'
 * @returns {Promise<Array>} Lista de componentes {id, nombre, descripcion}
 */
export const getInitialChecklist = async (tipoMotor) => {
  try {
    console.log('📡 [getInitialChecklist] Llamando API con tipoMotor:', tipoMotor);
    const data = await get(`/vehiculos/checklist-inicial/`, { tipo_motor: tipoMotor });
    console.log('✅ [getInitialChecklist] Respuesta recibida:', data);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('❌ [getInitialChecklist] Error obteniendo checklist inicial:', error);
    console.error('❌ [getInitialChecklist] Detalles del error:', {
      message: error.message,
      status: error.status,
      response: error.response?.data
    });
    // Retornamos array vacío para no bloquear la creación, pero idealmente debería reintentarse
    return [];
  }
};

/**
 * Crea un nuevo vehículo
 * @param {Object|FormData} vehicleData - Datos del vehículo
 * @returns {Promise<Object>} Vehículo creado
 */
export const createVehicle = async (vehicleData) => {
  try {
    let requestData = vehicleData;
    let options = {};

    // Detectar si los datos están en FormData (para carga de imágenes) o JSON
    if (vehicleData instanceof FormData) {
      // IMPORTANTE: NO establecer Content-Type manualmente para FormData
      // Axios/React Native necesita establecerlo automáticamente con el boundary correcto
      options.isFormData = true;
    } else {
      // Si es un objeto simple, asegurarse de que year sea un número
      if (vehicleData.year && typeof vehicleData.year === 'string') {
        vehicleData = {
          ...vehicleData,
          year: parseInt(vehicleData.year, 10)
        };
      }

      // Asegurarse que kilometraje sea un número
      if (vehicleData.kilometraje && typeof vehicleData.kilometraje === 'string') {
        vehicleData = {
          ...vehicleData,
          kilometraje: parseInt(vehicleData.kilometraje, 10)
        };
      }
      requestData = vehicleData;
    }

    // Endpoint correcto para crear vehículos
    const data = await post('/vehiculos/', requestData, options);
    return data;
  } catch (error) {
    console.error('Error creando vehículo:', error);
    throw error;
  }
};

/**
 * Actualiza un vehículo existente
 * @param {number} vehicleId - ID del vehículo
 * @param {Object|FormData} vehicleData - Datos del vehículo
 * @returns {Promise<Object>} Vehículo actualizado
 */
export const updateVehicle = async (vehicleId, vehicleData) => {
  try {
    let requestData = vehicleData;
    let options = {};

    // Detectar si los datos están en FormData (para carga de imágenes) o JSON
    if (vehicleData instanceof FormData) {
      // IMPORTANTE: NO establecer Content-Type manualmente para FormData
      options.isFormData = true;
    } else {
      // Si es un objeto simple, asegurarse de que year sea un número
      if (vehicleData.year && typeof vehicleData.year === 'string') {
        vehicleData = {
          ...vehicleData,
          year: parseInt(vehicleData.year, 10)
        };
      }

      // Asegurarse que kilometraje sea un número
      if (vehicleData.kilometraje && typeof vehicleData.kilometraje === 'string') {
        vehicleData = {
          ...vehicleData,
          kilometraje: parseInt(vehicleData.kilometraje, 10)
        };
      }
      requestData = vehicleData;
    }

    // Endpoint correcto para actualizar vehículos
    const data = await patch(`/vehiculos/${vehicleId}/`, requestData, options);
    return data;
  } catch (error) {
    console.error('Error actualizando vehículo:', error);
    throw error;
  }
};

/**
 * Elimina un vehículo
 * @param {number} vehicleId - ID del vehículo
 * @returns {Promise<boolean>} True si se eliminó con éxito
 */
export const deleteVehicle = async (vehicleId) => {
  try {
    // Endpoint correcto para eliminar vehículos
    await delete_(`/vehiculos/${vehicleId}/`);
    return true;
  } catch (error) {
    console.error('Error eliminando vehículo:', error);
    throw error;
  }
};

/**
 * Verifica si una patente ya está registrada en el sistema
 * @param {string} patente - Patente del vehículo
 * @returns {Promise<Object>} { registered, owner, vehicle_id, marca, modelo }
 */
export const verificarPatenteRegistrada = async (patente) => {
  const data = await get('/vehiculos/verificar-patente/', { patente: patente.toUpperCase().trim() });
  return data;
};

/**
 * Consulta información de un vehículo por su patente
 * @param {string} patente - Patente del vehículo
 * @returns {Promise<Object>} Datos del vehículo encontrado o null
 */
export const getVehicleByPatente = async (patente) => {
  try {
    console.log(`🔍 Consultando patente: ${patente}`);
    // Nota: Asegúrate de que este endpoint exista en tu backend o ajusta la ruta
    const response = await get(`/vehiculos/consultar-patente/`, { patente });

    // Handle the structure described by the user: { success: true, data: { ... } }
    // Or if backend unwraps it, handle direct object.
    const vehicleData = response.data || response;

    console.log('🚗 [VehicleService] Patente Data:', JSON.stringify(vehicleData));

    if (!vehicleData) return null;

    // Normalizar datos para la app (Mapping keys)
    // La respuesta puede venir con datos nestados en raw_data
    const source = vehicleData.raw_data || vehicleData;

    return {
      marca: source.model?.brand?.name || vehicleData.brand?.name || vehicleData.marca,
      marca_nombre: source.model?.brand?.name || vehicleData.brand?.name || vehicleData.marca || vehicleData.marca_nombre,
      modelo: source.model?.id || source.model?.name || vehicleData.modelo,
      modelo_nombre: source.model?.name || vehicleData.modelName || vehicleData.modelo || vehicleData.modelo_nombre,
      year: source.year || vehicleData.year || vehicleData.anio,
      color: source.color || vehicleData.color,
      vin: source.vinNumber || source.vin || vehicleData.vin,
      motor: source.engine || source.cilindraje || vehicleData.motor, // 1.4 or 1600cc
      numero_motor: source.engineNumber || vehicleData.numero_motor, // Serial number
      tipo_motor: source.fuel || source.combustible || vehicleData.tipo_motor, // BENCINA, DIESEL
      cilindraje: source.engine || source.cilindraje || vehicleData.cilindraje, // 1.4
      transmision: source.transmission || source.transmision || vehicleData.transmision, // MECANICA
      puertas: source.doors || source.puertas || vehicleData.puertas,
      version: source.version || vehicleData.version,
      mes_revision_tecnica: source.monthRT || vehicleData.mes_revision_tecnica,
      precio_mercado_promedio: source.precio_mercado_promedio || vehicleData.precio_mercado_promedio || source.marketValue || 0
    };
  } catch (error) {
    console.error('Error consultando patente:', error);

    // Retorna null explícitamente si no se encuentra o hay error,
    // para que la UI pueda manejar el caso "no encontrado"
    throw error;
  }
};

/**
 * Obtiene la configuración de venta en marketplace para un vehículo
 * @param {number} vehicleId
 * @returns {Promise<Object>}
 */
export const getMarketplaceData = async (vehicleId) => {
  try {
    const data = await get(`/vehiculos/${vehicleId}/marketplace/`);
    return data;
  } catch (error) {
    console.error(`Error obteniendo datos marketplace ${vehicleId}:`, error);
    throw error;
  }
};

/**
 * Actualiza la configuración de venta en marketplace
 * @param {number} vehicleId
 * @param {Object} marketplaceData - { is_published, precio_venta }
 * @returns {Promise<Object>}
 */
export const updateMarketplaceData = async (vehicleId, marketplaceData) => {
  try {
    const data = await patch(`/vehiculos/${vehicleId}/marketplace/`, marketplaceData);
    return data;
  } catch (error) {
    console.error(`Error actualizando marketplace ${vehicleId}:`, error);
    throw error;
  }
};

/**
 * Obtiene métricas de rendimiento del vehículo en marketplace
 * @param {number} vehicleId
 * @returns {Promise<Object>} { views, favorites, leads }
 */
export const getMarketplaceStats = async (vehicleId) => {
  try {
    const data = await get(`/vehiculos/${vehicleId}/marketplace-stats/`);
    return data;
  } catch (error) {
    console.error(`Error obteniendo stats marketplace ${vehicleId}:`, error);
    throw error;
  }
};

/**
 * Obtiene el listado público de vehículos en marketplace
 * @returns {Promise<Array>}
 */
export const getMarketplaceListings = async () => {
  try {
    const data = await get('/vehiculos/marketplace-listings/', {}, { requiresAuth: false });
    return data;
  } catch (error) {
    console.error("Error obteniendo listado marketplace:", error);
    throw error;
  }
};

/**
 * Obtiene el detalle público de un vehículo en marketplace (incluye historial)
 * @param {number} vehicleId
 * @returns {Promise<Object>}
 */
export const getMarketplaceVehicleDetail = async (vehicleId) => {
  try {
    const data = await get(`/vehiculos/${vehicleId}/marketplace-public-detail/`, {}, {
      requiresAuth: false,
      forceRefresh: true,
    });
    return data;
  } catch (error) {
    console.error(`Error obteniendo detalle marketplace ${vehicleId}:`, error);
    throw error;
  }
};

/**
 * Obtiene la tasación del vehículo (Fiscal + Mercado + Bonus Salud)
 * @param {number} vehicleId
 * @returns {Promise<Object>}
 */
export const getVehicleAppraisal = async (vehicleId) => {
  try {
    const data = await get(`/vehiculos/${vehicleId}/tasacion/`);
    return data;
  } catch (error) {
    console.error(`Error obteniendo tasación ${vehicleId}:`, error);
    throw error;
  }
};

/**
 * Obtiene el historial COMPLETO de servicios de un vehículo (todos los dueños).
 * Solo accesible por el dueño actual.
 */
export const getVehicleServiceHistory = async (vehicleId) => {
  try {
    const data = await get(`/vehiculos/${vehicleId}/historial-servicios/`);
    return data;
  } catch (error) {
    console.error(`Error obteniendo historial servicios ${vehicleId}:`, error);
    return [];
  }
};

/**
 * Crea una oferta para un vehículo
 * @param {Object} offerData - { vehiculo_id, monto, mensaje }
 * @returns {Promise<Object>}
 */
export const createOffer = async (offerData) => {
  try {
    const payload = {
      vehiculo: offerData.vehiculo_id,
      monto: offerData.monto,
      mensaje: offerData.mensaje
    };
    const data = await post('/vehiculos/ofertas/', payload);
    return data;
  } catch (error) {
    console.error('Error creando oferta:', error);
    throw error;
  }
};

/**
 * Obtiene las ofertas enviadas por el usuario actual (Compras)
 * @returns {Promise<Array>}
 */
export const getSentOffers = async () => {
  try {
    const data = await get('/vehiculos/ofertas/mis_ofertas_enviadas/');
    return data;
  } catch (error) {
    console.error('Error obteniendo ofertas enviadas:', error);
    throw error;
  }
};

/**
 * Obtiene las ofertas recibidas para mis vehículos (Ventas)
 * @returns {Promise<Array>}
 */
export const getReceivedOffers = async () => {
  try {
    const data = await get('/vehiculos/ofertas/mis_ofertas_recibidas/');
    return data;
  } catch (error) {
    console.error('Error obteniendo ofertas recibidas:', error);
    throw error;
  }
};

/**
 * Responde a una oferta (aceptar/rechazar/contraoferta)
 * @param {number} offerId
 * @param {string} status - 'aceptada', 'rechazada', 'contraoferta'
 * @returns {Promise<Object>}
 */
export const respondToOffer = async (offerId, status) => {
  try {
    const data = await post(`/vehiculos/ofertas/${offerId}/responder/`, { estado: status });
    return data;
  } catch (error) {
    console.error(`Error respondiendo oferta ${offerId}:`, error);
    throw error;
  }
};

/**
 * Obtiene el detalle de una oferta de vehículo por su ID
 * @param {number} offerId
 * @returns {Promise<Object>}
 */
export const getOfferById = async (offerId) => {
  try {
    const data = await get(`/vehiculos/ofertas/${offerId}/`);
    return data;
  } catch (error) {
    console.error(`Error obteniendo oferta ${offerId}:`, error);
    throw error;
  }
};