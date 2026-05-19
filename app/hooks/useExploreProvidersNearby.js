import { useQuery } from '@tanstack/react-query';
import { getNearbyProvidersForPanel } from '../services/providers';
import { geocodeAddress } from '../services/location';
import { coordsFromSavedAddress, resolveVehicleMarcaId } from '../components/home/shared/homeVehicleUtils';

const EXPLORE_PROVIDER_LIMIT = 60;

async function resolveCoordsForAddress(address) {
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
 * Proveedores cercanos para ExploreProviders (misma API que el panel, más resultados).
 */
export function useExploreProvidersNearby({ vehicle, address, enabled = true }) {
  const marcaId = resolveVehicleMarcaId(vehicle);
  const addressId = address?.id ?? null;

  return useQuery({
    queryKey: ['exploreProvidersNearby', vehicle?.id, addressId, marcaId],
    enabled: enabled && !!vehicle?.id && !!address,
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 15,
    queryFn: async () => {
      const coords = await resolveCoordsForAddress(address);
      if (!coords) return [];
      return getNearbyProvidersForPanel(coords.lat, coords.lng, marcaId, {
        limit: EXPLORE_PROVIDER_LIMIT,
      });
    },
  });
}

export { EXPLORE_PROVIDER_LIMIT };
