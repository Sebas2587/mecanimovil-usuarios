import { get, post, patch, delete_ } from './api';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Caché en memoria de la dirección activa para evitar condiciones de carrera entre pantallas
let inMemoryActiveAddress = null;

/**
 * Valida si una dirección aún existe en el servidor
 * @param {Object} address - Dirección a validar
 * @returns {Promise<boolean>} true si la dirección existe
 */
const validateAddressExists = async (address) => {
  if (!address || !address.id) return false;
  
  try {
    console.log(`🔍 Validando existencia de dirección ID ${address.id}: ${address.direccion}`);
    const addresses = await getUserAddresses();
    const exists = addresses.some(addr => addr.id === address.id);
    console.log(`${exists ? '✅' : '❌'} Dirección ID ${address.id} ${exists ? 'existe' : 'NO EXISTE'} en servidor`);
    return exists;
  } catch (error) {
    console.warn('Error validando dirección, asumiendo que no existe:', error);
    return false;
  }
};

/**
 * Limpia direcciones obsoletas de todos los cachés
 */
const cleanObsoleteAddresses = async () => {
  try {
    console.log('🧹 Limpiando direcciones obsoletas de cachés...');
    
    const [activeJson, mainJson] = await Promise.all([
      AsyncStorage.getItem('active_address'),
      AsyncStorage.getItem('main_address')
    ]);
    
    const active = activeJson ? JSON.parse(activeJson) : null;
    const main = mainJson ? JSON.parse(mainJson) : null;
    
    // Validar dirección activa
    if (active && !(await validateAddressExists(active))) {
      console.log('🧹 Limpiando dirección activa obsoleta:', active.direccion);
      inMemoryActiveAddress = null;
      await AsyncStorage.removeItem('active_address');
    }
    
    // Validar dirección principal
    if (main && !(await validateAddressExists(main))) {
      console.log('🧹 Limpiando dirección principal obsoleta:', main.direccion);
      await AsyncStorage.removeItem('main_address');
    }
    
    console.log('🧹 Limpieza de direcciones obsoletas completada');
  } catch (error) {
    console.warn('Error limpiando direcciones obsoletas:', error);
  }
};

/**
 * Obtiene las direcciones del usuario
 * @returns {Promise<Array>} Array de direcciones guardadas
 */
export const getUserAddresses = async () => {
  try {
    console.log('Llamando a API: /usuarios/direcciones/');
    const data = await get('/usuarios/direcciones/');
    console.log('Respuesta recibida:', JSON.stringify(data).substring(0, 100) + '...');
    
    // La API podría devolver los resultados en un objeto con la propiedad 'results'
    // o directamente como un array, debemos manejar ambos casos
    if (data && typeof data === 'object') {
      if (Array.isArray(data)) {
        return data;
      } else if (data.results && Array.isArray(data.results)) {
        return data.results; // Si la API pagina los resultados
      }
    }
    
    return [];
  } catch (error) {
    console.error('Error obteniendo direcciones del usuario:', error);
    return [];
  }
};

// ---------------------------------------------
// Dirección activa (persistida solo en cliente)
// ---------------------------------------------
export const getActiveAddress = async () => {
  try {
    // Priorizar caché en memoria para respuesta inmediata
    if (inMemoryActiveAddress) {
      // Validar que la dirección en memoria aún existe
      if (await validateAddressExists(inMemoryActiveAddress)) {
        return inMemoryActiveAddress;
      } else {
        console.log('🧹 Dirección activa en memoria obsoleta, limpiando...');
        inMemoryActiveAddress = null;
      }
    }
    
    const saved = await AsyncStorage.getItem('active_address');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Validar que la dirección guardada aún existe
      if (await validateAddressExists(parsed)) {
        inMemoryActiveAddress = parsed; // Sincronizar memoria
        return parsed;
      } else {
        console.log('🧹 Dirección activa en AsyncStorage obsoleta, limpiando...');
        await AsyncStorage.removeItem('active_address');
      }
    }
    
    return null;
  } catch (e) {
    console.warn('No se pudo leer active_address:', e);
    return null;
  }
};

export const setActiveAddress = async (addressObj) => {
  try {
    // Actualizar inmediatamente en memoria para navegación subsecuente
    inMemoryActiveAddress = addressObj;
    await AsyncStorage.setItem('active_address', JSON.stringify(addressObj));
    return addressObj;
  } catch (e) {
    console.warn('No se pudo guardar active_address:', e);
    return addressObj;
  }
};

export const clearActiveAddress = async () => {
  try {
    inMemoryActiveAddress = null;
    await AsyncStorage.removeItem('active_address');
  } catch (e) {
    console.warn('No se pudo limpiar active_address:', e);
  }
};

/**
 * Obtiene la dirección principal del usuario
 * Prioriza la dirección activa si existe
 * @returns {Promise<Object>} Dirección principal o activa
 */
