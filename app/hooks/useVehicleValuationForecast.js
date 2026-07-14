import { useQuery } from '@tanstack/react-query';
import { getVehicleValorReal } from '../services/vehicle';

function scrapeIsActive(data) {
  const state = data?.meta?.scrape?.state;
  return state === 'pending' || state === 'running';
}

/**
 * Valor real, liquidez y proyección del vehículo seleccionado.
 * Mientras el scrape on-demand corre, refresca cada 3s para mostrar %.
 * Si el mercado externo no está disponible (sin OAuth de MercadoLibre
 * configurado en backend), el motor cae a estado "estimado" (GetAPI +
 * curva de depreciación) — nunca deja la tarjeta cargando indefinidamente.
 */
export function useVehicleValuationForecast(vehicle, { enabled = true, refresh = false } = {}) {
  const vehicleId = vehicle?.id ?? null;

  return useQuery({
    queryKey: ['vehicleValorReal', vehicleId, refresh ? 'refresh' : 'cached'],
    enabled: enabled && !!vehicleId,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60,
    queryFn: () => getVehicleValorReal(vehicleId, { refresh }),
    refetchInterval: (query) => (scrapeIsActive(query.state.data) ? 3000 : false),
  });
}
