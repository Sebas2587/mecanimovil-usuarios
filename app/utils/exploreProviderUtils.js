import { compareProvidersByKpiRelevance } from './providerUtils';

/** Radio de recomendación por cercanía (PostGIS /cerca/ + UI). */
export const PROVIDER_RECOMMENDATION_MIN_KM = 0.1;
export const PROVIDER_RECOMMENDATION_MAX_KM = 5;

/** @deprecated Usar PROVIDER_RECOMMENDATION_MAX_KM */
export const EXPLORE_RADAR_KM_TALLER = PROVIDER_RECOMMENDATION_MAX_KM;
/** @deprecated Usar PROVIDER_RECOMMENDATION_MAX_KM */
export const EXPLORE_RADAR_KM_MECANICO = PROVIDER_RECOMMENDATION_MAX_KM;

export function mergeProviderLists(talleres = [], mecanicos = []) {
  const withKind = (arr, kind) =>
    (Array.isArray(arr) ? arr : []).map((p) => ({ ...p, _panelKind: kind }));
  return [...withKind(talleres, 'taller'), ...withKind(mecanicos, 'mecanico')];
}

/** Parsea distancia del proveedor a km (número), tolerando respuestas del serializer. */
export function normalizeDistanceKm(provider) {
  const raw = provider?.distance ?? provider?.distancia_km ?? provider?.distancia;
  if (raw == null || raw === '') return null;
  if (typeof raw === 'object') {
    if (raw.km != null && Number.isFinite(Number(raw.km))) return Number(raw.km);
    if (raw.m != null && Number.isFinite(Number(raw.m))) return Number(raw.m) / 1000;
  }
  let n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  // Valores grandes suelen venir en metros desde algún endpoint legacy
  if (n > 50 && n < 50000) n /= 1000;
  return n >= 0 ? n : null;
}

export function providerDistanceKm(provider) {
  return normalizeDistanceKm(provider);
}

/** Distancia para ordenar; sin dato → al final. */
export function providerDistanceKmOrInfinity(provider) {
  const km = providerDistanceKm(provider);
  return km == null ? 1e9 : km;
}

export function providerRadarLimitKm() {
  return PROVIDER_RECOMMENDATION_MAX_KM;
}

/**
 * Dentro de «tu zona»: distancia conocida y ≤ 5 km (incluye &lt; 100 m y ~0 km del API).
 * Sin distancia → no se asume cercanía (va a «Fuera de tu zona»).
 */
export function isProviderWithinRadar(provider) {
  const km = providerDistanceKm(provider);
  if (km == null) return false;
  return km <= PROVIDER_RECOMMENDATION_MAX_KM;
}

export function isProviderOutsideRadar(provider) {
  const km = providerDistanceKm(provider);
  if (km == null) return true;
  return km > PROVIDER_RECOMMENDATION_MAX_KM;
}

export function filterProvidersWithinRecommendationRadius(providers) {
  return (providers || []).filter(isProviderWithinRadar);
}

/**
 * Separa proveedores en zona (recomendados) y fuera del radar.
 * En zona: distancia primero, KPI en empate. Fuera: KPI y distancia si existe.
 */
export function splitProvidersByRadar(providers) {
  const inRadar = [];
  const outOfRadar = [];
  for (const p of providers || []) {
    if (isProviderWithinRadar(p)) inRadar.push(p);
    else outOfRadar.push(p);
  }
  inRadar.sort(compareProvidersByDistanceThenKpi);
  outOfRadar.sort((a, b) => {
    const aOut = isProviderOutsideRadar(a);
    const bOut = isProviderOutsideRadar(b);
    if (aOut && bOut) return compareProvidersByDistanceThenKpi(a, b);
    if (aOut && !bOut) return -1;
    if (!aOut && bOut) return 1;
    return compareProvidersByKpiThenDistance(a, b);
  });
  return { inRadar, outOfRadar };
}

/** Más cercano primero; a igual distancia, mejor KPI. */
export function compareProvidersByDistanceThenKpi(a, b) {
  const da = providerDistanceKmOrInfinity(a);
  const db = providerDistanceKmOrInfinity(b);
  if (da !== db) return da - db;
  return compareProvidersByKpiRelevance(a, b);
}

/** Solo distancia (home «Cerca»): sin desempate por KPI ni rating. */
export function compareProvidersByDistanceOnly(a, b) {
  const da = providerDistanceKmOrInfinity(a);
  const db = providerDistanceKmOrInfinity(b);
  if (da !== db) return da - db;
  const ka = providerStableKey(a) || '';
  const kb = providerStableKey(b) || '';
  return ka.localeCompare(kb);
}

/** KPI primero; a igual relevancia, más cercano. */
export function compareProvidersByKpiThenDistance(a, b) {
  const kpi = compareProvidersByKpiRelevance(a, b);
  if (kpi !== 0) return kpi;
  return providerDistanceKmOrInfinity(a) - providerDistanceKmOrInfinity(b);
}

/**
 * Orden para recomendaciones con dirección: prioriza cercanía (100 m–5 km), luego KPI.
 */
export function compareProvidersByRecommendationProximity(a, b) {
  const aIn = isProviderWithinRadar(a);
  const bIn = isProviderWithinRadar(b);
  if (aIn && !bIn) return -1;
  if (!aIn && bIn) return 1;
  if (aIn && bIn) return compareProvidersByDistanceThenKpi(a, b);
  return compareProvidersByKpiThenDistance(a, b);
}

export function sortProvidersForExploreMode(providers, mode) {
  const list = [...(providers || [])];
  if (mode === 'cerca') {
    list.sort(compareProvidersByDistanceOnly);
    return list;
  }
  list.sort(compareProvidersByRecommendationProximity);
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

export function providerStableKey(provider) {
  if (!provider?.id) return '';
  return `${provider._panelKind || 'taller'}-${provider.id}`;
}

/** Fusiona distancias desde listado /cerca/ sobre proveedores ya cargados. */
export function mergeProvidersWithDistanceMap(providers, distMap, nearbyList = []) {
  const seen = new Set((providers || []).map((p) => providerStableKey(p)));
  let merged = (providers || []).map((p) => {
    const key = providerStableKey(p);
    const d = distMap.get(key);
    if (d == null) return p;
    return { ...p, distance: d, distancia_km: d };
  });
  for (const p of nearbyList) {
    const key = providerStableKey(p);
    if (!key || seen.has(key)) continue;
    merged.push(p);
    seen.add(key);
  }
  return merged;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Coordenadas del proveedor (GeoJSON o campos sueltos). */
export function coordsFromProvider(provider) {
  const u = provider?.ubicacion;
  if (u?.coordinates?.length >= 2) {
    const lng = Number(u.coordinates[0]);
    const lat = Number(u.coordinates[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  const lat = Number(provider?.latitud ?? provider?.latitude);
  const lng = Number(provider?.longitud ?? provider?.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  return null;
}

/**
 * Completa distancia faltante con Haversine (p. ej. proveedores de categoría no devueltos por /cerca/).
 */
export function attachDistancesFromUserCoords(providers, userLat, userLng) {
  const la = Number(userLat);
  const lo = Number(userLng);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return providers || [];
  return (providers || []).map((p) => {
    if (providerDistanceKm(p) != null) return p;
    const c = coordsFromProvider(p);
    if (!c) return p;
    const km = haversineKm(la, lo, c.lat, c.lng);
    return { ...p, distance: km, distancia_km: km };
  });
}
