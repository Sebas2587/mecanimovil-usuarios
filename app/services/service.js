import { get } from './api';
import { getMediaURL } from './api';
import { Platform } from 'react-native';

/**
 * Servicios relacionados con la aplicación de clientes
 * Ahora usa configuración dinámica automática
 */

/**
 * Obtiene la URL completa de una imagen
 * @param {string} imagePath - Ruta de la imagen
 * @returns {Promise<string>} URL completa de la imagen
 */
export const getImageUrl = async (imagePath) => {
  return await getMediaURL(imagePath);
};

/**
 * Obtiene todos los servicios disponibles
 * @returns {Promise<Array>} Lista de servicios
 */
export const getServices = async () => {
  try {
    const response = await get('/servicios/');
    return response.results || response;
  } catch (error) {
    console.error('Error obteniendo servicios:', error);
    return [];
  }
};

/**
 * Obtiene servicios disponibles para un vehículo específico por su modelo
 * @param {number} vehiculoId - ID del vehículo
 * @returns {Promise<Array>} Lista de servicios disponibles para el vehículo
 */
export const getServicesByVehiculo = async (vehiculoId) => {
  const vehicleResponse = await get(`/vehiculos/${vehiculoId}/`);
  if (!vehicleResponse || !vehicleResponse.modelo) {
    console.log(`Vehículo ${vehiculoId} no encontrado o sin modelo`);
    return [];
  }

  const response = await get('/servicios/servicios/por_modelo/', { modelo: vehicleResponse.modelo });
  return Array.isArray(response) ? response : (response?.results ?? []);
};

/**
 * Obtiene servicios disponibles para una marca específica
 * @param {number} marcaId - ID de la marca
 * @returns {Promise<Array>} Lista de servicios disponibles para la marca
 */
export const getServicesByMarca = async (marcaId) => {
  try {
    // Obtener modelos de la marca
    const modelos = await get('/vehiculos/modelos/', { marca: marcaId });
    if (!modelos || modelos.length === 0) {
      console.log(`No se encontraron modelos para la marca ${marcaId}`);
      return [];
    }
    
    // Obtener servicios para todos los modelos de la marca
    const allServices = [];
    const serviceIds = new Set();
    
    for (const modelo of modelos) {
      try {
        const serviciosModelo = await get('/servicios/servicios/por_modelo/', { modelo: modelo.id });
        if (serviciosModelo && Array.isArray(serviciosModelo)) {
          serviciosModelo.forEach(servicio => {
            if (!serviceIds.has(servicio.id)) {
              serviceIds.add(servicio.id);
              allServices.push(servicio);
            }
          });
        }
      } catch (error) {
        console.error(`Error obteniendo servicios para modelo ${modelo.id}:`, error);
      }
    }
    
    return allServices;
  } catch (error) {
    console.error(`Error obteniendo servicios para marca ${marcaId}:`, error);
    return [];
  }
};

/**
 * Obtiene los talleres disponibles
 * @returns {Promise<Array>} Lista de talleres
 */
export const getTalleres = async () => {
  try {
    const response = await get('/usuarios/talleres/');
    return response.results || response;
  } catch (error) {
    console.error('Error obteniendo talleres:', error);
    return [];
  }
};

/**
 * Obtiene los mecánicos a domicilio disponibles
 * @returns {Promise<Array>} Lista de mecánicos
 */
export const getMecanicosDomicilio = async () => {
  try {
    const response = await get('/usuarios/mecanicos-domicilio/');
    return response.results || response;
  } catch (error) {
    console.error('Error obteniendo mecánicos a domicilio:', error);
    return [];
  }
};

/**
 * Obtiene las categorías de servicios
 * @returns {Promise<Array>} Lista de categorías
 */
export const getCategorias = async () => {
  try {
    const response = await get('/servicios/categorias/');
    return response.results || response;
  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    return [];
  }
};

/**
 * Obtiene información de un servicio específico
 * @param {number} servicioId - ID del servicio
 * @returns {Promise<Object>} Información del servicio
 */
export const getServicioDetalle = async (servicioId) => {
  try {
    const response = await get(`/servicios/${servicioId}/`);
    return response;
  } catch (error) {
    console.error('Error obteniendo detalle del servicio:', error);
    return null;
  }
};

/**
 * Detalle de servicio por ID (ruta que usa el backend: servicios/servicios/:id/)
 * Necesario porque GET /servicios/ suele ser paginado y no devuelve todos en una sola respuesta.
 */
export const getServicioPorIdNested = async (servicioId) => {
  try {
    const response = await get(`/servicios/servicios/${servicioId}/`);
    return response;
  } catch (error) {
    console.error('Error obteniendo servicio por id (nested):', error);
    return null;
  }
};

