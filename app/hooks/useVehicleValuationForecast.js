import { useQuery } from '@tanstack/react-query';
import { getVehicleValorReal } from '../services/vehicle';

/**
 * Valor real, liquidez y proyección del vehículo seleccionado.
 */
export function useVehicleValuationForecast(vehicle, { enabled = true, refresh = false } = {}) {
  const vehicleId = vehicle?.id ?? null;

  return useQuery({
    queryKey: ['vehicleValorReal', vehicleId, refresh ? 'refresh' : 'cached'],
    enabled: enabled && !!vehicleId,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60,
    queryFn: () => getVehicleValorReal(vehicleId, { refresh }),
  });
}
