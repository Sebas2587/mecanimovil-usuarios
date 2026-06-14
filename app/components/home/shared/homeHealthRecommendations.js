/**
 * Normaliza respuesta de GET .../health/vehicle/{id}/components/ (array o paginado).
 */
import { formatHealthActionWindow } from '../../../utils/healthFormat';

export function normalizeHealthComponentsList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.componentes)) return data.componentes;
  return [];
}

const ALERT_PRIORITY = {
  CRITICO: 0,
  URGENTE: 1,
};

const ALERT_LEVEL_LABELS = {
  CRITICO: 'Crítico',
  URGENTE: 'Urgente',
};

/**
 * Palabras clave por slug → qué debe contener el NOMBRE del servicio para
 * considerarse relevante para ese componente.
 * Incluye slugs en inglés (legacy) y en español (slugs actuales de la BD).
 */
const SLUG_SERVICE_KEYWORDS = {
  // ── Inglés (slugs legacy) ────────────────────────────────────────────────
  tires: ['neumatico', 'neumático', 'goma', 'llanta', 'rotacion', 'rotación', 'alineacion', 'alineación', 'balanceo'],
  brakes: ['pastilla', 'freno'],
  'brake-discs': ['disco', 'rectificado', 'pastilla', 'freno'],
  'brake-fluid': ['liquido de freno', 'líquido de freno', 'liquido frenos'],
  oil: ['aceite motor', 'cambio de aceite', 'aceite y filtro'],
  'oil-filter': ['filtro de aceite', 'filtro aceite', 'aceite motor y filtro'],
  'air-filter': ['filtro de aire', 'filtro aire'],
  'cabin-filter': ['filtro habitaculo', 'filtro habitáculo', 'filtro cabina', 'habitaculo', 'habitáculo'],
  'spark-plug': ['bujia', 'bujía'],
  battery: ['bateria', 'batería'],
  coolant: ['refrigerante'],
  shocks: ['amortiguador'],
  'timing-belt': ['correa', 'distribucion', 'distribución'],
  exhaust: ['dpf', 'particula', 'partícula', 'filtro de part', 'escape'],
  adblue: ['adblue', 'urea'],
  // ── Español (slugs actuales de la BD) ────────────────────────────────────
  neumaticos: ['neumatico', 'neumático', 'goma', 'llanta', 'rotacion', 'rotación', 'alineacion', 'alineación', 'balanceo'],
  'pastillas-freno': ['pastilla', 'freno'],
  'discos-freno': ['disco', 'rectificado', 'pastilla', 'freno'],
  'liquido-frenos': ['liquido de freno', 'líquido de freno', 'liquido frenos'],
  'aceite-motor': ['aceite motor', 'cambio de aceite', 'aceite y filtro'],
  'filtro-aceite': ['filtro de aceite', 'filtro aceite', 'aceite motor y filtro'],
  'filtro-aire': ['filtro de aire', 'filtro aire'],
  'filtro-habitaculo': ['filtro habitaculo', 'filtro habitáculo', 'filtro cabina', 'habitaculo', 'habitáculo'],
  'filtro-cabina': ['filtro habitaculo', 'filtro habitáculo', 'filtro cabina', 'habitaculo', 'habitáculo'],
  bujias: ['bujia', 'bujía'],
  bateria: ['bateria', 'batería'],
  refrigerante: ['refrigerante'],
  amortiguadores: ['amortiguador'],
  'correa-distribucion': ['correa', 'distribucion', 'distribución', 'correa de distribucion'],
  embrague: ['embrague', 'disco de embrague'],
  'aceite-transmision': ['aceite transmision', 'aceite de transmision', 'caja de cambio'],
  'filtro-combustible': ['filtro combustible', 'filtro de combustible'],
};

const GENERIC_SERVICE_PATTERNS = [
  /^mantenimiento por kilometraje$/i,
  /^diagn[oó]stico mec[aá]nico$/i,
  /^diagn[oó]stico electromec[aá]nico$/i,
];

