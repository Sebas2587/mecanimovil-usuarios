import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import solicitudesService, { normalizarSolicitudPublica } from '../services/solicitudesService';
import ofertasService from '../services/ofertasService';
import { useAuth } from '../context/AuthContext';

const CACHE = {
    staleTime: 1000 * 45,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: true,
};

/** Claves React Query canónicas para listas de solicitudes del cliente. */
export const REQUESTS_LIST_KEY = (uid) => ['requests', uid ?? 'anon'];
export const ACTIVE_REQUESTS_KEY = (uid) => ['activeRequests', uid ?? 'anon'];

/** Misma clave en toda la app + invalidaciones WebSocket / mutaciones (siempre string). */
export const requestDetailQueryKey = (solicitudId) => {
    if (solicitudId == null || solicitudId === '') return null;
    return ['request', String(solicitudId)];
};

/**
 * Invalida listas de solicitudes (Mis solicitudes + panel activas).
 * Usar tras crear/publicar/cancelar sin pasar por useMutation.
 */
export function invalidateSolicitudesListQueries(queryClient, userId) {
    queryClient.invalidateQueries({ queryKey: REQUESTS_LIST_KEY(userId) });
    queryClient.invalidateQueries({ queryKey: ACTIVE_REQUESTS_KEY(userId) });
}

/**
 * Refetch activo de listas (fuerza red tras mutación vía servicio directo).
 */
export async function refetchSolicitudesListQueries(queryClient, userId) {
    await Promise.all([
        queryClient.refetchQueries({ queryKey: REQUESTS_LIST_KEY(userId) }),
        queryClient.refetchQueries({ queryKey: ACTIVE_REQUESTS_KEY(userId) }),
    ]);
}

/**
 * Inserta o actualiza una solicitud al inicio de la lista en cache (UX inmediata).
 */
export function prependSolicitudToListCache(queryClient, userId, solicitud) {
    const normalized = normalizarSolicitudPublica(solicitud);
    if (!normalized?.id) return;

    const listKey = REQUESTS_LIST_KEY(userId);
    queryClient.setQueryData(listKey, (old) => {
        const current = Array.isArray(old) ? old : [];
        const sid = String(normalized.id);
        const filtered = current.filter((s) => s && String(s.id) !== sid);
        return [normalized, ...filtered];
    });

    const activeKey = ACTIVE_REQUESTS_KEY(userId);
    const estadosActivos = new Set([
        'publicada',
        'con_ofertas',
        'esperando_creditos_proveedor',
        'adjudicada',
        'pendiente_pago',
        'creada',
        'seleccionando_servicios',
        'pagada',
        'en_ejecucion',
    ]);
    if (estadosActivos.has(normalized.estado)) {
        queryClient.setQueryData(activeKey, (old) => {
            const current = Array.isArray(old) ? old : [];
            const sid = String(normalized.id);
            const filtered = current.filter((s) => s && String(s.id) !== sid);
            return [normalized, ...filtered];
        });
    }
}

/**
 * Sincroniza listas tras crear/publicar vía solicitudesService (sin doble POST).
 */
export async function syncSolicitudesListAfterChange(queryClient, userId, solicitudPublicada) {
    if (solicitudPublicada) {
        prependSolicitudToListCache(queryClient, userId, {
            ...solicitudPublicada,
            estado: solicitudPublicada.estado || 'publicada',
        });
    }
    invalidateSolicitudesListQueries(queryClient, userId);
    await refetchSolicitudesListQueries(queryClient, userId);
}

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
        queryKey: REQUESTS_LIST_KEY(uid),
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
        queryKey: ACTIVE_REQUESTS_KEY(uid),
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
    const uid = user?.id ?? 'anon';
    const activeKey = ACTIVE_REQUESTS_KEY(uid);
    const allKey = REQUESTS_LIST_KEY(uid);
    return useMutation({
        mutationFn: solicitudesService.crearSolicitud,
        onMutate: async (newRequest) => {
            await queryClient.cancelQueries({ queryKey: activeKey });
            await queryClient.cancelQueries({ queryKey: allKey });

            const previousActive = queryClient.getQueryData(activeKey);
            const previousAll = queryClient.getQueryData(allKey);

            const optimisticRequest = {
                id: 'temp-' + Date.now(),
                ...newRequest,
                estado: 'pendiente',
                fecha_creacion: new Date().toISOString(),
                isOptimistic: true,
            };

            const prepend = (old) => {
                const current = Array.isArray(old) ? old : [];
                return [optimisticRequest, ...current];
            };

            queryClient.setQueryData(activeKey, prepend);
            queryClient.setQueryData(allKey, prepend);

            return { previousActive, previousAll };
        },
        onError: (err, newRequest, context) => {
            if (context?.previousActive !== undefined) {
                queryClient.setQueryData(activeKey, context.previousActive);
            }
            if (context?.previousAll !== undefined) {
                queryClient.setQueryData(allKey, context.previousAll);
            }
        },
        onSettled: () => {
            invalidateSolicitudesListQueries(queryClient, uid);
        },
    });
};

export const usePublishRequest = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const uid = user?.id ?? 'anon';
    return useMutation({
        mutationFn: solicitudesService.publicarSolicitud,
        onSuccess: (data) => {
            if (data) {
                prependSolicitudToListCache(queryClient, uid, data);
            }
            invalidateSolicitudesListQueries(queryClient, uid);
        },
    });
};

export const useCancelRequest = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const uid = user?.id ?? 'anon';
    return useMutation({
        mutationFn: solicitudesService.cancelarSolicitud,
        onSuccess: (data, solicitudId) => {
            invalidateSolicitudesListQueries(queryClient, uid);
            const rk = requestDetailQueryKey(solicitudId);
            if (rk) queryClient.invalidateQueries({ queryKey: rk });
        },
    });
};

export const useSelectOffer = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const uid = user?.id ?? 'anon';
    return useMutation({
        mutationFn: ({ solicitudId, ofertaId }) => solicitudesService.seleccionarOferta(solicitudId, ofertaId),
        onSuccess: (data, variables) => {
            invalidateSolicitudesListQueries(queryClient, uid);
            const rk = requestDetailQueryKey(variables.solicitudId);
            if (rk) queryClient.invalidateQueries({ queryKey: rk });
        },
    });
};
