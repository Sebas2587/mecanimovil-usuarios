import { Platform } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import solicitudesService from '../services/solicitudesService';
import ofertasService from '../services/ofertasService';
import logger from '../utils/logger';
import { useAuth } from '../context/AuthContext';

const CACHE = {
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: Platform.OS === 'web',
};

/** Misma clave en toda la app + invalidaciones WebSocket / mutaciones (siempre string). */
export const requestDetailQueryKey = (solicitudId) => {
    if (solicitudId == null || solicitudId === '') return null;
    return ['request', String(solicitudId)];
};

/**
 * Detalle público de solicitud + ofertas (un solo bundle cacheado).
 * No usar refetch en cada focus: solo al montar si los datos están stale, o tras invalidate.
 */
export async function fetchRequestDetailBundle(solicitudId) {
    const sid = solicitudId != null && solicitudId !== '' ? String(solicitudId) : null;
    if (!sid) {
        throw new Error('solicitudId requerido');
    }
    const [solicitudData, ofertasData] = await Promise.all([
        solicitudesService.obtenerDetalleSolicitud(sid),
        ofertasService.obtenerOfertasDeSolicitud(sid),
    ]);
    const solicitudNormalizada =
        solicitudData?.type === 'Feature'
            ? { ...solicitudData.properties, id: solicitudData.id }
            : solicitudData;
    const todas = ofertasData || [];
    const principales = todas
        .filter((o) => !o.es_oferta_secundaria)
        .sort((a, b) => parseFloat(a.precio_total_ofrecido) - parseFloat(b.precio_total_ofrecido));
    const secundarias = todas
        .filter((o) => o.es_oferta_secundaria)
        .sort((a, b) => parseFloat(a.precio_total_ofrecido) - parseFloat(b.precio_total_ofrecido));
    return {
        solicitud: solicitudNormalizada,
        ofertas: principales,
        ofertasSecundarias: secundarias,
    };
}

export const useRequestDetail = (solicitudId) => {
    const key = requestDetailQueryKey(solicitudId);
    return useQuery({
        queryKey: key || ['request', '__disabled__'],
        queryFn: () => fetchRequestDetailBundle(solicitudId),
        enabled: key != null,
        staleTime: CACHE.staleTime,
        gcTime: CACHE.gcTime,
        refetchOnWindowFocus: false,
        retry: 1,
        placeholderData: (prev) => prev,
    });
};

export function prefetchRequestDetail(queryClient, solicitudId) {
    const key = requestDetailQueryKey(solicitudId);
    if (!key) return Promise.resolve();
    return queryClient.prefetchQuery({
        queryKey: key,
        queryFn: () => fetchRequestDetailBundle(solicitudId),
        staleTime: CACHE.staleTime,
    });
}

export const useRequests = () => {
    const { user } = useAuth();
    const uid = user?.id ?? 'anon';
    return useQuery({
        queryKey: ['requests', uid],
        queryFn: () => solicitudesService.obtenerMisSolicitudes(),
        enabled: !!user?.id,
        select: (data) => (Array.isArray(data) ? data : []),
        staleTime: CACHE.staleTime,
        gcTime: CACHE.gcTime,
        refetchOnWindowFocus: CACHE.refetchOnWindowFocus,
        placeholderData: (previousData, previousQuery) => {
            const prevId = previousQuery?.queryKey?.[1];
            if (prevId != null && prevId === uid) return previousData;
            return undefined;
        },
    });
};

export const useActiveRequests = () => {
    const { user } = useAuth();
    const uid = user?.id ?? 'anon';
    return useQuery({
        queryKey: ['activeRequests', uid],
        queryFn: () => solicitudesService.obtenerSolicitudesActivas(),
        enabled: !!user?.id,
        select: (data) => (Array.isArray(data) ? data : []),
        staleTime: CACHE.staleTime,
        gcTime: CACHE.gcTime,
        refetchOnWindowFocus: CACHE.refetchOnWindowFocus,
        placeholderData: (previousData, previousQuery) => {
            const prevId = previousQuery?.queryKey?.[1];
            if (prevId != null && prevId === uid) return previousData;
            return undefined;
        },
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
        onSuccess: (data, solicitudId) => {
            queryClient.invalidateQueries({ queryKey: allKey });
            queryClient.invalidateQueries({ queryKey: activeKey });
            const rk = requestDetailQueryKey(solicitudId);
            if (rk) queryClient.invalidateQueries({ queryKey: rk });
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
            const rk = requestDetailQueryKey(variables.solicitudId);
            if (rk) queryClient.invalidateQueries({ queryKey: rk });
        }
    });
};
