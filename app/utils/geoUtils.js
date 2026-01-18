/**
 * Utilidades geográficas para cálculos de distancia y geolocalización
 */

/**
 * Calcula la distancia entre dos puntos geográficos usando la fórmula de Haversine
 * @param {number} lat1 - Latitud del primer punto
 * @param {number} lon1 - Longitud del primer punto
 * @param {number} lat2 - Latitud del segundo punto
 * @param {number} lon2 - Longitud del segundo punto
 * @returns {number} Distancia en kilómetros
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radio de la Tierra en kilómetros
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Distancia en kilómetros
};

/**
 * Convierte grados a radianes
 * @param {number} degrees - Grados a convertir
 * @returns {number} Radianes
 */
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Formatea la distancia para mostrar en la UI
 * @param {number} distance - Distancia en kilómetros
 * @returns {string} Distancia formateada
 */
export const formatDistance = (distance) => {
  if (distance < 0.1) {
    return "< 100m";
  } else if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  } else if (distance < 10) {
    return `${distance.toFixed(1)}km`;
  } else {
    return `${Math.round(distance)}km`;
  }
};

/**
 * Ordena una lista de elementos por distancia a una ubicación de referencia
 * @param {Array} items - Lista de elementos con propiedades latitude y longitude
 * @param {number} userLat - Latitud del usuario
 * @param {number} userLon - Longitud del usuario
 * @returns {Array} Lista ordenada por distancia con propiedad distancia agregada
 */
export const sortByDistance = (items, userLat, userLon) => {
  return items
    .map(item => {
      // Intentar obtener coordenadas del item
      let itemLat, itemLon;
      
      // Diferentes formas de obtener coordenadas según la estructura del objeto
      if (item.latitude && item.longitude) {
        itemLat = item.latitude;
        itemLon = item.longitude;
      } else if (item.coordenadas) {
        itemLat = item.coordenadas.latitude;
        itemLon = item.coordenadas.longitude;
      } else if (item.ubicacion) {
        itemLat = item.ubicacion.latitude;
        itemLon = item.ubicacion.longitude;
      } else {
        // Si no hay coordenadas, asignar una distancia muy alta
        return {
          ...item,
          distancia: 999,
          distanciaFormateada: "Sin ubicación"
        };
      }
      
      const distancia = calculateDistance(userLat, userLon, itemLat, itemLon);
      
      return {
        ...item,
        distancia: distancia,
        distanciaFormateada: formatDistance(distancia)
      };
    })
    .sort((a, b) => a.distancia - b.distancia);
};

/**
 * Filtra elementos dentro de un radio específico
 * @param {Array} items - Lista de elementos con coordenadas
 * @param {number} userLat - Latitud del usuario
 * @param {number} userLon - Longitud del usuario
 * @param {number} radius - Radio en kilómetros
 * @returns {Array} Elementos dentro del radio especificado
 */
export const filterByRadius = (items, userLat, userLon, radius = 10) => {
  return sortByDistance(items, userLat, userLon)
    .filter(item => item.distancia <= radius);
};

/**
 * Obtiene coordenadas mockadas para Santiago si no se pueden obtener reales
 * @returns {Object} Coordenadas de Santiago
 */
export const getSantiagoCoordinates = () => {
  return {
    latitude: -33.4489,
    longitude: -70.6693
  };
};

/**
 * Valida que las coordenadas sean válidas para Chile
 * @param {number} latitude - Latitud
 * @param {number} longitude - Longitud
 * @returns {boolean} true si las coordenadas son válidas para Chile
 */
export const areValidChileanCoordinates = (latitude, longitude) => {
  // Coordenadas aproximadas de Chile
  return (
    latitude >= -56 && 
    latitude <= -17.5 && 
    longitude >= -80 && 
    longitude <= -66
  );
};

/**
 * Genera coordenadas aleatorias alrededor de Santiago para testing
 * @param {number} radiusKm - Radio en kilómetros alrededor de Santiago
 * @returns {Object} Coordenadas aleatorias
 */
export const generateRandomSantiagoCoordinates = (radiusKm = 20) => {
  const santiago = getSantiagoCoordinates();
  
  // Convertir km a grados aproximadamente (1° ≈ 111km)
  const radiusDegrees = radiusKm / 111;
  
  const randomLat = santiago.latitude + (Math.random() - 0.5) * 2 * radiusDegrees;
  const randomLon = santiago.longitude + (Math.random() - 0.5) * 2 * radiusDegrees;
  
  return {
    latitude: randomLat,
    longitude: randomLon
  };
}; 