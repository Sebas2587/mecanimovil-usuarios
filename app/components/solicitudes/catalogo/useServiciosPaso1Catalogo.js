import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getServicesByVehiculo } from '../../../services/service';
import {
  prepararServiciosPaso1NuevaSolicitud,
  contarCoberturaProveedoresEnCatalogo,
  mensajeCoberturaPaso1,
} from '../../../utils/solicitudCatalogoServicios';

/**
 * Catálogo paso 1: servicios con ofertas de especialistas y multimarca (backend unificado).
 */
export function useServiciosPaso1Catalogo(vehiculoId, { enabled = true } = {}) {
  const query = useQuery({
    queryKey: ['vehicleServices', vehiculoId],
    queryFn: () => getServicesByVehiculo(vehiculoId),
    enabled: Boolean(vehiculoId) && enabled,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: 2,
    refetchOnMount: true,
    select: (data) => prepararServiciosPaso1NuevaSolicitud(data),
  });

  const cobertura = useMemo(
    () => contarCoberturaProveedoresEnCatalogo(query.data),
    [query.data],
  );

  const mensajeCobertura = useMemo(() => mensajeCoberturaPaso1(cobertura), [cobertura]);

  return {
    servicios: query.data ?? [],
    cobertura,
    mensajeCobertura,
    isPending: query.isPending,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
