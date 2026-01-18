import { get, post, put, patch, delete_ } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Servicio para gestionar solicitudes públicas de servicios
 */
class SolicitudesService {
  /**
   * Crea una nueva solicitud de servicio
   * @param {Object} solicitudData - Datos de la solicitud
   * @returns {Promise<Object>} Solicitud creada
   */
  async crearSolicitud(solicitudData) {
    try {
      console.log('SolicitudesService: Creando nueva solicitud:', solicitudData);
      const data = await post('/ordenes/solicitudes-publicas/', solicitudData);
      console.log('SolicitudesService: Solicitud creada:', data);
      
      // Normalizar: extraer properties de GeoJSON Feature si aplica
      if (data && data.type === 'Feature' && data.properties) {
        return {
          ...data.properties,
          id: data.id || data.properties.id,
          geometry: data.geometry
        };
      }
      return data;
    } catch (error) {
      console.error('SolicitudesService: Error al crear solicitud:', error);
      throw error;
    }
  }

  /**
   * Obtiene servicios sugeridos basados en vehículo y descripción
   * @param {string} solicitudId - ID de la solicitud
   * @returns {Promise<Object>} Servicios sugeridos
   */
  async obtenerServiciosSugeridos(solicitudId) {
    try {
      console.log('SolicitudesService: Obteniendo servicios sugeridos para solicitud:', solicitudId);
      const data = await post(`/ordenes/solicitudes-publicas/${solicitudId}/sugerir_servicios/`);
      console.log('SolicitudesService: Servicios sugeridos obtenidos:', data);
      return data;
    } catch (error) {
      console.error('SolicitudesService: Error al obtener servicios sugeridos:', error);
      throw error;
    }
  }

  /**
   * Agrega servicios seleccionados a una solicitud
   * @param {string} solicitudId - ID de la solicitud
   * @param {Array<number>} serviciosIds - IDs de los servicios a agregar
   * @returns {Promise<Object>} Solicitud actualizada
   */
  async agregarServiciosASolicitud(solicitudId, serviciosIds) {
    try {
      console.log('SolicitudesService: Agregando servicios a solicitud:', solicitudId, serviciosIds);
      const data = await post(`/ordenes/solicitudes-publicas/${solicitudId}/agregar_servicios/`, {
        servicios: serviciosIds
      });
      console.log('SolicitudesService: Servicios agregados:', data);
      return data;
    } catch (error) {
      console.error('SolicitudesService: Error al agregar servicios:', error);
      throw error;
    }
  }

  /**
   * Publica una solicitud para que los proveedores puedan ofertar
   * @param {string} solicitudId - ID de la solicitud
   * @returns {Promise<Object>} Solicitud publicada
   */
  async publicarSolicitud(solicitudId) {
    try {
      console.log('SolicitudesService: Publicando solicitud:', solicitudId);
      const data = await post(`/ordenes/solicitudes-publicas/${solicitudId}/publicar/`);
      console.log('SolicitudesService: Solicitud publicada:', data);
      
      // Normalizar: extraer properties de GeoJSON Feature si aplica
      if (data && data.type === 'Feature' && data.properties) {
        return {
          ...data.properties,
          id: data.id || data.properties.id,
          geometry: data.geometry
        };
      }
      return data;
    } catch (error) {
      console.error('SolicitudesService: Error al publicar solicitud:', error);
      throw error;
    }
  }

