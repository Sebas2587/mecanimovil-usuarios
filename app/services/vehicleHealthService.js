import { get } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY_PREFIX = 'vehicle_health_';
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
    try {
      const response = await get(`/vehiculos/health/vehicle/${vehicleId}/`);
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

