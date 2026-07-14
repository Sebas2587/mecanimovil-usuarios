/**
 * Utilidades compartidas para formatear datos de proveedores en cards.
 * Usar esta función en todos los lugares donde se muestren cards de proveedores
 * para garantizar información consistente sin excepciones.
 */

import Constants from 'expo-constants';
import serverConfig from '../config/serverConfig';
import { getAxiosMediaBaseSync } from '../services/api';
import { COLORS as DS } from '../design-system/tokens/colors';

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
 * Paleta KPI = etiquetas suaves del design system (mismo lenguaje que Tag).
 * No usar hex del API: suelen traer slate/Tailwind fuera de marca.
 */
export const KPI_TIER_PALETTE = {
  ELITE: {
    bg_color: DS.accent[50],
    text_color: DS.accent[700],
    border_color: DS.accent[100],
    tagVariant: 'accent',
  },
  MASTER: {
    bg_color: DS.primary[50],
    text_color: DS.primary[700],
    border_color: DS.primary[100],
    tagVariant: 'primary',
  },
  PRO: {
    bg_color: DS.success.light,
    text_color: DS.success.dark,
    border_color: DS.success[100],
    tagVariant: 'success',
  },
  ASCENSO: {
    bg_color: DS.warning.light,
    text_color: DS.warning.darker,
    border_color: DS.warning[200],
    tagVariant: 'warning',
  },
  EN_PROGRESO: {
    bg_color: DS.neutral.gray[100],
    text_color: DS.text.secondary,
    border_color: DS.border.light,
    tagVariant: 'neutral',
  },
  SIN_ACTIVIDAD: {
    bg_color: DS.neutral.gray[100],
    text_color: DS.text.tertiary,
    border_color: DS.border.light,
    tagVariant: 'neutral',
  },
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

export function isProviderMultimarca(provider) {
  if (provider?._esMultimarca) return true;
  const tipo = provider?.tipo_cobertura_marca;
  if (tipo === 'multimarca') return true;
  if (tipo === 'especialista' || tipo === 'por_marca') return false;
  if (!tipo && !(provider?.marcas_atendidas_nombres?.length > 0)) return true;
  return false;
}

export function tagProviderMarcaFlags(provider) {
  const mm = isProviderMultimarca(provider);
  return { ...provider, _esMultimarca: mm, _esEspecialistaMarca: !mm };
}

/** Legacy helper: solo especialistas (ya no se usa en Destacados; ver destacadosMatching). */
export function filterProvidersEspecialistasMarca(providers) {
  return (providers || []).filter((p) => !isProviderMultimarca(p));
}

/** Especialistas en la marca del vehículo primero; luego orden KPI. */
export function compareProvidersByMarcaThenKpi(a, b) {
  const aMm = isProviderMultimarca(a);
  const bMm = isProviderMultimarca(b);
  if (aMm !== bMm) return aMm ? 1 : -1;
  return compareProvidersByKpiRelevance(a, b);
}

function _distanceKmForSort(p) {
  const v = p?.distance ?? p?.distancia_km ?? p?.distancia;
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : Infinity;
}

/** Especialistas primero; luego distancia ascendente. */
export function compareProvidersByMarcaThenDistance(a, b) {
  const aMm = isProviderMultimarca(a);
  const bMm = isProviderMultimarca(b);
  if (aMm !== bMm) return aMm ? 1 : -1;
  return _distanceKmForSort(a) - _distanceKmForSort(b);
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

/**
 * Servicios terminados en ventana KPI (checklist inicio+fin) o histórico en listados.
 */
export const getProviderTerminatedServicesInPeriod = (provider, kpiBadge) => {
  const fromBadge = kpiBadge?.servicios_terminados_en_periodo;
  if (fromBadge != null && fromBadge !== '') {
    const n = Number(fromBadge);
    if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  }
  return getProviderCompletedServicesCount(provider);
};

/**
 * Si debe mostrarse insignia KPI alta en cards de usuarios (Elite/Máster/Pro).
 */
export const shouldShowPublicKpiTier = (kpiBadge, provider) => {
  if (!kpiBadge || typeof kpiBadge !== 'object') return false;
  const code = kpiBadge.code != null ? String(kpiBadge.code).trim().toUpperCase() : '';
  if (!code || code === 'SIN_ACTIVIDAD') return false;
  const highTier = code === 'ELITE' || code === 'MASTER' || code === 'PRO';
  const terminados = getProviderTerminatedServicesInPeriod(provider, kpiBadge);
  if (highTier && terminados < 1) return false;
  if (highTier && !kpiBadge.is_active) return false;
  return true;
};

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
/** kpi_badge del listado o del retrieve de ficha; evita perderlo al fusionar objetos. */
export function resolveProviderKpiBadge(provider) {
  const badge = provider?.kpi_badge;
  return badge && typeof badge === 'object' ? badge : null;
}

/**
 * Al abrir perfil desde el home, conservar el badge del listado (mismo que la card).
 */
export function mergeProviderKpiBadge(initialBadge, detailBadge) {
  if (initialBadge && typeof initialBadge === 'object') return initialBadge;
  return detailBadge && typeof detailBadge === 'object' ? detailBadge : null;
}

export const getKpiTierPresentation = (kpiBadge, provider = null, options = {}) => {
  if (!kpiBadge || typeof kpiBadge !== 'object') return null;

  const trustBadgeFields = options.trustBadgeFields === true;
  const apiCode = kpiBadge.code != null ? String(kpiBadge.code).trim().toUpperCase() : '';
  const highTier = apiCode === 'ELITE' || apiCode === 'MASTER' || apiCode === 'PRO';
  if (highTier && provider != null && !trustBadgeFields && !shouldShowPublicKpiTier(kpiBadge, provider)) {
    return null;
  }
  if (highTier && provider == null) {
    const terminados = getProviderTerminatedServicesInPeriod(null, kpiBadge);
    if (terminados < 1 || !kpiBadge.is_active) return null;
  }
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

  return {
    label,
    bg_color: palette.bg_color,
    text_color: palette.text_color,
    border_color: palette.border_color,
    tagVariant: palette.tagVariant || 'neutral',
    styleCode,
    reason: kpiBadge.reason != null ? String(kpiBadge.reason).trim() : '',
  };
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

const DIA_SEMANA_LABELS = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

export function formatHorarioHoraDisplay(h) {
  if (!h) return '';
  const s = String(h).trim();
  const parts = s.split(':');
  if (parts.length >= 2) {
    const hh = parts[0].padStart(2, '0');
    const mm = parts[1].padStart(2, '0');
    return `${hh}:${mm}`;
  }
  return s.slice(0, 5);
}

export function isHorarioDiaActivo(it) {
  const activo = it?.activo;
  if (activo === false || activo === 0 || activo === '0' || activo === 'false') {
    return false;
  }
  return Boolean(activo);
}

/** True si hay al menos un día con ventana horaria activa. */
export function weeklyHorariosHasAnyActiveSlot(horarios) {
  const items = Array.isArray(horarios) ? horarios : [];
  return items.some((it) => {
    const d = Number(it?.dia_semana);
    if (!Number.isFinite(d) || d < 0 || d > 6) return false;
    return isHorarioDiaActivo(it) && it?.hora_inicio && it?.hora_fin;
  });
}

/**
 * Agrupa solo días activos consecutivos que comparten el mismo rango horario.
 * Días activos no consecutivos o con horario distinto → filas separadas.
 */
export function buildWeeklyScheduleDisplayGroups(horarios) {
  const items = Array.isArray(horarios) ? horarios : [];
  const activeByDay = new Map();

  items.forEach((it) => {
    const d = Number(it?.dia_semana);
    if (!Number.isFinite(d) || d < 0 || d > 6) return;
    if (!isHorarioDiaActivo(it) || !it?.hora_inicio || !it?.hora_fin) return;
    activeByDay.set(d, {
      dia: d,
      hora_inicio: formatHorarioHoraDisplay(it.hora_inicio),
      hora_fin: formatHorarioHoraDisplay(it.hora_fin),
    });
  });

  const activeDays = [...activeByDay.values()].sort((a, b) => a.dia - b.dia);
  if (activeDays.length === 0) return [];

  const groups = [];
  let cur = null;

  activeDays.forEach((day) => {
    const sameAsCur =
      cur &&
      cur.hora_inicio === day.hora_inicio &&
      cur.hora_fin === day.hora_fin &&
      day.dia === cur.endDia + 1;

    if (!cur || !sameAsCur) {
      if (cur) groups.push(cur);
      cur = {
        startDia: day.dia,
        endDia: day.dia,
        hora_inicio: day.hora_inicio,
        hora_fin: day.hora_fin,
      };
    } else {
      cur.endDia = day.dia;
    }
  });
  if (cur) groups.push(cur);

  return groups.map((g) => ({
    startDia: g.startDia,
    endDia: g.endDia,
    dayLabel:
      g.startDia === g.endDia
        ? DIA_SEMANA_LABELS[g.startDia]
        : `${DIA_SEMANA_LABELS[g.startDia]}–${DIA_SEMANA_LABELS[g.endDia]}`,
    hoursLabel: `${g.hora_inicio} - ${g.hora_fin}`,
  }));
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
  if (!slot || !isHorarioDiaActivo(slot) || !slot.hora_inicio || !slot.hora_fin) return false;
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
/** Pin inventado histórico Santiago centro — no mostrar km falso. */
const DEFAULT_SANTIAGO_LAT = -33.4489;
const DEFAULT_SANTIAGO_LNG = -70.6693;

function providerLooksLikeDefaultSantiagoPin(provider) {
  const u = provider?.ubicacion;
  let lat;
  let lng;
  if (u?.coordinates?.length >= 2) {
    lng = Number(u.coordinates[0]);
    lat = Number(u.coordinates[1]);
  } else {
    lat = Number(provider?.latitud ?? provider?.latitude);
    lng = Number(provider?.longitud ?? provider?.longitude);
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return Math.abs(lat - DEFAULT_SANTIAGO_LAT) < 0.00015 && Math.abs(lng - DEFAULT_SANTIAGO_LNG) < 0.00015;
}

/**
 * Devuelve la distancia formateada del proveedor o null.
 */
export const getProviderDistance = (provider) => {
  if (providerLooksLikeDefaultSantiagoPin(provider)) return null;
  const raw = provider?.distance ?? provider?.distancia_km ?? provider?.distancia;
  if (raw == null || raw === '') return null;
  let d =
    typeof raw === 'number'
      ? raw
      : parseFloat(String(raw).replace(',', '.'));
  if (!Number.isFinite(d) || d < 0) return null;
  // API / Haversine usan km. Solo convertir metros inequívocos (>= 1000).
  // Antes: d>50 ÷1000 convertía 189.67 km → “190m” (Mauricio en Coquimbo).
  if (d >= 1000) d /= 1000;
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

/** Servicios completados en plataforma (`servicios_completados` / anotación en listados). */
export const getProviderCompletedServicesCount = (provider) => {
  const raw =
    provider?.servicios_completados ??
    provider?.servicios_completados_count ??
    provider?.trabajos_realizados ??
    0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
};

/** Etiqueta corta para badge de demanda en card (Coinbase). */
export const formatProviderBookingsBadgeLabel = (countOrProvider) => {
  const n =
    typeof countOrProvider === 'number'
      ? Math.max(0, Math.floor(countOrProvider))
      : getProviderCompletedServicesCount(countOrProvider);
  if (n <= 0) return null;
  if (n === 1) return '1 contratación';
  if (n >= 1000) return `${Math.floor(n / 1000)}k+ contrataciones`;
  return `${n} contrataciones`;
};

export const formatProviderReviewsBadgeLabel = (count, { emptyLabel = null } = {}) => {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  if (n <= 0) return emptyLabel;
  if (n === 1) return '1 reseña';
  if (n >= 1000) return `${Math.floor(n / 1000)}k+ reseñas`;
  return `${n} reseñas`;
};

/**
 * Conexión realtime del proveedor (app abierta / heartbeat).
 * Prioriza `status` de ConnectionStatus; no confía en defaults ambiguos.
 */
export const isProviderRealtimeOnline = (provider) => {
  if (!provider || typeof provider !== 'object') return false;
  const nested = provider.connection_status;
  const status = String(
    provider.status ?? nested?.status ?? '',
  ).toLowerCase();
  if (status === 'online' || status === 'busy') return true;
  if (status === 'offline') return false;

  const flag =
    provider.esta_conectado ??
    provider.is_online ??
    nested?.esta_conectado ??
    nested?.is_online;
  return flag === true;
};

export const formatProviderForCard = (provider) => {
  const candidates = getProviderImageCandidatesResolved(provider);
  return {
    id: provider?.id,
    name: provider?.nombre || 'Proveedor',
    specialty: getProviderSpecialty(provider),
    rating: getProviderRating(provider),
    reviews: getProviderReviews(provider),
    bookingsCount: getProviderCompletedServicesCount(provider),
    distance: getProviderDistance(provider),
    verified: provider?.verificado ?? false,
    image: candidates[0] || null,
    imageCandidates: candidates,
    serviceOffers: getPanelServicios(provider),
  };
};
