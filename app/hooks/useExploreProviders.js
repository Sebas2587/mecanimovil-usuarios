import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  EXPLORE_MODE_CERCA,
  EXPLORE_MODE_PARA_TI,
} from '../components/providers/explore/exploreProvidersConstants';
import { useExploreProvidersNearby } from './useExploreProvidersNearby';
import { useParaTiProviders } from './useParaTiProviders';
import { getExploreProvidersByServicios } from '../services/providers';
import { getServicesByCategory } from '../services/categories';
import { geocodeAddress } from '../services/location';
import {
  coordsFromSavedAddress,
  resolveVehicleMarcaId,
} from '../components/home/shared/homeVehicleUtils';
import { filterProvidersBySearchQuery } from '../utils/exploreProviderUtils';

const EXPLORE_PROVIDER_LIMIT = 60;

async function resolveCoords(address) {
  let coords = coordsFromSavedAddress(address);
  if (!coords && address?.direccion) {
    const g = await geocodeAddress(address.direccion);
    if (g?.latitude != null && g?.longitude != null) {
      coords = { lat: g.latitude, lng: g.longitude };
    }
  }
  return coords;
}

/**
 * Listado Explore: modo Para ti / Cerca, categoría opcional y búsqueda local.
 */
export function useExploreProviders({
  mode,
  vehicle,
  address,
  categoryId = null,
  searchQuery = '',
  enabled = true,
}) {
  const isParaTi = mode === EXPLORE_MODE_PARA_TI;
  const marcaId = resolveVehicleMarcaId(vehicle);

  const servicesQuery = useQuery({
    queryKey: ['exploreCategoryServices', categoryId],
    queryFn: () => getServicesByCategory(categoryId),
    enabled: enabled && !!categoryId,
    staleTime: 1000 * 60 * 30,
  });

  const servicioIds = useMemo(() => {
    const raw = servicesQuery.data;
    const list = Array.isArray(raw) ? raw : raw?.results || [];
    return list.map((s) => s.id).filter(Boolean);
  }, [servicesQuery.data]);

  const hasCategory = !!categoryId && servicioIds.length > 0;

  const nearby = useExploreProvidersNearby({
    vehicle,
    address,
    enabled: enabled && !isParaTi && !hasCategory && !!address,
  });

  const paraTi = useParaTiProviders({
    vehicle,
    address,
    enabled: enabled && isParaTi && !hasCategory,
    limit: EXPLORE_PROVIDER_LIMIT,
  });

  const categoryProviders = useQuery({
    queryKey: [
      'exploreProvidersCategory',
      vehicle?.id,
      categoryId,
      mode,
      address?.id,
      servicioIds.join(','),
    ],
    enabled: enabled && !!vehicle?.id && hasCategory,
    staleTime: 1000 * 60 * 3,
    queryFn: async () => {
      const coords = await resolveCoords(address);
      return getExploreProvidersByServicios(vehicle.id, servicioIds, {
        limit: EXPLORE_PROVIDER_LIMIT,
        sortMode: isParaTi ? 'para_ti' : 'cerca',
        lat: coords?.lat,
        lng: coords?.lng,
        marcaId,
      });
    },
  });

  const active = hasCategory
    ? categoryProviders
    : isParaTi
      ? paraTi
      : nearby;

  const rawProviders = useMemo(() => {
    const data = active.data ?? [];
    return Array.isArray(data) ? data.slice(0, EXPLORE_PROVIDER_LIMIT) : [];
  }, [active.data]);

  const providers = useMemo(
    () => filterProvidersBySearchQuery(rawProviders, searchQuery),
    [rawProviders, searchQuery],
  );

  return {
    mode,
    isParaTi,
    hasCategory,
    categoryLoading: servicesQuery.isLoading,
    providers,
    rawCount: rawProviders.length,
    isLoading: active.isLoading || (hasCategory && servicesQuery.isLoading),
    isRefetching: active.isRefetching,
    refetch: active.refetch,
  };
}

export { EXPLORE_PROVIDER_LIMIT };
