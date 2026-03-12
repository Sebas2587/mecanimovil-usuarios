import { get } from './api';
import { getMediaURL } from './api';
import * as locationService from './location';

/**
 * Servicios para manejo de proveedores (talleres y mecánicos)
 * Funciones para obtener, filtrar y gestionar proveedores
 */

/**
 * Obtiene proveedores por vehículo específico
 * @param {number} vehiculoId - ID del vehículo
 * @returns {Promise<Object>} Objeto con talleres y mecánicos
 */
export const getProvidersByVehiculo = async (vehiculoId) => {
  try {
    // Obtener información del vehículo
    const vehicleResponse = await get(`/vehiculos/${vehiculoId}/`);
    if (!vehicleResponse || !vehicleResponse.modelo) {
      console.log(`Vehículo ${vehiculoId} no encontrado o sin modelo`);
      return { talleres: [], mecanicos: [] };
    }

    // Obtener talleres por modelo
    const talleresResponse = await get('/usuarios/talleres/', {
      modelo: vehicleResponse.modelo,
      especialidades: true
    });

    // Obtener mecánicos por modelo
    const mecanicosResponse = await get('/usuarios/mecanicos-domicilio/', {
      modelo: vehicleResponse.modelo,
      especialidades: true
    });

    return {
      talleres: talleresResponse.results || talleresResponse || [],
      mecanicos: mecanicosResponse.results || mecanicosResponse || []
    };
  } catch (error) {
    console.error(`Error obteniendo proveedores para vehículo ${vehiculoId}:`, error);
    return { talleres: [], mecanicos: [] };
  }
};

/**
 * Obtiene proveedores filtrados por vehículo y servicios seleccionados
 * @param {number} vehiculoId - ID del vehículo
 * @param {Array<number>} servicioIds - IDs de servicios seleccionados (opcional)
 * @returns {Promise<Object>} Objeto con talleres y mecánicos filtrados
 */
export const getProvidersByVehiculoAndService = async (vehiculoId, servicioIds = []) => {
  try {
    if (!vehiculoId) {
      console.log('No se proporcionó ID de vehículo');
      return { talleres: [], mecanicos: [] };
    }

    // Construir parámetros para la consulta
    // El backend espera servicio_ids[]=1&servicio_ids[]=2 para arrays
    const params = {
      vehiculo_id: vehiculoId
    };

    // Agregar servicio_ids si están presentes
    // Para arrays con corchetes, axios necesita que la clave termine con []
    if (servicioIds && servicioIds.length > 0) {
      // Construir objeto con múltiples claves servicio_ids[]
      // Axios serializará esto correctamente como servicio_ids[]=1&servicio_ids[]=2
      servicioIds.forEach((id, index) => {
        params[`servicio_ids[${index}]`] = id;
      });
    }

    console.log(`🔍 Llamando a proveedores_filtrados con:`, params);

    // Llamar a los endpoints de proveedores filtrados
    const talleresResponse = await get(`/usuarios/talleres/proveedores_filtrados/`, params);
    const mecanicosResponse = await get(`/usuarios/mecanicos-domicilio/proveedores_filtrados/`, params);

    return {
      talleres: talleresResponse.talleres || [],
      mecanicos: mecanicosResponse.mecanicos || [],
      filtros_aplicados: {
        marca: talleresResponse.filtros_aplicados?.marca_vehiculo || mecanicosResponse.filtros_aplicados?.marca_vehiculo || null,
        servicios: servicioIds.length > 0 ? servicioIds : 'todos'
      }
    };
  } catch (error) {
    console.error(`❌ Error obteniendo proveedores filtrados para vehículo ${vehiculoId}:`, error);
    if (error.response) {
      console.error(`❌ Status: ${error.response.status}`);
      console.error(`❌ Data:`, error.response.data);
      console.error(`❌ URL completa: ${error.config?.baseURL}${error.config?.url}`);
      console.error(`❌ Parámetros:`, error.config?.params);

      // Si es 404, intentar con la URL sin el parámetro de array
      if (error.response.status === 404 && servicioIds.length > 0) {
        console.log('⚠️ 404 detectado, intentando con formato alternativo de parámetros...');
        // Intentar con formato diferente para arrays
        const paramsAlt = { vehiculo_id: vehiculoId };
        servicioIds.forEach((id, index) => {
          paramsAlt[`servicio_ids[${index}]`] = id;
        });

        try {
          const talleresResponse = await get(`/usuarios/talleres/proveedores_filtrados/`, paramsAlt);
          const mecanicosResponse = await get(`/usuarios/mecanicos-domicilio/proveedores_filtrados/`, paramsAlt);

          return {
            talleres: talleresResponse.talleres || [],
            mecanicos: mecanicosResponse.mecanicos || [],
            filtros_aplicados: {
              marca: talleresResponse.filtros_aplicados?.marca_vehiculo || mecanicosResponse.filtros_aplicados?.marca_vehiculo || null,
              servicios: servicioIds
            }
          };
        } catch (retryError) {
          console.error('❌ Error en reintento:', retryError);
        }
      }
    } else if (error.message) {
      console.error(`❌ Error message: ${error.message}`);
    }
    return { talleres: [], mecanicos: [] };
  }
};

