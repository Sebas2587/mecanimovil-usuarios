import { useQuery } from '@tanstack/react-query';
import * as providerService from '../services/providers';
import { get } from '../services/api';
import * as userService from '../services/user';
import solicitudesService from '../services/solicitudesService';
import { useAuth } from '../context/AuthContext';

// Cache for concurrent request deduplication
const requestCache = new Map();

/**
 * Batched hook for nearby talleres - groups vehicles by brand to minimize requests
 * Uses strategic caching to prevent excessive refetching
 */
export const useNearbyTalleres = (vehicles, address) => {
    // Only run if we have vehicles and address
    const enabled = vehicles && vehicles.length > 0 && !!address;

    // Create a stable key based on unique brands instead of vehicle IDs
    const uniqueBrands = vehicles
        ? [...new Set(vehicles.map(v => v.marca?.id || v.marca).filter(Boolean))].sort().join(',')
        : '';

    return useQuery({
        queryKey: ['nearbyTalleres', {
            brands: uniqueBrands,
            addressId: address?.id,
            vehicleCount: vehicles?.length || 0
        }],
        queryFn: async ({ signal }) => {
            const cacheKey = `talleres_${uniqueBrands}_${address?.id}`;

            // Check if same request is in-flight
            if (requestCache.has(cacheKey)) {
                console.log('[useNearbyTalleres] Reusing in-flight request');
                return requestCache.get(cacheKey);
            }

            // Create promise and cache it
            const promise = providerService.getWorkshopsForUserVehicles(vehicles, signal);
            requestCache.set(cacheKey, promise);

            try {
                const result = await promise;
                return Array.isArray(result) ? result.slice(0, 5) : [];
            } finally {
                // Clean up cache after request completes
                requestCache.delete(cacheKey);
            }
        },
        enabled: enabled,
        staleTime: 1000 * 60 * 5, // 5 mins - data doesn't change that fast
        cacheTime: 1000 * 60 * 30, // 30 mins - keep in memory
        refetchOnMount: false, // Don't refetch on every mount
        refetchOnWindowFocus: false, // Don't refetch on window focus
        retry: 2, // Retry failed requests
        select: (data) => Array.isArray(data) ? data.slice(0, 5) : [],
    });
};

/**
 * Batched hook for nearby mecanicos - groups vehicles by brand to minimize requests
 * Uses strategic caching to prevent excessive refetching
 */
export const useNearbyMecanicos = (vehicles, address) => {
    const enabled = vehicles && vehicles.length > 0 && !!address;

    // Create a stable key based on unique brands instead of vehicle IDs
    const uniqueBrands = vehicles
        ? [...new Set(vehicles.map(v => v.marca?.id || v.marca).filter(Boolean))].sort().join(',')
        : '';

    return useQuery({
        queryKey: ['nearbyMecanicos', {
            brands: uniqueBrands,
            addressId: address?.id,
            vehicleCount: vehicles?.length || 0
        }],
        queryFn: async ({ signal }) => {
            const cacheKey = `mecanicos_${uniqueBrands}_${address?.id}`;

            // Check if same request is in-flight
            if (requestCache.has(cacheKey)) {
                console.log('[useNearbyMecanicos] Reusing in-flight request');
                return requestCache.get(cacheKey);
            }

            // Create promise and cache it
            const promise = providerService.getMechanicsForUserVehicles(vehicles, signal);
            requestCache.set(cacheKey, promise);

            try {
                const result = await promise;
                return Array.isArray(result) ? result.slice(0, 5) : [];
            } finally {
                // Clean up cache after request completes
                requestCache.delete(cacheKey);
            }
        },
        enabled: enabled,
        staleTime: 1000 * 60 * 5, // 5 mins
        cacheTime: 1000 * 60 * 30, // 30 mins
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        retry: 2,
        select: (data) => Array.isArray(data) ? data.slice(0, 5) : [],
    });
};

// --- New Hooks for Provider Detail ---

