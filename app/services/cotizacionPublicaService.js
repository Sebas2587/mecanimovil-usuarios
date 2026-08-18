import { Platform } from 'react-native';
import { get, post, getAxiosApiBaseSync } from './api';

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
/**
 * Descarga el PDF servidor (web: archivo; nativo: abre el enlace).
 * @param {string} token
 * @param {string} [numeroPublico]
 */
export async function descargarPdfCotizacionPublica(token, numeroPublico) {
  const safe = String(token || '').trim();
  if (!safe) throw new Error('Token de cotización inválido');
  const filename = `Cotizacion-${numeroPublico || 'documento'}.pdf`;
  const path = `/ordenes/cotizaciones-publicas/${encodeURIComponent(safe)}/pdf/`;

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const data = await get(path, {}, {
      requiresAuth: false,
      responseType: 'arraybuffer',
      forceRefresh: true,
    });
    const blob = new Blob([data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return filename;
  }

  const base = getAxiosApiBaseSync();
  if (!base) {
    throw new Error('No se pudo resolver la URL del PDF.');
  }
  const WebBrowser = await import('expo-web-browser');
  await WebBrowser.openBrowserAsync(`${base}${path}`);
  return filename;
}

export function parseCotizacionTokenFromUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  const match = trimmed.match(/\/cotizacion\/([A-Za-z0-9_-]+)/i);
  if (match) return match[1];
  if (/^[A-Za-z0-9_-]{16,}$/.test(trimmed)) return trimmed;
  return null;
}
