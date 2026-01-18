import { apiRequest } from './api';

/**
 * Servicio para manejar funcionalidades de personalización
 */

// Gestión de vehículo activo
export const setActiveVehicle = async (vehicleId) => {
  try {
    const response = await apiRequest({
      url: '/personalizacion/vehiculo-activo/establecer_vehiculo_activo/',
      method: 'POST',
      data: { vehiculo_id: vehicleId },
      requiresAuth: true
    });
    return response.data;
  } catch (error) {
    console.error('Error al establecer vehículo activo:', error);
    throw error;
  }
};

export const getActiveVehicle = async () => {
  try {
    const response = await apiRequest({
      url: '/personalizacion/vehiculo-activo/',
      method: 'GET',
      requiresAuth: true
    });
    return response.data;
  } catch (error) {
    console.error('Error al obtener vehículo activo:', error);
    throw error;
  }
};

// Recomendaciones personalizadas
export const getMaintenanceRecommendations = async () => {
  try {
    const response = await apiRequest({
      url: '/personalizacion/recomendaciones/mantenimiento_sugerido/',
      method: 'GET',
      requiresAuth: true
    });
    return response.data;
  } catch (error) {
    console.error('Error al obtener recomendaciones de mantenimiento:', error);
    throw error;
  }
};

export const getFeaturedProviders = async () => {
  try {
    const response = await apiRequest({
      url: '/personalizacion/recomendaciones/proveedores_destacados/',
      method: 'GET',
      requiresAuth: true
    });
    return response.data;
  } catch (error) {
    console.error('Error al obtener proveedores destacados:', error);
    throw error;
  }
};

export const getPopularServices = async () => {
  try {
    const response = await apiRequest({
      url: '/personalizacion/recomendaciones/servicios_populares/',
      method: 'GET',
      requiresAuth: true
    });
    return response.data;
  } catch (error) {
    console.error('Error al obtener servicios populares:', error);
    throw error;
  }
};

// Búsqueda personalizada
export const searchPersonalizedServices = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    if (params.query) queryParams.append('q', params.query);
    if (params.sortBy) queryParams.append('ordenar', params.sortBy);
    if (params.providerType) queryParams.append('tipo_proveedor', params.providerType);
    if (params.maxPrice) queryParams.append('precio_max', params.maxPrice);
    
    const response = await apiRequest({
      url: `/personalizacion/busqueda/buscar_servicios/?${queryParams.toString()}`,
      method: 'GET',
      requiresAuth: true
    });
    return response.data;
  } catch (error) {
    console.error('Error en búsqueda personalizada:', error);
    throw error;
  }
};

// Métricas de interacción
export const markRecommendationView = async (recommendationId) => {
  try {
    const response = await apiRequest({
      url: `/personalizacion/recomendaciones/${recommendationId}/marcar_vista/`,
      method: 'POST',
      requiresAuth: true
    });
    return response.data;
  } catch (error) {
    console.error('Error al marcar vista de recomendación:', error);
    throw error;
  }
};

export const markRecommendationClick = async (recommendationId) => {
  try {
    const response = await apiRequest({
      url: `/personalizacion/recomendaciones/${recommendationId}/marcar_click/`,
      method: 'POST',
      requiresAuth: true
    });
    return response.data;
  } catch (error) {
    console.error('Error al marcar click de recomendación:', error);
    throw error;
  }
};

// Regenerar recomendaciones
export const regenerateRecommendations = async () => {
  try {
    const response = await apiRequest({
      url: '/personalizacion/recomendaciones/regenerar_recomendaciones/',
      method: 'POST',
      requiresAuth: true
    });
    return response.data;
  } catch (error) {
    console.error('Error al regenerar recomendaciones:', error);
    throw error;
  }
}; 