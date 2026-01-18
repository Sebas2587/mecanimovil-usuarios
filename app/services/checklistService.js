import { get } from './api';

/**
 * Servicio para gestión de checklists desde el lado del cliente
 */
class ChecklistClienteService {
  
  /**
   * Obtiene el checklist de un servicio completado
   * @param {number} ordenId - ID de la orden/servicio
   * @returns {Promise} Datos del checklist
   */
  async obtenerChecklistServicio(ordenId) {
    try {
      console.log('🔍 ChecklistClienteService: Obteniendo checklist para orden:', ordenId);
      
      const response = await get(`/checklists/instances/by_order/${ordenId}/`);
      
      console.log('✅ ChecklistClienteService: Checklist obtenido exitosamente:', {
        id: response.id,
        estado: response.estado,
        progreso: response.progreso_porcentaje
      });
      
      return response;
    } catch (error) {
      console.error('❌ ChecklistClienteService: Error obteniendo checklist:', error);
      
      // Si es 404, el servicio no tiene checklist
      if (error.status === 404) {
        throw new Error('Este servicio no tiene un checklist disponible');
      }
      
      // Si es 403, el checklist no está disponible aún
      if (error.status === 403) {
        throw new Error('El checklist aún no está disponible. Solo se puede ver después de completar el servicio.');
      }
      
      throw new Error('No se pudo cargar el checklist del servicio');
    }
  }

  /**
   * Verifica si un servicio tiene checklist disponible
   * @param {number} ordenId - ID de la orden/servicio
   * @returns {Promise<boolean>} true si tiene checklist disponible
   */
  async tieneChecklistDisponible(ordenId) {
    try {
      await this.obtenerChecklistServicio(ordenId);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Formatea los datos del checklist para mostrar al cliente
   * @param {Object} checklist - Datos del checklist
   * @returns {Object} Datos formateados para la UI
   */
  formatearChecklistParaCliente(checklist) {
    return {
      id: checklist.id,
      servicioInfo: {
        nombre: checklist.checklist_template?.servicio_nombre || 'Servicio',
        descripcion: checklist.checklist_template?.descripcion || '',
      },
      ordenInfo: checklist.orden_info,
      estado: checklist.estado,
      progreso: checklist.progreso_porcentaje,
      fechaInicio: checklist.fecha_inicio,
      fechaFinalizacion: checklist.fecha_finalizacion,
      tiempoTotal: checklist.tiempo_total_minutos,
      respuestas: checklist.respuestas || [],
      firmaTecnico: checklist.firma_tecnico,
      firmaCliente: checklist.firma_cliente,
      template: checklist.checklist_template,
      totalItems: checklist.progreso_info?.total_items || 0,
      itemsCompletados: checklist.progreso_info?.items_completados || 0,
    };
  }

  /**
   * Obtiene las categorías de items del checklist para organizar la visualización
   * @param {Array} respuestas - Array de respuestas del checklist
   * @returns {Object} Respuestas organizadas por categoría
   */
  organizarRespuestasPorCategoria(respuestas) {
    if (!respuestas || !Array.isArray(respuestas) || respuestas.length === 0) {
      return {};
    }

    const categorias = {};
    
    respuestas.forEach((respuesta) => {
      if (!respuesta) return;
      
      const categoria = respuesta.item_template_info?.categoria || 
                       respuesta.categoria || 
                       'OTROS';
      
      if (!categorias[categoria]) {
        categorias[categoria] = [];
      }
      categorias[categoria].push(respuesta);
    });

    return categorias;
  }

  /**
   * Formatea una fecha para mostrar al cliente
   * @param {string} fechaString - Fecha en formato ISO
   * @returns {string} Fecha formateada
   */
  formatearFecha(fechaString) {
    if (!fechaString || fechaString === null || fechaString === undefined) {
      return 'No disponible';
    }
    
    try {
      const fecha = new Date(fechaString);
      
      // Verificar si la fecha es válida
      if (isNaN(fecha.getTime())) {
        return 'Fecha inválida';
      }
      
      return fecha.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return 'Error en fecha';
    }
  }

  /**
   * Obtiene el nombre legible de una categoría
   * @param {string} categoria - Código de categoría
   * @returns {string} Nombre legible
   */
  obtenerNombreCategoria(categoria) {
    const categorias = {
      'DATOS_VEHICULO': 'Datos del Vehículo',
      'VERIFICACION_INICIAL': 'Verificación Inicial',
      'INSPECCION_VISUAL': 'Inspección Visual',
      'SISTEMAS_VEHICULO': 'Sistemas del Vehículo',
      'TRABAJO_REALIZADO': 'Trabajo Realizado',
      'FIRMAS_CONFORMIDAD': 'Firmas de Conformidad',
      'INFORMACION_GENERAL': 'Información General',
      'OTROS': 'Otros'
    };
    
    return categorias[categoria] || categoria.replace('_', ' ');
  }

  /**
   * Obtiene el ícono apropiado para cada categoría
   * @param {string} categoria - Código de categoría
   * @returns {string} Nombre del ícono
   */
  obtenerIconoCategoria(categoria) {
    const iconos = {
      'DATOS_VEHICULO': 'car',
      'VERIFICACION_INICIAL': 'checkmark-circle',
      'INSPECCION_VISUAL': 'eye',
      'SISTEMAS_VEHICULO': 'settings',
      'TRABAJO_REALIZADO': 'construct',
      'FIRMAS_CONFORMIDAD': 'create',
      'INFORMACION_GENERAL': 'information-circle',
      'OTROS': 'help-circle'
    };
    
    return iconos[categoria] || 'help-circle';
  }
}

// Exportar instancia única del servicio
const checklistClienteService = new ChecklistClienteService();
export default checklistClienteService; 