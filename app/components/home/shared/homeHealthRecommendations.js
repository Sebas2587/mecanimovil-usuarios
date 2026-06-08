/**
 * Normaliza respuesta de GET .../health/vehicle/{id}/components/ (array o paginado).
 */
export function normalizeHealthComponentsList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.componentes)) return data.componentes;
  return [];
}

const ALERT_PRIORITY = {
  CRITICO: 0,
  URGENTE: 1,
  ATENCION: 2,
};

/** Palabras clave por slug — alineado con backend componente_servicio_sugerido.py */
const SLUG_SERVICE_KEYWORDS = {
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
};

const GENERIC_SERVICE_PATTERNS = [
  /^mantenimiento por kilometraje$/i,
  /^diagn[oó]stico mec[aá]nico$/i,
  /^diagn[oó]stico electromec[aá]nico$/i,
];

const COMBO_PENALTY = {
  'air-filter': ['aceite motor y filtro', -25],
  'cabin-filter': ['aceite motor y filtro', -25],
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
 * Recomendaciones de servicio según componentes de salud (misma lógica que FormularioSolicitud).
 */
export function resolveHealthComponentDisplayName(comp) {
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
  if (typeof comp.slug === 'string' && comp.slug.trim()) {
    return comp.slug.replace(/_/g, ' ');
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

function resolveAlertLevel(comp) {
  return (comp.nivel_alerta || comp.status || 'OPTIMO').toUpperCase();
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

  const positive = scored.find((row) => row.score >= 1);
  return positive?.svc || null;
}

function buildGenericService(compName, comp, prediction) {
  const mlText = typeof prediction?.recomendacion === 'string' ? prediction.recomendacion.trim() : '';
  const mensaje = typeof comp?.mensaje_alerta === 'string' ? comp.mensaje_alerta.trim() : '';
  const nombre = mlText
    ? mlText.split('.')[0].trim()
    : (mensaje || `Revisión de ${compName}`);
  return {
    id: null,
    nombre,
    descripcion: mlText || mensaje,
    isGeneric: true,
  };
}

function componentNeedsAttention(comp, prediction) {
  const level = resolveAlertLevel(comp);
  if (level !== 'OPTIMO') return true;
  if (!prediction) return false;
  if (prediction.nivel_alerta && String(prediction.nivel_alerta).toUpperCase() !== 'OPTIMO') {
    return true;
  }
  if (prediction.salud_actual != null && prediction.salud_actual < 70) return true;
  if (prediction.dias_hasta_atencion != null && prediction.dias_hasta_atencion <= 30) return true;
  return false;
}

function resolveComponentHealth(comp, prediction) {
  const fromHealth = comp.salud_porcentaje ?? comp.salud;
  if (fromHealth != null && prediction?.salud_actual != null) {
    return Math.min(Number(fromHealth), Number(prediction.salud_actual));
  }
  return fromHealth ?? prediction?.salud_actual ?? 0;
}

function resolveKmRestantes(comp, prediction) {
  if (prediction?.km_hasta_servicio != null) return prediction.km_hasta_servicio;
  return comp.km_estimados_restantes ?? comp.km_restantes ?? null;
}

function sortComponentsByUrgency(a, b, predMap) {
  const predA = predMap.get(resolveHealthComponentKey(a));
  const predB = predMap.get(resolveHealthComponentKey(b));
  const levelA = resolveAlertLevel(a);
  const levelB = resolveAlertLevel(b);
  const prioA = ALERT_PRIORITY[levelA] ?? 99;
  const prioB = ALERT_PRIORITY[levelB] ?? 99;
  if (prioA !== prioB) return prioA - prioB;
  const healthA = resolveComponentHealth(a, predA);
  const healthB = resolveComponentHealth(b, predB);
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
 * Una card por componente con desgaste, servicio específico por slug + predicción ML.
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

  const worn = [...healthComponents]
    .filter((c) => componentNeedsAttention(c, predMap.get(resolveHealthComponentKey(c))))
    .sort((a, b) => sortComponentsByUrgency(a, b, predMap));

  for (const comp of worn) {
    const compKey = resolveHealthComponentKey(comp);
    if (seenComponentKeys.has(compKey)) continue;
    seenComponentKeys.add(compKey);

    const prediction = predMap.get(compKey) || null;
    const compName = resolveHealthComponentDisplayName(comp);
    const compHealth = resolveComponentHealth(comp, prediction);
    const compLevel = resolveAlertLevel(comp);
    const kmRest = resolveKmRestantes(comp, prediction);

    const candidates = collectServiceCandidates(comp, alertas, prediction);
    const service =
      pickBestServiceForComponent(compKey, candidates, availableById)
      || buildGenericService(compName, comp, prediction);

    recs.push({
      componentKey: compKey,
      componentName: compName,
      componentHealth: compHealth,
      componentLevel: compLevel,
      kmRestantes: kmRest,
      service,
      prediction,
      needsOpenRequest: !service?.id,
      mlRecomendacion: prediction?.recomendacion || null,
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
