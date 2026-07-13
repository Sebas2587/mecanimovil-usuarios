import { post, get } from './api';

function extractErrorMessage(error, fallback) {
    return (
        error?.data?.error ||
        error?.response?.data?.error ||
        error?.message ||
        fallback
    );
}

const TransferenciaService = {
    /**
     * Genera un token/QR de transferencia.
     * Preferido: vehicleId (P2P desde ficha del vehículo).
     * Legacy: offerId (oferta marketplace).
     */
    generateToken: async ({ vehicleId, offerId } = {}) => {
        const body = {};
        if (vehicleId != null) body.vehicle_id = vehicleId;
        if (offerId != null) body.offer_id = offerId;
        try {
            return await post('/marketplace/transferencias/generate_transfer_token/', body);
        } catch (error) {
            console.error('Error generando token de transferencia:', error);
            const err = new Error(extractErrorMessage(error, 'No se pudo generar el código'));
            err.cause = error;
            throw err;
        }
    },

    /**
     * Completa la transferencia usando el token escaneado del QR.
     */
    completeTransfer: async (token) => {
        try {
            return await post('/marketplace/transferencias/complete_transfer/', { token });
        } catch (error) {
            console.error('Error completando transferencia:', error);
            const err = new Error(extractErrorMessage(error, 'Código inválido o expirado'));
            err.cause = error;
            throw err;
        }
    },

    /**
     * Polling del estado de la transferencia (vendedor).
     */
    getTransferStatus: async (transferId) => {
        try {
            return await get(
                '/marketplace/transferencias/transfer_status/',
                { transfer_id: transferId },
                { forceRefresh: true },
            );
        } catch (error) {
            console.error('Error consultando estado de transferencia:', error);
            throw error;
        }
    },
};

export default TransferenciaService;
