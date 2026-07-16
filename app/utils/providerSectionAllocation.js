/**
 * Asigna cada proveedor a una sola sección del feed (sin duplicados entre filas).
 *
 * Híbrido Airbnb (opción 2):
 * - Home / carrusel: asignación EXCLUSIVA → el feed no se satura con el mismo taller.
 * - “Ver todos” de una sección de marca: catálogo COMPLETO de especialistas que
 *   atienden esa marca (permite solapes entre marcas). Al profundizar no se pierde oferta.
 *
 * Orden del feed: especialistas de la patente → especialistas por marca popular →
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
 * Catálogo no exclusivo: todos los especialistas que atienden una marca.
 * Usado en “Ver todos” (y para ranking de popularidad de marcas).
 *
 * @param {object[]} providers
 * @param {string} brandName
 * @param {{ marcaId?: number|string|null }} [opts]
 * @returns {object[]}
 */
export function collectSpecialistsForBrand(providers, brandName, opts = {}) {
  const { marcaId = null } = opts;
  const brand = brandName != null ? String(brandName).trim() : '';
  if (!brand && (marcaId == null || marcaId === '')) return [];

  const list = [];
  const seen = new Set();

  for (const raw of providers || []) {
    const p = tagProviderMarcaFlags(raw);
    const key = providerStableKey(p);
    if (!key || seen.has(key)) continue;
    if (isProviderMultimarca(p)) continue;

    const matches =
      (marcaId != null && marcaId !== '' && coversBrand(p, marcaId, brand || null))
      || (brand && coversBrand(p, brand));

    if (!matches) continue;
    seen.add(key);
    list.push(p);
  }

  return list;
}

/**
 * Resuelve la lista para Airbnb “See all”.
 * - Sección con brandName → catálogo completo (solapes permitidos).
 * - Resto → misma lista exclusiva del feed.
 *
 * @param {{ brandName?: string|null, marcaId?: number|null, providers?: object[] }} section
 * @param {object[]} allProviders — pool filtrado del landing (misma búsqueda/geo)
 * @returns {object[]}
 */
export function resolveProvidersForSeeAll(section, allProviders = []) {
  if (!section) return [];
  const brand = section.brandName != null ? String(section.brandName).trim() : '';
  if (brand) {
    return collectSpecialistsForBrand(allProviders, brand, {
      marcaId: section.marcaId ?? null,
    });
  }
  return Array.isArray(section.providers) ? section.providers : [];
}

/**
 * Meta corta estilo Airbnb para la pantalla “Ver todos” de una marca.
 * @param {string} brandName
 * @param {number} count
 */
export function buildBrandSeeAllMeta(brandName, count) {
  const brand = brandName != null ? String(brandName).trim() : '';
  const n = Number(count) || 0;
  if (!brand) return `${n} taller${n === 1 ? '' : 'es'}`;
  return `${n} taller${n === 1 ? '' : 'es'} · atienden ${brand}`;
}

/**
 * Ranking de marcas por cobertura total de especialistas (no exclusivo).
 * Así una marca secundaria de talleres multi-marca sigue compitiendo por sección.
 * @returns {string[]}
 */
function topSpecialistBrandNames(providers, excludeNombre, minCount) {
  const counts = new Map();
  for (const raw of providers || []) {
    const p = tagProviderMarcaFlags(raw);
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
 * @returns {{ sections: Array<{ key: string, title: string, meta?: string|null, brandName?: string|null, marcaId?: number|null, providers: object[], catalogCount: number }>, meta: object }}
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

  // 1) Especialistas de la marca del vehículo (si hay patente) — exclusivos en feed
  if (marcaId != null || marcaNombre) {
    const specialists = collectMatching(providers, assigned, (p) => {
      if (isProviderMultimarca(p)) return false;
      return coversBrand(p, marcaId, marcaNombre) || coversBrand(p, marcaNombre);
    });
    if (specialists.length > 0) {
      const catalogCount = collectSpecialistsForBrand(providers, marcaNombre, { marcaId }).length;
      pushSection(sections, assigned, specialists, {
        key: 'specialists',
        title: tituloGrupoEspecialistas(marcaNombre || 'tu marca'),
        meta: marcaNombre ? `Enfocados en ${marcaNombre}` : null,
        brandName: marcaNombre || null,
        marcaId: marcaId ?? null,
        catalogCount,
      });
    }
  }

  // 2) Otras marcas con especialistas
  //    Ranking = cobertura TOTAL (permite que marcas “secundarias” existan como sección).
  //    Lista del carrusel = EXCLUSIVA (sin duplicar en el feed).
  const brandNames = topSpecialistBrandNames(
    providers,
    marcaNombre,
    brandMin,
  ).slice(0, Math.max(0, maxBrandSections));

  for (const brand of brandNames) {
    const catalog = collectSpecialistsForBrand(providers, brand);
    if (catalog.length < brandMin) continue;

    const exclusive = collectMatching(providers, assigned, (p) => {
      if (isProviderMultimarca(p)) return false;
      return coversBrand(p, brand);
    });

    // Solo se muestra en el feed si quedan cards exclusivas; el catálogo completo
    // sigue disponible vía “Ver todos” cuando la sección existe.
    if (exclusive.length < brandMin) continue;

    pushSection(sections, assigned, exclusive, {
      key: `brand-${brand.toLowerCase().replace(/\s+/g, '-')}`,
      title: tituloGrupoEspecialistas(brand),
      meta: `Talleres especializados en ${brand}`,
      brandName: brand,
      marcaId: null,
      catalogCount: catalog.length,
    });
  }

  // 3) Por categoría de servicio
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
        marcaId: null,
        catalogCount: matched.length,
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
      marcaId: null,
      catalogCount: multimarca.length,
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
      marcaId: null,
      catalogCount: remainder.length,
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

/**
 * ¿Mostrar “Ver todos”?
 * Airbnb: el link está siempre en el header de la fila cuando hay listings,
 * para abrir el catálogo / grid completo (marca, categoría, multimarca, etc.).
 */
export function sectionShouldShowSeeAll(section, _previewLimit = SECTION_PREVIEW_LIMIT) {
  if (!section) return false;
  const exclusiveLen = Array.isArray(section.providers) ? section.providers.length : 0;
  const catalogLen = Number(section.catalogCount) > 0
    ? Number(section.catalogCount)
    : exclusiveLen;
  return exclusiveLen > 0 || catalogLen > 0;
}
