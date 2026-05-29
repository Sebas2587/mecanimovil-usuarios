import { useQuery } from '@tanstack/react-query';
import { getParaTiProvidersForPanel } from '../services/providers';
import { geocodeAddress } from '../services/location';
import {
  coordsFromSavedAddress,
  resolveVehicleMarcaId,
} from '../components/home/shared/homeVehicleUtils';
import { resolveUserCityContext } from '../components/home/shared/homeAddressUtils';

/**
 * Destacados en home: solo especialistas en la marca del vehículo, orden KPI (ciudad + radar 5 km).
 */
export function useParaTiProviders({ vehicle, address, enabled = true, limit = 12 }) {
  const marcaId = resolveVehicleMarcaId(vehicle);

  return useQuery({
    queryKey: ['homeParaTiProviders', vehicle?.id, address?.id, marcaId, limit],
    enabled: enabled && !!vehicle?.id && !!address,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 20,
    queryFn: async () => {
      let coords = coordsFromSavedAddress(address);
      if (!coords && address?.direccion) {
        const g = await geocodeAddress(address.direccion);
        if (g?.latitude != null && g?.longitude != null) {
          coords = { lat: g.latitude, lng: g.longitude };
        }
      }
      const cityContext = await resolveUserCityContext(address, coords);

      return getParaTiProvidersForPanel(vehicle.id, {
        limit,
        scope: 'panel',
        lat: coords?.lat,
        lng: coords?.lng,
        marcaId,
        cityContext,
      });
    },
  });
}
