/**
 * Utilidades compartidas para formatear datos de proveedores en cards.
 * Usar esta función en todos los lugares donde se muestren cards de proveedores
 * para garantizar información consistente sin excepciones.
 */

import Constants from 'expo-constants';
import serverConfig from '../config/serverConfig';
import { getAxiosMediaBaseSync } from '../services/api';

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
    })() ||
    getAxiosMediaBaseSync();

  if (!base) return s.startsWith('/') ? s : null;

  if (s.startsWith('/media/')) return `${base}${s}`;
  if (s.startsWith('/')) return `${base}${s}`;
  return `${base}/media/${s.replace(/^\//, '')}`;
};

/**
 * Prioridad de foto: URLs absolutas del backend primero (*_url), luego campos crudos.
 * Así el campo ya resuelto por cPanel/storage se usa directamente sin re-resolución incorrecta.
 */
function buildProfileOrderedRawPhotos(provider) {
  const seq = [
    provider?.foto_perfil_url,
    provider?.usuario?.foto_perfil_url,
    provider?.foto_perfil,
    provider?.usuario?.foto_perfil,
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
  const candidates = buildProfileOrderedRawPhotos(provider);
  for (const raw of candidates) {
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
 * Paleta por código KPI (mismos umbrales y hex que `kpi_badge_utils.py` en backend).
 */
export const KPI_TIER_PALETTE = {
  ELITE: { bg_color: '#7C3AED', text_color: '#FFFFFF', border_color: '#A78BFA' },
  MASTER: { bg_color: '#2563EB', text_color: '#FFFFFF', border_color: '#93C5FD' },
  PRO: { bg_color: '#059669', text_color: '#FFFFFF', border_color: '#6EE7B7' },
  ASCENSO: { bg_color: '#F59E0B', text_color: '#111827', border_color: '#FCD34D' },
  EN_PROGRESO: { bg_color: '#0F172A', text_color: '#E2E8F0', border_color: '#1F2937' },
  SIN_ACTIVIDAD: { bg_color: '#334155', text_color: '#F8FAFC', border_color: '#475569' },
};

function parseKpiScore(value) {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (Number.isNaN(n)) return null;
  return Math.max(0, Math.min(100, n));
}

/**
 * Tupla ordenable alineada con `_kpi_rank_tuple` del backend (mayor = mejor relevancia).
 * @returns {[number, number, number, number]}
 */
export function kpiRankTuple(kpiBadge) {
  if (!kpiBadge || typeof kpiBadge !== 'object') return [0, 0, 0, 0];
  const isActive = kpiBadge.is_active ? 1 : 0;
  const code = kpiBadge.code != null ? String(kpiBadge.code).trim().toUpperCase() : '';
  const tier = { ELITE: 4, MASTER: 3, PRO: 2, ASCENSO: 1 }[code] || 0;
  const score = parseKpiScore(kpiBadge.score) ?? 0;
  const sample = Number(kpiBadge.sample_points);
  const samplePoints = Number.isFinite(sample) ? sample : 0;
  return [isActive, tier, score, samplePoints];
}

/** Compara dos proveedores por KPI (desc) y rating como desempate. */
export function compareProvidersByKpiRelevance(a, b) {
  const ta = kpiRankTuple(a?.kpi_badge);
  const tb = kpiRankTuple(b?.kpi_badge);
  for (let i = 0; i < 4; i += 1) {
    if (tb[i] !== ta[i]) return tb[i] - ta[i];
  }
  const ra = parseFloat(a?.calificacion_promedio ?? a?.rating_average ?? 0) || 0;
  const rb = parseFloat(b?.calificacion_promedio ?? b?.rating_average ?? 0) || 0;
  if (rb !== ra) return rb - ra;
  const sa = Number(a?.servicios_completados_count) || 0;
  const sb = Number(b?.servicios_completados_count) || 0;
  return sb - sa;
}

/** Misma escala que backend: ≥90 Elite, ≥75 Máster, ≥55 Pro, si no En ascenso. */
export function kpiTierCodeFromScore(score) {
  if (score == null || Number.isNaN(score)) return null;
  if (score >= 90) return 'ELITE';
  if (score >= 75) return 'MASTER';
  if (score >= 55) return 'PRO';
  return 'ASCENSO';
}

function isValidHexColor(s) {
  return typeof s === 'string' && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(s.trim());
}

/**
 * Texto corto de etiqueta de nivel (sin % ni métricas). Alineado con kpi_badge del backend.
 */
export const getProviderTierLabel = (kpiBadge) => {
  if (!kpiBadge) return null;
  const short = kpiBadge.short_label != null ? String(kpiBadge.short_label).trim() : '';
  if (short) return short;
  const codeKey = kpiBadge.code != null ? String(kpiBadge.code).trim().toUpperCase() : '';
  if (codeKey && KPI_CODE_DISPLAY[codeKey]) return KPI_CODE_DISPLAY[codeKey];
  const lab = (kpiBadge.label || '').replace(/^KPI\s+/i, '').trim();
  return lab || null;
};

/**
 * Etiqueta + colores para pills KPI en cards (prioriza API; infiere tier por score si falta code).
 * @returns {{ label: string, bg_color: string, text_color: string, border_color: string, styleCode: string } | null}
 */
export const getKpiTierPresentation = (kpiBadge) => {
  if (!kpiBadge || typeof kpiBadge !== 'object') return null;

  const apiCode = kpiBadge.code != null ? String(kpiBadge.code).trim().toUpperCase() : '';
  const score = parseKpiScore(kpiBadge.score);
  const staticSample = apiCode === 'EN_PROGRESO' || apiCode === 'SIN_ACTIVIDAD';
  const knownTier = apiCode === 'ELITE' || apiCode === 'MASTER' || apiCode === 'PRO' || apiCode === 'ASCENSO';

  let styleCode = null;
  if (staticSample) styleCode = apiCode;
  else if (knownTier) styleCode = apiCode;
  else if (score != null) styleCode = kpiTierCodeFromScore(score);
  else if (apiCode && KPI_CODE_DISPLAY[apiCode]) styleCode = apiCode;

  let label = getProviderTierLabel(kpiBadge);
  if (!label && styleCode && KPI_CODE_DISPLAY[styleCode]) {
    label = KPI_CODE_DISPLAY[styleCode];
  }
  if (!label && score != null) {
    const inferred = kpiTierCodeFromScore(score);
    if (inferred && KPI_CODE_DISPLAY[inferred]) label = KPI_CODE_DISPLAY[inferred];
  }
  if (!label) return null;
  if (!styleCode) {
    if (score != null) {
      styleCode = kpiTierCodeFromScore(score);
    } else {
      const sl = kpiBadge.short_label != null ? String(kpiBadge.short_label).trim() : '';
      const fromShort =
        sl &&
        Object.keys(KPI_CODE_DISPLAY).find(
          (c) => KPI_CODE_DISPLAY[c].toLowerCase() === sl.toLowerCase()
        );
      styleCode = fromShort || 'EN_PROGRESO';
    }
  }

  const palette = KPI_TIER_PALETTE[styleCode] || KPI_TIER_PALETTE.EN_PROGRESO;
  const bg_color = isValidHexColor(kpiBadge.bg_color) ? kpiBadge.bg_color.trim() : palette.bg_color;
  const text_color = isValidHexColor(kpiBadge.text_color) ? kpiBadge.text_color.trim() : palette.text_color;
  const border_color = isValidHexColor(kpiBadge.border_color) ? kpiBadge.border_color.trim() : palette.border_color;

  return { label, bg_color, text_color, border_color, styleCode };
};

/** `dia_semana` del API: 0=Lunes … 6=Domingo (igual que Python weekday). */
export function jsDateToBackendDiaSemana(date) {
  const d = date instanceof Date ? date : new Date(date);
  const js = d.getDay(); // 0=Dom … 6=Sáb
  return js === 0 ? 6 : js - 1;
}

function parseHorarioToMinutes(timeStr) {
  if (timeStr == null || timeStr === '') return null;
  const parts = String(timeStr).trim().split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1] || '0', 10);
  if (Number.isNaN(h)) return null;
  return h * 60 + (Number.isNaN(m) ? 0 : m);
}

/** True si hay al menos un día con ventana horaria activa (misma lógica que ProviderScheduleSection). */
export function weeklyHorariosHasAnyActiveSlot(horarios) {
  const items = Array.isArray(horarios) ? horarios : [];
  return items.some((it) => {
    const d = Number(it?.dia_semana);
    if (!Number.isFinite(d) || d < 0 || d > 6) return false;
    return !!it?.activo && it?.hora_inicio && it?.hora_fin;
  });
}

/**
 * Si el proveedor atiende "ahora" según horarios semanales del API (hora local del dispositivo).
 * Rango [hora_inicio, hora_fin): a las 18:00 ya no cuenta como dentro si fin es 18:00.
 */
export function isProviderOpenAccordingToWeeklyHorarios(horarios, now = new Date()) {
  if (!weeklyHorariosHasAnyActiveSlot(horarios)) return false;
  const dia = jsDateToBackendDiaSemana(now);
  const items = Array.isArray(horarios) ? horarios : [];
  const slot = items.find((it) => Number(it?.dia_semana) === dia);
  if (!slot || !slot.activo || !slot.hora_inicio || !slot.hora_fin) return false;
  const start = parseHorarioToMinutes(slot.hora_inicio);
  const end = parseHorarioToMinutes(slot.hora_fin);
  if (start == null || end == null || end <= start) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  return cur >= start && cur < end;
}

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
 * Devuelve la calificación formateada (string "4.5") o null si no hay datos útiles.
 * Usa los mismos campos que expone el backend en talleres/mecánicos (lista y cerca).
 */
export const getProviderRating = (provider) => {
  // Misma fuente que ProviderDetailScreen (endpoint reviews / modelo Review en API).
  const fromReviews =
    provider?.rating_average != null && provider?.rating_average !== ''
      ? provider.rating_average
      : null;

  const raw =
    fromReviews ??
    provider?.calificacion_promedio ??
    provider?.rating ??
    provider?.calificacion ??
    provider?.promedio_calificaciones ??
    null;

  const reviewCount = Number(
    provider?.rating_reviews_count ??
      provider?.numero_de_calificaciones ??
      provider?.total_resenas ??
      provider?.total_reviews ??
      provider?.reviews_count ??
      0
  );

  if (raw == null || raw === '') {
    return reviewCount > 0 ? '0.0' : null;
  }

  const normalized = String(raw).trim().replace(',', '.');
  const parsed = parseFloat(normalized);
  if (Number.isNaN(parsed)) {
    return reviewCount > 0 ? '0.0' : null;
  }

  // Sin reseñas y promedio en 0: no mostrar badge numérico engañoso
  if (reviewCount === 0 && parsed <= 0) {
    return null;
  }

  return parsed.toFixed(1);
};

/**
 * Devuelve el número de reseñas del proveedor.
 */
export const getProviderReviews = (provider) =>
  provider?.rating_reviews_count ??
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
/** Ofertas resumidas del panel (`panel_servicios` del backend). */
export const getPanelServicios = (provider) => {
  const raw = provider?.panel_servicios;
  if (!Array.isArray(raw)) return [];
  return raw.filter((item) => item && (item.nombre || item.servicio_id));
};

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
    serviceOffers: getPanelServicios(provider),
  };
};
