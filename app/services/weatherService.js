import { get } from './api';
import { getCurrentLocation } from './location';

/**
 * Obtiene la predicción de desgaste vehicular basada en clima real.
 * Prioridad: GPS del dispositivo → addressId guardado → dirección principal del usuario.
 *
 * @param {Object} params
 * @param {number} [params.addressId]  - ID de DireccionUsuario (fallback si no hay GPS)
 * @param {number} [params.vehicleId] - ID del vehículo (enriquece cálculo con telemetría)
 * @param {boolean} [params.useGps]   - Forzar uso de GPS (default: true)
 * @returns {Promise<Object>} Predicción con weather, components, ai_insight
 */
export const getWeatherPrediction = async ({ addressId, vehicleId, useGps = true, forceRefresh = false } = {}) => {
  const params = {};
  if (vehicleId) params.vehicle_id = vehicleId;
  if (forceRefresh) params.force_refresh = '1';

  // Solo con refresh explícito: evita variar la URL en cada poll y reduce ruido en CDN/proxies.
  if (forceRefresh) {
    params._t = Date.now();
  }

  // Si hay una dirección explícitamente seleccionada por el usuario, usarla
  // directamente sin intentar GPS — el usuario eligió esta dirección a propósito.
  if (addressId) {
    params.address_id = addressId;
    return get('/vehiculos/weather-prediction/', params);
  }

  // Sin dirección seleccionada: intentar GPS del dispositivo
  if (useGps) {
    try {
      const location = await getCurrentLocation(false);
      if (location?.coords?.latitude && location?.coords?.longitude) {
        params.lat = location.coords.latitude;
        params.lng = location.coords.longitude;
        return get('/vehiculos/weather-prediction/', params);
      }
    } catch (_) {
      // GPS no disponible → backend usará dirección principal del usuario
    }
  }

  return get('/vehiculos/weather-prediction/', params);
};

/**
 * Obtiene la lista de estaciones meteorológicas disponibles.
 * @returns {Promise<Object>} { stations: [{ code, city }] }
 */
export const getWeatherStations = async () => {
  return get('/vehiculos/weather-stations/');
};