  /**
   * Obtiene todas las solicitudes del usuario autenticado
   * @param {Object} filtros - Filtros opcionales (estado, fecha, etc.)
   * @returns {Promise<Array>} Lista de solicitudes
   */
  async obtenerMisSolicitudes(filtros = {}) {
    try {
      console.log('SolicitudesService: Obteniendo mis solicitudes con filtros:', filtros);
      const queryParams = new URLSearchParams();
      Object.keys(filtros).forEach(key => {
        if (filtros[key] !== null && filtros[key] !== undefined) {
          queryParams.append(key, filtros[key]);
        }
      });
      const queryString = queryParams.toString();
      // Construir URL correctamente: base + query params si existen
      const baseUrl = '/ordenes/solicitudes-publicas/';
      const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;
      const data = await get(url);
      console.log('SolicitudesService: Solicitudes obtenidas:', data);
      
      // Normalizar solicitudes: extraer properties de GeoJSON Features
      const normalizarSolicitud = (solicitud) => {
        // Si es un GeoJSON Feature, extraer properties y combinar con id
        if (solicitud && solicitud.type === 'Feature' && solicitud.properties) {
          // El ID puede estar en el nivel raíz (solicitud.id) o en properties.id
          const id = solicitud.id || solicitud.properties.id;
          if (!id) {
            console.warn('SolicitudesService: Solicitud Feature sin ID:', solicitud);
          }
          return {
            ...solicitud.properties,
            id: id, // Asegurar que el ID esté siempre en el nivel raíz
            geometry: solicitud.geometry
          };
        }
        // Si ya es un objeto normal pero tiene properties, normalizar también
        if (solicitud && !solicitud.id && solicitud.properties && solicitud.properties.id) {
          return {
            ...solicitud.properties,
            id: solicitud.properties.id,
            geometry: solicitud.geometry
          };
        }
        // Si ya es un objeto normal, devolverlo tal cual
        return solicitud;
      };
      
      // Manejar diferentes estructuras de respuesta
      let solicitudesArray = [];
      if (Array.isArray(data)) {
        solicitudesArray = data;
      } else if (data.results) {
        // Si results es un FeatureCollection, extraer features
        if (data.results.type === 'FeatureCollection' && Array.isArray(data.results.features)) {
          solicitudesArray = data.results.features;
        } else if (Array.isArray(data.results)) {
          solicitudesArray = data.results;
        } else if (data.results.features && Array.isArray(data.results.features)) {
          solicitudesArray = data.results.features;
        }
      } else if (data.data) {
        solicitudesArray = Array.isArray(data.data) ? data.data : [];
      }
      
      // Normalizar todas las solicitudes para extraer properties de GeoJSON Features
      const solicitudesNormalizadas = solicitudesArray.map(normalizarSolicitud);
      console.log('SolicitudesService: Solicitudes normalizadas (primeras 2):', solicitudesNormalizadas.slice(0, 2).map(s => ({ id: s?.id, tieneId: !!s?.id })));
      return solicitudesNormalizadas;
    } catch (error) {
      console.error('SolicitudesService: Error al obtener mis solicitudes:', error);
      if (error.status === 404) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Verifica si el cliente puede crear una nueva solicitud
   * @returns {Promise<Object>} {puede_crear: bool, razon: string (opcional), solicitudes_pendientes: number, ofertas_secundarias_pendientes: number, error: boolean}
   */
  async puedeCrearSolicitud() {
    try {
      // Verificar autenticación antes de hacer la llamada
      const token = await AsyncStorage.getItem('auth_token');
      
      // Si no hay token o es un token temporal, permitir crear (usuario no autenticado puede necesitar crear cuenta primero)
      if (!token || token === "usuario_registrado_exitosamente") {
        return {
          puede_crear: true,
          solicitudes_pendientes: 0,
          ofertas_secundarias_pendientes: 0,
          total_pendientes: 0,
          error: false
        };
      }
      
      console.log('SolicitudesService: Verificando si puede crear solicitud');
      const data = await get('/ordenes/solicitudes-publicas/puede-crear-solicitud/');
      console.log('SolicitudesService: Resultado verificación:', data);
      return {
        ...data,
        error: false
      };
    } catch (error) {
      // Si es un error 401 (no autenticado), permitir crear
      if (error.status === 401 || error.status === 403) {
        return {
          puede_crear: true,
          solicitudes_pendientes: 0,
          ofertas_secundarias_pendientes: 0,
          total_pendientes: 0,
          error: false
        };
      }
      
      // Si es un error 404, intentar validación alternativa usando solicitudes activas
      if (error.status === 404) {
        console.log('ℹ️ SolicitudesService: Endpoint puede-crear-solicitud no disponible (404). Usando validación alternativa.');
        try {
          // Validación alternativa: obtener solicitudes activas y verificar manualmente
          const solicitudesActivas = await this.obtenerSolicitudesActivas();
          
          // Filtrar solicitudes adjudicadas o pendientes de pago
          const solicitudesPendientes = solicitudesActivas.filter(s => {
            const estado = s.estado || s.properties?.estado;
            const tieneOfertaSeleccionada = s.oferta_seleccionada || s.properties?.oferta_seleccionada;
            
            return (estado === 'adjudicada' || estado === 'pendiente_pago') && tieneOfertaSeleccionada;
          });

          // Verificar ofertas secundarias pendientes
          let ofertasSecundariasPendientes = 0;
          for (const solicitud of solicitudesActivas) {
            const ofertasSecundarias = solicitud.ofertas_secundarias || solicitud.properties?.ofertas_secundarias || [];
            const pendientes = ofertasSecundarias.filter((oferta) => {
              const estado = oferta.estado;
              return (estado === 'aceptada' || estado === 'pendiente_pago');
            });
            ofertasSecundariasPendientes += pendientes.length;
          }

          const totalPendientes = solicitudesPendientes.length + ofertasSecundariasPendientes;
          const puedeCrear = totalPendientes === 0;

          let razon = null;
          if (!puedeCrear) {
            const razones = [];
            if (solicitudesPendientes.length > 0) {
              razones.push(`${solicitudesPendientes.length} solicitud(es) principal(es) pendiente(s) de pago`);
            }
            if (ofertasSecundariasPendientes > 0) {
              razones.push(`${ofertasSecundariasPendientes} servicio(s) adicional(es) pendiente(s) de pago`);
            }
            razon = `Tienes ${razones.join(' y ')}. Por favor, completa el pago de tus servicios antes de crear una nueva solicitud.`;
          }

          console.log('✅ SolicitudesService: Validación alternativa completada exitosamente:', {
            puede_crear: puedeCrear,
            solicitudes_pendientes: solicitudesPendientes.length,
            ofertas_secundarias_pendientes: ofertasSecundariasPendientes,
            total_pendientes: totalPendientes
          });

          return {
            puede_crear: puedeCrear,
            solicitudes_pendientes: solicitudesPendientes.length,
            ofertas_secundarias_pendientes: ofertasSecundariasPendientes,
            total_pendientes: totalPendientes,
            razon: razon,
            error: false // No es un error, validación alternativa exitosa
          };
        } catch (altError) {
          console.error('❌ SolicitudesService: Error en validación alternativa:', altError);
          // Si la validación alternativa también falla, permitir crear pero informar
          return {
            puede_crear: true,
            solicitudes_pendientes: 0,
            ofertas_secundarias_pendientes: 0,
            total_pendientes: 0,
            error: true,
            mensaje: 'No se pudo verificar si puedes crear una solicitud. Por favor, verifica manualmente que no tengas solicitudes pendientes de pago.'
          };
        }
      }
      
      // En caso de otros errores (no 404), mostrar como error real
      console.error('❌ SolicitudesService: Error verificando si puede crear solicitud:', error);
      return {
        puede_crear: true,
        solicitudes_pendientes: 0,
        ofertas_secundarias_pendientes: 0,
        total_pendientes: 0,
        error: true,
        mensaje: 'No se pudo verificar si puedes crear una solicitud. Por favor, verifica que no tengas solicitudes pendientes de pago.'
      };
    }
  }

  /**
   * Obtiene las solicitudes activas del cliente
   * @returns {Promise<Array>} Lista de solicitudes activas
   */
  async obtenerSolicitudesActivas() {
    try {
      // Verificar autenticación antes de hacer la llamada
      const token = await AsyncStorage.getItem('auth_token');
      
      // Si no hay token o es un token temporal, retornar array vacío silenciosamente
      if (!token || token === "usuario_registrado_exitosamente") {
        return [];
      }
      
      console.log('SolicitudesService: Obteniendo solicitudes activas');
      const data = await get('/ordenes/solicitudes-publicas/activas/');
      console.log('SolicitudesService: Solicitudes activas obtenidas:', data);
      
      // Normalizar solicitudes: extraer properties de GeoJSON Features
      const normalizarSolicitud = (solicitud) => {
        // Si es un GeoJSON Feature, extraer properties y combinar con id
        if (solicitud && solicitud.type === 'Feature' && solicitud.properties) {
          // El ID puede estar en el nivel raíz (solicitud.id) o en properties.id
          const id = solicitud.id || solicitud.properties.id;
          if (!id) {
            console.warn('SolicitudesService: Solicitud Feature sin ID:', solicitud);
          }
          return {
            ...solicitud.properties,
            id: id, // Asegurar que el ID esté siempre en el nivel raíz
            geometry: solicitud.geometry
          };
        }
        // Si ya es un objeto normal pero tiene properties, normalizar también
        if (solicitud && !solicitud.id && solicitud.properties && solicitud.properties.id) {
          return {
            ...solicitud.properties,
            id: solicitud.properties.id,
            geometry: solicitud.geometry
          };
        }
        // Si ya es un objeto normal, devolverlo tal cual
        return solicitud;
      };
      
      // Manejar diferentes estructuras de respuesta
      let solicitudesArray = [];
      if (Array.isArray(data)) {
        solicitudesArray = data;
      } else if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
        // Si es un FeatureCollection directo, extraer features
        solicitudesArray = data.features;
      } else if (data.results) {
        // Si results es un FeatureCollection, extraer features
        if (data.results.type === 'FeatureCollection' && Array.isArray(data.results.features)) {
          solicitudesArray = data.results.features;
        } else if (Array.isArray(data.results)) {
          solicitudesArray = data.results;
        } else if (data.results.features && Array.isArray(data.results.features)) {
          solicitudesArray = data.results.features;
        }
      } else if (data.data) {
        // Si data es un FeatureCollection, extraer features
        if (data.data.type === 'FeatureCollection' && Array.isArray(data.data.features)) {
          solicitudesArray = data.data.features;
        } else if (Array.isArray(data.data)) {
          solicitudesArray = data.data;
        }
      }
      
      // Normalizar todas las solicitudes para extraer properties de GeoJSON Features
      const solicitudesNormalizadas = solicitudesArray.map(normalizarSolicitud);
      console.log('SolicitudesService: Solicitudes activas normalizadas (primeras 2):', solicitudesNormalizadas.slice(0, 2).map(s => ({ id: s?.id, tieneId: !!s?.id })));
      return solicitudesNormalizadas;
    } catch (error) {
      // Manejar errores 401 (no autenticado) silenciosamente - retornar array vacío
      if (error.status === 401 || error.status === 403) {
        return [];
      }
      // Manejar 404 también silenciosamente
      if (error.status === 404) {
        return [];
      }
      // Solo lanzar otros errores inesperados
      console.error('SolicitudesService: Error inesperado al obtener solicitudes activas:', error);
      throw error;
    }
  }

  /**
   * Obtiene el detalle completo de una solicitud
   * @param {string} solicitudId - ID de la solicitud
   * @returns {Promise<Object>} Detalle de la solicitud
   */
  async obtenerDetalleSolicitud(solicitudId) {
    try {
      console.log('SolicitudesService: Obteniendo detalle de solicitud:', solicitudId);
      const data = await get(`/ordenes/solicitudes-publicas/${solicitudId}/`);
      console.log('SolicitudesService: Detalle obtenido:', data);
      
      // Normalizar: extraer properties de GeoJSON Feature si aplica
      if (data && data.type === 'Feature' && data.properties) {
        return {
          ...data.properties,
          id: data.id || data.properties.id,
          geometry: data.geometry
        };
      }
      return data;
    } catch (error) {
      console.error('SolicitudesService: Error al obtener detalle:', error);
      throw error;
    }
  }

  /**
   * Selecciona una oferta y crea una SolicitudServicio tradicional
   * @param {string} solicitudId - ID de la solicitud
   * @param {string} ofertaId - ID de la oferta a seleccionar
   * @returns {Promise<Object>} Respuesta con solicitud_tradicional_id
   */
  async seleccionarOferta(solicitudId, ofertaId) {
    try {
      console.log('SolicitudesService: Seleccionando oferta:', solicitudId, ofertaId);
      const data = await post(`/ordenes/solicitudes-publicas/${solicitudId}/seleccionar_oferta/`, {
        oferta_id: ofertaId
      });
      console.log('SolicitudesService: Oferta seleccionada:', data);
      // Si la respuesta es exitosa pero no tiene datos, devolver un objeto de éxito
      if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
        return { success: true, message: 'Oferta seleccionada correctamente' };
      }
      return data;
    } catch (error) {
      // Si el error es un 204 o 200 con respuesta vacía, tratarlo como éxito
      if (error.response && (error.response.status === 204 || error.response.status === 200)) {
        console.log('✅ Oferta seleccionada exitosamente (respuesta vacía):', error.response.status);
        return { success: true, status: error.response.status, message: 'Oferta seleccionada correctamente' };
      }
      console.error('SolicitudesService: Error al seleccionar oferta:', error);
      throw error;
    }
  }

