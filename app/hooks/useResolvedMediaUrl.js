import { useEffect, useState } from 'react';
import {
  collectOfertaProveedorFotoCandidates,
  collectVehiculoFotoCandidates,
  resolveFirstMediaUrlAsync,
  resolveMediaUrlAsync,
  resolveVehiculoId,
} from '../utils/resolveMediaUrl';
import { getVehicleById } from '../services/vehicle';
import { get } from '../services/api';
import { buildProviderAvatarUri } from '../utils/providerUtils';
import { resolveOfertaProviderNav } from '../utils/resolveOfertaProviderNav';

/**
 * Resuelve URL de media con el patrón async de OfertaCard / VehicleHealthCard.
 * @param {string|string[]|null} rawOrCandidates
 */
export function useResolvedMediaUrl(rawOrCandidates) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const candidates = Array.isArray(rawOrCandidates)
      ? rawOrCandidates
      : rawOrCandidates
        ? [rawOrCandidates]
        : [];

    if (candidates.length === 0) {
      setUrl(null);
      return undefined;
    }

    (async () => {
      const resolved = await resolveFirstMediaUrlAsync(candidates);
      if (!cancelled) setUrl(resolved);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    Array.isArray(rawOrCandidates)
      ? rawOrCandidates.filter(Boolean).join('|')
      : String(rawOrCandidates || ''),
  ]);

  return url;
}

async function fetchProveedorFotoFallback(oferta) {
  const nav = resolveOfertaProviderNav(oferta);
  if (!nav?.providerId || !nav?.providerType) return null;

  const path =
    nav.providerType === 'mecanico'
      ? `/usuarios/mecanicos-domicilio/${nav.providerId}/`
      : `/usuarios/talleres/${nav.providerId}/`;

  try {
    const detail = await get(path, {}, { requiresAuth: false, forceRefresh: true });
    const fromDetail = buildProviderAvatarUri(detail);
    if (fromDetail) return resolveMediaUrlAsync(fromDetail);
    return resolveFirstMediaUrlAsync([
      detail?.foto_perfil_url,
      detail?.foto_perfil,
      detail?.usuario?.foto_perfil_url,
      detail?.usuario?.foto_perfil,
    ]);
  } catch (_) {
    return null;
  }
}

export function useOfertaProveedorFotoUrl(oferta) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!oferta) {
      setUrl(null);
      return undefined;
    }

    (async () => {
      const local = await resolveFirstMediaUrlAsync(collectOfertaProveedorFotoCandidates(oferta));
      if (local) {
        if (!cancelled) setUrl(local);
        return;
      }
      const fetched = await fetchProveedorFotoFallback(oferta);
      if (!cancelled) setUrl(fetched);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    oferta?.id,
    oferta?.proveedor_foto,
    oferta?.proveedor_id_detail,
    oferta?.proveedor,
    oferta?.tipo_proveedor,
    oferta?.nombre_proveedor,
  ]);

  return url;
}

/**
 * Foto de vehículo: candidatos locales, y si faltan, fetch por ID (VehiculoSerializer.foto).
 */
export function useVehiculoFotoUrl(vehiculo, solicitud = null) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const vehicleId = resolveVehiculoId(vehiculo, solicitud);

    (async () => {
      const local = await resolveFirstMediaUrlAsync(collectVehiculoFotoCandidates(vehiculo));
      if (local) {
        if (!cancelled) setUrl(local);
        return;
      }

      if (!vehicleId) {
        if (!cancelled) setUrl(null);
        return;
      }

      try {
        const full = await getVehicleById(vehicleId);
        if (cancelled) return;
        const fetched = await resolveFirstMediaUrlAsync(collectVehiculoFotoCandidates(full));
        if (!cancelled) setUrl(fetched);
      } catch (_) {
        if (!cancelled) setUrl(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    vehiculo?.id,
    vehiculo?.foto,
    vehiculo?.foto_url,
    solicitud?.vehiculo,
    solicitud?.id,
  ]);

  return url;
}

export { resolveMediaUrlAsync, resolveFirstMediaUrlAsync };
