import { get, post, withRetry } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizePct } from '../utils/healthFormat';

// v2: backend incluye servicios_asociados en componentes (modal salud)
const CACHE_KEY_PREFIX = 'vehicle_health_v2_';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Servicio para gestionar la salud vehicular con cache en memoria y AsyncStorage
 */
class VehicleHealthService {
  // Cache local en memoria
  static memoryCache = new Map();

  // ── Parches optimistas ────────────────────────────────────────────────────
  // Mapa vehicleId (string) → Map<slug, patchObj>
  // Es la misma estructura que optimisticDeclRef.current en VehicleHealthScreen.
  // VehicleHealthScreen llama a setPatchMap() para mantenerlo sincronizado;
  // el resto de pantallas lo leen a través de getVehicleHealthWithPatches().
  static _patchMaps = new Map();

  static _optimisticStorageKey(vehicleId) {
    return `health_optimistic_decl_v1_${vehicleId}`;
  }

  /**
   * VehicleHealthScreen llama a este método cada vez que hidrata o modifica
   * su mapa de parches optimistas, para que el servicio lo mantenga en memoria
   * y las demás pantallas usen el mismo pipeline de cálculo.
   */
  static setPatchMap(vehicleId, map) {
    this._patchMaps.set(String(vehicleId), map);
  }

  /**
   * Carga el mapa de parches optimistas desde la caché en memoria o AsyncStorage.
   * Mismo formato que optimisticDeclRef.current en VehicleHealthScreen.
   */
  static async loadPatchMap(vehicleId) {
    const key = String(vehicleId);
    if (this._patchMaps.has(key)) return this._patchMaps.get(key);
    try {
      const raw = await AsyncStorage.getItem(this._optimisticStorageKey(vehicleId));
      const obj = raw ? JSON.parse(raw) : {};
      const now = Date.now();
      const map = new Map();
      for (const [slug, opt] of Object.entries(obj)) {
        if (opt?.expiry && opt.expiry > now) map.set(slug, opt);
      }
      this._patchMaps.set(key, map);
      return map;
    } catch {
      return new Map();
    }
  }

  /**
   * Aplica los parches optimistas vigentes sobre los datos crudos del servidor.
   * Lógica idéntica a VehicleHealthScreen.applyOptimisticPatch.
   * Muta `patches` in-place (elimina parches expirados o confirmados por el servidor).
   */
  static applyPatchMap(data, patches) {
    if (!patches || patches.size === 0) return data;
    if (!data?.componentes?.length) return data;

    const now = Date.now();
    for (const [slug, opt] of patches.entries()) {
      if (now > opt.expiry) patches.delete(slug);
    }
    if (patches.size === 0) return data;

    let listChanged = false;
    const patched = data.componentes.map((c) => {
      const s = String(c.slug || c.componente_detail?.slug || c.icon_slug || '');
      const opt = patches.get(s);
      if (!opt) return c;

      const serverPct = normalizePct(c.salud_porcentaje ?? c.salud);
      const serverFuente = c.historial_fuente;
      const serverKm = c.km_ultimo_servicio;

      // Si el backend ya procesó la declaración, descartar el parche local.
      const backendProceso =
        serverPct > 0 &&
        serverFuente === 'USUARIO_DECLARADO' &&
        opt.km != null &&
        Math.abs(Number(serverKm || 0) - opt.km) < 100;

      if (backendProceso) {
        patches.delete(s);
        return c;
      }

      listChanged = true;
      return {
        ...c,
        historial_conocido: true,
        historial_fuente: opt.fuente,
        salud_porcentaje: opt.pct,
        ...(opt.km ? { km_ultimo_servicio: opt.km } : {}),
        ...(opt.fechaIso ? { fecha_ultimo_servicio: opt.fechaIso } : {}),
      };
    });

    if (!listChanged) return data;

    const total = patched.length;
    const suma = patched.reduce(
      (acc, c) => acc + normalizePct(c.salud_porcentaje ?? c.salud ?? 0),
      0,
    );
    const saludGeneral =
      total > 0 ? Math.round(suma / total) : data.salud_general_porcentaje;
    return { ...data, componentes: patched, salud_general_porcentaje: saludGeneral };
  }

  /**
   * Obtiene la salud del vehículo con los parches optimistas ya aplicados.
   * Fuente única de verdad para UserPanelScreen, MarketplaceVehicleDetailScreen
   * y cualquier otra pantalla que muestre el % global de salud.
   */
  static async getVehicleHealthWithPatches(vehicleId, forceRefresh = false) {
    const raw = await this.getVehicleHealth(vehicleId, forceRefresh);
    const patches = await this.loadPatchMap(vehicleId);
    return this.applyPatchMap(raw, patches);
  }
  // ── fin parches optimistas ────────────────────────────────────────────────
  
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
        page_size: 50,
      });
      return response;
    } catch (error) {
      console.error('Error obteniendo componentes:', error);
      throw error;
    }
  }

  /**
   * Todos los componentes de salud (pagina hasta agotar has_more).
   * Usado en recomendaciones de mantenimiento para no perder alertas fuera de la página 1.
   */
  static async getAllComponents(vehicleId) {
    const all = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 20) {
      const response = await this.getComponents(vehicleId, page);
      const batch = Array.isArray(response)
        ? response
        : (response?.results ?? response?.componentes ?? []);
      all.push(...batch);
      hasMore = !Array.isArray(response) && response?.has_more === true;
      page += 1;
    }

    return all;
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

