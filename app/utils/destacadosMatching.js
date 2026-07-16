/**
 * Destacados (home) — pipeline aprobado (distancia pura).
 *
 * Reglas de negocio:
 * - Todos son talleres; elegibles por marca (y modelo vía ofertas del backend).
 * - No se excluye por distancia / ciudad / radar.
 * - Orden: distancia ascendente (más cercano primero).
 * - Cupo del rail: takeLimit (12 en home).
 *
 * Cobertura marca: utils/providerBrandCoverage.js
 * Modalidad (tag UI): utils/providerModalidad.js — no filtra matching.
 */

import { coversBrand } from './providerBrandCoverage';
import {
  isProviderMultimarca,
  tagProviderMarcaFlags,
} from './providerUtils';
import { normalizeDistanceKm } from './exploreProviderUtils';

/**
 * ¿Compatible con la marca del vehículo del usuario?
 * Multimarca: sí. Especialista: solo si atiende esa marca
 * (valida id y, si faltan ids en el payload, el nombre).
 */
export function isBrandCompatible(provider, marcaId, marcaNombre) {
  if (!provider) return false;
  if (marcaId != null && String(marcaId).trim() !== '') {
    return coversBrand(provider, marcaId, marcaNombre);
  }
  if (marcaNombre) {
    return coversBrand(provider, marcaNombre);
  }
  return true;
}

/**
 * Etapa 1 — elegibilidad por marca.
 */
export function filterBrandEligible(providers, { marcaId, marcaNombre } = {}) {
  return (providers || [])
    .map((p) => tagProviderMarcaFlags(p))
    .filter((p) => isBrandCompatible(p, marcaId, marcaNombre));
}

/**
 * Etapa 2 — orden por distancia pura (asc). Sin distancia → al final.
 */
export function rankByDistance(providers) {
  return [...(providers || [])].sort((a, b) => {
    const da = normalizeDistanceKm(a);
    const db = normalizeDistanceKm(b);
    const aUnknown = da == null;
    const bUnknown = db == null;
    if (aUnknown && bUnknown) return 0;
    if (aUnknown) return 1;
    if (bUnknown) return -1;
    return da - db;
  });
}

/** @deprecated Usar rankByDistance. Conservado por imports legacy. */
export function rankForBrand(providers) {
  return rankByDistance(providers);
}

/**
 * @deprecated El plan aprobado no corta por ciudad/radar; se conserva por compat.
 * Devuelve la lista tal cual (relleno = identidad).
 */
export function localizeSoft(providers, _cityContext, { limit = 12 } = {}) {
  const n = Math.max(0, Number(limit) || 12);
  return (providers || []).slice(0, n);
}

/**
 * Etapa 3 — cupo del rail.
 */
export function takeLimit(providers, limit = 12) {
  const n = Math.max(0, Number(limit) || 12);
  return (providers || []).slice(0, n);
}

/**
 * Pipeline completo Destacados.
 * @param {object[]} providers — respuesta cruda ya con _panelKind y distance cuando exista
 * @param {{ marcaId?: number|string, marcaNombre?: string, cityContext?: object, limit?: number, maxKm?: number|null }} options
 */
export function buildDestacadosList(providers, options = {}) {
  const { marcaId, marcaNombre, limit = 12, maxKm = null } = options;

  let eligible = filterBrandEligible(providers, { marcaId, marcaNombre });

  if (maxKm != null && Number.isFinite(Number(maxKm))) {
    const cap = Number(maxKm);
    eligible = eligible.filter((p) => {
      const km = normalizeDistanceKm(p);
      // Home Destacados: solo con geo real y dentro del tope (sin pin default / sin km).
      return km != null && km <= cap;
    });
  }

  const ranked = rankByDistance(eligible);

  return {
    providers: takeLimit(ranked, limit),
    meta: {
      fetched: (providers || []).length,
      brandEligible: eligible.length,
      afterLocalize: ranked.length,
      specialists: eligible.filter((p) => !isProviderMultimarca(p)).length,
      multibrand: eligible.filter((p) => isProviderMultimarca(p)).length,
    },
  };
}
