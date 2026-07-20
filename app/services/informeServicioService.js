import { get, post } from './api';

/**
 * Obtiene el informe público de servicio (sin autenticación).
 * @param {string} token
 */
export async function obtenerInformePublico(token) {
  const safe = String(token || '').trim();
  if (!safe) throw new Error('Token de informe inválido');
  return get(`/checklists/informes/${encodeURIComponent(safe)}/`, {}, { requiresAuth: false });
}

/**
 * Firma del cliente en la página pública (sin autenticación).
 * @param {string} token
 * @param {{ firma_cliente: string, firmado_por_nombre: string }} payload
 */
export async function firmarInformeCliente(token, payload) {
  const safe = String(token || '').trim();
  if (!safe) throw new Error('Token de informe inválido');
  return post(
    `/checklists/informes/${encodeURIComponent(safe)}/firmar-cliente/`,
    payload,
    { requiresAuth: false },
  );
}

/**
 * Vincula el servicio del informe al vehículo del cliente autenticado.
 * @param {string} token
 */
export async function reclamarInformeServicio(token) {
  const safe = String(token || '').trim();
  if (!safe) throw new Error('Token de informe inválido');
  return post(`/vehiculos/reclamar-informe/${encodeURIComponent(safe)}/`, {});
}

/**
 * Extrae token de informe desde URL o texto QR.
 * @param {string} raw
 * @returns {string|null}
 */
export function parseInformeTokenFromUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  const match = trimmed.match(/\/reporte\/([A-Za-z0-9_-]+)/i);
  if (match) return match[1];
  if (/^[A-Za-z0-9_-]{16,}$/.test(trimmed)) return trimmed;
  return null;
}
