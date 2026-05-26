import { reverseGeocode } from '../../../services/location';
import { coordsFromSavedAddress } from './homeVehicleUtils';
import { isProviderWithinRadar, normalizeDistanceKm } from '../../../utils/exploreProviderUtils';

/** Normaliza nombres de comuna/ciudad para comparación (Chile). */
export function normalizePlaceName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Etiquetas de comuna/ciudad del usuario desde dirección guardada y/o reverse geocode.
 * @returns {Promise<{ labels: string[], comuna: string|null, ciudad: string|null }>}
 */
export async function resolveUserCityContext(address, coords = null) {
  const labelSet = new Set();

  const add = (raw) => {
    const n = normalizePlaceName(raw);
    if (n && n.length >= 2) labelSet.add(n);
  };

  let resolvedCoords = coords;
  if (!resolvedCoords && address) {
    resolvedCoords = coordsFromSavedAddress(address);
  }

  if (resolvedCoords?.lat != null && resolvedCoords?.lng != null) {
    try {
      const rev = await reverseGeocode(resolvedCoords.lat, resolvedCoords.lng);
      if (rev) {
        add(rev.district);
        add(rev.subregion);
        add(rev.city);
        if (rev.region && !String(rev.region).toLowerCase().includes('metropolitana')) {
          add(rev.region);
        }
      }
    } catch (e) {
      console.warn('resolveUserCityContext: reverse geocode falló', e);
    }
  }

  const dir = address?.direccion || address?.detalles || '';
  if (dir) {
    const parts = String(dir)
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      add(parts[parts.length - 2]);
      add(parts[parts.length - 1]);
    }
    if (parts.length === 1) add(parts[0]);
  }

  if (address?.etiqueta) add(address.etiqueta);

  const labels = [...labelSet];
  const comuna = labels[0] ?? null;
  const ciudad = labels.length > 1 ? labels[labels.length - 1] : comuna;

  return { labels, comuna, ciudad };
}

function placeNameMatches(labels, candidate) {
  const c = normalizePlaceName(candidate);
  if (!c) return false;
  return labels.some((l) => l === c || c.includes(l) || l.includes(c));
}

/**
 * ¿El proveedor opera en la misma comuna/ciudad que la dirección del usuario?
 */
export function providerMatchesUserCityContext(provider, cityContext) {
  if (!cityContext?.labels?.length) return true;

  const { labels } = cityContext;
  const df = provider?.direccion_fisica;
  if (df) {
    if (placeNameMatches(labels, df.comuna) || placeNameMatches(labels, df.ciudad)) {
      return true;
    }
  }

  const comunasAtendidas = provider?.comunas_atendidas;
  if (Array.isArray(comunasAtendidas) && comunasAtendidas.some((c) => placeNameMatches(labels, c))) {
    return true;
  }

  const zonas = provider?.zonas_servicio;
  if (Array.isArray(zonas)) {
    for (const z of zonas) {
      const comunas = z?.comunas || z?.commune_names || [];
      if (Array.isArray(comunas) && comunas.some((c) => placeNameMatches(labels, c))) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Panel Destacados: misma ciudad/comuna y dentro del radar (5 km) si hay distancia.
 */
export function filterProvidersForDestacadosPanel(providers, cityContext) {
  const list = providers || [];
  if (!cityContext?.labels?.length) {
    return list.filter((p) => {
      const km = normalizeDistanceKm(p);
      return km == null || isProviderWithinRadar(p);
    });
  }

  const inCity = list.filter((p) => providerMatchesUserCityContext(p, cityContext));
  const inCityAndNear = inCity.filter((p) => {
    const km = normalizeDistanceKm(p);
    if (km == null) return true;
    return isProviderWithinRadar(p);
  });

  return inCityAndNear.length > 0 ? inCityAndNear : inCity;
}