const COMBO_PENALTY = {
  'air-filter': ['aceite motor y filtro', -25],
  'cabin-filter': ['aceite motor y filtro', -25],
  'filtro-aire': ['aceite motor y filtro', -25],
  'filtro-habitaculo': ['aceite motor y filtro', -25],
  'filtro-cabina': ['aceite motor y filtro', -25],
};

/** Intervalos de referencia (km, meses) alineados con INDUSTRY_PRIORS del backend. */
const COMPONENT_INTERVAL_HINTS = {
  'aceite-motor': [10000, 6],
  'filtro-aceite': [10000, 6],
  'oil': [10000, 6],
  'oil-filter': [10000, 6],
  'filtro-aire': [20000, 12],
  'air-filter': [20000, 12],
  'filtro-combustible': [40000, 24],
  'bujias': [40000, 24],
  'spark-plug': [40000, 24],
  bateria: [50000, 36],
  battery: [50000, 36],
  neumaticos: [40000, 36],
  tires: [40000, 36],
  'pastillas-freno': [18000, 18],
  brakes: [18000, 18],
  'discos-freno': [50000, 36],
  'brake-discs': [50000, 36],
  'liquido-frenos': [40000, 24],
  'brake-fluid': [40000, 24],
  amortiguadores: [80000, 48],
  shocks: [80000, 48],
  'correa-distribucion': [90000, 60],
  'timing-belt': [90000, 60],
  refrigerante: [40000, 24],
  coolant: [40000, 24],
  'aceite-transmision': [60000, 48],
  embrague: [100000, 72],
  'filtro-habitaculo': [20000, 12],
  'filtro-cabina': [20000, 12],
  'cabin-filter': [20000, 12],
};

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isGenericServiceName(nombre) {
  const n = (nombre || '').trim();
  return GENERIC_SERVICE_PATTERNS.some((pat) => pat.test(n));
}

function scoreServiceForSlug(slug, svc) {
  const nombre = normalizeText(svc?.nombre);
  let score = 0;
  for (const kw of SLUG_SERVICE_KEYWORDS[slug] || []) {
    if (nombre.includes(normalizeText(kw))) score += 12;
  }
  if (isGenericServiceName(svc?.nombre)) score -= 60;
  const combo = COMBO_PENALTY[slug];
  if (combo && nombre.includes(normalizeText(combo[0]))) score += combo[1];
  return score;
}

/**
 * Nombre canónico del componente (snapshot de salud del API).
 */
export function resolveHealthComponentDisplayName(comp, prediction = null) {
  if (!comp && prediction?.componente) return String(prediction.componente).trim();
  if (!comp) return 'Componente';

  const n = comp.nombre;
  if (typeof n === 'string' && n.trim()) return n.trim();
  const detail = comp.componente_detail;
  if (detail && typeof detail.nombre === 'string' && detail.nombre.trim()) return detail.nombre.trim();
  const nested = comp.componente;
  if (nested && typeof nested === 'object' && typeof nested.nombre === 'string' && nested.nombre.trim()) {
    return nested.nombre.trim();
  }
  if (typeof comp.componente_nombre === 'string' && comp.componente_nombre.trim()) {
    return comp.componente_nombre.trim();
  }
  if (prediction?.componente) return String(prediction.componente).trim();
  if (typeof comp.slug === 'string' && comp.slug.trim()) {
    return comp.slug.replace(/-/g, ' ');
  }
  return 'Componente';
}

export function resolveHealthComponentKey(comp) {
  if (!comp) return 'componente';
  const slug = comp.slug || comp.componente_detail?.slug || comp.icon_slug;
  if (typeof slug === 'string' && slug.trim()) return slug.trim();
  if (comp.id != null) return `id-${comp.id}`;
  return resolveHealthComponentDisplayName(comp);
}

export function resolveAlertLevel(comp) {
  return (comp.nivel_alerta || comp.status || 'OPTIMO').toUpperCase();
}

export function isCriticalOrUrgentComponent(comp) {
  const level = resolveAlertLevel(comp);
  return level === 'CRITICO' || level === 'URGENTE';
}