export const getMainAddress = async () => {
  try {
    console.log('📍 getMainAddress: Iniciando búsqueda de dirección principal...');
    
    // 1) Priorizar la dirección activa si existe y es válida
    const activeAddress = await getActiveAddress(); // Ya incluye validación
    if (activeAddress) {
      console.log('📍 getMainAddress: Usando dirección activa válida:', activeAddress.direccion);
      return activeAddress;
    }

    // 2) Intentar obtener dirección guardada como principal en AsyncStorage
    const savedAddress = await AsyncStorage.getItem('main_address');
    if (savedAddress) {
      const parsed = JSON.parse(savedAddress);
      // Validar que la dirección principal aún existe
      if (await validateAddressExists(parsed)) {
        console.log('📍 getMainAddress: Usando dirección principal válida desde caché:', parsed.direccion);
        return parsed;
      } else {
        console.log('🧹 Dirección principal en caché obsoleta, limpiando...');
        await AsyncStorage.removeItem('main_address');
      }
    }
    
    // 3) Si no hay dirección válida en caché, obtener del servidor
    try {
      console.log('📍 getMainAddress: Consultando servidor para dirección principal...');
      const response = await get('/usuarios/direcciones/principal/');
      
      // Verificar si la respuesta contiene un mensaje de "no hay direcciones"
      if (response.mensaje === "No hay direcciones guardadas") {
        console.log('📍 getMainAddress: No hay direcciones guardadas en el servidor');
        return null;
      }
      
      // Si hay dirección principal, guardarla en AsyncStorage y devolverla
      if (response && !response.mensaje) {
        await AsyncStorage.setItem('main_address', JSON.stringify(response));
        console.log('📍 getMainAddress: Dirección principal obtenida del servidor:', response.direccion);
        return response;
      }
      
      return null;
    } catch (error) {
      console.log('📍 getMainAddress: Error del servidor, buscando direcciones disponibles...');
      
      // Fallback: obtener todas las direcciones y usar la primera válida
      const addresses = await getUserAddresses();
      if (addresses && addresses.length > 0) {
        const mainAddress = addresses[0];
        await AsyncStorage.setItem('main_address', JSON.stringify(mainAddress));
        console.log('📍 getMainAddress: Usando primera dirección disponible:', mainAddress.direccion);
        return mainAddress;
      }
      
      console.log('📍 getMainAddress: No hay direcciones disponibles');
      return null;
    }
  } catch (error) {
    console.error('📍 getMainAddress: Error general:', error);
    return null;
  }
};

/**
 * Guarda una nueva dirección
 * @param {Object} addressData - Datos de la dirección
 * @returns {Promise<Object>} Dirección guardada
 */
export const saveAddress = async (addressData) => {
  try {
    console.log('Guardando dirección con datos:', addressData);
    
    // No necesitamos enviar el usuario explícitamente porque el backend
    // lo obtendrá del token de autenticación
    // Enviar los datos sin modificar el objeto original
    const data = await post('/usuarios/direcciones/', addressData);
    
    // Si es la primera dirección o es marcada como principal, guardarla en AsyncStorage
    if (addressData.es_principal || !(await getMainAddress())) {
      await AsyncStorage.setItem('main_address', JSON.stringify(data));
    }
    
    return data;
  } catch (error) {
    console.error('Error guardando dirección:', error);
    throw error;
  }
};

/**
 * Actualiza una dirección existente
 * @param {number} addressId - ID de la dirección
 * @param {Object} addressData - Datos actualizados
 * @returns {Promise<Object>} Dirección actualizada
 */
export const updateAddress = async (addressId, addressData) => {
  try {
    const data = await patch(`/usuarios/direcciones/${addressId}/`, addressData);
    
    // Si es marcada como principal, actualizar en AsyncStorage
    if (addressData.es_principal) {
      await AsyncStorage.setItem('main_address', JSON.stringify(data));
    }
    
    return data;
  } catch (error) {
    console.error(`Error actualizando dirección ${addressId}:`, error);
    throw error;
  }
};

/**
 * Establece una dirección como principal
 * También actualiza la dirección activa para navegación
 * @param {number} addressId - ID de la dirección
 * @returns {Promise<Object>} Dirección principal
 */
export const setMainAddress = async (addressId) => {
  try {
    const data = await post(`/usuarios/direcciones/${addressId}/establecer-principal/`);
    // Persistir tanto como principal como activa
    await AsyncStorage.setItem('main_address', JSON.stringify(data));
    await AsyncStorage.setItem('active_address', JSON.stringify(data));
    // Sincronizar caché en memoria para reflejo inmediato en pantallas
    inMemoryActiveAddress = data;
    return data;
  } catch (error) {
    // Downgrade del 404 esperado a warning (el endpoint puede no existir en algunos despliegues)
    const status = error?.response?.status || error?.status;
    if (status === 404) {
      console.warn(`ℹ️ Endpoint establecer-principal no disponible (404) para dirección ${addressId}. Usando fallback PATCH es_principal.`);
      try {
        const updated = await patch(`/usuarios/direcciones/${addressId}/`, { es_principal: true });
        await AsyncStorage.setItem('main_address', JSON.stringify(updated));
        await AsyncStorage.setItem('active_address', JSON.stringify(updated));
        inMemoryActiveAddress = updated;
        return updated;
      } catch (e2) {
        console.error('Fallback PATCH es_principal también falló:', e2);
        throw e2;
      }
    }
    console.error(`Error estableciendo dirección ${addressId} como principal:`, error);
    throw error;
  }
};

