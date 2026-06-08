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

function resolveServicesForComponent(comp, alertas = [], availableById = new Map()) {
  const resolved = [];
  const seenIds = new Set();

  const addCandidate = (svcCandidate) => {
    const svc = resolveRecommendationService(svcCandidate, availableById);
    if (!svc?.id || seenIds.has(svc.id)) return;
    seenIds.add(svc.id);
    resolved.push(svc);
  };

  const direct = Array.isArray(comp.servicios_asociados) ? comp.servicios_asociados : [];
  direct.forEach(addCandidate);

  const compSaludId = comp.id;
  if (compSaludId && Array.isArray(alertas)) {
    for (const alerta of alertas) {
      const match =
        alerta.componente_salud === compSaludId
        || alerta.componente_salud_detail?.id === compSaludId;
      if (!match) continue;
      const fromAlerta = alerta.servicios_recomendados_detail || alerta.servicios_recomendados || [];
      fromAlerta.forEach(addCandidate);
    }
  }

  return resolved;
}

function buildGenericService(compName, comp) {
  const mensaje = typeof comp?.mensaje_alerta === 'string' ? comp.mensaje_alerta.trim() : '';
  return {
    id: null,
    nombre: mensaje || `Revisión de ${compName}`,
    descripcion: mensaje,
    isGeneric: true,
  };
}

function sortComponentsByUrgency(a, b) {
  const levelA = resolveAlertLevel(a);
  const levelB = resolveAlertLevel(b);
  const prioA = ALERT_PRIORITY[levelA] ?? 99;
  const prioB = ALERT_PRIORITY[levelB] ?? 99;
  if (prioA !== prioB) return prioA - prioB;
  return (a.salud_porcentaje ?? a.salud ?? 100) - (b.salud_porcentaje ?? b.salud ?? 100);
}

/**
 * Una card por cada componente con desgaste (ATENCION / URGENTE / CRITICO).
 * Fuente alineada con VehicleHealthScreen: componentes + alertas del reporte de salud.
 */
export function buildHealthServiceRecommendations(
  healthComponents = [],
  serviciosDisponibles = [],
  alertas = [],
) {
  if (!healthComponents?.length) return [];

  const availableById = new Map();
  for (const s of serviciosDisponibles) {
    if (s?.id) availableById.set(s.id, s);
  }

  const recs = [];
  const seenComponentKeys = new Set();

  const worn = [...healthComponents]
    .filter((c) => resolveAlertLevel(c) !== 'OPTIMO')
    .sort(sortComponentsByUrgency);

  for (const comp of worn) {
    const compKey = resolveHealthComponentKey(comp);
    if (seenComponentKeys.has(compKey)) continue;
    seenComponentKeys.add(compKey);

    const compName = resolveHealthComponentDisplayName(comp);
    const compHealth = comp.salud_porcentaje ?? comp.salud ?? 0;
    const compLevel = resolveAlertLevel(comp);
    const kmRest = comp.km_estimados_restantes ?? comp.km_restantes ?? null;
    const services = resolveServicesForComponent(comp, alertas, availableById);
    const service = services[0] || buildGenericService(compName, comp);

    recs.push({
      componentKey: compKey,
      componentName: compName,
      componentHealth: compHealth,
      componentLevel: compLevel,
      kmRestantes: kmRest,
      service,
      needsOpenRequest: !services.length,
    });
  }

  return recs;
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