  /**
   * Cancela una solicitud
   * @param {string} solicitudId - ID de la solicitud
   * @returns {Promise<void>}
   */
  async cancelarSolicitud(solicitudId) {
    try {
      console.log('SolicitudesService: Cancelando solicitud:', solicitudId);
      await delete_(`/ordenes/solicitudes-publicas/${solicitudId}/`);
      console.log('SolicitudesService: Solicitud cancelada');
    } catch (error) {
      console.error('SolicitudesService: Error al cancelar solicitud:', error);
      throw error;
    }
  }

  /**
   * Actualiza una solicitud (actualización parcial con PATCH)
   * @param {string} solicitudId - ID de la solicitud
   * @param {Object} updates - Campos a actualizar
   * @returns {Promise<Object>} Solicitud actualizada
   */
  async actualizarSolicitud(solicitudId, updates) {
    try {
      console.log('SolicitudesService: Actualizando solicitud:', solicitudId, updates);
      // Usar PATCH para actualizaciones parciales (no requiere todos los campos)
      const data = await patch(`/ordenes/solicitudes-publicas/${solicitudId}/`, updates);
      console.log('SolicitudesService: Solicitud actualizada:', data);
      
      // Normalizar: extraer properties de GeoJSON Feature si aplica
      if (data && data.type === 'Feature' && data.properties) {
        return {
          ...data.properties,
          id: data.id || data.properties.id,
          geometry: data.geometry
        };
      }
      return data;
    } catch (error) {
      console.error('SolicitudesService: Error al actualizar solicitud:', error);
      throw error;
    }
  }