export function resolveAlertLevelLabel(comp) {
  const level = resolveAlertLevel(comp);
  if (comp?.nivel_alerta_display) return comp.nivel_alerta_display;
  return ALERT_LEVEL_LABELS[level] || level;
}

function resolveRecommendationService(svcCandidate, availableById) {
  const svcId = svcCandidate?.id;
  if (!svcId) return null;
  const fromCatalog = availableById.get(svcId);
  if (fromCatalog) return fromCatalog;
  return {
    id: svcId,
    nombre: svcCandidate.nombre || 'Servicio',
    descripcion: svcCandidate.descripcion || '',
    precio_referencia: svcCandidate.precio_referencia ?? null,
  };
}

function collectServiceCandidates(comp, alertas = [], prediction = null) {
  const raw = [];
  const seenIds = new Set();
  const push = (item) => {
    const id = item?.id;
    if (!id || seenIds.has(id)) return;
    seenIds.add(id);
    raw.push(item);
  };

  if (prediction?.servicio_sugerido?.id) {
    push(prediction.servicio_sugerido);
  }

  const direct = Array.isArray(comp.servicios_asociados) ? comp.servicios_asociados : [];
  direct.forEach(push);

  const compSaludId = comp.id;
  if (compSaludId && Array.isArray(alertas)) {
    for (const alerta of alertas) {
      const match =
        alerta.componente_salud === compSaludId
        || alerta.componente_salud_detail?.id === compSaludId;
      if (!match) continue;
      const fromAlerta = alerta.servicios_recomendados_detail || alerta.servicios_recomendados || [];
      fromAlerta.forEach(push);
    }
  }

  return raw;
}

