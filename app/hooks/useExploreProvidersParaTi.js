import { useQuery } from '@tanstack/react-query';
import { getParaTiProvidersForPanel } from '../services/providers';
import { geocodeAddress } from '../services/location';
import {
  coordsFromSavedAddress,
  resolveVehicleMarcaId,
} from '../components/home/shared/homeVehicleUtils';

const EXPLORE_PARA_TI_LIMIT = 60;

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
 * Explore «Ver todos» Destacados: especialistas en la marca, orden KPI (sin filtro ciudad/radar).
 */
export function useExploreProvidersParaTi({ vehicle, address, enabled = true }) {
  const marcaId = resolveVehicleMarcaId(vehicle);

  return useQuery({
    queryKey: ['exploreProvidersParaTi', vehicle?.id, address?.id, marcaId],
    enabled: enabled && !!vehicle?.id,
    staleTime: 1000 * 60 * 3,
    queryFn: async () => {
      const coords = await resolveCoords(address);
      return getParaTiProvidersForPanel(vehicle.id, {
        limit: EXPLORE_PARA_TI_LIMIT,
        scope: 'explore',
        lat: coords?.lat,
        lng: coords?.lng,
        marcaId,
      });
    },
  });
}

export { EXPLORE_PARA_TI_LIMIT };
