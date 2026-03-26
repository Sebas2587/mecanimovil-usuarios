import { post, get } from './api';

/**
 * Registra un viaje GPS completado y actualiza el odómetro del vehículo.
 *
 * @param {number} vehicleId
 * @param {object} tripData
 * @param {number} tripData.km_recorridos        - km acumulados por GPS
 * @param {number} [tripData.duracion_segundos]   - duración del viaje en segundos
 * @param {object} [tripData.coordenadas_inicio]  - {latitude, longitude}
 * @param {object} [tripData.coordenadas_fin]     - {latitude, longitude}
 * @param {number} [tripData.velocidad_promedio_kmh]
 * @param {string} [tripData.fecha_inicio]        - ISO string
 * @returns {Promise<object>} respuesta del backend con viaje_id, km_odometro_nuevo, etc.
 */
export const registrarViaje = async (vehicleId, tripData) => {
  const payload = {
    km_recorridos: tripData.km_recorridos,
    duracion_segundos: tripData.duracion_segundos || 0,
    coordenadas_inicio: tripData.coordenadas_inicio || null,
    coordenadas_fin: tripData.coordenadas_fin || null,
    velocidad_promedio_kmh: tripData.velocidad_promedio_kmh || 0,
    fecha_inicio: tripData.fecha_inicio || null,
  };

  return post(`/vehiculos/${vehicleId}/registrar-viaje/`, payload, { timeout: 20000 });
};

/**
 * Obtiene el historial de viajes registrados para un vehículo.
 * (Futuro: cuando el backend exponga un list endpoint)
 */
export const getHistorialViajes = async (vehicleId) => {
  return get(`/vehiculos/${vehicleId}/viajes/`);
};
