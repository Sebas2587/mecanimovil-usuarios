import { get } from './api';

/**
 * Servicio para gestionar pagos
 */
class PagosService {
  /**
   * Obtiene el historial de pagos del usuario autenticado
   * Incluye pagos históricos desde ofertas pagadas
   * @returns {Promise<Array>} Lista de pagos
   */
  async obtenerHistorialPagos() {
    try {
      console.log('PagosService: Obteniendo historial completo de pagos');
      // Usar el endpoint historial_completo que incluye pagos históricos desde ofertas
      const data = await get('/mercadopago/payments/historial_completo/');
      console.log('PagosService: Historial completo de pagos obtenido:', data);
      
      // Manejar diferentes formatos de respuesta
      if (Array.isArray(data)) {
        return data;
      } else if (data && Array.isArray(data.results)) {
        return data.results;
      } else if (data && Array.isArray(data.data)) {
        return data.data;
      }
      
      return data || [];
    } catch (error) {
      console.error('PagosService: Error obteniendo historial de pagos:', error);
      // Si falla el historial completo, intentar con el endpoint normal
      try {
        console.log('PagosService: Intentando con endpoint normal...');
        const data = await get('/mercadopago/payments/');
        if (Array.isArray(data)) {
          return data;
        } else if (data && Array.isArray(data.results)) {
          return data.results;
        }
        return data || [];
      } catch (fallbackError) {
        console.error('PagosService: Error en fallback:', fallbackError);
        throw error;
      }
    }
  }

  /**
   * Obtiene el estado de un pago específico
   * @param {string} pagoId - ID del pago
   * @returns {Promise<Object>} Estado del pago
   */
  async obtenerEstadoPago(pagoId) {
    try {
      console.log('PagosService: Obteniendo estado del pago:', pagoId);
      const data = await get(`/mercadopago/payments/${pagoId}/status/`);
      console.log('PagosService: Estado del pago obtenido:', data);
      return data;
    } catch (error) {
      console.error('PagosService: Error obteniendo estado del pago:', error);
      throw error;
    }
  }
}

export default new PagosService();

