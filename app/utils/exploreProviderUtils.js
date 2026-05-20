import { compareProvidersByKpiRelevance } from './providerUtils';

export function mergeProviderLists(talleres = [], mecanicos = []) {
  const withKind = (arr, kind) =>
    (Array.isArray(arr) ? arr : []).map((p) => ({ ...p, _panelKind: kind }));
  return [...withKind(talleres, 'taller'), ...withKind(mecanicos, 'mecanico')];
}

export function sortProvidersForExploreMode(providers, mode) {
  const list = [...(providers || [])];
  if (mode === 'para_ti') {
    list.sort(compareProvidersByKpiRelevance);
    return list;
  }
  list.sort((a, b) => {
    const da = a.distance ?? a.distancia_km ?? 1e9;
    const db = b.distance ?? b.distancia_km ?? 1e9;
    return da - db;
  });
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
