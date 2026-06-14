import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getExploreProvidersUnified } from '../services/providers';
import { getServicesByCategory } from '../services/categories';
import { geocodeAddress } from '../services/location';
import {
  coordsFromSavedAddress,
  resolveVehicleMarcaId,
} from '../components/home/shared/homeVehicleUtils';
import {
  filterProvidersBySearchQuery,
  filterProvidersByServicioIds,
  sortProvidersForCategoryExplore,
} from '../utils/exploreProviderUtils';

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
 * Listado Explore unificado (relevancia + distancia); sin modo Para ti / Cerca.
 */
export function useExploreProviders({
  vehicle,
  address,
  categoryId = null,
  searchQuery = '',
  enabled = true,
}) {
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

  const hasCategory = !!categoryId;
  const categoryServicesReady = !categoryId || !servicesQuery.isLoading;
  const hasCategoryServices = hasCategory && servicioIds.length > 0;

  const providersQuery = useQuery({
    queryKey: [
      'exploreProvidersUnified',
      vehicle?.id,
      categoryId,
      address?.id,
      servicioIds.join(','),
    ],
    enabled:
      enabled &&
      !!vehicle?.id &&
      categoryServicesReady &&
      (!hasCategory || hasCategoryServices),
    staleTime: 1000 * 60 * 3,
    queryFn: async () => {
      const coords = await resolveCoords(address);
      return getExploreProvidersUnified(vehicle.id, {
        servicioIds: hasCategoryServices ? servicioIds : [],
        limit: EXPLORE_PROVIDER_LIMIT,
        lat: coords?.lat,
        lng: coords?.lng,
        marcaId,
      });
    },
  });

  const rawProviders = useMemo(() => {
    const data = providersQuery.data ?? [];
    const list = Array.isArray(data) ? data : [];
    if (!hasCategoryServices) return list;
    return filterProvidersByServicioIds(list, servicioIds);
  }, [providersQuery.data, hasCategoryServices, servicioIds]);

  const providers = useMemo(() => {
    const searched = filterProvidersBySearchQuery(rawProviders, searchQuery);
    if (!hasCategoryServices) return searched;
    return sortProvidersForCategoryExplore(searched, servicioIds);
  }, [rawProviders, searchQuery, hasCategoryServices, servicioIds]);

  return {
    hasCategory: hasCategoryServices,
    categoryLoading: hasCategory && servicesQuery.isLoading,
    categoryHasNoServices: hasCategory && categoryServicesReady && servicioIds.length === 0,
    providers,
    rawCount: rawProviders.length,
    hasAddress: !!address,
    isLoading:
      (hasCategory && servicesQuery.isLoading) ||
      providersQuery.isLoading,
    isRefetching: providersQuery.isRefetching,
    refetch: providersQuery.refetch,
  };
}

export { EXPLORE_PROVIDER_LIMIT };
