import { get, post, put } from './api';

/**
 * Servicio para gestionar ofertas de proveedores y chat
 */
class OfertasService {
  /**
   * Obtiene todas las ofertas de una solicitud
   * @param {string} solicitudId - ID de la solicitud
   * @returns {Promise<Array>} Lista de ofertas
   */
  async obtenerOfertasDeSolicitud(solicitudId) {
    try {
      console.log('OfertasService: Obteniendo ofertas de solicitud:', solicitudId);
      const data = await get(`/ordenes/ofertas/?solicitud=${solicitudId}`);
      console.log('OfertasService: Ofertas obtenidas:', data);
      
      // Manejar diferentes estructuras de respuesta
      let ofertas = [];
      if (Array.isArray(data)) {
        ofertas = data;
      } else if (data.results) {
        ofertas = data.results;
      } else if (data.data) {
        ofertas = data.data;
      }
      
      // Debug: Log para verificar si los detalles_servicios tienen repuestos_info
      if (__DEV__ && ofertas.length > 0) {
        ofertas.forEach((oferta, index) => {
          console.log(`🔍 Oferta ${index} (${oferta.id}):`, {
            tiene_detalles_servicios: !!oferta.detalles_servicios,
            cantidad_detalles: oferta.detalles_servicios?.length || 0,
            detalles_con_repuestos: oferta.detalles_servicios?.filter(d => 
              (d.repuestos_info && d.repuestos_info.length > 0) || 
              (d.repuestos_seleccionados && d.repuestos_seleccionados.length > 0)
            ).length || 0
          });
          
          if (oferta.detalles_servicios && oferta.detalles_servicios.length > 0) {
            oferta.detalles_servicios.forEach((detalle, detIndex) => {
              console.log(`  📦 Detalle ${detIndex} (${detalle.servicio_nombre}):`, {
                repuestos_seleccionados: detalle.repuestos_seleccionados,
                repuestos_info: detalle.repuestos_info,
                tiene_repuestos_info: !!detalle.repuestos_info,
                cantidad_repuestos_info: detalle.repuestos_info?.length || 0
              });
            });
          }
        });
      }
      
      return ofertas;
    } catch (error) {
      console.error('OfertasService: Error al obtener ofertas:', error);
      if (error.status === 404) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Obtiene el detalle completo de una oferta
   * @param {string} ofertaId - ID de la oferta
   * @returns {Promise<Object>} Detalle de la oferta
   */
  async obtenerDetalleOferta(ofertaId) {
    try {
      console.log('OfertasService: Obteniendo detalle de oferta:', ofertaId);
      const data = await get(`/ordenes/ofertas/${ofertaId}/`);
      console.log('OfertasService: Detalle obtenido:', data);
      return data;
    } catch (error) {
      console.error('OfertasService: Error al obtener detalle:', error);
      throw error;
    }
  }

  /**
   * Marca una oferta como vista por el cliente
   * @param {string} ofertaId - ID de la oferta
   * @returns {Promise<Object>} Oferta actualizada
   */
  async marcarOfertaComoVista(ofertaId) {
    try {
      console.log('OfertasService: Marcando oferta como vista:', ofertaId);
      const data = await put(`/ordenes/ofertas/${ofertaId}/`, {
        estado: 'vista'
      });
      console.log('OfertasService: Oferta marcada como vista:', data);
      return data;
    } catch (error) {
      console.error('OfertasService: Error al marcar oferta como vista:', error);
      throw error;
    }
  }

  /**
   * Compara múltiples ofertas y retorna estadísticas
   * @param {Array<Object>} ofertas - Array de ofertas a comparar
   * @returns {Object} Estadísticas comparativas
   */
  compararOfertas(ofertas) {
    if (!ofertas || ofertas.length === 0) {
      return {
        min: 0,
        promedio: 0,
        max: 0,
        total: 0
      };
    }

    const precios = ofertas.map(o => parseFloat(o.precio_total_ofrecido) || 0);
    const ratings = ofertas.map(o => parseFloat(o.rating_proveedor) || 0);
    const tiempos = ofertas.map(o => {
      // Convertir DurationField a horas
      if (o.tiempo_estimado_total) {
        const match = o.tiempo_estimado_total.match(/(\d+):(\d+):(\d+)/);
        if (match) {
          const hours = parseInt(match[1]);
          const minutes = parseInt(match[2]);
          return hours + minutes / 60;
        }
      }
      return 0;
    });

    return {
      precio: {
        min: Math.min(...precios),
        max: Math.max(...precios),
        promedio: precios.reduce((a, b) => a + b, 0) / precios.length,
        total: ofertas.length
      },
      rating: {
        min: Math.min(...ratings),
        max: Math.max(...ratings),
        promedio: ratings.reduce((a, b) => a + b, 0) / ratings.length,
        total: ofertas.length
      },
      tiempo: {
        min: Math.min(...tiempos),
        max: Math.max(...tiempos),
        promedio: tiempos.reduce((a, b) => a + b, 0) / tiempos.length,
        total: ofertas.length
      }
    };
  }

  /**
   * Obtiene todos los mensajes de chat de una oferta
   * @param {string} ofertaId - ID de la oferta
   * @returns {Promise<Array>} Lista de mensajes
   */
  async obtenerChatOferta(ofertaId) {
    try {
      console.log('OfertasService: Obteniendo chat de oferta:', ofertaId);
      const data = await get(`/ordenes/chat-solicitudes/por_oferta/${ofertaId}/`);
      console.log('OfertasService: Mensajes obtenidos:', data);
      
      if (Array.isArray(data)) {
        return data;
      } else if (data.results) {
        return data.results;
      } else if (data.data) {
        return data.data;
      }
      return [];
    } catch (error) {
      console.error('OfertasService: Error al obtener chat:', error);
      if (error.status === 404) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Envía un mensaje en el chat de una oferta
   * @param {string} ofertaId - ID de la oferta
   * @param {string} mensaje - Texto del mensaje
   * @param {File|null} archivo - Archivo adjunto opcional
   * @returns {Promise<Object>} Mensaje creado
   */
  async enviarMensajeChat(ofertaId, mensaje, archivo = null) {
    try {
      console.log('OfertasService: Enviando mensaje en oferta:', ofertaId);
      
      const formData = new FormData();
      formData.append('oferta', ofertaId);
      formData.append('mensaje', mensaje);
      if (archivo) {
        formData.append('archivo_adjunto', {
          uri: archivo.uri,
          type: archivo.type || 'image/jpeg',
          name: archivo.name || 'adjunto.jpg'
        });
      }

      // Usar post de api.js que maneja FormData automáticamente
      const data = await post('/ordenes/chat-solicitudes/', formData, {
        requiresAuth: true
      });
      
      console.log('OfertasService: Mensaje enviado:', data);
      return data;
    } catch (error) {
      console.error('OfertasService: Error al enviar mensaje:', error);
      const errorMessage = error.message || error.response?.data?.detail || 'Error al enviar mensaje';
      throw new Error(errorMessage);
    }
  }

  /**
   * Marca los mensajes de una oferta como leídos
   * @param {string} ofertaId - ID de la oferta
   * @returns {Promise<void>}
   */
  async marcarMensajesComoLeidos(ofertaId) {
    try {
      console.log('OfertasService: Marcando mensajes como leídos:', ofertaId);
      // Al obtener el chat, automáticamente se marcan como leídos
      await this.obtenerChatOferta(ofertaId);
      console.log('OfertasService: Mensajes marcados como leídos');
    } catch (error) {
      console.error('OfertasService: Error al marcar mensajes como leídos:', error);
      // No lanzar error, es una operación opcional
    }
  }

  /**
   * Rechaza una oferta (especialmente útil para ofertas secundarias)
   * @param {string} ofertaId - ID de la oferta
   * @returns {Promise<Object>} Oferta actualizada
   */
  async rechazarOferta(ofertaId) {
    try {
      console.log('OfertasService: Rechazando oferta:', ofertaId);
      const data = await post(`/ordenes/ofertas/${ofertaId}/rechazar-oferta/`, {});
      console.log('OfertasService: Oferta rechazada:', data);
      return data;
    } catch (error) {
      console.error('OfertasService: Error al rechazar oferta:', error);
      throw error;
    }
  }

  /**
   * Obtiene la lista de todos los chats del usuario
   * @returns {Promise<Array>} Lista de chats con metadata
   */
  async obtenerListaChats() {
    try {
      console.log('OfertasService: Obteniendo lista de chats');
      const data = await get('/ordenes/chat-solicitudes/lista-chats/');
      console.log('OfertasService: Lista de chats obtenida:', data);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('OfertasService: Error al obtener lista de chats:', error);
      if (error.status === 404) {
        return [];
      }
      throw error;
    }
  }
}

export default new OfertasService();