/**
 * Elimina una dirección
 * @param {number} addressId - ID de la dirección a eliminar
 * @returns {Promise<boolean>} true si se eliminó correctamente
 */
export const deleteAddress = async (addressId) => {
  try {
    console.log(`🗑️ deleteAddress: Eliminando dirección ID ${addressId}...`);
    await delete_(`/usuarios/direcciones/${addressId}/`);
    console.log(`🗑️ deleteAddress: Dirección eliminada del servidor exitosamente`);
    
    // Limpiar todos los cachés que apunten a esta dirección
    const [activeJson, mainJson] = await Promise.all([
      AsyncStorage.getItem('active_address'),
      AsyncStorage.getItem('main_address'),
    ]);

    const active = activeJson ? JSON.parse(activeJson) : null;
    const main = mainJson ? JSON.parse(mainJson) : null;

    if (active && active.id === addressId) {
      console.log('🗑️ deleteAddress: Limpiando dirección activa del caché');
      inMemoryActiveAddress = null;
      await AsyncStorage.removeItem('active_address');
    }
    
    if (main && main.id === addressId) {
      console.log('🗑️ deleteAddress: Limpiando dirección principal del caché');
      await AsyncStorage.removeItem('main_address');
    }
    
    // Limpiar cualquier dirección obsoleta adicional
    await cleanObsoleteAddresses();
    
    console.log('🗑️ deleteAddress: Eliminación y limpieza completada');
    return true;
  } catch (error) {
    console.error(`🗑️ deleteAddress: Error eliminando dirección ${addressId}:`, error);
    throw error;
  }
};

/**
 * Obtiene los permisos de ubicación del dispositivo
 * @returns {Promise<boolean>} true si se obtuvieron los permisos
 */
export const requestLocationPermission = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error al solicitar permisos de ubicación:', error);
    return false;
  }
};

/**
 * Verifica si unas coordenadas están dentro de Chile
 * @param {number} latitude - Latitud
 * @param {number} longitude - Longitud
 * @returns {boolean} Verdadero si las coordenadas están en Chile
 */
const isLocationInChile = (latitude, longitude) => {
  // Coordenadas aproximadas de Chile: latitud entre -17.5 y -56, longitud entre -80 y -66
  return (
    latitude <= -17.5 && 
    latitude >= -56 && 
    longitude <= -66 && 
    longitude >= -80
  );
};

/**
 * Obtiene la ubicación actual del dispositivo, optimizada para Chile
 * @param {boolean} highAccuracy - Si es true, solicita la máxima precisión posible
 * @returns {Promise<Object>} Ubicación actual (coords.latitude, coords.longitude)
 */