/**
 * Proveedores que ofrecen los servicios indicados sin filtrar por vehículo/marca
 * (precompra u otros flujos sin auto registrado). Backend: proveedores_filtrados sin vehiculo_id + servicio_ids.
 */
export const getProvidersByServicioOnly = async (servicioIds = []) => {
  try {
    if (!servicioIds || servicioIds.length === 0) {
      return { talleres: [], mecanicos: [] };
    }
    const params = {};
    servicioIds.forEach((id, index) => {
      params[`servicio_ids[${index}]`] = id;
    });
    const talleresResponse = await get(`/usuarios/talleres/proveedores_filtrados/`, params);
    const mecanicosResponse = await get(`/usuarios/mecanicos-domicilio/proveedores_filtrados/`, params);
    return {
      talleres: talleresResponse.talleres || [],
      mecanicos: mecanicosResponse.mecanicos || [],
      filtros_aplicados: { sin_vehiculo: true, servicios: servicioIds },
    };
  } catch (error) {
    console.error('Error obteniendo proveedores por servicio (sin vehículo):', error);
    return { talleres: [], mecanicos: [] };
  }
};

/**
 * Calcula la distancia entre dos coordenadas usando la fórmula de Haversine
 * @param {number} lat1 - Latitud del primer punto
 * @param {number} lon1 - Longitud del primer punto
 * @param {number} lat2 - Latitud del segundo punto
 * @param {number} lon2 - Longitud del segundo punto
 * @returns {number} Distancia en kilómetros
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en kilómetros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Normaliza un nombre de comuna para comparación
 * Remueve acentos, convierte a minúsculas y normaliza espacios
 * @param {string} communeName - Nombre de la comuna
 * @returns {string} Nombre normalizado
 */
function normalizeCommuneName(communeName) {
  if (!communeName || typeof communeName !== 'string') {
    return '';
  }

  // Remover acentos y caracteres especiales
  let normalized = communeName
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover diacríticos
    .replace(/[^a-z0-9\s]/g, '') // Remover caracteres especiales
    .replace(/\s+/g, ' ') // Normalizar espacios múltiples a uno solo
    .trim();

  return normalized;
}

/**
 * Obtiene talleres para los vehículos del usuario
 * Filtra por marca de vehículo usando el endpoint proveedores_filtrados
 * @param {Array} userVehicles - Lista de vehículos del usuario
 * @returns {Promise<Array>} Lista de talleres compatibles
 */