/** Detalle público de servicio (flujo invitado / AllowAny). */
export const getServicioDetallePublico = async (servicioId) => {
  if (servicioId == null || servicioId === '') return null;
  try {
    return await get(
      `/servicios/servicios/${servicioId}/`,
      {},
      { requiresAuth: false },
    );
  } catch (error) {
    console.error('Error obteniendo servicio público:', error);
    return null;
  }
};

/** OfertaServicioSerializer: `taller`/`mecanico` son IDs; el objeto viene en `*_info`. */
function resolveOfertaProviderPublico(oferta) {
  const tallerInfo = oferta?.taller_info;
  const mecanicoInfo = oferta?.mecanico_info;
  if (tallerInfo && typeof tallerInfo === 'object' && tallerInfo.id != null) {
    return { provider: tallerInfo, providerType: 'taller' };
  }
  if (mecanicoInfo && typeof mecanicoInfo === 'object' && mecanicoInfo.id != null) {
    return { provider: mecanicoInfo, providerType: 'mecanico' };
  }
  // Payload ya normalizado (mas_solicitados / buscar)
  if (oferta?.provider?.id) {
    return {
      provider: oferta.provider,
      providerType: oferta.provider_type === 'mecanico' ? 'mecanico' : 'taller',
    };
  }
  return { provider: null, providerType: null };
}

function coberturaFromOfertaSerializer(oferta, provider) {
  if (oferta?.cobertura_vehiculo) return oferta.cobertura_vehiculo;
  const marca = oferta?.marca_vehiculo_info;
  const modelo = oferta?.modelo_vehiculo_info;
  if (marca?.nombre) {
    return {
      alcance: 'marca',
      marca_nombre: marca.nombre,
      modelo_nombre: modelo?.nombre || null,
      marcas_nombres: [],
    };
  }
  const coberturaTipo = provider?.tipo_cobertura_marca;
  if (coberturaTipo === 'multimarca') {
    return {
      alcance: 'multimarca',
      marca_nombre: null,
      modelo_nombre: null,
      marcas_nombres: [],
    };
  }
  const marcasNombres = Array.isArray(provider?.marcas_atendidas_nombres)
    ? provider.marcas_atendidas_nombres
    : Array.isArray(provider?.marcas_atendidas)
      ? provider.marcas_atendidas.map((m) => m?.nombre || m).filter(Boolean)
      : [];
  return {
    alcance: 'especialista',
    marca_nombre: null,
    modelo_nombre: null,
    marcas_nombres: marcasNombres,
  };
}

/**
 * Ofertas públicas de un servicio → shape de “grupo” para GuestServiceOfferScreen
 * (mismo contrato que mas_solicitados / GuestLanding).
 * `marcaId` opcional: acota ofertas a la marca del vehículo del usuario logueado.
 */
export const getServicioOfertasPublicasGroup = async (servicioId, { marcaId = null } = {}) => {
  if (servicioId == null || servicioId === '') return null;
  try {
    const params = {};
    if (marcaId != null && marcaId !== '') params.marca = marcaId;

    const [detalle, ofertasRaw] = await Promise.all([
      getServicioDetallePublico(servicioId),
      get(`/servicios/servicios/${servicioId}/ofertas/`, params, { requiresAuth: false }),
    ]);
    const ofertasList = Array.isArray(ofertasRaw)
      ? ofertasRaw
      : Array.isArray(ofertasRaw?.results)
        ? ofertasRaw.results
        : [];

    const ofertas = [];
    const precios = [];
    const providersUnicos = new Set();
    for (const oferta of ofertasList) {
      if (!oferta?.disponible && oferta?.disponible !== undefined) continue;
      const { provider, providerType } = resolveOfertaProviderPublico(oferta);
      if (!provider?.id || !providerType) continue;

      const precio = Number(
        oferta.precio_publicado_cliente
        || oferta.precio_sin_repuestos
        || oferta.precio_con_repuestos
        || oferta.precio
        || 0,
      );
      if (precio > 0) precios.push(precio);
      providersUnicos.add(`${providerType}-${provider.id}`);
      ofertas.push({
        oferta_id: oferta.id,
        servicio_id: Number(servicioId),
        nombre:
          detalle?.nombre
          || oferta.servicio_info?.nombre
          || oferta.servicio_nombre
          || 'Servicio',
        precio,
        precio_publicado_cliente: Number(oferta.precio_publicado_cliente || precio || 0),
        tipo_servicio: oferta.tipo_servicio || 'sin_repuestos',
        provider: {
          id: provider.id,
          nombre: provider.nombre,
          foto_perfil: provider.foto_perfil || provider.foto_perfil_url,
          foto_perfil_url: provider.foto_perfil_url || provider.foto_perfil,
          calificacion_promedio: provider.calificacion_promedio,
          direccion: provider.direccion,
          verificado: provider.verificado,
          tipo_cobertura_marca: provider.tipo_cobertura_marca,
          marcas_atendidas_nombres: provider.marcas_atendidas_nombres,
        },
        provider_type: providerType,
        cobertura_vehiculo: coberturaFromOfertaSerializer(oferta, provider),
      });
    }

    if (ofertas.length === 0) return null;

    return {
      servicio_id: Number(servicioId),
      nombre: detalle?.nombre || 'Servicio',
      foto: detalle?.foto || null,
      fotos_servicio: detalle?.foto ? [{ imagen_url: detalle.foto }] : [],
      precio_desde: precios.length ? Math.min(...precios) : null,
      precio_hasta: precios.length ? Math.max(...precios) : null,
      total_proveedores: providersUnicos.size,
      ofertas,
    };
  } catch (error) {
    console.error('Error obteniendo ofertas públicas del servicio:', error);
    return null;
  }
};

