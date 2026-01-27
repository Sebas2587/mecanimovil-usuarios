import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import solicitudesService from '../services/solicitudesService';
import logger from '../utils/logger';

export const useRequests = () => {
    return useQuery({
        queryKey: ['requests'],
        queryFn: () => solicitudesService.obtenerMisSolicitudes(),
        staleTime: 1000 * 60 * 5, // 5 min
        select: (data) => Array.isArray(data) ? data : [],
    });
};

export const useActiveRequests = () => {
    return useQuery({
        queryKey: ['activeRequests'],
        queryFn: () => solicitudesService.obtenerSolicitudesActivas(),
        staleTime: 1000 * 60 * 2, // 2 min
        refetchOnWindowFocus: true, // Actualizar al volver a la app
        select: (data) => Array.isArray(data) ? data : [],
    });
};

export const useCreateRequest = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: solicitudesService.crearSolicitud,
        onMutate: async (newRequest) => {
            // Cancelar refetches salientes (para que no sobrescriban nuestra actualización optimista)
            await queryClient.cancelQueries({ queryKey: ['activeRequests'] });

            // Snapshot del valor anterior
            const previousRequests = queryClient.getQueryData(['activeRequests']);

            // Crear un objeto temporal para la UI
            const optimisticRequest = {
                id: 'temp-' + Date.now(),
                ...newRequest,
                estado: 'pendiente', // Estado inicial
                fecha_creacion: new Date().toISOString(),
                isOptimistic: true
            };

            // Actualizar optimísticamente la cache
            queryClient.setQueryData(['activeRequests'], (old) => {
                const current = Array.isArray(old) ? old : [];
                return [optimisticRequest, ...current];
            });

            // Retornar contexto para rollback en caso de error
            return { previousRequests };
        },
        onError: (err, newRequest, context) => {
            // Rollback a los datos anteriores si falla
            queryClient.setQueryData(['activeRequests'], context.previousRequests);
        },
        onSettled: () => {
            // Invalidar queries para obtener datos reales del servidor
            queryClient.invalidateQueries({ queryKey: ['requests'] });
            queryClient.invalidateQueries({ queryKey: ['activeRequests'] });
        }
    });
};

export const usePublishRequest = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: solicitudesService.publicarSolicitud,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['requests'] });
            queryClient.invalidateQueries({ queryKey: ['activeRequests'] });
        }
    });
};

export const useCancelRequest = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: solicitudesService.cancelarSolicitud,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['requests'] });
            queryClient.invalidateQueries({ queryKey: ['activeRequests'] });
        }
    });
};

export const useSelectOffer = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ solicitudId, ofertaId }) => solicitudesService.seleccionarOferta(solicitudId, ofertaId),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['requests'] });
            queryClient.invalidateQueries({ queryKey: ['activeRequests'] });
            queryClient.invalidateQueries({ queryKey: ['request', variables.solicitudId] });
        }
    });
};
