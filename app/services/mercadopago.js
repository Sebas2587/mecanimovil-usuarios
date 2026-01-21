/**
 * Servicio para interactuar con Mercado Pago Checkout Pro
 */
import { post, get } from './api';
import { Linking } from 'react-native';

class MercadoPagoService {
  /**
   * Crea una preferencia de pago para Checkout Pro
   * @param {string} carritoId - ID del carrito (opcional si se proporciona solicitudServicioId)
   * @param {object} backUrls - URLs de retorno (success, failure, pending)
   * @param {string} notificationUrl - URL para recibir webhooks (opcional)
   * @param {string} solicitudServicioId - ID de la solicitud de servicio (opcional, para ofertas secundarias)
   * @returns {Promise<object>} Preferencia creada con init_point
   */
  async createPreference(carritoId = null, backUrls = {}, notificationUrl = null, solicitudServicioId = null) {
    try {
      const requestData = {
        back_urls: backUrls,
        notification_url: notificationUrl,
      };

      if (solicitudServicioId) {
        console.log('📤 Creando preferencia de pago para solicitud de servicio:', solicitudServicioId);
        requestData.solicitud_servicio_id = solicitudServicioId;
      } else if (carritoId) {
        console.log('📤 Creando preferencia de pago para carrito:', carritoId);
        requestData.carrito_id = carritoId;
      } else {
        throw new Error('Debe proporcionar carritoId o solicitudServicioId');
      }

      const response = await post(
        '/mercadopago/preferences/create_preference/',
        requestData,
        { requiresAuth: true }
      );

      console.log('✅ Preferencia creada exitosamente:', response.preference_id_mp);

      return response;
    } catch (error) {
      console.error('❌ Error creando preferencia:', error);
      throw new Error(error.message || 'Error al crear la preferencia de pago');
    }
  }

  /**
   * Obtiene el estado de un pago
   * @param {string} paymentId - ID del pago
   * @returns {Promise<object>} Estado del pago
   */
  async getPaymentStatus(paymentId) {
    try {
      console.log('📥 Obteniendo estado del pago:', paymentId);

      const response = await get(
        `/mercadopago/payments/${paymentId}/status/`,
        {},
        { requiresAuth: true }
      );

      console.log('✅ Estado del pago obtenido:', response.status);

      return response;
    } catch (error) {
      console.error('❌ Error obteniendo estado del pago:', error);
      throw new Error(error.message || 'Error al obtener el estado del pago');
    }
  }

  /**
   * Abre Checkout Pro usando WebView modal
   * 
   * IMPORTANTE: Esta función retorna la URL del checkout para que se abra en un WebView modal.
   * El WebView mantiene el contexto de la app y evita que se abran múltiples instancias.
   * 
   * @param {string} initPoint - URL de inicio de Checkout Pro
   * @returns {Promise<object>} Objeto con la URL para abrir en WebView
   */
  async openCheckoutPro(initPoint) {
    try {
      console.log('🚀 Preparando Checkout Pro para WebView:', initPoint);

      // Retornar la URL para que se abra en un WebView modal
      // El WebView interceptará las redirecciones y capturará el deep link
      return {
        success: true,
        type: 'webview',
        url: initPoint,
        useWebView: true, // Indicar que se debe usar WebView
      };
    } catch (error) {
      console.error('❌ Error preparando Checkout Pro:', error);
      throw new Error(error.message || 'Error al preparar Checkout Pro');
    }
  }

  /**
   * Maneja el retorno desde Checkout Pro
   * @param {string} url - URL de retorno desde Checkout Pro
   * @returns {object} Información del pago procesado
   */
  parseCheckoutReturn(url) {
    try {
      console.log('📨 Procesando retorno de Checkout Pro:', url);

      // Parsear los parámetros de la URL
      const urlObj = new URL(url);
      const params = {};

      // Extraer parámetros de query
      urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
      });

      // Extraer información del fragmento (#) si existe
      const fragment = urlObj.hash.substring(1);
      if (fragment) {
        fragment.split('&').forEach(param => {
          const [key, value] = param.split('=');
          if (key && value) {
            params[key] = decodeURIComponent(value);
          }
        });
      }

      console.log('✅ Parámetros extraídos:', params);

