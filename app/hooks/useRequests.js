import { Platform } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import solicitudesService from '../services/solicitudesService';
import logger from '../utils/logger';
import { useAuth } from '../context/AuthContext';

const CACHE = {
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: Platform.OS === 'web',
    placeholderData: (previousData) => previousData,
};

export const useRequests = () => {
    const { user } = useAuth();
    return useQuery({
        queryKey: ['requests'],
        queryFn: () => solicitudesService.obtenerMisSolicitudes(),
        enabled: !!user,
        select: (data) => (Array.isArray(data) ? data : []),
        ...CACHE,
    });
};

export const useActiveRequests = () => {
    const { user } = useAuth();
    return useQuery({
        queryKey: ['activeRequests'],
        queryFn: () => solicitudesService.obtenerSolicitudesActivas(),
        enabled: !!user,
        select: (data) => (Array.isArray(data) ? data : []),
        ...CACHE,
    });
};

export const useCreateRequest = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: solicitudesService.crearSolicitud,
        onMutate: async (newRequest) => {
            await queryClient.cancelQueries({ queryKey: ['activeRequests'] });

            const previousRequests = queryClient.getQueryData(['activeRequests']);

            const optimisticRequest = {
                id: 'temp-' + Date.now(),
                ...newRequest,
                estado: 'pendiente',
                fecha_creacion: new Date().toISOString(),
                isOptimistic: true
            };

            queryClient.setQueryData(['activeRequests'], (old) => {
                const current = Array.isArray(old) ? old : [];
                return [optimisticRequest, ...current];
            });

            return { previousRequests };
        },
        onError: (err, newRequest, context) => {
            queryClient.setQueryData(['activeRequests'], context.previousRequests);
        },
        onSettled: () => {
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
