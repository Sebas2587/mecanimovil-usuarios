/**
 * Cobertura de marca del proveedor: especialista (atiende marcas específicas)
 * vs multimarca (atiende cualquier marca).
 *
 * Campos reales del backend (talleres / mecanicos-domicilio):
 * - `tipo_cobertura_marca`: 'multimarca' | 'especialista' | 'por_marca'
 * - `marcas_atendidas_nombres`: string[] con nombres de marcas del especialista
 * - `marcas_atendidas` | `marcas_atendidas_ids`: ids (números u objetos {id})
 * - `_esMultimarca`: flag agregado en cliente por los servicios del panel
 */

import { isProviderMultimarca, tagProviderMarcaFlags } from './providerUtils';

function normalizeBrandName(value) {
  if (value == null || value === '') return '';
  return String(value).trim().toLowerCase();
}

function looksLikeNumericId(marca) {
  const raw = String(marca).trim();
  if (!raw) return false;
  const n = Number(raw);
  return Number.isFinite(n) && String(n) === raw;
}

function coversBrandByIds(provider, marcaId) {
  const rawIds = provider?.marcas_atendidas ?? provider?.marcas_atendidas_ids;
  if (!Array.isArray(rawIds) || rawIds.length === 0) return null;
  const target = Number(marcaId);
  if (!Number.isFinite(target)) return null;
  return rawIds.some((m) => Number(m?.id ?? m) === target);
}

function coversBrandByName(provider, marcaNombre) {
  const target = normalizeBrandName(marcaNombre);
  if (!target) return null;
  const brandNames = Array.isArray(provider?.marcas_atendidas_nombres)
    ? provider.marcas_atendidas_nombres
    : [];
  if (brandNames.length === 0) return null;
  return brandNames.some((n) => {
    const nn = normalizeBrandName(n);
    return nn === target || nn.includes(target) || target.includes(nn);
  });
}

/**
 * Deriva la cobertura de marca del proveedor.
 * @returns {{ isMultimarca: boolean, brandNames: string[] }}
 */
export function getProviderBrandCoverage(provider) {
  const isMultimarca = isProviderMultimarca(provider);
  const brandNames = Array.isArray(provider?.marcas_atendidas_nombres)
    ? provider.marcas_atendidas_nombres
        .map((n) => (n == null ? '' : String(n).trim()))
        .filter(Boolean)
    : [];
  return { isMultimarca, brandNames };
}

/**
 * ¿El proveedor cubre la marca indicada (id numérico o nombre)?
 * Multimarca cubre todo. Si no hay marca que comparar, o el proveedor no expone
 * datos suficientes para negarlo, se asume cubierta (el backend ya filtra por
 * vehiculo_id / marca en los endpoints del panel).
 *
 * @param {object} provider
 * @param {number|string} marca — id o nombre
 * @param {string} [marcaNombreHint] — nombre a usar si `marca` es solo id y no hay IDs en el payload
 */
export function coversBrand(provider, marca, marcaNombreHint = null) {
  if (!provider) return false;
  const { isMultimarca, brandNames } = getProviderBrandCoverage(provider);
  if (isMultimarca) return true;
  if (marca == null || String(marca).trim() === '') return true;

  if (looksLikeNumericId(marca)) {
    const byId = coversBrandByIds(provider, marca);
    if (byId != null) return byId;
    const byName = coversBrandByName(provider, marcaNombreHint);
    if (byName != null) return byName;
    // Sin ids ni nombres: no podemos negar (listados legacy).
    return brandNames.length === 0;
  }

  const byName = coversBrandByName(provider, marca);
  if (byName != null) return byName;
  return true;
}

/**
 * Badge de cobertura para cards estilo Airbnb Explore.
 * Solo dice «Especialista {marcaUsuario}» si realmente atiende esa marca.
 */
export function getCoverageBadgeLabel(provider, userBrandName = null) {
  if (!provider) return null;
  const { isMultimarca, brandNames } = getProviderBrandCoverage(provider);
  if (isMultimarca) return 'Multimarca';

  const brand = userBrandName != null ? String(userBrandName).trim() : '';
  if (brand && coversBrand(provider, brand)) {
    return `Especialista ${brand}`;
  }

  if (brandNames.length === 1) return `Especialista ${brandNames[0]}`;
  if (brandNames.length > 1) {
    return `Especialista ${brandNames[0]} +${brandNames.length - 1}`;
  }
  return null;
}

/**
 * Specialty bajo contexto de sección de marca (Airbnb Explore).
 * El badge ya comunica «Especialista {Marca}»; aquí preferimos servicios
 * del panel (no listar marcas otra vez ni el prefijo “También …”).
 *
 * @param {object} provider
 * @param {object[]|null} [serviceOffers] — ofertas de panel ya resueltas
 * @returns {string|null}
 */
export function getSpecialtyForBrandContext(provider, serviceOffers = null) {
  const offers = Array.isArray(serviceOffers)
    ? serviceOffers
    : Array.isArray(provider?._panel_servicios_cache)
      ? provider._panel_servicios_cache
      : Array.isArray(provider?.panel_servicios)
        ? provider.panel_servicios
        : [];
  const names = offers
    .slice(0, 2)
    .map((o) => o?.nombre || o?.name || (typeof o === 'string' ? o : null))
    .filter(Boolean);
  if (names.length > 0) return names.join(' · ');
  return null;
}

/**
 * Particiona proveedores elegibles en especialistas de la marca vs multimarca.
 * Los especialistas de otra marca se excluyen (no se relabelizan como multimarca).
 *
 * @returns {{ especialistas: object[], multimarca: object[], meta: object }}
 */
export function partitionProvidersPorCoberturaMarca(providers, { marcaId, marcaNombre } = {}) {
  const especialistas = [];
  const multimarca = [];
  let skippedOtherBrand = 0;

  (providers || []).forEach((raw) => {
    const p = tagProviderMarcaFlags(raw);
    if (isProviderMultimarca(p)) {
      multimarca.push(p);
      return;
    }
    if (coversBrand(p, marcaId, marcaNombre) || coversBrand(p, marcaNombre)) {
      especialistas.push(p);
      return;
    }
    skippedOtherBrand += 1;
  });

  return {
    especialistas,
    multimarca,
    meta: {
      fetched: (providers || []).length,
      specialists: especialistas.length,
      multibrand: multimarca.length,
      skippedOtherBrand,
    },
  };
}

/**
 * ¿El proveedor declara la categoría (especialidad) seleccionada?
 * Filtro cliente instantáneo para chips — sin refetch.
 */
export function providerMatchesCategory(provider, categoryId) {
  if (categoryId == null || categoryId === '') return true;
  if (!provider) return false;
  const target = Number(categoryId);
  if (!Number.isFinite(target)) return true;

  const raw = provider.especialidades;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.some((e) => Number(e?.id ?? e) === target);
  }
  return false;
}
