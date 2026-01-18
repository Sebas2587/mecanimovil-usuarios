import { get } from './api';
import { getMediaURL } from './api';
import { Platform } from 'react-native';

/**
 * Servicios relacionados con la aplicación de clientes
 * Ahora usa configuración dinámica automática
 */

/**
 * Obtiene la URL completa de una imagen
 * @param {string} imagePath - Ruta de la imagen
 * @returns {Promise<string>} URL completa de la imagen
 */
export const getImageUrl = async (imagePath) => {
  return await getMediaURL(imagePath);
};

/**
 * Obtiene todos los servicios disponibles
 * @returns {Promise<Array>} Lista de servicios
 */
export const getServices = async () => {
  try {
    const response = await get('/servicios/');
    return response.results || response;
  } catch (error) {
    console.error('Error obteniendo servicios:', error);
    return [];
  }
};

/**
 * Obtiene servicios disponibles para un vehículo específico por su modelo
 * @param {number} vehiculoId - ID del vehículo
 * @returns {Promise<Array>} Lista de servicios disponibles para el vehículo
 */
export const getServicesByVehiculo = async (vehiculoId) => {
  try {
    // Primero obtener información del vehículo para conocer su modelo
    const vehicleResponse = await get(`/vehiculos/${vehiculoId}/`);
    if (!vehicleResponse || !vehicleResponse.modelo) {
      console.log(`Vehículo ${vehiculoId} no encontrado o sin modelo`);
      return [];
    }
    
    // Obtener servicios por modelo
    const response = await get('/servicios/servicios/por_modelo/', { modelo: vehicleResponse.modelo });
    return response || [];
  } catch (error) {
    console.error(`Error obteniendo servicios para vehículo ${vehiculoId}:`, error);
    return [];
  }
};

/**
 * Obtiene servicios disponibles para una marca específica
 * @param {number} marcaId - ID de la marca
 * @returns {Promise<Array>} Lista de servicios disponibles para la marca
 */
export const getServicesByMarca = async (marcaId) => {
  try {
    // Obtener modelos de la marca
    const modelos = await get('/vehiculos/modelos/', { marca: marcaId });
    if (!modelos || modelos.length === 0) {
      console.log(`No se encontraron modelos para la marca ${marcaId}`);
      return [];
    }
    
    // Obtener servicios para todos los modelos de la marca
    const allServices = [];
    const serviceIds = new Set();
    
    for (const modelo of modelos) {
      try {
        const serviciosModelo = await get('/servicios/servicios/por_modelo/', { modelo: modelo.id });
        if (serviciosModelo && Array.isArray(serviciosModelo)) {
          serviciosModelo.forEach(servicio => {
            if (!serviceIds.has(servicio.id)) {
              serviceIds.add(servicio.id);
              allServices.push(servicio);
            }
          });
        }
      } catch (error) {
        console.error(`Error obteniendo servicios para modelo ${modelo.id}:`, error);
      }
    }
    
    return allServices;
  } catch (error) {
    console.error(`Error obteniendo servicios para marca ${marcaId}:`, error);
    return [];
  }
};

/**
 * Obtiene los talleres disponibles
 * @returns {Promise<Array>} Lista de talleres
 */
export const getTalleres = async () => {
  try {
    const response = await get('/usuarios/talleres/');
    return response.results || response;
  } catch (error) {
    console.error('Error obteniendo talleres:', error);
    return [];
  }
};

/**
 * Obtiene los mecánicos a domicilio disponibles
 * @returns {Promise<Array>} Lista de mecánicos
 */
export const getMecanicosDomicilio = async () => {
  try {
    const response = await get('/usuarios/mecanicos-domicilio/');
    return response.results || response;
  } catch (error) {
    console.error('Error obteniendo mecánicos a domicilio:', error);
    return [];
  }
};

/**
 * Obtiene las categorías de servicios
 * @returns {Promise<Array>} Lista de categorías
 */
export const getCategorias = async () => {
  try {
    const response = await get('/servicios/categorias/');
    return response.results || response;
  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    return [];
  }
};

/**
 * Obtiene información de un servicio específico
 * @param {number} servicioId - ID del servicio
 * @returns {Promise<Object>} Información del servicio
 */
export const getServicioDetalle = async (servicioId) => {
  try {
    const response = await get(`/servicios/${servicioId}/`);
    return response;
  } catch (error) {
    console.error('Error obteniendo detalle del servicio:', error);
    return null;
  }
};

/**
 * Busca servicios por término
 * @param {string} termino - Término de búsqueda
 * @returns {Promise<Array>} Lista de servicios que coinciden con la búsqueda
 */
export const buscarServicios = async (termino) => {
  try {
    const response = await get('/servicios/buscar/', { q: termino });
    return response.results || response || [];
  } catch (error) {
    console.error('Error buscando servicios:', error);
    return [];
  }
};

/**
 * Obtiene los servicios más escogidos/populares para un vehículo específico
 * @param {number} vehiculoId - ID del vehículo
 * @returns {Promise<Array>} Lista de servicios más populares para el vehículo
 */
export const getPopularServicesByVehicle = async (vehiculoId) => {
  try {
    console.log(`🔥 Obteniendo servicios más escogidos para vehículo ${vehiculoId}`);
    
    // Obtener información del vehículo
    const vehicleResponse = await get(`/vehiculos/${vehiculoId}/`);
    if (!vehicleResponse || !vehicleResponse.modelo) {
      console.log(`Vehículo ${vehiculoId} no encontrado o sin modelo`);
      return [];
    }
    
    // Obtener servicios más populares por modelo
    const response = await get('/servicios/servicios/populares/', { 
      modelo: vehicleResponse.modelo,
      marca: vehicleResponse.marca,
      limit: 10 
    });
    
    if (response && Array.isArray(response)) {
      console.log(`🔥 ${response.length} servicios populares encontrados`);
      return response;
    } else {
      console.log('🔥 No se encontraron servicios populares, usando servicios regulares');
      // Fallback: usar servicios regulares si no hay populares
      return await getServicesByVehiculo(vehiculoId);
    }
  } catch (error) {
    console.error(`Error obteniendo servicios populares para vehículo ${vehiculoId}:`, error);
    // Fallback: usar servicios regulares en caso de error
    return await getServicesByVehiculo(vehiculoId);
  }
};

export default {
  getImageUrl,
  getServices,
  getServicesByVehiculo,
  getServicesByMarca,
  getTalleres,
  getMecanicosDomicilio,
  getCategorias,
  getServicioDetalle,
  buscarServicios,
  getPopularServicesByVehicle
}; 