import { useQuery } from '@tanstack/react-query';
import { getParaTiProvidersForPanel } from '../services/providers';
import { geocodeAddress } from '../services/location';
import { coordsFromSavedAddress, resolveVehicleMarcaId } from '../components/home/shared/homeVehicleUtils';

/**
 * Proveedores destacados por KPI para la sección «Para ti» del home.
 */
export function useParaTiProviders({ vehicle, address, enabled = true }) {
  const marcaId = resolveVehicleMarcaId(vehicle);

  return useQuery({
    queryKey: ['homeParaTiProviders', vehicle?.id, address?.id, marcaId],
    enabled: enabled && !!vehicle?.id,
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
      return getParaTiProvidersForPanel(vehicle.id, {
        limit: 12,
        lat: coords?.lat,
        lng: coords?.lng,
        marcaId,
      });
    },
  });
}
