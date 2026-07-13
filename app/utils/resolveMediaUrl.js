import { getMediaURL } from '../services/api';
import { buildProviderAvatarUri, resolveToAbsoluteMediaUrl } from './providerUtils';

/**
 * Resuelve una ruta/URL de media (Cloudflare R2 o /media local) al patrón
 * usado en OfertaCard / VehicleHealthCard / Header: http(s) directo o getMediaURL async.
 */
export async function resolveMediaUrlAsync(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw !== 'string') {
    const asString = String(raw).trim();
    if (!asString || asString === '[object Object]') return null;
    return resolveMediaUrlAsync(asString);
  }
  const path = raw.trim();
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('file://') || path.startsWith('content://') || path.startsWith('blob:')) {
    return path;
  }
  try {
    return await getMediaURL(path);
  } catch (_) {
    return resolveToAbsoluteMediaUrl(path);
  }
}

/** Primera URL válida de una lista de candidatos (raw paths o URLs). */
export async function resolveFirstMediaUrlAsync(candidates) {
  const list = Array.isArray(candidates) ? candidates : [candidates];
  const seen = new Set();
  for (const raw of list) {
    if (raw == null || raw === '') continue;
    const key = typeof raw === 'string' ? raw.trim() : String(raw);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const url = await resolveMediaUrlAsync(raw);
    if (url) return url;
  }
  return null;
}

/**
 * Candidatos de foto de proveedor en una oferta (mismo orden que OfertaCard + buildProviderAvatarUri).
 */
export function collectOfertaProveedorFotoCandidates(oferta) {
  if (!oferta) return [];
  const fromBuilders = [
    buildProviderAvatarUri(oferta.proveedor_info),
    buildProviderAvatarUri(oferta.taller_info),
    buildProviderAvatarUri(oferta.mecanico_info),
    buildProviderAvatarUri(oferta.proveedor),
  ].filter(Boolean);

  return [
    oferta.proveedor_foto,
    oferta.proveedor_foto_url,
    oferta.foto_proveedor,
    oferta.foto_perfil_url,
    ...fromBuilders,
    oferta.proveedor_info?.foto,
    oferta.proveedor_info?.foto_perfil_url,
    oferta.proveedor_info?.usuario?.foto_perfil_url,
    oferta.taller_info?.foto_perfil_url,
    oferta.taller_info?.usuario?.foto_perfil_url,
    oferta.mecanico_info?.foto_perfil_url,
    oferta.mecanico_info?.usuario?.foto_perfil_url,
    oferta.proveedor_info?.foto_perfil,
    oferta.proveedor_info?.usuario?.foto_perfil,
    oferta.taller_info?.foto_perfil,
    oferta.taller_info?.usuario?.foto_perfil,
    oferta.mecanico_info?.foto_perfil,
    oferta.mecanico_info?.usuario?.foto_perfil,
  ].filter(Boolean);
}

export function collectVehiculoFotoCandidates(vehiculo) {
  if (!vehiculo) return [];
  return [
    vehiculo.foto,
    vehiculo.foto_url,
    vehiculo.imagen,
    vehiculo.imagen_url,
  ].filter(Boolean);
}

export function resolveVehiculoId(vehiculo, solicitud) {
  if (vehiculo?.id != null) return vehiculo.id;
  const raw = solicitud?.vehiculo;
  if (raw == null) return null;
  if (typeof raw === 'object') return raw.id ?? null;
  return raw;
}
