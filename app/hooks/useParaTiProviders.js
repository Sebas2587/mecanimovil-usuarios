import { useQuery } from '@tanstack/react-query';
import { getParaTiProvidersForPanel } from '../services/providers';

/**
 * Proveedores destacados por KPI para la sección «Destacados» del home.
 * No usa la dirección: el orden es solo por relevancia KPI + marca del vehículo.
 */
export function useParaTiProviders({ vehicle, enabled = true, limit = 12 }) {
  return useQuery({
    queryKey: ['homeParaTiProviders', vehicle?.id, limit],
    enabled: enabled && !!vehicle?.id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 20,
    queryFn: () => getParaTiProvidersForPanel(vehicle.id, { limit }),
  });
}
