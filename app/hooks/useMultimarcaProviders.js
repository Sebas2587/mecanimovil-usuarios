import { useQuery } from '@tanstack/react-query';
import { getMultimarcaProvidersForPanel } from '../services/providers';
import { geocodeAddress } from '../services/location';
import { coordsFromSavedAddress } from '../components/home/shared/homeVehicleUtils';

/**
 * Proveedores multimarca en home: atienden cualquier marca de vehículo.
 * Siempre son relevantes independientemente de la marca del auto del usuario.
 */
export function useMultimarcaProviders({ address, enabled = true, limit = 12 }) {
  return useQuery({
    queryKey: ['homeMultimarcaProviders', address?.id, limit],
    enabled: enabled,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    queryFn: async () => {
      let coords = address ? coordsFromSavedAddress(address) : null;
      if (!coords && address?.direccion) {
        const g = await geocodeAddress(address.direccion);
        if (g?.latitude != null && g?.longitude != null) {
          coords = { lat: g.latitude, lng: g.longitude };
        }
      }

      return getMultimarcaProvidersForPanel({
        limit,
        lat: coords?.lat,
        lng: coords?.lng,
      });
    },
  });
}
