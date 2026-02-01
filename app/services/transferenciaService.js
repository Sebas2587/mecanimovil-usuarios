import { post } from './api';

const TransferenciaService = {
    /**
     * Genera un token de transferencia para una oferta aceptada.
     * @param {string|number} offerId - ID de la oferta aceptada
     * @returns {Promise<Object>} Datos del token (token, qr_data, expires_at)
     */
    generateToken: async (offerId) => {
        try {
            const response = await post('/marketplace/transferencias/generate_transfer_token/', {
                offer_id: offerId
            });
            return response;
        } catch (error) {
            console.error('Error generando token de transferencia:', error);
            throw error;
        }
    },

    /**
     * Completa la transferencia usando el token escaneado.
     * @param {string} token - Token escaneado del QR
     * @returns {Promise<Object>} Resultado de la transferencia
     */
    completeTransfer: async (token) => {
        try {
            const response = await post('/marketplace/transferencias/complete_transfer/', {
                token: token
            });
            return response;
        } catch (error) {
            console.error('Error completando transferencia:', error);
            throw error;
        }
    }
};

export default TransferenciaService;
