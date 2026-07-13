/**
 * Actividad de mercado: servicios pedidos por otros con el mismo marca/modelo.
 */
import { useQuery } from '@tanstack/react-query';
import { getActividadMercadoVehiculo } from '../services/user';

export function useMarketActivityForVehicle(vehicle, { limit = 12, enabled = true } = {}) {
  const vehicleId = vehicle?.id ?? null;

  return useQuery({
    queryKey: ['userVehicleMarketActivity', vehicleId, limit],
    enabled: enabled && !!vehicleId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    queryFn: async () => {
      const data = await getActividadMercadoVehiculo(vehicleId, limit);
      const items = Array.isArray(data?.items) ? data.items : [];
      // Preferir más personas primero (por si el API no ordena)
      const sorted = [...items].sort(
        (a, b) => Number(b.personas || 0) - Number(a.personas || 0),
      );
      return {
        marca: data?.marca ?? vehicle?.marca_nombre ?? null,
        modelo: data?.modelo ?? vehicle?.modelo_nombre ?? null,
        items: sorted,
      };
    },
  });
}
