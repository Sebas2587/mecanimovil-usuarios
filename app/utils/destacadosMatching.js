/**
 * Destacados (home) — pipeline de matching estilo Airbnb "For you".
 *
 * Roles de descubrimiento:
 * - Destacados: curados por compatibilidad con la MARCA del vehículo del usuario.
 * - Cerca de ti: ordenados por distancia (geo), con cobertura de marca cuando aplica.
 *
 * Ejes del proveedor (todos son talleres):
 * 1. Modalidad: en_taller | a_domicilio | ambas  → utils/providerModalidad.js
 * 2. Cobertura: especialista | multimarca         → utils/providerBrandCoverage.js
 *
 * Pipeline (orden fijo):
 * 1. brandEligible  — solo quienes cubren la marca del vehículo (nunca especialista de otra marca)
 * 2. rankForBrand   — especialistas de la marca primero, luego multimarca; dentro de cada grupo KPI
 * 3. localizeSoft   — preferir ciudad + radar, con fallback progresivo para no vaciar la sección
 * 4. takeLimit      — cortar al cupo del panel
 */

import { coversBrand } from './providerBrandCoverage';
import {
  compareProvidersByMarcaThenKpi,
  isProviderMultimarca,
  tagProviderMarcaFlags,
} from './providerUtils';
import {
  filterProvidersForDestacadosPanel,
  providerMatchesUserCityContext,
} from '../components/home/shared/homeAddressUtils';
import { isProviderWithinRadar, normalizeDistanceKm } from './exploreProviderUtils';

/**
 * ¿Compatible con la marca del vehículo del usuario?
 * Multimarca: sí. Especialista: solo si atiende esa marca.
 */
export function isBrandCompatible(provider, marcaId, marcaNombre) {
  if (!provider) return false;
  if (marcaId != null && String(marcaId).trim() !== '') {
    return coversBrand(provider, marcaId);
  }
  if (marcaNombre) {
    return coversBrand(provider, marcaNombre);
  }
  // Sin marca conocida: el backend ya filtró por vehiculo_id; no descartar.
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
 * Etapa 2 — ranking Airbnb-like: especialistas de la marca → multimarca → KPI.
 */
export function rankForBrand(providers) {
  return [...(providers || [])].sort(compareProvidersByMarcaThenKpi);
}

/**
 * Etapa 3 — localización suave.
 * Preferencia: (ciudad ∩ radar) → ciudad → radar → todos elegibles por marca.
 * Evita el empty state cuando hay talleres compatibles fuera del radio estricto.
 */
export function localizeSoft(providers, cityContext) {
  const list = providers || [];
  if (list.length === 0) return [];

  const preferred = filterProvidersForDestacadosPanel(list, cityContext);
  if (preferred.length > 0) return preferred;

  if (cityContext?.labels?.length) {
    const inCity = list.filter((p) => providerMatchesUserCityContext(p, cityContext));
    if (inCity.length > 0) return inCity;
  }

  const inRadar = list.filter((p) => {
    const km = normalizeDistanceKm(p);
    if (km == null) return false;
    return isProviderWithinRadar(p);
  });
  if (inRadar.length > 0) return inRadar;

  // Fallback final: todos los compatibles por marca (orden ya aplicado).
  return list;
}

/**
 * Etapa 4 — cupo del rail.
 */
export function takeLimit(providers, limit = 12) {
  const n = Math.max(0, Number(limit) || 12);
  return (providers || []).slice(0, n);
}

/**
 * Pipeline completo Destacados.
 * @param {object[]} providers — respuesta cruda (talleres + mecánicos) ya con _panelKind
 * @param {{ marcaId?: number|string, marcaNombre?: string, cityContext?: object, limit?: number }} options
 */
export function buildDestacadosList(providers, options = {}) {
  const { marcaId, marcaNombre, cityContext, limit = 12 } = options;

  const eligible = filterBrandEligible(providers, { marcaId, marcaNombre });
  const ranked = rankForBrand(eligible);
  const localized = localizeSoft(ranked, cityContext);
  // Re-rank tras localizar para mantener especialistas-primero dentro del subset.
  const finalRanked = rankForBrand(localized);

  return {
    providers: takeLimit(finalRanked, limit),
    meta: {
      fetched: (providers || []).length,
      brandEligible: eligible.length,
      afterLocalize: localized.length,
      specialists: eligible.filter((p) => !isProviderMultimarca(p)).length,
      multibrand: eligible.filter((p) => isProviderMultimarca(p)).length,
    },
  };
}
