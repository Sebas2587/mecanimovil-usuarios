/**
 * Utilidades compartidas para formatear datos de proveedores en cards.
 * Usar esta función en todos los lugares donde se muestren cards de proveedores
 * para garantizar información consistente sin excepciones.
 */

import Constants from 'expo-constants';
import serverConfig from '../config/serverConfig';

/**
 * Convierte rutas relativas del backend (/media/..., proveedores/...) en URL absoluta
 * para que expo-image cargue bien en dispositivo (el API puede devolver solo path).
 */
export const resolveToAbsoluteMediaUrl = (raw) => {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  if (s.startsWith('file://') || s.startsWith('content://')) return s;

  const fromConfig = serverConfig.getMediaURL && serverConfig.getMediaURL();
  const base =
    (fromConfig && String(fromConfig).replace(/\/$/, '')) ||
    (() => {
      const api = Constants.expoConfig?.extra?.apiUrl || Constants.expoConfig?.extra?.API_URL;
      if (api && typeof api === 'string') {
        return api.replace(/\/api\/?$/i, '').replace(/\/$/, '');
      }
      return null;
    })();

  if (!base) return s.startsWith('/') ? s : null;

  if (s.startsWith('/media/')) return `${base}${s}`;
  if (s.startsWith('/')) return `${base}${s}`;
  return `${base}/media/${s.replace(/^\//, '')}`;
};

/**
 * Misma prioridad que ProviderHeader (perfil proveedor): foto del proveedor, luego usuario, luego *_url.
 */
function buildProfileOrderedRawPhotos(provider) {
  const seq = [
    provider?.foto_perfil,
    provider?.usuario?.foto_perfil,
    provider?.foto_perfil_url,
    provider?.usuario?.foto_perfil_url,
    provider?.imagen,
  ];
  const out = [];
  const seen = new Set();
  for (const x of seq) {
    if (x == null) continue;
    const s = String(x).trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

/**
 * URL absoluta principal para avatar (perfil / cards). Misma lógica de origen que ProviderHeader + resolución media.
 */
export const buildProviderAvatarUri = (provider) => {
  for (const raw of buildProfileOrderedRawPhotos(provider)) {
    const abs = resolveToAbsoluteMediaUrl(raw);
    if (abs) return abs;
  }
  return null;
};

const KPI_CODE_DISPLAY = {
  ELITE: 'Elite',
  MASTER: 'Máster',
  PRO: 'Pro',
  ASCENSO: 'En ascenso',
  EN_PROGRESO: 'En progreso',
  SIN_ACTIVIDAD: 'Sin actividad',
};

/**
 * Texto corto de etiqueta de nivel (sin % ni métricas). Alineado con kpi_badge del backend.
 */
export const getProviderTierLabel = (kpiBadge) => {
  if (!kpiBadge) return null;
  const short = kpiBadge.short_label != null ? String(kpiBadge.short_label).trim() : '';
  if (short) return short;
  const code = kpiBadge.code;
  if (code && KPI_CODE_DISPLAY[code]) return KPI_CODE_DISPLAY[code];
  const lab = (kpiBadge.label || '').replace(/^KPI\s+/i, '').trim();
  return lab || null;
};

/**
 * Devuelve la cadena de especialidad/marcas de un proveedor.
 * Prioridad: marcas_atendidas_nombres → especialidades_nombres → especialidades[].nombre → fallback
 */
export const getProviderSpecialty = (provider, fallback = 'Especialidad general') => {
  if (provider?.marcas_atendidas_nombres?.length > 0) {
    return provider.marcas_atendidas_nombres.join(', ');
  }
  if (provider?.especialidades_nombres?.length > 0) {
    return provider.especialidades_nombres.join(', ');
  }
  if (Array.isArray(provider?.especialidades) && provider.especialidades.length > 0) {
    return provider.especialidades
      .map((e) => e?.nombre || e)
      .filter(Boolean)
      .join(', ');
  }
  return fallback;
};

/**
 * Devuelve la calificación formateada (string "4.5") o null si no hay datos.
 */
export const getProviderRating = (provider) => {
  const raw =
    provider?.calificacion_promedio ??
    provider?.rating ??
    provider?.calificacion ??
    null;
  if (raw == null) return null;
  const parsed = parseFloat(raw);
  return isNaN(parsed) ? null : parsed > 0 ? parsed.toFixed(1) : null;
};

/**
 * Devuelve el número de reseñas del proveedor.
 */
export const getProviderReviews = (provider) =>
  provider?.numero_de_calificaciones ??
  provider?.total_resenas ??
  provider?.total_reviews ??
  provider?.reviews_count ??
  0;

/**
 * Devuelve la URL de foto del proveedor (misma prioridad que perfil), ya absoluta si es posible.
 */
export const getProviderImage = (provider) => buildProviderAvatarUri(provider);

/**
 * Lista de URLs absolutas candidatas (para fallback si la primera falla al cargar).
 */
export const getProviderImageCandidatesResolved = (provider) => {
  const seen = new Set();
  const out = [];
  for (const raw of buildProfileOrderedRawPhotos(provider)) {
    const abs = resolveToAbsoluteMediaUrl(raw);
    if (abs && !seen.has(abs)) {
      seen.add(abs);
      out.push(abs);
    }
  }
  return out;
};

/**
 * Devuelve la distancia formateada del proveedor o null.
 */
export const getProviderDistance = (provider) => {
  const km =
    provider?.distance ??
    provider?.distancia_km ??
    provider?.distancia ??
    null;
  if (km == null) return null;
  const d = parseFloat(km);
  if (isNaN(d)) return null;
  if (d < 0.1) return '< 100m';
  if (d < 1) return `${Math.round(d * 1000)}m`;
  if (d < 10) return `${d.toFixed(1)} km`;
  return `${Math.round(d)} km`;
};

/**
 * Formatea un proveedor al shape que espera ProviderPreviewCard.
 * Usar esta función en UserPanelScreen, TalleresScreen, MecanicosScreen
 * y cualquier otra pantalla que muestre ProviderPreviewCard.
 */
export const formatProviderForCard = (provider) => {
  const candidates = getProviderImageCandidatesResolved(provider);
  return {
    id: provider?.id,
    name: provider?.nombre || 'Proveedor',
    specialty: getProviderSpecialty(provider),
    rating: getProviderRating(provider),
    reviews: getProviderReviews(provider),
    distance: getProviderDistance(provider),
    verified: provider?.verificado ?? false,
    image: candidates[0] || null,
    imageCandidates: candidates,
  };
};