  /**
   * Procesa el pago de una solicitud adjudicada sin usar carrito
   * @param {string} solicitudId - ID de la solicitud
   * @param {string} metodoPago - Método de pago (mercadopago, transferencia, etc.)
   * @param {string} notasCliente - Notas adicionales del cliente
   * @returns {Promise<Object>} Datos del pago procesado
   */
  async pagarSolicitudAdjudicada(solicitudId, metodoPago = 'mercadopago', notasCliente = '') {
    try {
      console.log('SolicitudesService: Procesando pago directo para solicitud:', solicitudId);
      console.log('  - Método de pago:', metodoPago);
      
      const data = await post(`/ordenes/solicitudes-publicas/${solicitudId}/pagar_solicitud_adjudicada/`, {
        metodo_pago: metodoPago,
        notas_cliente: notasCliente
      });
      
      console.log('SolicitudesService: Pago procesado exitosamente:', data);
      return data;
    } catch (error) {
      console.error('SolicitudesService: Error al procesar pago:', error);
      throw error;
    }
  }

  /**
   * Obtiene los datos necesarios para procesar el pago de una solicitud adjudicada
   * @param {string} solicitudId - ID de la solicitud
   * @returns {Promise<Object>} Datos para el pago
   */
  async obtenerDatosPago(solicitudId) {
    try {
      console.log('SolicitudesService: Obteniendo datos de pago para solicitud:', solicitudId);
      
      // Obtener la solicitud completa con oferta seleccionada
      const solicitud = await this.obtenerDetalleSolicitud(solicitudId);
      
      if (solicitud.estado !== 'adjudicada' && solicitud.estado !== 'pagada') {
        throw new Error('La solicitud debe estar adjudicada para obtener datos de pago');
      }
      
      if (!solicitud.oferta_seleccionada_detail) {
        throw new Error('No hay oferta seleccionada');
      }
      
      const oferta = solicitud.oferta_seleccionada_detail;
      
      // Log de campos de desglose para verificación
      console.log('🔍 SolicitudesService: Campos de desglose:', {
        costo_repuestos: oferta.costo_repuestos,
        costo_mano_obra: oferta.costo_mano_obra,
        incluye_repuestos: oferta.incluye_repuestos,
        precio_total_ofrecido: oferta.precio_total_ofrecido,
        proveedor_puede_recibir_pagos: oferta.proveedor_puede_recibir_pagos
      });
      
      // Estructurar datos para el pago
      const datosPago = {
        solicitud_id: solicitud.id,
        oferta_id: oferta.id,
        monto_total: parseFloat(oferta.precio_total_ofrecido || 0),
        proveedor: {
          id: oferta.proveedor || oferta.proveedor_id,
          nombre: oferta.nombre_proveedor || oferta.proveedor_nombre,
          tipo: oferta.tipo_proveedor
        },
        servicios: (oferta.detalles_servicios || []).map(detalle => ({
          nombre: detalle.servicio_nombre || detalle.servicio?.nombre || 'Servicio',
          precio: parseFloat(detalle.precio_servicio || 0),
          tiempo_estimado: detalle.tiempo_estimado_horas || detalle.tiempo_estimado
        })),
        fecha_servicio: oferta.fecha_disponible,
        hora_servicio: oferta.hora_disponible,
        ubicacion: solicitud.direccion_servicio_texto || 'No especificada',
        vehiculo: solicitud.vehiculo_detail || solicitud.vehiculo,
        incluye_repuestos: oferta.incluye_repuestos || false,
        descripcion: solicitud.descripcion_servicio || '',
        // Campos de desglose para pagos separados
        costo_repuestos: parseFloat(oferta.costo_repuestos || 0),
        costo_mano_obra: parseFloat(oferta.costo_mano_obra || 0),
        costo_gestion_compra: parseFloat(oferta.costo_gestion_compra || 0),
        foto_cotizacion_repuestos: oferta.foto_cotizacion_repuestos || null,
        metodo_pago_cliente: oferta.metodo_pago_cliente || 'pendiente',
        estado_pago_repuestos: oferta.estado_pago_repuestos || 'no_aplica',
        estado_pago_servicio: oferta.estado_pago_servicio || 'pendiente',
        proveedor_puede_recibir_pagos: oferta.proveedor_puede_recibir_pagos || false,
      };
      
      console.log('SolicitudesService: Datos de pago estructurados:', datosPago);
      return datosPago;
    } catch (error) {
      console.error('SolicitudesService: Error al obtener datos de pago:', error);
      throw error;
    }
  }

  /**
   * Reenvía una solicitud que no tiene ofertas pero tiene rechazos
   * @param {string} solicitudId - ID de la solicitud a reenviar
   * @returns {Promise<Object>} Solicitud reenviada
   */
  async reenviarSolicitud(solicitudId) {
    try {
      console.log('SolicitudesService: Reenviando solicitud:', solicitudId);
      const data = await post(`/ordenes/solicitudes-publicas/${solicitudId}/reenviar/`, {});
      console.log('SolicitudesService: Solicitud reenviada:', data);
      
      // Normalizar solicitud reenviada
      if (data && data.solicitud) {
        const solicitud = data.solicitud;
        if (solicitud.type === 'Feature' && solicitud.properties) {
          return {
            message: data.message,
            solicitud: {
              ...solicitud.properties,
              id: solicitud.id || solicitud.properties.id,
              geometry: solicitud.geometry
            }
          };
        }
        return data;
      }
      return data;
    } catch (error) {
      console.error('SolicitudesService: Error al reenviar solicitud:', error);
      throw error;
    }
  }
}

export default new SolicitudesService();