export const getWorkshopsForUserVehicles = async (userVehicles, signal = null) => {
  try {
    if (!userVehicles || userVehicles.length === 0) {
      return [];
    }

    // Obtener la dirección principal del usuario para calcular distancias
    const address = await locationService.getMainAddress();
    let coords = null;

    if (address) {
      const addressString = typeof address === 'object' ? address.direccion : address;

      // PRIORIDAD: Usar coordenadas guardadas en la dirección si están disponibles
      if (typeof address === 'object' && address.ubicacion) {
        // La dirección puede tener coordenadas en el campo ubicacion (GeoJSON Point)
        if (address.ubicacion.coordinates && Array.isArray(address.ubicacion.coordinates) && address.ubicacion.coordinates.length >= 2) {
          // GeoJSON usa [longitude, latitude]
          coords = {
            latitude: parseFloat(address.ubicacion.coordinates[1]),
            longitude: parseFloat(address.ubicacion.coordinates[0])
          };
          console.log(`✅ Usando coordenadas guardadas de la dirección (talleres): ${coords.latitude}, ${coords.longitude}`);
        }
      }

      // Si no hay coordenadas guardadas, geocodificar la dirección
      if (!coords) {
        console.log('📍 No hay coordenadas guardadas, geocodificando dirección (talleres)...');
        coords = await locationService.geocodeAddress(addressString);
        if (coords) {
          console.log(`✅ Coordenadas obtenidas por geocodificación (talleres): ${coords.latitude}, ${coords.longitude}`);
        } else {
          console.warn('⚠️ No se pudieron obtener coordenadas por geocodificación (talleres)');
        }
      }
    }

    const allWorkshops = [];
    const workshopIds = new Set();

    // OPTIMIZATION: Group vehicles by brand to minimize API calls
    const vehiclesByBrand = new Map();
    userVehicles.forEach(v => {
      const brandId = v.marca?.id || v.marca;
      if (brandId && !vehiclesByBrand.has(brandId)) {
        vehiclesByBrand.set(brandId, v);
      }
    });

    console.log(`📊 [Talleres] Batched ${userVehicles.length} vehicles -> ${vehiclesByBrand.size} brands`);

    for (const [brandId, vehicle] of vehiclesByBrand) {
      if (vehicle.id) {
        try {
          const params = { vehiculo_id: vehicle.id };
          // api.get signature is (url, params, options)
          // We need to pass signal inside options if it exists
          const options = signal ? { signal, forceRefresh: true } : { forceRefresh: true };
          const response = await get('/usuarios/talleres/proveedores_filtrados/', params, options);
          const workshops = response.talleres || [];

          if (Array.isArray(workshops)) {
            workshops.forEach(workshop => {
              if (!workshopIds.has(workshop.id)) {
                workshopIds.add(workshop.id);
                allWorkshops.push(workshop);
              }
            });
          }
        } catch (error) {
          console.error(`Error talleres brand ${brandId}:`, error);
        }
      }
    }

    // Si tenemos coordenadas, calcular y ordenar por distancia
    if (coords && allWorkshops.length > 0) {
      // Calcular distancia para cada taller si no la tienen
      allWorkshops.forEach(workshop => {
        let workshopLat = null;
        let workshopLng = null;

        // Intentar obtener coordenadas desde diferentes fuentes
        if (workshop.direccion_fisica && workshop.direccion_fisica.latitud && workshop.direccion_fisica.longitud) {
          workshopLat = parseFloat(workshop.direccion_fisica.latitud);
          workshopLng = parseFloat(workshop.direccion_fisica.longitud);
        } else if (workshop.ubicacion) {
          // Si tiene ubicación GeoDjango
          if (typeof workshop.ubicacion === 'object' && workshop.ubicacion.coordinates) {
            workshopLng = parseFloat(workshop.ubicacion.coordinates[0]);
            workshopLat = parseFloat(workshop.ubicacion.coordinates[1]);
          }
        }

        if (workshopLat && workshopLng && !isNaN(workshopLat) && !isNaN(workshopLng)) {
          // Calcular distancia (Haversine)
          const distance = calculateDistance(
            coords.latitude,
            coords.longitude,
            workshopLat,
            workshopLng
          );

          // Asignar distancia en múltiples campos para compatibilidad
          workshop.distancia_km = distance;
          workshop.distance = distance; // Campo usado por NearbyTallerCard
          workshop.distancia = distance; // Campo alternativo

          console.log(`📏 Distancia calculada para taller ${workshop.id} (${workshop.nombre}): ${distance.toFixed(2)}km`);
        } else {
          // Si no tiene coordenadas, usar distancia del backend si está disponible
          if (workshop.distance !== undefined && workshop.distance !== null) {
            const backendDistance = typeof workshop.distance === 'number' ? workshop.distance : parseFloat(workshop.distance);
            workshop.distancia_km = backendDistance;
            workshop.distance = backendDistance;
            workshop.distancia = backendDistance;
            console.log(`📏 Usando distancia del backend para taller ${workshop.id}: ${backendDistance.toFixed(2)}km`);
          } else {
            console.warn(`⚠️ Taller ${workshop.id} (${workshop.nombre}) no tiene coordenadas ni distancia del backend`);
          }
        }
      });

      // Ordenar por distancia
      allWorkshops.sort((a, b) => {
        const distA = a.distance || a.distancia_km || a.distancia || Infinity;
        const distB = b.distance || b.distancia_km || b.distancia || Infinity;
        return distA - distB;
      });
    }

    return allWorkshops;
  } catch (error) {
    console.error('Error obteniendo talleres para vehículos del usuario:', error);
    return [];
  }
};

/**
 * Obtiene mecánicos para los vehículos del usuario
 * Filtra por marca de vehículo, zonas de servicio (comunas) y radio de cobertura
 * @param {Array} userVehicles - Lista de vehículos del usuario
 * @returns {Promise<Array>} Lista de mecánicos compatibles
 */
