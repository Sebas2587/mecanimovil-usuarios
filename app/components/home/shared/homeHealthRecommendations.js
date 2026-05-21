/**
 * Normaliza respuesta de GET .../health/vehicle/{id}/components/ (array o paginado).
 */
export function normalizeHealthComponentsList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.componentes)) return data.componentes;
  return [];
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

export function buildHealthServiceRecommendations(healthComponents = [], serviciosDisponibles = []) {
  if (!healthComponents?.length) return [];

  const availableById = new Map();
  for (const s of serviciosDisponibles) {
    if (s?.id) availableById.set(s.id, s);
  }

  const recs = [];
  const seenServiceIds = new Set();

  const critical = [...healthComponents]
    .filter((c) => {
      const level = c.nivel_alerta || c.status || 'OPTIMO';
      return level !== 'OPTIMO';
    })
    .sort(
      (a, b) =>
        (a.salud_porcentaje ?? a.salud ?? 100) - (b.salud_porcentaje ?? b.salud ?? 100),
    )
    .slice(0, 6);

  for (const comp of critical) {
    const compName = resolveHealthComponentDisplayName(comp);
    const compHealth = comp.salud_porcentaje ?? comp.salud ?? 0;
    const compLevel = comp.nivel_alerta || comp.status || 'ATENCION';
    const kmRest = comp.km_estimados_restantes ?? comp.km_restantes ?? null;
    const services = Array.isArray(comp.servicios_asociados) ? comp.servicios_asociados : [];

    for (const svcCandidate of services) {
      const svcId = svcCandidate?.id;
      if (!svcId || seenServiceIds.has(svcId)) continue;
      const svc = availableById.get(svcId);
      if (!svc) continue;

      seenServiceIds.add(svcId);
      recs.push({
        componentName: compName,
        componentHealth: compHealth,
        componentLevel: compLevel,
        kmRestantes: kmRest,
        service: svc,
      });
      // Un servicio por componente: evita varias cards con el mismo desgaste
      break;
    }
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
