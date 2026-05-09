import { get, post, withRetry } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// v2: backend incluye servicios_asociados en componentes (modal salud)
const CACHE_KEY_PREFIX = 'vehicle_health_v2_';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Servicio para gestionar la salud vehicular con cache en memoria y AsyncStorage
 */
class VehicleHealthService {
  // Cache local en memoria
  static memoryCache = new Map();
  
  /**
   * Genera la clave de cache para un vehículo
   */
  static getCacheKey(vehicleId, cacheType = 'summary') {
    return `${CACHE_KEY_PREFIX}${vehicleId}_${cacheType}`;
  }
  
  /**
   * Obtiene la salud del vehículo con cache
   * @param {number} vehicleId - ID del vehículo
   * @param {boolean} forceRefresh - Si true, fuerza la recarga desde API
   * @returns {Promise<Object>} Datos de salud del vehículo
   */
  static async getVehicleHealth(vehicleId, forceRefresh = false) {
    const cacheKey = this.getCacheKey(vehicleId, 'summary');
    
    // 1. Verificar cache en memoria (más rápido)
    if (!forceRefresh && this.memoryCache.has(cacheKey)) {
      const cached = this.memoryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('Cache HIT (memory) para vehículo', vehicleId);
        return cached.data;
      }
    }
    
    // 2. Verificar cache en AsyncStorage
    if (!forceRefresh) {
      try {
        const stored = await AsyncStorage.getItem(cacheKey);
        if (stored) {
          const cached = JSON.parse(stored);
          if (Date.now() - cached.timestamp < CACHE_DURATION) {
            console.log('Cache HIT (storage) para vehículo', vehicleId);
            this.memoryCache.set(cacheKey, cached);
            return cached.data;
          }
        }
      } catch (error) {
        console.warn('Error leyendo cache:', error);
      }
    }
    
    // 3. Cargar desde API
    // Importante: pasar forceRefresh a get() para saltar responseCache (Cache-Control) en api.js;
    // sin esto, en web el GET podía devolver JSON viejo tras declarar mantenimiento.
    try {
      const response = await get(
        `/vehiculos/health/vehicle/${vehicleId}/`,
        {},
        { forceRefresh: forceRefresh },
      );
      const data = response;
      
      // Guardar en cache
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      this.memoryCache.set(cacheKey, cacheData);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      
      return data;
    } catch (error) {
      console.error('Error obteniendo salud del vehículo:', error);
      throw error;
    }
  }
  
  /**
   * Obtiene los componentes del vehículo con paginación (lazy loading)
   * @param {number} vehicleId - ID del vehículo
   * @param {number} page - Número de página
   * @returns {Promise<Object>} Datos de componentes paginados
   */
  static async getComponents(vehicleId, page = 1) {
    try {
      const response = await get(`/vehiculos/health/vehicle/${vehicleId}/components/`, {
        page,
        page_size: 20
      });
      return response;
    } catch (error) {
      console.error('Error obteniendo componentes:', error);
      throw error;
    }
  }
  
  /**
   * Solicita recálculo al backend (ahora asíncrono, devuelve 202).
   * Invalida cache local para que el próximo GET cargue datos frescos.
   */
  static async syncVehicleHealth(vehicleId) {
    const doSync = () => post(`/vehiculos/health/vehicle/${vehicleId}/sync/`, {});
    const data = await withRetry(doSync, 1);
    await this.invalidateCache(vehicleId);
    return data;
  }

  /**
   * Obtiene predicciones inteligentes (bootstrap + scikit-learn + similares).
   * Backend cachea 30 min; pasar force=true para refrescar tras un sync manual.
   */
  static async getVehiclePredictions(vehicleId, force = false) {
    const url = `/vehiculos/health/vehicle/${vehicleId}/predicciones/${force ? '?force=1' : ''}`;
    return await get(url);
  }

  /**
   * Registra un mantenimiento retroactivo declarado por el usuario.
   * @param {number} vehicleId
   * @param {{ componente_slug: string, km_en_el_que_se_hizo: number, fecha_realizado?: string, nota?: string }} data
   */
  static async registrarMantenimiento(vehicleId, data) {
    const response = await post(
      `/vehiculos/health/vehicle/${vehicleId}/registrar-mantenimiento/`,
      data,
    );
    await this.invalidateCache(vehicleId);
    return response;
  }

  /**
   * Invalida el cache de un vehículo
   * @param {number} vehicleId - ID del vehículo
   */
  static async invalidateCache(vehicleId) {
    const cacheKeys = [
      this.getCacheKey(vehicleId, 'summary'),
      this.getCacheKey(vehicleId, 'components'),
    ];
    
    // Limpiar cache en memoria
    cacheKeys.forEach(key => this.memoryCache.delete(key));
    
    // Limpiar cache en AsyncStorage
    try {
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.warn('Error limpiando cache:', error);
    }
  }
}

export default VehicleHealthService;

