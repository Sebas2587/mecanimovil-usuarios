import { get, post } from './api';

/**
 * Obtiene cotización pública (sin autenticación).
 * @param {string} token
 */
export async function obtenerCotizacionPublica(token) {
  const safe = String(token || '').trim();
  if (!safe) throw new Error('Token de cotización inválido');
  return get(`/ordenes/cotizaciones-publicas/${encodeURIComponent(safe)}/`, {}, { requiresAuth: false });
}

/**
 * Acepta cotización pública (sin autenticación).
 * @param {string} token
 */
export async function aceptarCotizacionPublica(token) {
  const safe = String(token || '').trim();
  if (!safe) throw new Error('Token de cotización inválido');
  return post(`/ordenes/cotizaciones-publicas/${encodeURIComponent(safe)}/aceptar/`, {}, { requiresAuth: false });
}

/**
 * Rechaza cotización pública (sin autenticación).
 * @param {string} token
 */
export async function rechazarCotizacionPublica(token) {
  const safe = String(token || '').trim();
  if (!safe) throw new Error('Token de cotización inválido');
  return post(`/ordenes/cotizaciones-publicas/${encodeURIComponent(safe)}/rechazar/`, {}, { requiresAuth: false });
}

/**
 * Extrae token de cotización desde URL.
 * @param {string} raw
 * @returns {string|null}
 */
export function parseCotizacionTokenFromUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  const match = trimmed.match(/\/cotizacion\/([A-Za-z0-9_-]+)/i);
  if (match) return match[1];
  if (/^[A-Za-z0-9_-]{16,}$/.test(trimmed)) return trimmed;
  return null;
}