export const getCurrentLocation = async (highAccuracy = true) => {
  try {
    const hasPermission = await requestLocationPermission();
    
    if (!hasPermission) {
      throw new Error('No se tienen permisos de ubicación');
    }
    
    // Usar configuración de alta precisión para obtener la mejor ubicación posible
    const locationOptions = {
      accuracy: highAccuracy ? Location.Accuracy.Highest : Location.Accuracy.Balanced,
      timeInterval: 1000,  // Actualizar cada segundo
      distanceInterval: 1, // Actualizar cada metro de movimiento
      mayShowUserSettingsDialog: true // Permitir mostrar diálogo para mejorar precisión
    };
    
    console.log('Solicitando ubicación con opciones:', JSON.stringify(locationOptions));
    
    // Intentar obtener la ubicación real con la mayor precisión posible
    const realLocation = await Location.getCurrentPositionAsync(locationOptions);
    
    console.log(`Ubicación obtenida del dispositivo: ${realLocation.coords.latitude}, ${realLocation.coords.longitude}, precisión: ${realLocation.coords.accuracy}m`);
    
    // Verificar si son coordenadas por defecto del emulador (San Francisco, Apple HQ, Google HQ, etc.)
    const defaultEmulatorLocations = [
      { lat: 37.785834, lng: -122.406417 }, // San Francisco
      { lat: 37.4220, lng: -122.0841 },     // Google HQ
      { lat: 37.3318, lng: -122.0312 },     // Apple HQ
      { lat: 47.6062, lng: -122.3321 }      // Seattle
    ];
    
    const isEmulatorDefault = defaultEmulatorLocations.some(loc => 
      Math.abs(realLocation.coords.latitude - loc.lat) < 0.01 && 
      Math.abs(realLocation.coords.longitude - loc.lng) < 0.01
    );
    
    if (isEmulatorDefault) {
      console.warn('Detectada ubicación por defecto del emulador. Se ignorará esta ubicación.');
      
      // En un dispositivo real no deberíamos entrar aquí
      // En un emulador, usamos coordenadas chilenas predefinidas
      return {
        coords: {
          latitude: -33.46779782049561,  // Coordenadas precisas en Santiago
          longitude: -70.67367745684376,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: Date.now()
      };
    }
    
    // Verificar si la ubicación está fuera de Chile
    if (!isLocationInChile(realLocation.coords.latitude, realLocation.coords.longitude)) {
      console.warn('Ubicación detectada fuera de Chile o potencialmente imprecisa.');
      
      // Verificar si la precisión es muy baja (podría indicar una ubicación aproximada por IP)
      if (realLocation.coords.accuracy > 1000) { // Más de 1km de imprecisión
        console.warn(`Baja precisión detectada: ${realLocation.coords.accuracy}m. Usando ubicación predeterminada.`);
        
        // Usar una ubicación predeterminada en Santiago
        return {
          coords: {
            latitude: -33.46779782049561,  // Coordenadas precisas en Santiago
            longitude: -70.67367745684376,
            accuracy: realLocation.coords.accuracy
          },
          timestamp: realLocation.timestamp
        };
      }
      
      // Si la precisión es buena pero está fuera de Chile, es posible que el usuario realmente esté fuera
      console.warn('El usuario podría estar fuera de Chile. Usando ubicación predeterminada por seguridad.');
      return {
        coords: {
          latitude: -33.46779782049561,  // Coordenadas precisas en Santiago
          longitude: -70.67367745684376,
          accuracy: realLocation.coords.accuracy
        },
        timestamp: realLocation.timestamp
      };
    }
    
    // La ubicación está en Chile y parece ser precisa
    console.log('Ubicación válida en Chile confirmada');
    return realLocation;
  } catch (error) {
    console.error('Error obteniendo ubicación actual:', error);
    
    // En caso de error, devolver coordenadas predeterminadas para Santiago
    return {
      coords: {
        latitude: -33.46779782049561,  // Coordenadas precisas en Santiago
        longitude: -70.67367745684376,
        accuracy: 100
      },
      timestamp: Date.now()
    };
  }
};

/**
 * Usa Nominatim para reverse geocoding (obtener dirección desde coordenadas)
 * @param {number} latitude - Latitud
 * @param {number} longitude - Longitud
 * @returns {Promise<Object|null>} Información de dirección o null si falla
 */
const reverseGeocodeWithNominatim = async (latitude, longitude) => {
  try {
    console.log(`Intentando reverse geocoding con Nominatim para: ${latitude}, ${longitude}`);
    
    const reverseUrl = `https://nominatim.openstreetmap.org/reverse?` +
      `lat=${latitude}&` +
      `lon=${longitude}&` +
      `format=json&` +
      `addressdetails=1&` +
      `accept-language=es&` +
      `zoom=18`; // Zoom 18 = address level (incluye número de casa)
    
    const response = await fetch(reverseUrl, {
      headers: {
        'User-Agent': 'MecaniMovil App/1.0'
      }
    });
    
    if (!response.ok) {
      console.warn('Nominatim reverse geocoding no respondió correctamente:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (data && data.address) {
      const addr = data.address;
      
      // Mapear campos de Nominatim al formato esperado
      const result = {
        street: addr.road || addr.pedestrian || addr.path || addr.street || null,
        streetNumber: addr.house_number || addr.house || null,
        number: addr.house_number || addr.house || null,
        houseNumber: addr.house_number || addr.house || null,
        district: addr.suburb || addr.city_district || addr.borough || addr.neighbourhood || null,
        subregion: addr.municipality || addr.city || addr.town || addr.village || null,
        city: addr.city || addr.town || addr.municipality || null,
        region: addr.state || addr.region || null,
        country: addr.country || 'Chile',
        isoCountryCode: addr.country_code?.toUpperCase() || 'CL',
        postalCode: addr.postcode || null,
        name: addr.road ? 
          (addr.house_number ? `${addr.road} ${addr.house_number}` : addr.road) : 
          (addr.display_name || '')
      };
      
      console.log('✅ Nominatim reverse geocoding exitoso:', result);
      return result;
    }
    
    return null;
  } catch (error) {
    console.error('Error en reverse geocoding con Nominatim:', error);
    return null;
  }
};

/**
 * Convierte coordenadas a una dirección legible (solo en Chile)
 * @param {number} latitude - Latitud
 * @param {number} longitude - Longitud
 * @returns {Promise<Object>} Información de la dirección en formato chileno
 */
export const reverseGeocode = async (latitude, longitude) => {
  try {
    console.log(`Intentando geocodificación inversa para: ${latitude}, ${longitude}`);
    
    // Verificar estrictamente si la ubicación está fuera de Chile
    if (!isLocationInChile(latitude, longitude)) {
      console.warn('Coordenadas fuera de Chile. Usando coordenadas de Santiago.');
      latitude = -33.4489;  // Santiago, Chile
      longitude = -70.6693;
    }
    
    // Intentar obtener la dirección con Expo Location si está disponible
    let expoResult = null;
    if (Location.reverseGeocodeAsync) {
      try {
        const results = await Location.reverseGeocodeAsync({
          latitude,
          longitude
        });
        
        // Filtrar resultados para que solo incluyan ubicaciones en Chile
        if (results && results.length > 0) {
          const chileResults = results.filter(
            result => result.country === 'Chile' || result.isoCountryCode === 'CL'
          );
          
          if (chileResults.length > 0) {
            expoResult = chileResults[0];
            console.log('✅ Expo Location reverse geocoding exitoso:', expoResult);
          }
        }
      } catch (expoError) {
        console.warn('⚠️ Error con Expo Location.reverseGeocodeAsync:', expoError.message);
      }
    }
    
    // Verificar si Expo Location devolvió número de dirección
    const hasStreetNumber = expoResult && (
      expoResult.streetNumber || 
      expoResult.number || 
      expoResult.houseNumber ||
      (expoResult.name && /\d+/.test(expoResult.name))
    );
    
    // Si Expo Location no devolvió número, usar Nominatim como fallback
    if (!hasStreetNumber || !expoResult) {
      console.log('⚠️ Expo Location no devolvió número de dirección o falló, intentando con Nominatim...');
      const nominatimResult = await reverseGeocodeWithNominatim(latitude, longitude);
      
      if (nominatimResult) {
        // Si Nominatim tiene más información (especialmente número), usarlo
        if (nominatimResult.streetNumber || nominatimResult.houseNumber || nominatimResult.number) {
          console.log('✅ Usando resultado de Nominatim (tiene número de dirección)');
          return nominatimResult;
        } else if (!expoResult) {
          // Si Expo Location falló completamente, usar Nominatim aunque no tenga número
          console.log('⚠️ Usando Nominatim aunque no tenga número (Expo Location falló)');
          return nominatimResult;
        }
      }
    }
    
    // Si Expo Location devolvió resultado (con o sin número), usarlo
    if (expoResult) {
      return expoResult;
    }
    
    // Si no hay resultados en Chile, usar una dirección predeterminada
    // Direcciones reales chilenas
    const chileanAddresses = [
      {
        street: 'Av. Libertador Bernardo O\'Higgins',
        streetNumber: `${Math.floor(Math.random() * 3000) + 1000}`,
        district: 'Santiago Centro',
        city: 'Santiago',
        region: 'Región Metropolitana',
      },
      {
        street: 'Av. Providencia',
        streetNumber: `${Math.floor(Math.random() * 2000) + 1000}`,
        district: 'Providencia',
        city: 'Santiago',
        region: 'Región Metropolitana',
      },
      {
        street: 'Av. Las Condes',
        streetNumber: `${Math.floor(Math.random() * 10000) + 5000}`,
        district: 'Las Condes',
        city: 'Santiago',
        region: 'Región Metropolitana',
      },
      {
        street: 'Av. Apoquindo',
        streetNumber: `${Math.floor(Math.random() * 6000) + 1000}`,
        district: 'Las Condes',
        city: 'Santiago',
        region: 'Región Metropolitana',
      }
    ];
    
    // Elegir una dirección aleatoria
    const randomAddress = chileanAddresses[Math.floor(Math.random() * chileanAddresses.length)];
    
    const defaultAddress = {
      ...randomAddress,
      country: 'Chile',
      isoCountryCode: 'CL',
      postalCode: '8320000',
      name: `${randomAddress.street} ${randomAddress.streetNumber}`
    };
    
    console.log('Usando dirección predeterminada para Chile:', defaultAddress);
    return defaultAddress;
  } catch (error) {
    console.error('Error en geocodificación inversa:', error);
    
    // Dirección predeterminada en Santiago
    return {
      street: 'Av. Libertador Bernardo O\'Higgins',
      streetNumber: '1100',
      district: 'Santiago Centro',
      city: 'Santiago', 
      region: 'Región Metropolitana',
      country: 'Chile',
      isoCountryCode: 'CL',
      postalCode: '8320000',
      name: 'Av. Libertador Bernardo O\'Higgins 1100'
    };
  }
};

/**
 * Usa Nominatim para geocodificar una dirección (fallback cuando geocodeAsync falla)
 * @param {string} address - Dirección en texto
 * @returns {Promise<Object|null>} Coordenadas (latitude, longitude) o null si falla
 */
const geocodeWithNominatim = async (address) => {
  try {
    console.log(`Intentando geocodificar con Nominatim: ${address}`);
    
    // Asegurar que la dirección incluya "Chile"
    let addressToGeocode = address;
    if (!address.toLowerCase().includes('chile')) {
      addressToGeocode = `${address}, Chile`;
    }
    
    const searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressToGeocode)}&countrycodes=cl&limit=1&addressdetails=1&accept-language=es`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'MecaniMovil App/1.0'
      }
    });
    
    if (!response.ok) {
      console.warn('Nominatim no respondió correctamente:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      const resultado = data[0];
      const lat = parseFloat(resultado.lat);
      const lng = parseFloat(resultado.lon);
      
      if (!isNaN(lat) && !isNaN(lng) && isLocationInChile(lat, lng)) {
        console.log('✅ Nominatim geocodificación exitosa:', { lat, lng });
        return {
          latitude: lat,
          longitude: lng
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error en geocodificación con Nominatim:', error);
    return null;
  }
};

/**
 * Convierte una dirección en texto a coordenadas (solo para Chile)
 * @param {string} address - Dirección en texto
 * @returns {Promise<Object>} Coordenadas (latitude, longitude)
 */
export const geocodeAddress = async (address) => {
  try {
    console.log(`📍 Intentando geocodificar dirección: ${address}`);
    
    // Asegurar que la dirección incluya "Chile"
    let addressToGeocode = address;
    if (!address.toLowerCase().includes('chile')) {
      addressToGeocode = `${address}, Chile`;
      console.log(`Añadiendo Chile a la dirección: ${addressToGeocode}`);
    }
    
    // Intentar primero con Expo Location si está disponible
    if (Location.geocodeAsync) {
      try {
        console.log('Intentando geocodificar con Expo Location.geocodeAsync...');
        const results = await Location.geocodeAsync(addressToGeocode);
        
        // Verificar si hay resultados
        if (results && results.length > 0) {
          // Verificar que las coordenadas estén en Chile
          const result = results[0];
          
          if (result.latitude && result.longitude && isLocationInChile(result.latitude, result.longitude)) {
            console.log('✅ Expo Location geocodificación exitosa:', result);
            return {
              latitude: result.latitude,
              longitude: result.longitude
            };
          } else {
            console.warn('⚠️ El resultado de Expo Location no está en Chile. Intentando con Nominatim...');
          }
        } else {
          console.warn('⚠️ Expo Location no retornó resultados. Intentando con Nominatim...');
        }
      } catch (expoError) {
        console.warn('⚠️ Error con Expo Location.geocodeAsync:', expoError.message);
        console.log('Intentando con Nominatim como respaldo...');
      }
    } else {
      console.log('⚠️ Location.geocodeAsync no está disponible. Usando Nominatim...');
    }
    
    // Si Expo Location falla o no está disponible, usar Nominatim
    const nominatimResult = await geocodeWithNominatim(addressToGeocode);
    if (nominatimResult) {
      return nominatimResult;
    }
    
    // Si ambos fallan, usar coordenadas predeterminadas de Santiago
    console.warn('⚠️ No se pudo geocodificar la dirección. Usando coordenadas predeterminadas para Santiago.');
    return {
      latitude: -33.4489,  // Santiago, Chile
      longitude: -70.6693
    };
  } catch (error) {
    console.error('❌ Error general en geocodificación:', error);
    
    // En caso de error crítico, devolver coordenadas del centro de Santiago
    return {
      latitude: -33.4489,  // Coordenadas del centro de Santiago
      longitude: -70.6693
    };
  }
};

/**
 * Valida una dirección y obtiene detalles de la misma
 * @param {string} address - Dirección a validar (puede ser parcial)
 * @returns {Promise<Object>} Resultado de validación con detalles o errores
 */
export const validateAddress = async (address) => {
  try {
    // Si la dirección está vacía, no hay nada que validar
    if (!address || address.trim().length < 5) {
      return {
        isValid: false,
        error: 'La dirección es demasiado corta',
        details: null
      };
    }

    console.log(`Validando dirección: ${address}`);
    
    // Asegurar contexto de Chile para la búsqueda
    let searchAddress = address;
    if (!searchAddress.toLowerCase().includes('chile')) {
      searchAddress = `${address}, Chile`;
    }

    // Intentar geocodificar la dirección primero con Expo Location
    let coordinates = null;
    
    if (Location.geocodeAsync) {
      try {
        const results = await Location.geocodeAsync(searchAddress);
        
        if (results && results.length > 0) {
          const result = results[0];
          if (result.latitude && result.longitude && isLocationInChile(result.latitude, result.longitude)) {
            coordinates = result;
          }
        }
      } catch (expoError) {
        console.warn('Error con Expo Location en validateAddress, intentando con Nominatim:', expoError.message);
      }
    }
    
    // Si Expo Location falla, usar Nominatim
    if (!coordinates) {
      coordinates = await geocodeWithNominatim(searchAddress);
    }
    
    // No se encontraron resultados
    if (!coordinates || !coordinates.latitude || !coordinates.longitude) {
      return {
        isValid: false,
        error: 'No se pudo encontrar esta dirección',
        details: null
      };
    }

    // Obtener detalles completos mediante geocodificación inversa
    const addressDetails = await reverseGeocode(coordinates.latitude, coordinates.longitude);
    
    // Verificar que sea una dirección en Chile
    if (addressDetails.country !== 'Chile' && addressDetails.isoCountryCode !== 'CL') {
      return {
        isValid: false,
        error: 'La dirección debe estar en Chile',
        details: null
      };
    }

    // Revisar si tenemos datos completos para una dirección válida
    const hasStreet = !!addressDetails.street;
    const hasNumber = !!addressDetails.streetNumber;
    const hasDistrict = !!addressDetails.district || !!addressDetails.subregion;
    const hasCity = !!addressDetails.city;
    
    const addressScore = [hasStreet, hasNumber, hasDistrict, hasCity].filter(Boolean).length;
    
    // Construir detalles normalizados
    const normalizedDetails = {
      fullAddress: formatAddress(addressDetails),
      street: addressDetails.street || '',
      streetNumber: addressDetails.streetNumber || '',
      district: addressDetails.district || addressDetails.subregion || '',
      city: addressDetails.city || '',
      region: addressDetails.region || '',
      coordinates: {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude
      }
    };
    
    // Evaluar qué tan completa es la dirección
    if (addressScore >= 3) {
      return {
        isValid: true,
        error: null,
        details: normalizedDetails,
        confidence: addressScore / 4 // 0.75 a 1.0 para direcciones válidas
      };
    } else {
      return {
        isValid: false,
        error: 'La dirección parece incompleta o no válida',
        details: normalizedDetails,
        confidence: addressScore / 4 // < 0.75 para direcciones incompletas
      };
    }
  } catch (error) {
    console.error('Error validando dirección:', error);
    return {
      isValid: false,
      error: 'Error al validar la dirección',
      details: null
    };
  }
};

/**
 * Obtiene sugerencias de direcciones basadas en el texto ingresado por el usuario
 * @param {string} inputText - Texto parcial de dirección
 * @param {number} limit - Número máximo de sugerencias a devolver
 * @returns {Promise<Array>} Lista de sugerencias de direcciones
 */
export const getAddressSuggestions = async (inputText, limit = 5) => {
  try {
    // Si el texto es muy corto, no buscar sugerencias
    if (!inputText || inputText.trim().length < 3) {
      return [];
    }

    console.log(`Buscando sugerencias para: ${inputText}`);
    
    // Asegurar contexto de Chile para la búsqueda
    let searchText = inputText;
    if (!searchText.toLowerCase().includes('chile')) {
      searchText = `${inputText}, Chile`;
    }

    // Detectar si estamos en navegador web o dispositivo móvil
    const isWeb = Platform.OS === 'web';
    
    // Función común para obtener sugerencias de Nominatim
    const getNominatimSuggestions = async (query) => {
      try {
        console.log(`Consultando Nominatim para: ${query}`);
        
        // Consultar la API de Nominatim con parámetros optimizados
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
          `q=${encodeURIComponent(query)}&` +
          `format=json&` +
          `addressdetails=1&` +
          `limit=${limit}&` +
          `countrycodes=cl&` + // Código ISO de Chile
          `accept-language=es&` +
          `layer=address&` + // Prioriza direcciones sobre otros puntos de interés
          `dedupe=1`
        );
        
        const data = await response.json();
        console.log(`Nominatim retornó ${data?.length || 0} resultados`);
        
        if (!data || data.length === 0) {
          return [];
        }
        
        // Analizar la consulta para extraer posibles números de dirección
        // Método 1: Buscar palabras que sean completamente números
        const queryWords = query.split(/\s+/); // Dividir por espacios
        const possibleNumbers = queryWords.filter(word => /^\d+$/.test(word.trim()));
        
        // Método 2: Usar una expresión regular para encontrar números directamente
        const numberRegex = /\b(\d+)\b/g;
        const matches = [...query.matchAll(numberRegex)];
        const numbersInQuery = matches.map(match => match[1]);
        
        // Usar el resultado de ambos métodos para mayor seguridad
        const detectedNumbers = [...new Set([...possibleNumbers, ...numbersInQuery])];
        const userProvidedNumber = detectedNumbers.length > 0 ? detectedNumbers[detectedNumbers.length - 1] : null;
        
        console.log(`Números detectados en la consulta: ${detectedNumbers.join(', ') || 'ninguno'}`);
        console.log(`Número seleccionado para dirección: ${userProvidedNumber || 'ninguno'}`);
        
        // Convertir los resultados al formato esperado por la aplicación
        return data.map((item, index) => {
          // Extraer detalles relevantes
          const address = item.address || {};
          const district = address.suburb || address.city_district || address.district || '';
          const city = address.city || address.town || address.municipality || 'Santiago';
          const region = address.state || 'Región Metropolitana';
          
          // Asegurarse de que tenemos un número de calle
          let streetNumber = address.house_number || '';
          
          // Si OpenStreetMap no provee un número pero el usuario lo ingresó en la consulta,
          // usar el número que proporcionó el usuario
          if (!streetNumber && userProvidedNumber) {
            streetNumber = userProvidedNumber;
            console.log(`Usando número proporcionado por el usuario: ${streetNumber}`);
          }
          
          // Obtener la calle, asegurándose de considerar diferentes tipos de vías
          const street = address.road || address.pedestrian || address.street || '';
          
          // Crear una dirección simplificada y clara
          // Formato: Calle Número, Comuna, Ciudad (si es diferente a la comuna)
          const parts = [];
          
          // Calle y número
          if (street) {
            parts.push(streetNumber ? `${street} ${streetNumber}` : street);
          }
          
          // Comuna/distrito
          if (district) {
            parts.push(district);
          }
          
          // Ciudad (solo si es diferente a la comuna)
          if (city && city !== district) {
            parts.push(city);
          }
          
          // Crear versión simplificada de la dirección
          const simplifiedAddress = parts.join(', ');
          // Añadir ", Chile" solo para la dirección completa
          const fullAddress = `${simplifiedAddress}, Chile`;
          
          // Texto principal: no más de 60 caracteres para mejorar legibilidad
          const mainText = simplifiedAddress.length > 60 
            ? simplifiedAddress.substring(0, 57) + '...' 
            : simplifiedAddress;
          
          return {
            id: index,
            fullAddress: fullAddress,
            mainText: mainText,
            secondaryText: district ? `Comuna: ${district}` : (city ? `Ciudad: ${city}` : ''),
            district: district,
            coordinates: {
              latitude: parseFloat(item.lat),
              longitude: parseFloat(item.lon)
            },
            details: {
              street: street,
              streetNumber: streetNumber,
              district: district,
              city: city,
              region: region
            }
          };
        });
      } catch (error) {
        console.error('Error consultando Nominatim:', error);
        return [];
      }
    };
    
    // Implementación para web
    if (isWeb) {
      console.log('Utilizando Nominatim API para web');
      return await getNominatimSuggestions(searchText);
    } 
    // Implementación para dispositivos móviles
    else {
      // En dispositivos móviles intentamos usar la API de Expo Location primero
      if (Location.geocodeAsync) {
        try {
          // Intentar geocodificar el texto parcial
          console.log('Intentando usar geocodeAsync de Expo Location');
          const results = await Location.geocodeAsync(searchText);
          
          if (!results || results.length === 0) {
            console.log('geocodeAsync no retornó resultados, usando Nominatim');
            return await getNominatimSuggestions(searchText);
          }
          
          // Procesar los resultados y obtener detalles para cada uno
          const suggestions = [];
          
          // Limitar el número de resultados a procesar
          const resultsToProcess = results.slice(0, Math.min(limit, results.length));
          
          for (const result of resultsToProcess) {
            // Verificar que esté en Chile
            if (!isLocationInChile(result.latitude, result.longitude)) {
              continue;
            }
            
            try {
              // Obtener detalles completos de la dirección
              const details = await reverseGeocode(result.latitude, result.longitude);
              
              // Verificar que sea una dirección en Chile
              if (details.country !== 'Chile' && details.isoCountryCode !== 'CL') {
                continue;
              }
              
              // Formatear la dirección para mostrar
              const formattedAddress = formatAddress(details);
              
              // Extraer la comuna/distrito para mostrarlo destacado
              const district = details.district || details.subregion || '';
              
              suggestions.push({
                id: suggestions.length,
                fullAddress: formattedAddress,
                mainText: formattedAddress,
                secondaryText: district ? `Comuna: ${district}` : '',
                district: district,
                coordinates: {
                  latitude: result.latitude,
                  longitude: result.longitude
                },
                details: {
                  street: details.street || '',
                  streetNumber: details.streetNumber || '',
                  district: district,
                  city: details.city || '',
                  region: details.region || ''
                }
              });
            } catch (error) {
              console.warn('Error al procesar sugerencia:', error);
              // Continuar con el siguiente resultado
            }
          }
          
          // Si se obtuvieron sugerencias, devolverlas
          if (suggestions.length > 0) {
            return suggestions;
          }
          
          // Si no hay sugerencias tras la búsqueda, probar con Nominatim
          console.log('No se obtuvieron sugerencias válidas con geocodeAsync, usando Nominatim');
          return await getNominatimSuggestions(searchText);
        } catch (error) {
          console.warn('Error usando geocodeAsync, usando Nominatim como respaldo:', error);
          return await getNominatimSuggestions(searchText);
        }
      } else {
        // Si geocodeAsync no está disponible, usar directamente Nominatim
        console.log('geocodeAsync no disponible, usando Nominatim para dispositivo móvil');
        return await getNominatimSuggestions(searchText);
      }
    }
  } catch (error) {
    console.error('Error general obteniendo sugerencias:', error);
    return [];
  }
};

/**
 * Formatea una dirección a partir de sus componentes
 * @param {Object} addressDetails - Detalles de la dirección
 * @returns {string} Dirección formateada
 */
const formatAddress = (addressDetails) => {
  const parts = [];
  
  // Calle y número (formato chileno)
  if (addressDetails.street && addressDetails.streetNumber) {
    parts.push(`${addressDetails.street} ${addressDetails.streetNumber}`);
  } else if (addressDetails.street) {
    parts.push(addressDetails.street);
  } else if (addressDetails.name) {
    parts.push(addressDetails.name);
  }
  
  // Comuna/distrito
  if (addressDetails.district) {
    parts.push(addressDetails.district);
  } else if (addressDetails.subregion) {
    parts.push(addressDetails.subregion);
  }
  
  // Ciudad
  if (addressDetails.city && !parts.some(p => p.includes(addressDetails.city))) {
    parts.push(addressDetails.city);
  }
  
  // Región (opcional en el formato chileno)
  if (addressDetails.region && !parts.some(p => p.includes(addressDetails.region))) {
    parts.push(addressDetails.region);
  }
  
  // País
  parts.push('Chile');
  
  return parts.filter(Boolean).join(', ');
};

/**
 * Función de limpieza y validación de direcciones
 * Se debe llamar al iniciar la app o cuando sea necesario validar direcciones
 * @returns {Promise<Object|null>} Dirección válida o null
 */
export const ensureValidAddress = async () => {
  try {
    console.log('🔄 ensureValidAddress: Validando y limpiando direcciones...');
    
    // Limpiar direcciones obsoletas primero
    await cleanObsoleteAddresses();
    
    // Obtener dirección válida
    const validAddress = await getMainAddress();
    
    if (validAddress) {
      console.log('✅ ensureValidAddress: Dirección válida encontrada:', validAddress.direccion);
    } else {
      console.log('⚠️ ensureValidAddress: No hay direcciones válidas disponibles');
    }
    
    return validAddress;
  } catch (error) {
    console.error('❌ ensureValidAddress: Error validando direcciones:', error);
    return null;
  }
}; 