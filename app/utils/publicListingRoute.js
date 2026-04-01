import { Platform } from 'react-native';

/**
 * ID de vehículo en ruta pública /marketplace/vehicle/:id (web, pathname).
 */
export function getMarketplaceVehicleIdFromWebPath() {
  if (Platform.OS !== 'web') return null;
  if (typeof window === 'undefined') return null;
  const raw = String(window.location?.pathname || '');
  const path = raw.split('?')[0].split('#')[0];
  const m = path.match(/\/marketplace\/vehicle\/(\d+)\/?$/i);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Extrae vehicleId de una URL (deep link o https).
 */
export function parseMarketplaceVehicleIdFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const m = url.match(/marketplace\/vehicle\/(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Extrae type + id de URL de ficha pública de proveedor (deep link o https).
 * Ej.: mecanimovil://provider/taller/42, https://host/provider/mecanico/5/nombre-slug
 */
export function parsePublicProviderFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const m = url.match(/provider\/(taller|mecanico|proveedor)\/(\d+)/i);
  if (!m) return null;
  const rawType = m[1].toLowerCase();
  const type = rawType === 'proveedor' ? 'taller' : rawType;
  const id = parseInt(m[2], 10);
  if (Number.isNaN(id)) return null;
  return { type, id };
}

/**
 * Unifica params de navegación (deep link usa type/id; código legacy providerType/providerId).
 */
export function normalizeProviderRouteParams(params) {
  if (!params || typeof params !== 'object') {
    return { providerType: 'taller', providerId: null };
  }
  const rawId = params.providerId ?? params.id;
  let providerId = null;
  if (rawId !== undefined && rawId !== null && rawId !== '') {
    const n = typeof rawId === 'number' ? rawId : parseInt(String(rawId), 10);
    providerId = Number.isFinite(n) ? n : null;
  }
  const rawType = params.providerType ?? params.type ?? 'taller';
  const t = typeof rawType === 'string' ? rawType.toLowerCase() : 'taller';
  const providerType = t === 'proveedor' ? 'taller' : t === 'mecanico' ? 'mecanico' : 'taller';
  return { providerType, providerId };
}

/**
 * Parses /provider/:type/:id from web location (navegador / WhatsApp → Chrome).
 * Sin ancla ^: tolera subrutas; opcional slug tras el id; fallback en hash (#/provider/...).
 */
export function getPublicProviderFromWebPath() {
  if (Platform.OS !== 'web') return null;
  if (typeof window === 'undefined') return null;
  const raw = String(window.location?.pathname || '');
  const path = raw.split('?')[0].split('#')[0];
  const hash = String(window.location?.hash || '').replace(/^#\/?/, '');
  let m = path.match(/\/provider\/(taller|mecanico|proveedor)\/(\d+)/i);
  if (!m && hash) {
    m = hash.match(/provider\/(taller|mecanico|proveedor)\/(\d+)/i);
  }
  if (m) {
    const rawType = m[1].toLowerCase();
    const type = rawType === 'proveedor' ? 'taller' : rawType;
    const providerId = parseInt(m[2], 10);
    if (Number.isNaN(providerId)) return null;
    const data = { providerType: type, providerId };
    console.log('🔗 [WebRoute] Detectada ficha pública de proveedor:', data);
    return data;
  }
  return null;
}
