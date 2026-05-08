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
        queryKey: ['requests', user?.id ?? 'anon'],
        queryFn: () => solicitudesService.obtenerMisSolicitudes(),
        enabled: !!user?.id,
        select: (data) => (Array.isArray(data) ? data : []),
        ...CACHE,
    });
};

export const useActiveRequests = () => {
    const { user } = useAuth();
    return useQuery({
        queryKey: ['activeRequests', user?.id ?? 'anon'],
        queryFn: () => solicitudesService.obtenerSolicitudesActivas(),
        enabled: !!user?.id,
        select: (data) => (Array.isArray(data) ? data : []),
        ...CACHE,
    });
};

export const useCreateRequest = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const activeKey = ['activeRequests', user?.id ?? 'anon'];
    const allKey = ['requests', user?.id ?? 'anon'];
    return useMutation({
        mutationFn: solicitudesService.crearSolicitud,
        onMutate: async (newRequest) => {
            await queryClient.cancelQueries({ queryKey: activeKey });

            const previousRequests = queryClient.getQueryData(activeKey);

            const optimisticRequest = {
                id: 'temp-' + Date.now(),
                ...newRequest,
                estado: 'pendiente',
                fecha_creacion: new Date().toISOString(),
                isOptimistic: true
            };

            queryClient.setQueryData(activeKey, (old) => {
                const current = Array.isArray(old) ? old : [];
                return [optimisticRequest, ...current];
            });

            return { previousRequests };
        },
        onError: (err, newRequest, context) => {
            queryClient.setQueryData(activeKey, context.previousRequests);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: allKey });
            queryClient.invalidateQueries({ queryKey: activeKey });
        }
    });
};

export const usePublishRequest = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const activeKey = ['activeRequests', user?.id ?? 'anon'];
    const allKey = ['requests', user?.id ?? 'anon'];
    return useMutation({
        mutationFn: solicitudesService.publicarSolicitud,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: allKey });
            queryClient.invalidateQueries({ queryKey: activeKey });
        }
    });
};

export const useCancelRequest = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const activeKey = ['activeRequests', user?.id ?? 'anon'];
    const allKey = ['requests', user?.id ?? 'anon'];
    return useMutation({
        mutationFn: solicitudesService.cancelarSolicitud,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: allKey });
            queryClient.invalidateQueries({ queryKey: activeKey });
        }
    });
};

export const useSelectOffer = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const activeKey = ['activeRequests', user?.id ?? 'anon'];
    const allKey = ['requests', user?.id ?? 'anon'];
    return useMutation({
        mutationFn: ({ solicitudId, ofertaId }) => solicitudesService.seleccionarOferta(solicitudId, ofertaId),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: allKey });
            queryClient.invalidateQueries({ queryKey: activeKey });
            queryClient.invalidateQueries({ queryKey: ['request', variables.solicitudId] });
        }
    });
};