/**
 * Busca servicios por término
 * @param {string} termino - Término de búsqueda
 * @returns {Promise<Array>} Lista de servicios que coinciden con la búsqueda
 */
export const buscarServicios = async (termino) => {
  try {
    const response = await get('/servicios/buscar/', { q: termino });
    return response.results || response || [];
  } catch (error) {
    console.error('Error buscando servicios:', error);
    return [];
  }
};

/**
 * Servicios realmente más solicitados (demanda histórica agregada), con todas
 * las ofertas/precios de cada taller o mecánico disponible para ese servicio.
 * Público (AllowAny) — usado en la landing de invitado.
 * @param {number} [limit=12]
 * @returns {Promise<Array<{servicio_id:number, nombre:string, total_solicitudes:number, precio_desde:number|null, precio_hasta:number|null, ofertas:Array}>>}
 */
/**
 * `marcaId` opcional: acota la demanda a lo que realmente pidieron otros dueños de esa
 * marca (usuarios logueados con vehículo registrado), en vez del ranking global genérico.
 */
export const getServiciosMasSolicitados = async (limit = 12, marcaId = null) => {
  try {
    const params = { limit };
    if (marcaId != null && marcaId !== '') params.marca_id = marcaId;
    const response = await get(
      '/servicios/servicios/mas_solicitados/',
      params,
      { requiresAuth: false },
    );
    return Array.isArray(response) ? response : [];
  } catch (error) {
    console.error('Error obteniendo servicios más solicitados:', error);
    return [];
  }
};

/** Búsqueda pública de servicios (flujo invitado, AllowAny). */
export const buscarServiciosPublico = async (termino) => {
  if (!termino || !String(termino).trim()) return [];
  try {
    const response = await get(
      '/servicios/buscar/',
      { q: String(termino).trim() },
      { requiresAuth: false },
    );
    return response.results || response || [];
  } catch (error) {
    console.error('Error buscando servicios (público):', error);
    return [];
  }
};

/**
 * Obtiene los servicios más escogidos/populares para un vehículo específico
 * @param {number} vehiculoId - ID del vehículo
 * @returns {Promise<Array>} Lista de servicios más populares para el vehículo
 */
export const getPopularServicesByVehicle = async (vehiculoId) => {
  try {
    console.log(`🔥 Obteniendo servicios más escogidos para vehículo ${vehiculoId}`);
    
    // Obtener información del vehículo
    const vehicleResponse = await get(`/vehiculos/${vehiculoId}/`);
    if (!vehicleResponse || !vehicleResponse.modelo) {
      console.log(`Vehículo ${vehiculoId} no encontrado o sin modelo`);
      return [];
    }
    
    // Obtener servicios más populares por modelo
    const response = await get('/servicios/servicios/populares/', { 
      modelo: vehicleResponse.modelo,
      marca: vehicleResponse.marca,
      limit: 10 
    });
    
    if (response && Array.isArray(response)) {
      console.log(`🔥 ${response.length} servicios populares encontrados`);
      return response;
    } else {
      console.log('🔥 No se encontraron servicios populares, usando servicios regulares');
      // Fallback: usar servicios regulares si no hay populares
      return await getServicesByVehiculo(vehiculoId);
    }
  } catch (error) {
    console.error(`Error obteniendo servicios populares para vehículo ${vehiculoId}:`, error);
    // Fallback: usar servicios regulares en caso de error
    return await getServicesByVehiculo(vehiculoId);
  }
};

export default {
  getImageUrl,
  getServices,
  getServicesByVehiculo,
  getServicesByMarca,
  getTalleres,
  getMecanicosDomicilio,
  getCategorias,
  getServicioDetalle,
  getServicioPorIdNested,
  buscarServicios,
  getPopularServicesByVehicle
}; 