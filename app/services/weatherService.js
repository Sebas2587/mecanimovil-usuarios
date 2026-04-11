import { get } from './api';

/**
 * Obtiene la predicción de desgaste vehicular basada en clima real.
 * @param {Object} params
 * @param {number} [params.addressId] - ID de la dirección del usuario
 * @param {number} [params.vehicleId] - ID del vehículo (enriquece cálculo)
 * @returns {Promise<Object>} Predicción con weather, components, ai_insight
 */
export const getWeatherPrediction = async ({ addressId, vehicleId } = {}) => {
  const params = {};
  if (addressId) params.address_id = addressId;
  if (vehicleId) params.vehicle_id = vehicleId;
  return get('/vehiculos/weather-prediction/', params);
};

/**
 * Obtiene la lista de estaciones meteorológicas disponibles.
 * @returns {Promise<Object>} { stations: [{ code, city }] }
 */
export const getWeatherStations = async () => {
  return get('/vehiculos/weather-stations/');
};