export const useProviderDetails = (id, type) => {
    const numericId =
        id !== undefined && id !== null && id !== ''
            ? typeof id === 'number'
                ? id
                : parseInt(String(id), 10)
            : NaN;
    const safeId = Number.isFinite(numericId) ? numericId : null;

    return useQuery({
        queryKey: ['provider', type, safeId],
        queryFn: async () => {
            const endpoint = type === 'taller'
                ? `/usuarios/talleres/${safeId}/`
                : `/usuarios/mecanicos-domicilio/${safeId}/`;
            return await get(endpoint, {}, { requiresAuth: false });
        },
        enabled: safeId != null && !!type,
        staleTime: 1000 * 60 * 5,   // 5 min
        gcTime: 1000 * 60 * 30,     // 30 min en memoria
        refetchOnMount: false,       // no refetch si los datos son frescos
        refetchOnWindowFocus: false,
        // refetchInterval eliminado: el polling cada 30s multiplicaba los requests al backend
    });
};

export const useProviderServices = (id, type, providerName, vehicle = null) => {
    return useQuery({
        queryKey: ['providerServices', type, id, vehicle?.id ?? null],
        queryFn: async () => {
            const endpoint = type === 'taller'
                ? `/servicios/ofertas/por_taller/?taller=${id}`
                : `/servicios/ofertas/por_mecanico/?mecanico=${id}`;

            const response = await get(endpoint, {}, { requiresAuth: false });
            const ofertas = Array.isArray(response) ? response : (response?.results || []);

            if (ofertas.length === 0) return [];

            return ofertas
                .map((oferta) => providerService.mapOfertaToServicioRow(oferta, type, id, providerName))
                .filter(Boolean);
        },
        enabled: !!id && !!type,
        staleTime: 0,                // siempre considerar datos desactualizados
        gcTime: 1000 * 60 * 10,     // 10 min en memoria
        refetchOnMount: 'always',    // forzar refetch cada vez que se abre el perfil
        refetchOnWindowFocus: false,
    });
};

export const useProviderWeeklySchedule = (id, type) => {
    return useQuery({
        queryKey: ['providerSchedule', type, id],
        queryFn: async () => {
            const safeId = typeof id === 'number' ? id : parseInt(String(id), 10);
            const endpoint =
                type === 'taller'
                    ? `/usuarios/talleres/${safeId}/horarios_semanales/`
                    : `/usuarios/mecanicos-domicilio/${safeId}/horarios_semanales/`;

            const response = await get(endpoint, {}, { requiresAuth: false, forceRefresh: true });
            return Array.isArray(response) ? response : (response?.horarios || response?.results || []);
        },
        enabled: !!id && !!type,
        staleTime: 1000 * 60 * 30,
        gcTime: 1000 * 60 * 60,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
    });
};

export const useProviderTeam = (id, options = {}) => {
    const { ofertaServicioId = null, modalidad = null } = options;
    return useQuery({
        queryKey: ['providerTeam', id, ofertaServicioId, modalidad],
        queryFn: async () => {
            const safeId = typeof id === 'number' ? id : parseInt(String(id), 10);
            const params = {};
            if (ofertaServicioId) params.oferta_servicio_id = ofertaServicioId;
            if (modalidad) params.modalidad = modalidad;
            const response = await get(
                `/usuarios/talleres/${safeId}/equipo-publico/`,
                params,
                { requiresAuth: false },
            );
            return Array.isArray(response?.miembros) ? response.miembros : [];
        },
        enabled: !!id,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
    });
};

export const useProviderDocuments = (id, type) => {
    return useQuery({
        queryKey: ['providerDocuments', type, id],
        queryFn: async () => {
            return await get(
                `/usuarios/documentos-onboarding/proveedor_documentos/?provider_id=${id}&provider_type=${type}`,
                {},
                { requiresAuth: false }
            );
        },
        enabled: !!id && !!type,
        staleTime: 1000 * 60 * 60, // 1 hour
        retry: false,
        select: (data) => Array.isArray(data) ? data : [],
    });
};

