/**
 * Asigna cada proveedor a una sola sección (sin duplicados entre filas).
 * Orden: especialistas de la patente → especialistas por marca popular →
 * categorías de servicio → multimarca → remanente.
 */
import { tituloGrupoEspecialistas, tituloGrupoMultimarca } from './catalogoComparadorCobertura';
import { providerStableKey } from './exploreProviderUtils';
import {
  coversBrand,
  getProviderBrandCoverage,
  providerMatchesCategory,
} from './providerBrandCoverage';
import { isProviderMultimarca, tagProviderMarcaFlags } from './providerUtils';

const MIN_SECTION_SIZE = 2;
const MAX_CATEGORY_SECTIONS = 6;
const MAX_BRAND_SECTIONS_DEFAULT = 12;
/** Cards visibles en el carrusel del home (incentiva “Ver todos”). */
export const SECTION_PREVIEW_LIMIT = 4;

function collectMatching(providers, assigned, filterFn) {
  const list = [];
  for (const raw of providers || []) {
    const p = tagProviderMarcaFlags(raw);
    const key = providerStableKey(p);
    if (!key || assigned.has(key)) continue;
    if (filterFn(p)) list.push(p);
  }
  return list;
}

function commitAssigned(assigned, list) {
  for (const p of list) {
    const key = providerStableKey(p);
    if (key) assigned.add(key);
  }
}

function pushSection(sections, assigned, list, section) {
  if (!list.length) return;
  commitAssigned(assigned, list);
  sections.push({ ...section, providers: list });
}

/**
 * Marcas más frecuentes entre especialistas aún no asignados.
 * @returns {string[]}
 */
function topSpecialistBrandNames(providers, assigned, excludeNombre, minCount) {
  const counts = new Map();
  for (const raw of providers || []) {
    const p = tagProviderMarcaFlags(raw);
    const key = providerStableKey(p);
    if (!key || assigned.has(key)) continue;
    if (isProviderMultimarca(p)) continue;
    const { brandNames } = getProviderBrandCoverage(p);
    for (const name of brandNames) {
      const n = String(name).trim();
      if (!n) continue;
      if (
        excludeNombre &&
        n.toLowerCase() === String(excludeNombre).trim().toLowerCase()
      ) {
        continue;
      }
      counts.set(n, (counts.get(n) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .filter(([, c]) => c >= minCount)
    .map(([name]) => name);
}

/**
 * @param {object[]} providers
 * @param {{
 *   marcaId?: number,
 *   marcaNombre?: string,
 *   categories?: object[],
 *   minBrandSectionSize?: number,
 *   maxBrandSections?: number,
 *   prioritizeBrandSections?: boolean,
 * }} options
 * @returns {{ sections: Array<{ key: string, title: string, meta?: string|null, brandName?: string|null, providers: object[] }>, meta: object }}
 */
export function allocateProvidersToSections(providers, options = {}) {
  const {
    marcaId,
    marcaNombre,
    categories = [],
    minBrandSectionSize = MIN_SECTION_SIZE,
    maxBrandSections = MAX_BRAND_SECTIONS_DEFAULT,
    prioritizeBrandSections = false,
  } = options;
  const brandMin = Math.max(1, Number(minBrandSectionSize) || MIN_SECTION_SIZE);
  const assigned = new Set();
  const sections = [];

  // 1) Especialistas de la marca del vehículo (si hay patente)
  if (marcaId != null || marcaNombre) {
    const specialists = collectMatching(providers, assigned, (p) => {
      if (isProviderMultimarca(p)) return false;
      return coversBrand(p, marcaId, marcaNombre) || coversBrand(p, marcaNombre);
    });
    if (specialists.length > 0) {
      pushSection(sections, assigned, specialists, {
        key: 'specialists',
        title: tituloGrupoEspecialistas(marcaNombre || 'tu marca'),
        meta: marcaNombre ? `Enfocados en ${marcaNombre}` : null,
        brandName: marcaNombre || null,
      });
    }
  }

  // 2) Otras marcas con especialistas — sin patente o marcas distintas
  const brandNames = topSpecialistBrandNames(
    providers,
    assigned,
    marcaNombre,
    brandMin,
  ).slice(0, Math.max(0, maxBrandSections));

  for (const brand of brandNames) {
    const list = collectMatching(providers, assigned, (p) => {
      if (isProviderMultimarca(p)) return false;
      return coversBrand(p, brand);
    });
    if (list.length >= brandMin) {
      pushSection(sections, assigned, list, {
        key: `brand-${brand.toLowerCase().replace(/\s+/g, '-')}`,
        title: tituloGrupoEspecialistas(brand),
        meta: `Talleres especializados en ${brand}`,
        brandName: brand,
      });
    }
  }

  // 3) Por categoría de servicio (opcional en guest: después de marcas)
  const catLimit = prioritizeBrandSections
    ? Math.min(MAX_CATEGORY_SECTIONS, 4)
    : MAX_CATEGORY_SECTIONS;
  for (const cat of (categories || []).slice(0, catLimit)) {
    const matched = collectMatching(providers, assigned, (p) =>
      providerMatchesCategory(p, cat.id),
    );
    if (matched.length >= MIN_SECTION_SIZE) {
      pushSection(sections, assigned, matched, {
        key: `cat-${cat.id}`,
        title: cat.nombre,
        meta: null,
        brandName: null,
      });
    }
  }

  // 4) Multimarca
  const multimarca = collectMatching(providers, assigned, (p) => isProviderMultimarca(p));
  if (multimarca.length > 0) {
    pushSection(sections, assigned, multimarca, {
      key: 'multimarca',
      title: tituloGrupoMultimarca(),
      meta: 'Atienden todas las marcas',
      brandName: null,
    });
  }

  // 5) Remanente
  const remainder = collectMatching(providers, assigned, () => true);
  if (remainder.length > 0) {
    pushSection(sections, assigned, remainder, {
      key: 'more',
      title: 'Más talleres para ti',
      meta: null,
      brandName: null,
    });
  }

  return {
    sections,
    meta: {
      total: (providers || []).length,
      assigned: assigned.size,
      sectionCount: sections.length,
    },
  };
}

/** Recorte para el carrusel del home. */
export function previewSectionProviders(providers, limit = SECTION_PREVIEW_LIMIT) {
  return (providers || []).slice(0, limit);
}
