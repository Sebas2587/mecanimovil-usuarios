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
    const data = await get('/vehiculos/');
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