export const getMechanicsForUserVehicles = async (userVehicles, signal = null) => {
  try {
    if (!userVehicles || userVehicles.length === 0) {
      return [];
    }

    // Obtener la dirección principal del usuario para calcular distancias y obtener comuna
    const address = await locationService.getMainAddress();
    let coords = null;
    let userCommune = null;

    if (address) {
      const addressString = typeof address === 'object' ? address.direccion : address;

      // PRIORIDAD: Usar coordenadas guardadas en la dirección si están disponibles
      if (typeof address === 'object' && address.ubicacion) {
        // La dirección puede tener coordenadas en el campo ubicacion (GeoJSON Point)
        if (address.ubicacion.coordinates && Array.isArray(address.ubicacion.coordinates) && address.ubicacion.coordinates.length >= 2) {
          // GeoJSON usa [longitude, latitude]
          coords = {
            latitude: parseFloat(address.ubicacion.coordinates[1]),
            longitude: parseFloat(address.ubicacion.coordinates[0])
          };
          console.log(`✅ Usando coordenadas guardadas de la dirección: ${coords.latitude}, ${coords.longitude}`);
        }
      }

      // Si no hay coordenadas guardadas, geocodificar la dirección
      if (!coords) {
        console.log('📍 No hay coordenadas guardadas, geocodificando dirección...');
        coords = await locationService.geocodeAddress(addressString);
        if (coords) {
          console.log(`✅ Coordenadas obtenidas por geocodificación: ${coords.latitude}, ${coords.longitude}`);
        } else {
          console.warn('⚠️ No se pudieron obtener coordenadas por geocodificación');
        }
      }

      // PRIORIDAD 1: Intentar extraer comuna directamente del string de dirección
      // Las direcciones típicamente incluyen la comuna en el formato: "Calle 123, Comuna, Región, Chile"
      if (addressString) {
        // Obtener todas las comunas de Chile desde el backend (o usar lista estática)
        // Por ahora, intentar extraer del string usando patrones comunes
        const addressLower = addressString.toLowerCase();

        // Patrones comunes de direcciones chilenas:
        // "Calle, Comuna, Región, Chile"
        // "Comuna, Región, Chile"
        // Buscar la palabra antes de la región o antes de "Chile"

        // Intentar extraer usando el patrón: texto antes de la última coma antes de "Chile" o región
        const parts = addressString.split(',').map(p => p.trim()).filter(p => p.length > 0);

        // Estructuras comunes de direcciones chilenas:
        // "Calle 123, Comuna, Región, Chile"
        // "Calle 123, Comuna, Chile"  
        // "Comuna, Región, Chile"
        // "Calle 123, Comuna"

        if (parts.length >= 2) {
          let potentialCommune = null;

          // Buscar la comuna en diferentes posiciones según la estructura
          // Normalmente está antes de "Chile" o antes de una región conocida
          const regions = ['metropolitana', 'valparaiso', 'bio bio', 'araucania', 'los lagos'];
          const lastPart = parts[parts.length - 1].toLowerCase();
          const secondLastPart = parts.length >= 2 ? parts[parts.length - 2].toLowerCase() : '';

          // Si la última parte es "Chile" o una región conocida, la comuna está en la penúltima
          if (lastPart === 'chile' || regions.some(r => lastPart.includes(r))) {
            if (parts.length >= 3) {
              // Estructura: [Calle, Comuna, Región/Chile]
              potentialCommune = parts[parts.length - 2];
            } else if (parts.length === 2) {
              // Estructura: [Comuna, Chile]
              potentialCommune = parts[0];
            }
          } else if (parts.length === 2 && secondLastPart) {
            // Si solo hay 2 partes y la última no es Chile, puede ser [Calle, Comuna]
            potentialCommune = parts[1];
          } else if (parts.length >= 3) {
            // Intentar con la penúltima posición
            potentialCommune = parts[parts.length - 2];
          }

          if (potentialCommune && potentialCommune.toLowerCase() !== 'chile' && !regions.some(r => potentialCommune.toLowerCase().includes(r))) {
            // Normalizar y verificar que no sea muy largo (comunas típicamente < 30 caracteres)
            // y que no sea un número (direcciones)
            const normalized = normalizeCommuneName(potentialCommune);
            const isNumber = /^\d+$/.test(normalized.replace(/\s/g, ''));

            if (normalized.length > 2 && normalized.length < 30 && !isNumber) {
              userCommune = normalized;
              console.log(`📍 Comuna del usuario extraída del string de dirección: "${potentialCommune}" (normalizada: "${userCommune}")`);
            }
          }
        }

        // Si no se pudo extraer del patrón, buscar comunas conocidas en el string
        if (!userCommune) {
          const commonCommunes = [
            'santiago', 'providencia', 'las condes', 'ñuñoa', 'maipu', 'macul',
            'san miguel', 'la florida', 'puente alto', 'san bernardo', 'cerro navia',
            'recoleta', 'independencia', 'quilicura', 'huechuraba', 'vitacura',
            'san joaquin', 'la granja', 'la pintana', 'el bosque', 'lo espejo',
            'pedro aguirre cerda', 'lo prado', 'estacion central', 'cerro navia',
            'conchali', 'renca', 'penalolen', 'la reina', 'barnechea', 'san jose de maipo'
          ];

          for (const commune of commonCommunes) {
            const normalizedCommune = normalizeCommuneName(commune);
            // Buscar como palabra completa (no solo substring) para evitar falsos positivos
            const regex = new RegExp(`\\b${normalizedCommune.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            if (regex.test(normalizeCommuneName(addressString))) {
              userCommune = normalizedCommune;
              console.log(`📍 Comuna del usuario encontrada en dirección (búsqueda de palabras conocidas): "${commune}" (normalizada: "${userCommune}")`);
              break;
            }
          }
        }
      }

      // PRIORIDAD 2: Si no se pudo extraer del string, intentar geocodificación inversa
      if (!userCommune && coords) {
        try {
          const addressDetails = await locationService.reverseGeocode(coords.latitude, coords.longitude);
          // Extraer comuna de los detalles de la dirección
          // Puede estar en district, subregion, o city dependiendo del proveedor de geocodificación
          const extractedCommune = addressDetails?.district || addressDetails?.subregion || addressDetails?.city || null;

          if (extractedCommune) {
            const originalCommune = extractedCommune.trim();
            userCommune = normalizeCommuneName(extractedCommune);
            console.log(`📍 Comuna del usuario detectada (geocodificación inversa): "${originalCommune}" (normalizada: "${userCommune}")`);
          } else {
            console.warn('⚠️ No se pudo extraer la comuna de los detalles de geocodificación inversa:', addressDetails);
          }
        } catch (error) {
          console.warn('⚠️ No se pudo obtener la comuna mediante geocodificación inversa:', error);
        }
      }

      if (!userCommune) {
        console.warn(`⚠️ No se pudo determinar la comuna del usuario desde la dirección: "${addressString}"`);
      }
    }

    const allMechanics = [];
    const mechanicIds = new Set();

    // OPTIMIZATION: Group vehicles by brand to minimize API calls
    const vehiclesByBrand = new Map();
    userVehicles.forEach(v => {
      const brandId = v.marca?.id || v.marca;
      if (brandId && !vehiclesByBrand.has(brandId)) {
        vehiclesByBrand.set(brandId, v);
      }
    });

    console.log(`📊 [Mecanicos] Batched ${userVehicles.length} vehicles -> ${vehiclesByBrand.size} brands`);

    for (const [brandId, vehicle] of vehiclesByBrand) {
      if (vehicle.id) {
        try {
          const params = { vehiculo_id: vehicle.id };
          // api.get signature is (url, params, options)
          const options = signal ? { signal, forceRefresh: true } : { forceRefresh: true };
          const response = await get('/usuarios/mecanicos-domicilio/proveedores_filtrados/', params, options);
          const mechanics = response.mecanicos || [];

          if (Array.isArray(mechanics)) {
            mechanics.forEach(mechanic => {
              if (!mechanicIds.has(mechanic.id)) {
                mechanicIds.add(mechanic.id);
                allMechanics.push(mechanic);
              }
            });
          }
        } catch (error) {
          console.error(`Error mecanicos brand ${brandId}:`, error);
        }
      }
    }

    // Filtrar por zonas de servicio y calcular distancias
    const filteredMechanics = [];

    if (coords && allMechanics.length > 0) {
      for (const mechanic of allMechanics) {
        let shouldInclude = true;

        // FILTRO 1: REGLA ESTRICTA - Solo mostrar mecánicos que tengan zonas de servicio configuradas
        // Si el mecánico NO tiene zonas de servicio, NO debe aparecer (regla de funcionamiento)
        if (!mechanic.zonas_servicio || !Array.isArray(mechanic.zonas_servicio) || mechanic.zonas_servicio.length === 0) {
          // Mecánico sin zonas configuradas - NO incluir (regla estricta)
          if (filteredMechanics.length < 3) {
            console.log(`❌ Mecánico ${mechanic.id} (${mechanic.nombre}) NO tiene zonas de servicio configuradas - EXCLUIDO (regla estricta)`);
          }
          shouldInclude = false;
        } else if (userCommune) {
          // Si el usuario tiene comuna detectada, filtrar por zonas de servicio
          // Verificar si el mecánico tiene zonas de servicio activas que incluyan la comuna del usuario
          const zonasActivas = mechanic.zonas_servicio.filter(z => z.activa && z.comunas && Array.isArray(z.comunas) && z.comunas.length > 0);

          if (zonasActivas.length > 0) {
            // Solo filtrar si el mecánico tiene zonas activas con comunas
            const hasMatchingZone = zonasActivas.some(zona => {
              // Comparación normalizada de nombres de comunas
              return zona.comunas.some(communeName => {
                const normalizedZoneCommune = normalizeCommuneName(communeName);
                const matches = normalizedZoneCommune === userCommune;

                // Log detallado de comparación solo cuando hay match
                if (matches) {
                  console.log(`   ✅ Match encontrado: "${communeName}" (normalizada: "${normalizedZoneCommune}") === "${userCommune}"`);
                }

                return matches;
              });
            });

            // Si el mecánico tiene zonas de servicio activas con comunas, debe tener match
            if (!hasMatchingZone) {
              // Log detallado para debugging (solo el primero para no llenar la consola)
              if (filteredMechanics.length < 3) {
                const zonasComunas = zonasActivas
                  .map(z => {
                    const comunasNormalizadas = z.comunas.map(c => {
                      const norm = normalizeCommuneName(c);
                      return `"${c}" (norm: "${norm}")`;
                    });
                    return `[${comunasNormalizadas.join(', ')}]`;
                  })
                  .join(' | ');

                console.log(`❌ Mecánico ${mechanic.id} (${mechanic.nombre}) no tiene zona de servicio para comuna del usuario`);
                console.log(`   📍 Comuna usuario (normalizada): "${userCommune}"`);
                console.log(`   🗺️  Zonas activas del mecánico (${zonasActivas.length} zonas): ${zonasComunas}`);
              }
              shouldInclude = false;
            } else {
              // Match encontrado, incluir el mecánico
              if (filteredMechanics.length < 3) {
                console.log(`✅ Mecánico ${mechanic.id} (${mechanic.nombre}) tiene zona de servicio que coincide con comuna del usuario`);
              }
            }
          } else {
            // El mecánico tiene zonas configuradas pero ninguna está activa o no tiene comunas
            // Como tiene zonas configuradas, lo incluimos (pero con advertencia)
            if (filteredMechanics.length < 3) {
              console.log(`⚠️ Mecánico ${mechanic.id} (${mechanic.nombre}) tiene zonas configuradas pero ninguna activa, incluyéndolo`);
            }
          }
        } else {
          // Caso: El mecánico tiene zonas configuradas pero NO se detectó comuna del usuario
          // Incluirlo porque no podemos verificar el match, pero tiene zonas configuradas
          if (filteredMechanics.length < 3) {
            console.log(`⚠️ No se detectó comuna del usuario, pero mecánico ${mechanic.id} (${mechanic.nombre}) tiene zonas configuradas - INCLUIDO (sin verificación de match)`);
          }
        }

        // Si pasó el filtro de zonas, calcular distancia
        if (shouldInclude) {
          // Calcular distancia si el mecánico tiene ubicación
          // Para mecánicos a domicilio, usar la dirección física si está disponible
          let mechanicLat = null;
          let mechanicLng = null;

          if (mechanic.direccion_fisica && mechanic.direccion_fisica.latitud && mechanic.direccion_fisica.longitud) {
            mechanicLat = parseFloat(mechanic.direccion_fisica.latitud);
            mechanicLng = parseFloat(mechanic.direccion_fisica.longitud);
          } else if (mechanic.ubicacion) {
            // Si tiene ubicación GeoDjango
            if (typeof mechanic.ubicacion === 'object' && mechanic.ubicacion.coordinates) {
              mechanicLng = parseFloat(mechanic.ubicacion.coordinates[0]);
              mechanicLat = parseFloat(mechanic.ubicacion.coordinates[1]);
            }
          }

          if (mechanicLat && mechanicLng && !isNaN(mechanicLat) && !isNaN(mechanicLng)) {
            // Calcular distancia (Haversine)
            const distance = calculateDistance(
              coords.latitude,
              coords.longitude,
              mechanicLat,
              mechanicLng
            );

            // Asignar distancia en múltiples campos para compatibilidad con diferentes componentes
            mechanic.distancia_km = distance;
            mechanic.distance = distance; // Campo usado por NearbyMecanicoCard
            mechanic.distancia = distance; // Campo alternativo

            console.log(`📏 Distancia calculada para mecánico ${mechanic.id} (${mechanic.nombre}): ${distance.toFixed(2)}km`);

            // FILTRO 2: Verificar radio de cobertura del mecánico
            const radioCobertura = mechanic.radio_cobertura || mechanic.radioCobertura || null;

            if (radioCobertura && typeof radioCobertura === 'number' && radioCobertura > 0) {
              if (distance > radioCobertura) {
                console.log(`❌ Mecánico ${mechanic.id} (${mechanic.nombre}) está fuera del radio de cobertura: ${distance.toFixed(2)}km > ${radioCobertura}km`);
                shouldInclude = false;
              }
            }
          } else {
            // Si no tiene coordenadas, usar distancia del backend si está disponible
            if (mechanic.distance !== undefined && mechanic.distance !== null) {
              const backendDistance = typeof mechanic.distance === 'number' ? mechanic.distance : parseFloat(mechanic.distance);
              mechanic.distancia_km = backendDistance;
              mechanic.distance = backendDistance;
              mechanic.distancia = backendDistance;
              console.log(`📏 Usando distancia del backend para mecánico ${mechanic.id}: ${backendDistance.toFixed(2)}km`);
            } else {
              console.warn(`⚠️ Mecánico ${mechanic.id} (${mechanic.nombre}) no tiene coordenadas ni distancia del backend`);
            }
          }

          if (shouldInclude) {
            filteredMechanics.push(mechanic);
          }
        }
      }

      // Ordenar por distancia
      filteredMechanics.sort((a, b) => {
        const distA = a.distancia_km || Infinity;
        const distB = b.distancia_km || Infinity;
        return distA - distB;
      });

      console.log(`✅ Mecánicos filtrados: ${filteredMechanics.length} de ${allMechanics.length} (filtrados por zonas de servicio y radio de cobertura)`);
      console.log(`📊 Resumen de filtrado:`);
      console.log(`   - Total mecánicos obtenidos: ${allMechanics.length}`);
      console.log(`   - Comuna del usuario: ${userCommune || 'NO DETECTADA'}`);
      console.log(`   - Mecánicos después de filtrado: ${filteredMechanics.length}`);
      console.log(`   - Coordenadas usuario: ${coords ? `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}` : 'NO DISPONIBLES'}`);

      // Verificar que las distancias se calcularon correctamente
      const mecanicosConDistancia = filteredMechanics.filter(m => m.distance !== undefined && m.distance !== null).length;
      console.log(`   - Mecánicos con distancia calculada: ${mecanicosConDistancia} de ${filteredMechanics.length}`);

      // Mostrar distancias de los primeros 3 mecánicos para verificación
      if (filteredMechanics.length > 0) {
        const primerosMecanicos = filteredMechanics.slice(0, 3);
        primerosMecanicos.forEach(m => {
          console.log(`   - ${m.nombre}: distancia = ${m.distance !== undefined ? m.distance.toFixed(2) + 'km' : 'NO CALCULADA'}`);
        });
      }

      // Log detallado de mecánicos excluidos
      const excludedCount = allMechanics.length - filteredMechanics.length;
      if (excludedCount > 0) {
        console.log(`   - Mecánicos excluidos: ${excludedCount}`);
      }
    } else {
      // Si no hay coordenadas, aplicar el mismo filtro de zonas de servicio
      // pero sin calcular distancias ni verificar radio de cobertura
      for (const mechanic of allMechanics) {
        let shouldInclude = true;

        // REGLA ESTRICTA: Solo incluir mecánicos con zonas de servicio configuradas
        if (!mechanic.zonas_servicio || !Array.isArray(mechanic.zonas_servicio) || mechanic.zonas_servicio.length === 0) {
          // Sin zonas configuradas - EXCLUIR (regla estricta)
          shouldInclude = false;
        } else if (userCommune) {
          // Si hay comuna, verificar match con zonas
          const zonasActivas = mechanic.zonas_servicio.filter(z => z.activa && z.comunas && Array.isArray(z.comunas) && z.comunas.length > 0);

          if (zonasActivas.length > 0) {
            const hasMatchingZone = zonasActivas.some(zona => {
              return zona.comunas.some(communeName => {
                const normalizedZoneCommune = normalizeCommuneName(communeName);
                return normalizedZoneCommune === userCommune;
              });
            });

            if (!hasMatchingZone) {
              shouldInclude = false;
            }
          }
        }
        // Si no hay comuna pero el mecánico tiene zonas, incluirlo (mejor que no mostrar nada)

        if (shouldInclude) {
          filteredMechanics.push(mechanic);
        }
      }
    }

    return filteredMechanics;
  } catch (error) {
    console.error('Error obteniendo mecánicos para vehículos del usuario:', error);
    return [];
  }
};

/**
 * Obtiene talleres cercanos con información de distancia
 * @param {string|Object} address - Dirección del usuario (puede ser string o objeto)
 * @param {number} radius - Radio de búsqueda en km
 * @returns {Promise<Array>} Lista de talleres cercanos
 */
export const getTalleresRealmenteCercanos = async (address, radius = 10) => {
  try {
    if (!address) {
      console.log('No se proporcionó dirección para buscar talleres cercanos');
      return [];
    }

    // Extraer la dirección como string si es un objeto
    let addressString = address;
    if (typeof address === 'object' && address.direccion) {
      addressString = address.direccion;
    } else if (typeof address === 'object' && address.address) {
      addressString = address.address;
    }

    // Geocodificar la dirección
    const coords = await locationService.geocodeAddress(addressString);
    if (!coords) {
      console.log('No se pudo geocodificar la dirección');
      return [];
    }

    const response = await get('/usuarios/talleres/cerca/', {
      lat: coords.latitude,
      lng: coords.longitude,
      dist: radius,
      ordenar_por: 'distancia'
    });

    return response.results || response || [];
  } catch (error) {
    console.error('Error obteniendo talleres cercanos:', error);
    return [];
  }
};

/**
 * Obtiene mecánicos cercanos con información de distancia
 * @param {string|Object} address - Dirección del usuario (puede ser string o objeto)
 * @param {number} radius - Radio de búsqueda en km
 * @returns {Promise<Array>} Lista de mecánicos cercanos
 */
export const getMecanicosRealmenteCercanos = async (address, radius = 10) => {
  try {
    if (!address) {
      console.log('No se proporcionó dirección para buscar mecánicos cercanos');
      return [];
    }

    // Extraer la dirección como string si es un objeto
    let addressString = address;
    if (typeof address === 'object' && address.direccion) {
      addressString = address.direccion;
    } else if (typeof address === 'object' && address.address) {
      addressString = address.address;
    }

    // Geocodificar la dirección
    const coords = await locationService.geocodeAddress(addressString);
    if (!coords) {
      console.log('No se pudo geocodificar la dirección');
      return [];
    }

    const response = await get('/usuarios/mecanicos-domicilio/cerca/', {
      lat: coords.latitude,
      lng: coords.longitude,
      dist: radius,
      ordenar_por: 'distancia'
    });

    return response.results || response || [];
  } catch (error) {
    console.error('Error obteniendo mecánicos cercanos:', error);
    return [];
  }
};

/**
 * Obtiene talleres cercanos por coordenadas
 * @param {number} lat - Latitud
 * @param {number} lng - Longitud
 * @param {number} radius - Radio de búsqueda en km
 * @returns {Promise<Array>} Lista de talleres cercanos
 */
export const getNearbyWorkshops = async (lat, lng, radius = 10) => {
  try {
    const response = await get('/usuarios/talleres/cerca/', {
      lat: lat,
      lng: lng,
      dist: radius,
      ordenar_por: 'distancia'
    });

    return response.results || response || [];
  } catch (error) {
    console.error('Error obteniendo talleres cercanos por coordenadas:', error);
    return [];
  }
};

/**
 * Obtiene mecánicos cercanos por coordenadas
 * @param {number} lat - Latitud
 * @param {number} lng - Longitud
 * @param {number} radius - Radio de búsqueda en km
 * @returns {Promise<Array>} Lista de mecánicos cercanos
 */
export const getNearbyMechanics = async (lat, lng, radius = 10) => {
  try {
    const response = await get('/usuarios/mecanicos-domicilio/cerca/', {
      lat: lat,
      lng: lng,
      dist: radius,
      ordenar_por: 'distancia'
    });

    return response.results || response || [];
  } catch (error) {
    console.error('Error obteniendo mecánicos cercanos por coordenadas:', error);
    return [];
  }
};

/**
 * Obtiene talleres por modelo de vehículo
 * @param {number} modeloId - ID del modelo
 * @returns {Promise<Array>} Lista de talleres compatibles
 */
export const getWorkshopsByModelo = async (modeloId) => {
  try {
    const response = await get('/usuarios/talleres/', {
      modelo: modeloId,
      especialidades: true
    });

    return response.results || response || [];
  } catch (error) {
    console.error('Error obteniendo talleres por modelo:', error);
    return [];
  }
};

/**
 * Obtiene mecánicos por modelo de vehículo
 * @param {number} modeloId - ID del modelo
 * @returns {Promise<Array>} Lista de mecánicos compatibles
 */
export const getMechanicsByModelo = async (modeloId) => {
  try {
    const response = await get('/usuarios/mecanicos-domicilio/', {
      modelo: modeloId,
      especialidades: true
    });

    return response.results || response || [];
  } catch (error) {
    console.error('Error obteniendo mecánicos por modelo:', error);
    return [];
  }
};

/**
 * Obtiene todos los talleres disponibles
 * @returns {Promise<Array>} Lista de talleres
 */
export const getTalleres = async () => {
  try {
    const response = await get('/usuarios/talleres/');
    return response.results || response || [];
  } catch (error) {
    console.error('Error obteniendo talleres:', error);
    return [];
  }
};

/**
 * Obtiene todos los mecánicos disponibles
 * @returns {Promise<Array>} Lista de mecánicos
 */
export const getMecanicos = async () => {
  try {
    const response = await get('/usuarios/mecanicos-domicilio/');
    return response.results || response || [];
  } catch (error) {
    console.error('Error obteniendo mecánicos:', error);
    return [];
  }
};

/**
 * Obtiene información detallada de un taller
 * @param {number} tallerId - ID del taller
 * @returns {Promise<Object>} Información del taller
 */
export const getTallerDetalle = async (tallerId) => {
  try {
    const response = await get(`/usuarios/talleres/${tallerId}/`);
    return response;
  } catch (error) {
    console.error('Error obteniendo detalle del taller:', error);
    return null;
  }
};

/**
 * Obtiene información detallada de un mecánico
 * @param {number} mecanicoId - ID del mecánico
 * @returns {Promise<Object>} Información del mecánico
 */
export const getMecanicoDetalle = async (mecanicoId) => {
  try {
    const response = await get(`/usuarios/mecanicos-domicilio/${mecanicoId}/`);
    return response;
  } catch (error) {
    console.error('Error obteniendo detalle del mecánico:', error);
    return null;
  }
};

/**
 * Busca proveedores por término de búsqueda
 * @param {string} termino - Término de búsqueda
 * @param {string} tipo - 'taller' o 'mecanico' o 'todos'
 * @returns {Promise<Object>} Objeto con talleres y mecánicos encontrados
 */
export const buscarProveedores = async (termino, tipo = 'todos') => {
  try {
    let talleres = [];
    let mecanicos = [];

    if (tipo === 'todos' || tipo === 'taller') {
      const talleresResponse = await get('/usuarios/talleres/', { search: termino });
      talleres = talleresResponse.results || talleresResponse || [];
    }

    if (tipo === 'todos' || tipo === 'mecanico') {
      const mecanicosResponse = await get('/usuarios/mecanicos-domicilio/', { search: termino });
      mecanicos = mecanicosResponse.results || mecanicosResponse || [];
    }

    return { talleres, mecanicos };
  } catch (error) {
    console.error('Error buscando proveedores:', error);
    return { talleres: [], mecanicos: [] };
  }
};

/**
 * Obtiene las reseñas detalladas de un proveedor
 * @param {number} providerId - ID del proveedor
 * @param {string} providerType - Tipo ('taller' o 'mecanico')
 * @returns {Promise<Object>} Resumen de reseñas y lista
 */
export const getProviderReviews = async (providerId, providerType) => {
  try {
    // Usar el endpoint unificado que maneja ambos tipos de proveedores y retorna el resumen
    const endpoint = `/usuarios/providers/${providerId}/reviews/`;

    const response = await get(endpoint);
    return response;
  } catch (error) {
    console.error('Error fetching provider reviews:', error);
    throw error;
  }
};

export default {
  getProvidersByVehiculo,
  getProvidersByVehiculoAndService,
  getProvidersByServicioOnly,
  getWorkshopsForUserVehicles,
  getMechanicsForUserVehicles,
  getTalleresRealmenteCercanos,
  getMecanicosRealmenteCercanos,
  getNearbyWorkshops,
  getNearbyMechanics,
  getWorkshopsByModelo,
  getMechanicsByModelo,
  getTalleres,
  getMecanicos,
  getTallerDetalle,
  getMecanicoDetalle,
  buscarProveedores,
  getProviderReviews
}; 