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
        onSuccess: () => {
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
