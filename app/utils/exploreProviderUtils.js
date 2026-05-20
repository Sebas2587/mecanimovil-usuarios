import { compareProvidersByKpiRelevance } from './providerUtils';

export function mergeProviderLists(talleres = [], mecanicos = []) {
  const withKind = (arr, kind) =>
    (Array.isArray(arr) ? arr : []).map((p) => ({ ...p, _panelKind: kind }));
  return [...withKind(talleres, 'taller'), ...withKind(mecanicos, 'mecanico')];
}

export function providerDistanceKm(provider) {
  const d = provider?.distance ?? provider?.distancia_km;
  if (d == null || d === '') return 1e9;
  const n = typeof d === 'number' ? d : parseFloat(String(d));
  return Number.isFinite(n) ? n : 1e9;
}

/** Cerca primero; a igual distancia, mejor KPI (evita empates arbitrarios con el mismo servicio). */
export function compareProvidersByDistanceThenKpi(a, b) {
  const da = providerDistanceKm(a);
  const db = providerDistanceKm(b);
  if (da !== db) return da - db;
  return compareProvidersByKpiRelevance(a, b);
}

/** KPI primero; a igual relevancia, más cercano (mejor desempate en categorías saturadas). */
export function compareProvidersByKpiThenDistance(a, b) {
  const kpi = compareProvidersByKpiRelevance(a, b);
  if (kpi !== 0) return kpi;
  return providerDistanceKm(a) - providerDistanceKm(b);
}

export function sortProvidersForExploreMode(providers, mode) {
  const list = [...(providers || [])];
  if (mode === 'para_ti') {
    list.sort(compareProvidersByKpiThenDistance);
    return list;
  }
  list.sort(compareProvidersByDistanceThenKpi);
  return list;
}

export function filterProvidersBySearchQuery(providers, query) {
  const q = String(query || '')
    .trim()
    .toLowerCase();
  if (!q) return providers || [];
  return (providers || []).filter((p) => {
    const name = (p.nombre || '').toLowerCase();
    const specs = (p.especialidades_nombres || []).join(' ').toLowerCase();
    const offers = (p.panel_servicios || [])
      .map((o) => (o.nombre || '').toLowerCase())
      .join(' ');
    return name.includes(q) || specs.includes(q) || offers.includes(q);
  });
}

export function providerMatchesCategory(p, categoryId, servicioIdsSet) {
  if (!categoryId || !servicioIdsSet?.size) return true;
  const offers = p.panel_servicios || [];
  if (offers.some((o) => servicioIdsSet.has(o.servicio_id))) return true;
  const esp = p.especialidades || [];
  return esp.some((id) => id === categoryId);
}
