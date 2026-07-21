import { get, patch, post } from './api';

export const exportMyData = async () => get('/usuarios/mis-datos/export/');

export const getNotificationPreferences = async () =>
  get('/usuarios/preferencias-notificacion/');

export const updateNotificationPreferences = async (payload) =>
  patch('/usuarios/preferencias-notificacion/', payload);

export const getDeleteAccountStatus = async () =>
  get('/usuarios/eliminar-cuenta/estado/');

export const deleteAccount = async ({ password, confirmacion = 'ELIMINAR' }) =>
  post('/usuarios/eliminar-cuenta/', { password, confirmacion });

export const getConsentStatus = async () => get('/usuarios/consentimiento/estado/');

export const registerLegalConsent = async (payload = {}) =>
  post('/usuarios/consentimiento/registrar/', {
    acepta_terminos: true,
    acepta_privacidad: true,
    canal: 'app_usuarios',
    ...payload,
  });

export const enablePublicVehicleFicha = async (vehicleId) =>
  post(`/vehiculos/${vehicleId}/habilitar-ficha-publica/`);

export const disablePublicVehicleFicha = async (vehicleId) =>
  post(`/vehiculos/${vehicleId}/deshabilitar-ficha-publica/`);

export const getPublicVehicleFichaByToken = async (token) =>
  get(`/vehiculos/ficha-publica-token/${encodeURIComponent(token)}/`, {}, {
    requiresAuth: false,
    forceRefresh: true,
  });