function pickBestServiceForComponent(compKey, candidates, availableById) {
  const scored = candidates
    .map((c) => {
      const svc = resolveRecommendationService(c, availableById);
      if (!svc) return null;
      return { svc, score: scoreServiceForSlug(compKey, svc) };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;

  // Prefer a service with positive keyword match.
  const positive = scored.find((row) => row.score >= 1);
  if (positive) return positive.svc;

  // Fallback: top-scored service that isn't flagged as a generic maintenance
  // catch-all (those score -60). The backend already filtered irrelevant
  // services via servicios_asociados, so score-0 items are still meaningful.
  const nonGeneric = scored.find((row) => row.score > -55);
  return nonGeneric?.svc || null;
}

function resolveKmRestantes(comp, prediction) {
  const fromHealth = comp.km_estimados_restantes ?? comp.km_restantes;
  if (fromHealth != null) return fromHealth;
  if (prediction?.km_hasta_servicio != null) return prediction.km_hasta_servicio;
  return null;
}

export function resolveMaintenanceIntervalHint(compKey) {
  const prior = COMPONENT_INTERVAL_HINTS[compKey];
  if (!prior) return null;
  const [km, months] = prior;
  const kmPart = km ? `${Number(km).toLocaleString('es-CL')} km` : null;
  const monthsPart = months ? `${months} meses` : null;
  if (kmPart && monthsPart) return `Cada ${kmPart} · ${monthsPart}`;
  if (kmPart) return `Cada ${kmPart}`;
  if (monthsPart) return `Cada ${monthsPart}`;
  return null;
}

/** Líneas accionables para cards del home (sin mensajes largos de historial/ML). */
export function resolveComponentActionLines(comp, prediction, compLevel, compHealth) {
  const compKey = resolveHealthComponentKey(comp);
  const km = resolveKmRestantes(comp, prediction);
  const days = prediction?.dias_hasta_atencion ?? prediction?.dias_hasta_critico ?? null;
  const scheduleLine = resolveMaintenanceIntervalHint(compKey);

  if (compLevel === 'CRITICO' || compHealth < 10 || (km != null && Number(km) <= 0)) {
    return {
      actionLine: 'Revisar ya',
      scheduleLine,
    };
  }

  const window = formatHealthActionWindow({ km, days });
  if (window) {
    const prefix = compLevel === 'URGENTE' ? 'Agendar pronto · ' : 'Próxima · ';
    return { actionLine: `${prefix}${window}`, scheduleLine };
  }

  if (compLevel === 'URGENTE') {
    return { actionLine: 'Programar pronto', scheduleLine };
  }

  return { actionLine: scheduleLine, scheduleLine: null };
}

function sortComponentsByUrgency(a, b) {
  const levelA = resolveAlertLevel(a);
  const levelB = resolveAlertLevel(b);
  const prioA = ALERT_PRIORITY[levelA] ?? 99;
  const prioB = ALERT_PRIORITY[levelB] ?? 99;
  if (prioA !== prioB) return prioA - prioB;
  const healthA = a.salud_porcentaje ?? a.salud ?? 100;
  const healthB = b.salud_porcentaje ?? b.salud ?? 100;
  return healthA - healthB;
}

function dedupeGenericServiceCards(recs) {
  const seenGenericServiceIds = new Set();
  return recs.filter((rec) => {
    const svcId = rec.service?.id;
    if (!svcId || !isGenericServiceName(rec.service?.nombre)) return true;
    if (seenGenericServiceIds.has(svcId)) return false;
    seenGenericServiceIds.add(svcId);
    return true;
  });
}

/**
 * Cards de mantenimiento: solo componentes CRITICO/URGENTE del snapshot de salud.
 * ML enriquece km e hint; nunca define elegibilidad ni reemplaza nombres.
 */
export function buildHealthServiceRecommendations(
  healthComponents = [],
  serviciosDisponibles = [],
  alertas = [],
  predicciones = [],
) {
  if (!healthComponents?.length) return [];

  const availableById = new Map();
  for (const s of serviciosDisponibles) {
    if (s?.id) availableById.set(s.id, s);
  }

  const predMap = new Map();
  for (const p of predicciones) {
    const key = p.slug || p.componente_slug;
    if (key) predMap.set(String(key), p);
  }

  const recs = [];
  const seenComponentKeys = new Set();

  const urgentComponents = [...healthComponents]
    .filter(isCriticalOrUrgentComponent)
    .sort(sortComponentsByUrgency);

  for (const comp of urgentComponents) {
    const compKey = resolveHealthComponentKey(comp);
    if (seenComponentKeys.has(compKey)) continue;
    seenComponentKeys.add(compKey);

    const prediction = predMap.get(compKey) || null;
    const compName = resolveHealthComponentDisplayName(comp, prediction);
    const compHealth = comp.salud_porcentaje ?? comp.salud ?? 0;
    const compLevel = resolveAlertLevel(comp);
    const compLevelLabel = resolveAlertLevelLabel(comp);
    const kmRest = resolveKmRestantes(comp, prediction);

    const candidates = collectServiceCandidates(comp, alertas, prediction);
    const service = pickBestServiceForComponent(compKey, candidates, availableById);
    const { actionLine, scheduleLine } = resolveComponentActionLines(
      comp,
      prediction,
      compLevel,
      compHealth,
    );

    recs.push({
      componentKey: compKey,
      componentName: compName,
      componentHealth: compHealth,
      componentLevel: compLevel,
      componentLevelLabel: compLevelLabel,
      kmRestantes: kmRest,
      service: service || null,
      actionLine,
      scheduleLine,
      needsOpenRequest: !service?.id,
    });
  }

  return dedupeGenericServiceCards(recs);
}

export function mapAnalisisServiciosRecomendados(analisis, serviciosDisponibles = []) {
  const recs = analisis?.servicios_recomendados;
  if (!Array.isArray(recs) || recs.length === 0) return [];

  const byId = new Map();
  for (const s of serviciosDisponibles) {
    if (s?.id) byId.set(s.id, s);
  }

  const out = [];
  const seen = new Set();
  for (const r of recs) {
    const id = r.servicio_id ?? r.id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const full = byId.get(id);
    out.push(
      full || {
        id,
        nombre: r.nombre || 'Servicio',
        descripcion: r.descripcion || '',
        categoria_id: r.categoria_id,
      },
    );
  }
  return out;
}