export const useProviderReviews = (providerId, providerType) => {
    return useQuery({
        queryKey: ['providerReviews', providerType, providerId],
        queryFn: () => providerService.getProviderReviews(providerId, providerType),
        enabled: !!providerId && !!providerType,
        staleTime: 1000 * 60 * 5, // 5 min - no refetch if visited recently
        gcTime: 1000 * 60 * 30, // 30 min - keep in cache when navigating away
        refetchOnMount: true, // refetch only when data is stale
    });
};

/**
 * Obtiene los trabajos completados por el cliente con un proveedor específico.
 * Usa obtenerMisSolicitudes (SolicitudServicioPublica, estado 'completada') - misma fuente que
 * MarketplaceVehicleDetailScreen y VehicleHistoryScreen - en lugar de getServicesHistory (historial).
 */
export const useProviderCompletedJobs = (id, type) => {
    const { user } = useAuth();
    return useQuery({
        queryKey: ['providerJobs', type, id],
        queryFn: async () => {
            const allCompleted = await solicitudesService.obtenerMisSolicitudes({ estado: 'completada' });
            
            // Si el usuario no está logueado, obtenerMisSolicitudes retorna []
            const list = Array.isArray(allCompleted) ? allCompleted : (allCompleted?.results || []);
            
            if (list.length === 0) return [];

            // Filtrar por proveedor: oferta_seleccionada_detail tiene proveedor_id_detail (taller/mecanico id) y tipo_proveedor
            const providerIdStr = id.toString();
            const filtered = list
                .filter(s => s.estado === 'completada' && (s.oferta_seleccionada || s.oferta_seleccionada_detail))
                .filter(solicitud => {
                    const offer = solicitud.oferta_seleccionada_detail || solicitud.oferta_seleccionada;
                    if (!offer) return false;
                    const offerTipo = (offer.tipo_proveedor || '').toLowerCase();
                    if (offerTipo !== type) return false;
                    const providerId = offer.proveedor_id_detail || offer.proveedor_id || offer.proveedor_info?.id;
                    return providerId != null && providerId.toString() === providerIdStr;
                })
                .map(s => normalizarJobParaProviderDetail(s))
                .sort((a, b) => {
                    const dateA = new Date(a.fecha_servicio || a.fecha_hora_solicitud || 0);
                    const dateB = new Date(b.fecha_servicio || b.fecha_hora_solicitud || 0);
                    return dateB - dateA;
                });

            return filtered;
        },
        enabled: !!id && !!type, // Habilitado siempre si tenemos id y type
        staleTime: 1000 * 60 * 5,
    });
};

/** Normaliza SolicitudServicioPublica a formato esperado por ProviderCompletedJobsSection */
function normalizarJobParaProviderDetail(s) {
    const offer = s.oferta_seleccionada_detail || s.oferta_seleccionada || {};
    const detalles = offer.detalles_servicios || [];
    let lineas_detail = detalles.map(d => ({
        servicio_nombre: d.servicio_nombre || d.servicio?.nombre || d.nombre || 'Servicio',
        nombre: d.servicio_nombre || d.servicio?.nombre || d.nombre || 'Servicio',
    }));
    if (lineas_detail.length === 0 && (s.servicio_nombre || s.nombre_servicio)) {
        lineas_detail = [{ servicio_nombre: s.servicio_nombre || s.nombre_servicio, nombre: s.servicio_nombre || s.nombre_servicio }];
    }
    if (lineas_detail.length === 0 && s.servicios_solicitados_detail?.length > 0) {
        lineas_detail = s.servicios_solicitados_detail.map(svc => ({ servicio_nombre: svc.nombre, nombre: svc.nombre }));
    }
    if (lineas_detail.length === 0) {
        lineas_detail = [{ servicio_nombre: 'Servicio general', nombre: 'Servicio general' }];
    }
    const vehiculoDetail = s.vehiculo_detail || s.vehiculo_info || s.vehiculo;
    return {
        ...s,
        lineas_detail,
        lineas: lineas_detail,
        vehiculo_detail: vehiculoDetail,
        vehiculo: vehiculoDetail,
        fecha_servicio: s.fecha_servicio || s.fecha_creacion || s.fecha_hora_solicitud,
    };
}