      return {
        status: params.status || params.payment_status || 'unknown',
        payment_id: params.payment_id || params.preference_id || null,
        external_reference: params.external_reference || null,
        payment_type: params.payment_type || null,
        payment_method_id: params.payment_method_id || null,
        merchant_order_id: params.merchant_order_id || null,
      };
    } catch (error) {
      console.error('❌ Error parseando retorno de Checkout Pro:', error);
      return {
        status: 'error',
        error: error.message,
      };
    }
  }

  /**
   * Obtiene la public key de Mercado Pago
   * @returns {Promise<string>} Public key
   */
  async getPublicKey() {
    try {
      console.log('🔑 Obteniendo public key de Mercado Pago');

      const response = await get(
        '/mercadopago/public-key/',
        {},
        { requiresAuth: false }
      );

      console.log('✅ Public key obtenida');

      return response.public_key;
    } catch (error) {
      console.error('❌ Error obteniendo public key:', error);
      return null;
    }
  }

  /**
   * Crea una preferencia de pago directo al proveedor
   * El pago va directamente a la cuenta de Mercado Pago del proveedor
   * @param {string} ofertaId - ID de la oferta
   * @param {string} tipoPago - Tipo de pago: 'repuestos', 'servicio', o 'total'
   * @param {object} backUrls - URLs de retorno (success, failure, pending)
   * @returns {Promise<object>} Preferencia creada con init_point
   */
  async createPreferenceToProvider(ofertaId, tipoPago = 'total', backUrls = {}) {
    try {
      console.log('📤 Creando preferencia de pago directo al proveedor');
      console.log('   - Oferta ID:', ofertaId);
      console.log('   - Tipo de pago:', tipoPago);

      const response = await post(
        '/mercadopago/pago-proveedor/',
        {
          oferta_id: ofertaId,
          tipo_pago: tipoPago,
          back_urls: backUrls,
        },
        { requiresAuth: true }
      );

      console.log('✅ Preferencia creada exitosamente');
      console.log('   - Init point:', response.init_point);
      console.log('   - Monto:', response.monto);
      console.log('   - Proveedor:', response.proveedor);

      return response;
    } catch (error) {
      console.error('❌ Error creando preferencia de pago al proveedor:', error);
      throw new Error(error.message || 'Error al crear la preferencia de pago');
    }
  }

  /**
   * Confirma el pago de una oferta después del retorno de Mercado Pago
   * @param {string} ofertaId - ID de la oferta
   * @param {string} tipoPago - Tipo de pago: 'repuestos', 'servicio', o 'total'
   * @param {string} paymentId - ID del pago en Mercado Pago (opcional)
   * @param {string} status - Estado del pago (approved, pending, etc.)
   * @param {string} externalReference - Referencia externa
   * @returns {Promise<object>} Estado actualizado de la oferta
   */
  async confirmarPagoOferta(ofertaId, tipoPago = 'total', paymentId = null, status = 'approved', externalReference = null) {
    try {
      console.log('📤 Confirmando pago de oferta');
      console.log('   - Oferta ID:', ofertaId);
      console.log('   - Tipo de pago:', tipoPago);
      console.log('   - Payment ID:', paymentId);
      console.log('   - Status:', status);

      const response = await post(
        '/mercadopago/confirmar-pago-oferta/',
        {
          oferta_id: ofertaId,
          tipo_pago: tipoPago,
          payment_id: paymentId,
          status: status,
          external_reference: externalReference,
        },
        { requiresAuth: true }
      );

      console.log('✅ Pago confirmado exitosamente');
      console.log('   - Oferta estado:', response.oferta_estado);
      console.log('   - Solicitud estado:', response.solicitud_estado);
      console.log('   - Estado pago repuestos:', response.estado_pago_repuestos);
      console.log('   - Estado pago servicio:', response.estado_pago_servicio);

      return response;
    } catch (error) {
      console.error('❌ Error confirmando pago de oferta:', error);
      throw new Error(error.message || 'Error al confirmar el pago');
    }
  }

  /**
   * Obtiene el estado de pago de una oferta
   * @param {string} ofertaId - ID de la oferta
   * @returns {Promise<object>} Estado de pago de la oferta
   */
  async getEstadoPagoOferta(ofertaId) {
    try {
      console.log('📥 Obteniendo estado de pago de oferta:', ofertaId);

      const response = await get(
        `/mercadopago/estado-pago-oferta/${ofertaId}/`,
        {},
        { requiresAuth: true }
      );

      console.log('✅ Estado de pago obtenido');
      console.log('   - Estado pago repuestos:', response.estado_pago_repuestos);
      console.log('   - Estado pago servicio:', response.estado_pago_servicio);
      console.log('   - Puede pagar servicio:', response.puede_pagar_servicio);

      return response;
    } catch (error) {
      console.error('❌ Error obteniendo estado de pago:', error);
      throw new Error(error.message || 'Error al obtener estado de pago');
    }
  }

  /**
   * Verifica directamente con Mercado Pago si un pago fue completado
   * Este método busca pagos en MP por external_reference y confirma si encuentra uno aprobado
   * @param {string} ofertaId - ID de la oferta
   * @param {string} tipoPago - Tipo de pago: 'repuestos', 'servicio', o 'total'
   * @param {string} preferenceId - ID de la preferencia (opcional)
   * @returns {Promise<object>} Resultado de la verificación
   */
  async verificarPagoMercadoPago(ofertaId, tipoPago = 'total', preferenceId = null) {
    try {
      console.log('🔍 Verificando pago directamente con Mercado Pago');
      console.log('   - Oferta ID:', ofertaId);
      console.log('   - Tipo de pago:', tipoPago);
      console.log('   - Preference ID:', preferenceId);

      const response = await post(
        '/mercadopago/verificar-pago-mercadopago/',
        {
          oferta_id: ofertaId,
          tipo_pago: tipoPago,
          preference_id: preferenceId,
        },
        { requiresAuth: true }
      );

      console.log('✅ Verificación completada');
      console.log('   - success:', response.success);
      console.log('   - payment_found:', response.payment_found);
      console.log('   - payment_approved:', response.payment_approved);

      if (response.payment_approved) {
        console.log('   - Payment ID:', response.payment_id);
        console.log('   - Oferta estado:', response.oferta_estado);
      }

      return response;
    } catch (error) {
      console.error('❌ Error verificando pago con Mercado Pago:', error);
      throw new Error(error.message || 'Error al verificar el pago');
    }
  }
}

export default new MercadoPagoService();
