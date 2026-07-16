/**
 * Rail «Servicios más solicitados» para home logueado: demanda real de OTROS dueños
 * de la misma marca que el vehículo activo (no el ranking global genérico de invitados).
 */
import { useQuery } from '@tanstack/react-query';
import { getServiciosMasSolicitados } from '../services/service';
import { sortPopularServicesForVehicle } from '../utils/popularServicesForVehicle';
import { resolveVehicleMarcaId } from '../components/home/shared/homeVehicleUtils';

export function usePopularServicesForVehicle(vehicle, { limit = 12, enabled = true } = {}) {
  const vehicleId = vehicle?.id ?? null;
  const marcaId = resolveVehicleMarcaId(vehicle);

  return useQuery({
    queryKey: ['popularServicesMasSolicitados', vehicleId, marcaId, limit],
    enabled: enabled && !!vehicleId,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    queryFn: async () => {
      /** Se pide más de lo que se muestra: algunos de los servicios más pedidos por
       * dueños de esta marca pueden no tener oferta activa hoy; se filtran después. */
      const raw = await getServiciosMasSolicitados(Math.max(limit * 2, 24), marcaId);
      return sortPopularServicesForVehicle(raw, vehicle, { limit });
    },
  });
}
